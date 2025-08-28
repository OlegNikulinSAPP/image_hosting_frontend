# Dockerfile
FROM python:3.12-slim as builder

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Создание виртуального окружения
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Копирование и установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Финальный образ
FROM python:3.12-slim

# Установка системных зависимостей для runtime
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Копирование виртуального окружения
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Создание пользователя для безопасности
RUN useradd -m -u 1000 appuser
USER appuser

# Создание рабочих директорий
WORKDIR /app
RUN mkdir -p static images logs

# Копирование файлов приложения
COPY --chown=appuser:appuser app.py .
COPY --chown=appuser:appuser requirements.txt .
COPY --chown=appuser:appuser static/ static/

# Открытие порта
EXPOSE 8000

# Запуск приложения
CMD ["python", "app.py"]