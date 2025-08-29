import http.server
import socketserver
import logging
from logging.handlers import RotatingFileHandler
import json
import os
from urllib.parse import urlparse, parse_qs
import uuid
import time
from datetime import datetime

# Конфигурация
STATIC_FILES_DIR = 'static'
UPLOAD_DIR = 'images'
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']
LOG_DIR = 'logs'

# Создание директорий если их нет
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

if not os.path.exists(STATIC_FILES_DIR):
    os.makedirs(STATIC_FILES_DIR)

# Настройка логирования с ротацией
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        RotatingFileHandler(
            os.path.join(LOG_DIR, 'app.log'),
            maxBytes=1024*1024,  # 1 MB
            backupCount=5
        ),
        logging.StreamHandler()  # Вывод в консоль
    ]
)

# ===========================================
#
# ===========================================


class ImageHostingHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type='text/html'):
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _get_content_type(self, file_path):
        extension = os.path.splitext(file_path)[1].lower()
        content_types = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon'
        }
        return content_types.get(extension, 'application/octet-stream')

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        request_path = parsed_path.path

        # Главная страница
        if request_path == '/':
            file_path = os.path.join(STATIC_FILES_DIR, 'index.html')
        # Статические файлы
        elif request_path.startswith('/static/'):
            file_path = request_path[1:]  # Убираем первый слеш
        # Изображения
        elif request_path.startswith('/images/'):
            filename = request_path.split('/')[-1]
            file_path = os.path.join(UPLOAD_DIR, filename)
        else:
            file_path = os.path.join(STATIC_FILES_DIR, request_path.lstrip('/'))

        # Проверяем существование файла
        if os.path.exists(file_path) and os.path.isfile(file_path):
            try:
                content_type = self._get_content_type(file_path)
                with open(file_path, 'rb') as f:
                    content = f.read()

                self._set_headers(200, content_type)
                self.wfile.write(content)

                if request_path.startswith('/images/'):
                    logging.info(f"Действие: Отдано изображение: {request_path}")
                else:
                    logging.info(f"Действие: Отдан статический файл: {request_path}")

            except Exception as e:
                logging.error(f"Ошибка при отдаче файла {file_path}: {e}")
                self._set_headers(500, 'text/plain')
                self.wfile.write(b"500 Internal Server Error")
        else:
            logging.warning(f"Действие: Файл не найден: {request_path}")
            self._set_headers(404, 'text/plain')
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed_path = urlparse(self.path)

        if parsed_path.path == '/upload':
            content_length = int(self.headers.get('Content-Length', 0))

            # Проверка размера файла
            if content_length > MAX_FILE_SIZE:
                logging.warning(
                    f"Действие: Ошибка загрузки - файл превышает максимальный размер ({content_length} bytes)")
                self._set_headers(400, 'application/json')
                response = {
                    "status": "error",
                    "message": f"Файл превышает максимальный размер {MAX_FILE_SIZE / (1024 * 1024):.0f}MB."
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

            # Чтение данных
            try:
                post_data = self.rfile.read(content_length)

                # Парсим multipart/form-data (упрощенная версия)
                # В реальном проекте лучше использовать библиотеку для парсинга multipart
                boundary = self.headers.get('Content-Type').split('boundary=')[-1]
                parts = post_data.split(b'--' + boundary.encode())

                file_data = None
                filename = None

                for part in parts:
                    if b'filename="' in part:
                        headers_data, file_content = part.split(b'\r\n\r\n', 1)
                        file_content = file_content.rstrip(b'\r\n--')

                        # Извлекаем имя файла
                        filename_line = [line for line in headers_data.split(b'\r\n') if b'filename="' in line][0]
                        filename = filename_line.decode().split('filename="')[1].split('"')[0]

                        file_data = file_content
                        break

                if not file_data or not filename:
                    logging.warning("Действие: Ошибка загрузки - файл не найден в запросе")
                    self._set_headers(400, 'application/json')
                    response = {"status": "error", "message": "Файл не найден в запросе"}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    return

                # Проверка расширения файла
                file_extension = os.path.splitext(filename)[1].lower()
                if file_extension not in ALLOWED_EXTENSIONS:
                    logging.warning(f"Действие: Ошибка загрузки - неподдерживаемый формат файла ({filename})")
                    self._set_headers(400, 'application/json')
                    response = {
                        "status": "error",
                        "message": f"Неподдерживаемый формат файла. Допустимы: {', '.join(ALLOWED_EXTENSIONS)}"
                    }
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    return

                # Генерация уникального имени файла
                unique_filename = f"{uuid.uuid4().hex}{file_extension}"
                target_path = os.path.join(UPLOAD_DIR, unique_filename)

                # Сохранение файла
                with open(target_path, 'wb') as f:
                    f.write(file_data)

                file_url = f"/images/{unique_filename}"
                logging.info(
                    f"Действие: Изображение '{filename}' (сохранено как '{unique_filename}') успешно загружено. Ссылка: {file_url}")

                self._set_headers(200, 'application/json')
                response = {
                    "status": "success",
                    "message": "Файл успешно загружен",
                    "filename": unique_filename,
                    "original_name": filename,
                    "url": file_url,
                    "size": len(file_data)
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                logging.error(f"Ошибка при обработке загрузки: {e}")
                self._set_headers(500, 'application/json')
                response = {"status": "error", "message": "Произошла ошибка при обработке файла."}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self._set_headers(404, 'text/plain')
            self.wfile.write(b"404 Not Found")


def run_server(server_class=http.server.HTTPServer, handler_class=ImageHostingHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    logging.info(f"Сервер запущен на порту {port}")
    print(f"Сервер запущен на http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    logging.info("Сервер остановлен.")


if __name__ == '__main__':
    run_server()
