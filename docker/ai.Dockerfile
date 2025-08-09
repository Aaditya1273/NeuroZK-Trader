# AI service container (predict/train CLI baseline)
FROM python:3.11-slim
WORKDIR /app

# System deps for scientific stack
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only AI first for better caching
COPY ai/requirements.txt ai/requirements.txt
RUN pip install --no-cache-dir -r ai/requirements.txt

# Copy project
COPY . .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Default: run a quick predict (override with CMD)
CMD ["python", "-m", "ai.core", "predict", "--inst", "BTC-USDT", "--bar", "1m", "--horizon", "5"]
