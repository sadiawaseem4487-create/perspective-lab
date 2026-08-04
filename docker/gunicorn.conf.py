import os

bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8000')}"
# Prefer one worker on small hosts (Render free). Override with WORKERS=.
workers = int(os.getenv("WORKERS", "1"))
worker_class = "uvicorn.workers.UvicornWorker"
# LLM calls can be long; keep request timeout above model timeout.
timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "120")) + 60
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
# Load app once before fork — faster first request with 1 worker after boot.
preload_app = True
max_requests = 1000
max_requests_jitter = 100

if workers <= 0:
    workers = 1
