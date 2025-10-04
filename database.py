import psycopg2
import os
import logging


# Конфигурация БД
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'db'),
    'port': os.getenv('DB_PORT', '5432'),
    'dbname': os.getenv('DB_NAME', 'images_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}


def get_db_connection():
    """Создает подключение к базе данных"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        # Если подключение не удалось, записываем ошибку в лог
        logging.error(f"Ошибка подключения к базе данных {e}")
        return None


def test_connection():
    """Проверяет подключение к базе данных"""
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            # Информационное сообщение об успехе
            logging.info(f"Подключение к PostgreSQL успешно. Версия: {version[0]}")
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            logging.error(f"Ошибка тестирования подключения {e}")
    return False


def check_table_exists():
    """Проверяет существование таблицы"""
    conn = None
    cursor = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'images'
            )
        """)

        exists = cursor.fetchone()[0]

        if exists:
            return True
        else:
            return False

    except psycopg2.Error as e:
        logging.error(f"Ошибка при проверке таблицы: {e}")
        return False
    finally:
        # Безопасное закрытие ресурсов
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()
