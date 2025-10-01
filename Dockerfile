FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN useradd -m -u 1000 appuser
USER appuser

WORKDIR /app
RUN mkdir -p static images logs

COPY --chown=appuser:appuser app.py .
COPY --chown=appuser:appuser database.py .
COPY --chown=appuser:appuser logger_setup.py .
COPY --chown=appuser:appuser requirements.txt .
COPY --chown=appuser:appuser static/ static/

EXPOSE 8000

CMD ["python", "app.py"]