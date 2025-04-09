import sys
import os
import queue
import logging
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv

log_queue = queue.Queue()

class SSELogQueueHandler(logging.Handler):
    def emit(self, record):
        msg = self.format(record)
        log_queue.put(msg)

class StreamLogger:
    def __init__(self, original):
        self.original = original
        self.logger = logging.getLogger()

    def write(self, message):
        self.original.write(message)
        self.original.flush()
        if message.strip():
            self.logger.info(message.strip())

    def flush(self):
        self.original.flush()

def init_logging(log_file_name="app.log", level=logging.INFO):
    # .env の読み込み
    load_dotenv()
    log_dir = os.getenv("LOG_DIR", ".")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, log_file_name)

    # stdout/stderr リダイレクト
    sys.stdout = StreamLogger(sys.__stdout__)
    sys.stderr = StreamLogger(sys.__stderr__)

    # ログ設定
    logger = logging.getLogger()
    logger.setLevel(level)

    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')

    # ファイル出力（ローテーション付き）
    file_handler = TimedRotatingFileHandler(log_path, when="midnight", backupCount=7, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # SSE転送
    sse_handler = SSELogQueueHandler()
    sse_handler.setFormatter(formatter)
    logger.addHandler(sse_handler)


import time

def setup_progress(total, prefix=""):
    """1秒に1回だけログ出力する progress 関数を返す"""
    logger = logging.getLogger()
    count = [0]  # クロージャーで可変にするためリスト
    last_log_time = [0]

    def progress(message=None):
        count[0] += 1
        now = time.time()
        progress_msg = f"{prefix}{count[0]} / {total}"
        if message:
            progress_msg += f" - {message}"
        
        # 1秒ごとにログにも出力
        if now - last_log_time[0] >= 1 or count[0] >= total:
            # コンソールに1行で進捗を表示
            sys.stdout.write(f"\r{progress_msg}")
            sys.stdout.flush()
            last_log_time[0] = now

    return progress