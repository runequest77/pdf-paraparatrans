export function startSSEReceiver({ onLog, onProgress, onMessage, onRaw }) {
  const sse = new EventSource("/logstream");

  sse.onmessage = (e) => {
    const rawData = e.data;

    if (onRaw) onRaw(rawData);

    const lines = rawData.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith("[PROGRESS]")) {
        const msg = line.replace("[PROGRESS]", "").trim();
        if (onProgress) onProgress(msg);
      } else if (line.startsWith("[LOG]")) {
        const msg = line.replace("[LOG]", "").trim();
        if (onLog) onLog(msg);
      } else {
        if (onMessage) onMessage(line);
      }
    }
  };

  sse.onerror = () => {
    // エラーを表示せず静かに再接続を試みる
    sse.close();
    setTimeout(() => {
      startSSEReceiver({ onLog, onProgress, onMessage, onRaw });
    }, 3000); // 任意の再接続間隔（ミリ秒）
  };
}
