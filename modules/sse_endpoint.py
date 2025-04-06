import time
from flask import Response, stream_with_context
from modules.stream_logger import log_queue
# from stream_logger import log_queue as q2
import queue

print("q1 id:", id(log_queue))
# print("q2 id:", id(q2))
# print("同じキューか？", q1 is q2)

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


