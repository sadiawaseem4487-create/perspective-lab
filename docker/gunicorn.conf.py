import multiprocessing
import os

bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8000')}"
workers = int(os.getenv("WORKERS", "2"))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "90")) + 30
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
preload_app = True
max_requests = 1000
max_requests_jitter = 100

if workers <= 0:
    workers = max(2, multiprocessing.cpu_count())
