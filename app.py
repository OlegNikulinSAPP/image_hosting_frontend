import http.server
import logging
import json
import os
import uuid
from PIL import Image
import io
from urllib.parse import urlparse, parse_qs

from database import test_connection, get_db_connection, check_table_exists
# Импортируем настройку логгера из отдельного файла
from logger_setup import setup_logging

# Конфигурация
STATIC_FILES_DIR = 'static'
UPLOAD_DIR = 'images'
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']
LOG_DIR = 'logs'
MAX_IMAGE_DIMENSION = 1200


def setup_directories():
    """Создает необходимые директории если они не существуют"""
    for directory in [UPLOAD_DIR, LOG_DIR, STATIC_FILES_DIR, 'backups']:
        if not os.path.exists(directory):
            os.makedirs(directory)


def save_image_metadata(filename, original_name, size, file_type):
    """Сохраняет метаданные изображения в базу данных"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO images (filename, original_name, size, file_type) VALUES (%s, %s, %s, %s)",
            (filename, original_name, size, file_type)
        )
        conn.commit()
        logging.info(f"Метаданные сохранены в БД: {filename}")
    except Exception as e:
        logging.error(f"Ошибка сохранения метаданных: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def get_images_list(page=1, per_page=10):
    """Получает список изображений с пагинацией"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        offset = (page - 1) * per_page
        cursor.execute(
            "SELECT id, filename, original_name, size, upload_time, file_type FROM images ORDER BY upload_time DESC LIMIT %s OFFSET %s",
            (per_page, offset)
        )
        images = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) FROM images")
        total_count = cursor.fetchone()[0]

        return [
            {
                'id': img[0],
                'filename': img[1],
                'original_name': img[2],
                'size': img[3],
                'upload_time': img[4].isoformat(),
                'file_type': img[5]
            } for img in images
        ], total_count
    except Exception as e:
        logging.error(f"Ошибка получения списка изображений: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def delete_image(image_id):
    """Удаляет изображение из БД и файловой системы"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Получаем информацию об изображении
        cursor.execute("SELECT filename FROM images WHERE id = %s", (image_id,))
        result = cursor.fetchone()

        if not result:
            return False, "Изображение не найдено"

        filename = result[0]
        file_path = os.path.join(UPLOAD_DIR, filename)

        # Удаляем из БД
        cursor.execute("DELETE FROM images WHERE id = %s", (image_id,))
        conn.commit()

        # Удаляем файл
        if os.path.exists(file_path):
            os.remove(file_path)
            logging.info(f"Файл удален: {file_path}")

        return True, "Изображение удалено"
    except Exception as e:
        conn.rollback()
        logging.error(f"Ошибка удаления изображения: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


class ImageHostingHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type='text/html'):
        """Устанавливает базовые заголовки ответа"""
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        """Обрабатывает OPTIONS запросы"""
        self._set_headers(200)

    def do_GET(self):
        """Обрабатывает GET запросы"""
        parsed_path = urlparse(self.path)

        if parsed_path.path == '/images-list':
            self._handle_images_list(parsed_path.query)
        elif parsed_path.path.startswith('/images/'):
            self._serve_image(parsed_path.path)
        else:
            self._set_headers(404, 'text/plain')
            self.wfile.write(b"404 Not Found")

    def do_DELETE(self):
        """Обрабатывает DELETE запросы"""
        parsed_path = urlparse(self.path)
        if parsed_path.path.startswith('/delete/'):
            image_id = parsed_path.path.split('/')[-1]
            self._handle_delete_image(image_id)
        else:
            self._set_headers(404, 'text/plain')
            self.wfile.write(b"404 Not Found")

    def _handle_images_list(self, query_string):
        """Обрабатывает запрос списка изображений"""
        try:
            params = parse_qs(query_string)
            page = int(params.get('page', [1])[0])
            per_page = 10

            images, total_count = get_images_list(page, per_page)

            response = {
                'images': images,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'pages': (total_count + per_page - 1) // per_page
                }
            }

            self._set_headers(200, 'application/json')
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            logging.error(f"Ошибка обработки списка изображений: {e}")
            self._send_error_response(500, 'Ошибка сервера')

    def _handle_delete_image(self, image_id):
        """Обрабатывает удаление изображения"""
        try:
            success, message = delete_image(image_id)
            if success:
                response = {'status': 'success', 'message': message}
                self._set_headers(200, 'application/json')
            else:
                response = {'status': 'error', 'message': message}
                self._set_headers(404, 'application/json')

            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            logging.error(f"Ошибка удаления изображения: {e}")
            self._send_error_response(500, 'Ошибка сервера')

    def _serve_image(self, path):
        """Отдает изображения"""
        filename = path.split('/')[-1]
        file_path = os.path.join(UPLOAD_DIR, filename)

        if os.path.exists(file_path):
            self._set_headers(200, self._get_mime_type(filename))
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self._set_headers(404, 'text/plain')
            self.wfile.write(b"Image not found")

    def _get_mime_type(self, filename):
        """Определяет MIME-тип файла"""
        ext = os.path.splitext(filename)[1].lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        }
        return mime_types.get(ext, 'application/octet-stream')

    def _validate_file(self, filename, content_length):
        """Проверяет валидность файла"""
        if content_length > MAX_FILE_SIZE:
            return False, 'Превышен размер файла'

        file_extension = os.path.splitext(filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            return False, 'Неподдерживаемый формат файла'

        return True, ''

    def _process_image(self, file_data, file_extension):
        """Обрабатывает изображение с помощью Pillow"""
        try:
            image = Image.open(io.BytesIO(file_data))

            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')

            if image.width > MAX_IMAGE_DIMENSION or image.height > MAX_IMAGE_DIMENSION:
                image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

            output = io.BytesIO()

            if file_extension in ['.jpg', '.jpeg']:
                image.save(output, format='JPEG', quality=85)
            elif file_extension == '.png':
                image.save(output, format='PNG', optimize=True)
            elif file_extension == '.gif':
                image.save(output, format='GIF')

            return output.getvalue()
        except Exception as e:
            logging.error(f'Ошибка обработки изображения: {e}')
            raise

    def _parse_multipart_data(self, content_type, post_data):
        """Разбирает multipart/form-data запрос"""
        boundary = content_type.split('boundary=')[-1]
        parts = post_data.split(b'--' + boundary.encode())

        for part in parts:
            if b'filename="' in part:
                headers_data, file_content = part.split(b'\r\n\r\n', 1)
                file_content = file_content.rstrip(b'\r\n--')

                file_line = [line for line in headers_data.split(b'\r\n') if b'filename="' in line][0]
                filename = file_line.decode().split('filename="')[1].split('"')[0]

                return file_content, filename
        return None, None

    def do_POST(self):
        """Обрабатывает POST запросы"""
        if self.path != '/upload':
            self._set_headers(404, 'text/html')
            self.wfile.write(b'404 Not Found')
            return

        content_length = int(self.headers.get('Content-Length', 0))

        if content_length > MAX_FILE_SIZE:
            self._send_error_response(400, 'Превышен размер файла')
            return

        try:
            post_data = self.rfile.read(content_length)
            file_data, filename = self._parse_multipart_data(
                self.headers.get('Content-Type'),
                post_data
            )

            if not file_data or not filename:
                self._send_error_response(400, 'Файл не найден')
                return

            is_valid, error_msg = self._validate_file(filename, content_length)
            if not is_valid:
                self._send_error_response(400, error_msg)
                return

            file_extension = os.path.splitext(filename)[1].lower()
            processed_data = self._process_image(file_data, file_extension)

            unique_filename = f'{uuid.uuid4().hex}{file_extension}'
            target_path = os.path.join(UPLOAD_DIR, unique_filename)

            with open(target_path, 'wb') as f:
                f.write(processed_data)

            # Сохраняем метаданные в БД
            save_image_metadata(unique_filename, filename, len(processed_data), file_extension[1:])

            file_url = f'/images/{unique_filename}'
            logging.info(f'Изображение сохранено: {filename} -> {unique_filename}')

            self._send_success_response(filename, unique_filename, file_url, len(processed_data))

        except Exception as e:
            logging.error(f'Ошибка загрузки: {e}')
            self._send_error_response(500, 'Ошибка обработки файла')

    def _send_error_response(self, status_code, message):
        """Отправляет ответ с ошибкой"""
        self._set_headers(status_code, 'application/json')
        response = {'status': 'error', 'message': message}
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def _send_success_response(self, original_name, filename, url, size):
        """Отправляет успешный ответ"""
        self._set_headers(200, 'application/json')
        response = {
            'status': 'success',
            'message': 'Файл успешно загружен',
            'filename': filename,
            'original_name': original_name,
            'url': url,
            'size': size
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))


def run_server(server_class=http.server.HTTPServer, handler_class=ImageHostingHandler, port=8000):
    """Запускает HTTP сервер"""
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    logging.info(f"Сервер запущен на порту {port}")
    print(f"Сервер запущен на http://localhost:{port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        logging.info("Сервер остановлен")


def initialize_app():
    """Инициализация приложения: проверяет БД"""
    logging.info("Инициализация приложения...")

    # 1. Тестируем подключение к БД
    if test_connection():
        logging.info("Подключение к базе данных успешно")

        # 2. Проверяем, что таблица создана
        if check_table_exists():
            logging.info("Таблица 'images' существует")
        else:
            logging.error("Таблица 'images' не существует")
            return False

    else:
        logging.info("Не удалось подключиться к базе данных. Проверьте настройки Docker Compose")

    return True


if __name__ == '__main__':
    setup_directories()
    setup_logging(LOG_DIR)
    if initialize_app():
        run_server()
    else:
        logging.error("Не удалось инициализировать приложение")
