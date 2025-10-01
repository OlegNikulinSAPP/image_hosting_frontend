import logging
from logging.handlers import RotatingFileHandler
import os


def setup_logging(log_dir='logs'):
    """
    Настраивает систему логирования с ротацией файлов
    """
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=1024 * 1024,  # 1 MB
        backupCount=5
    )

    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        handlers=[handler, logging.StreamHandler()]
    )

    logging.info("Логгер успешно настроен")
