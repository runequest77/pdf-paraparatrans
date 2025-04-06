import time
import queue
from flask import Response, stream_with_context
from modules.stream_logger import log_queue # importの仕方でオブジェクトのIDが変わるのに注意。気づくのに3時間かかった。

def create_log_stream_endpoint():
    def stream():
        def event_stream():
            while True:
                try:
                    msg = log_queue.get(timeout=1)
                    yield f"data: {msg}\n\n"
                except queue.Empty:
                    # 接続維持のために ping を送る（optional）
                    yield ": ping\n\n"
                    time.sleep(5)
        return Response(stream_with_context(event_stream()), mimetype='text/event-stream')
    return stream


