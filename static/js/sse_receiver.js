// sse_receiver.js

export function startSSEReceiver({ onLog, onProgress, onMessage, onRaw }) {
    const sse = new EventSource("/logstream");
  
    sse.onmessage = (e) => {
      const rawData = e.data;
  
      // オプション: 受信した生データをそのまま処理
      if (onRaw) onRaw(rawData);
  
      const lines = rawData.split("\n");
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
  
        // ログ/進捗の振り分け（[PROGRESS] タグによる識別）
        if (line.startsWith("[PROGRESS]")) {
          const msg = line.replace("[PROGRESS]", "").trim();
          if (onProgress) onProgress(msg);
        } else if (line.startsWith("[LOG]")) {
          const msg = line.replace("[LOG]", "").trim();
          if (onLog) onLog(msg);
        } else {
          // 汎用メッセージハンドラ（未指定形式など）
          if (onMessage) onMessage(line);
        }
      }
    };
  
    sse.onerror = (e) => {
      console.warn("SSE 接続エラー:", e);
    };
  }
  