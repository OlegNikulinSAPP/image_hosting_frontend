import os
import subprocess
import datetime
import logging

def create_backup():
    """Создает резервную копию базы данных"""
    try:
        # Параметры подключения к БД
        db_config = {
            'host': os.getenv('DB_HOST', 'db'),
            'port': os.getenv('DB_PORT', '5432'),
            'dbname': os.getenv('DB_NAME', 'images_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'password')
        }

        # Создаем директорию для бэкапов если не существует
        backup_dir = 'backups'
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)

        # Формируем имя файла с датой и временем
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_filename = f'backup_{timestamp}.sql'
        backup_path = os.path.join(backup_dir, backup_filename)

        # Команда для создания бэкапа
        cmd = [
            'pg_dump',
            '-h', db_config['host'],
            '-p', db_config['port'],
            '-U', db_config['user'],
            '-d', db_config['dbname'],
            '-f', backup_path
        ]

        # Устанавливаем переменную окружения для пароля
        env = os.environ.copy()
        env['PGPASSWORD'] = db_config['password']

        # Выполняем команду
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode == 0:
            logging.info(f'Резервная копия создана: {backup_path}')
            return True, backup_path
        else:
            logging.error(f'Ошибка создания резервной копии: {result.stderr}')
            return False, result.stderr

    except Exception as e:
        logging.error(f'Исключение при создании резервной копии: {e}')
        return False, str(e)

def restore_backup(backup_path):
    """Восстанавливает базу данных из резервной копии"""
    try:
        db_config = {
            'host': os.getenv('DB_HOST', 'db'),
            'port': os.getenv('DB_PORT', '5432'),
            'dbname': os.getenv('DB_NAME', 'images_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'password')
        }

        if not os.path.exists(backup_path):
            return False, "Файл резервной копии не найден"

        # Команда для восстановления
        cmd = [
            'psql',
            '-h', db_config['host'],
            '-p', db_config['port'],
            '-U', db_config['user'],
            '-d', db_config['dbname'],
            '-f', backup_path
        ]

        env = os.environ.copy()
        env['PGPASSWORD'] = db_config['password']

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode == 0:
            logging.info(f'База данных восстановлена из: {backup_path}')
            return True, "База данных успешно восстановлена"
        else:
            logging.error(f'Ошибка восстановления: {result.stderr}')
            return False, result.stderr

    except Exception as e:
        logging.error(f'Исключение при восстановлении: {e}')
        return False, str(e)

if __name__ == '__main__':
    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s'
    )

    # Создаем бэкап при запуске скрипта
    success, result = create_backup()
    if success:
        print(f"Backup created successfully: {result}")
    else:
        print(f"Backup failed: {result}")