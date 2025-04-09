document.addEventListener("DOMContentLoaded", () => {
  console.log("floating_log.js loaded");

  const style = document.createElement("style");
  style.textContent = `
#logWindow {
  display: flex;
  flex-direction: column;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 300px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: 4px solid rgba(255, 255, 255, 0.5); /* ボーダーを太くして掴みやすくする */
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box; /* ボーダーを含めたサイズ計算 */
  backdrop-filter: blur(5px);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-family: monospace;
  z-index: 9999;
  min-width: 200px; /* 最小幅を設定 */
  min-height: 100px; /* 最小高さを設定 */
}

#logContent {
  flex: 1; /* 高さを使い切る */
  overflow-y: auto;
  overflow-x: hidden;
}

#logWindow.resizing {
  cursor: nwse-resize; /* リサイズ中のカーソルを変更 */
}

#logWindow .resize-handle {
  position: absolute;
  width: 20px; /* 掴みやすくするためサイズを拡大 */
  height: 20px;
  background: transparent; /* 背景を透明にする */
  z-index: 10000;
  pointer-events: auto; /* クリックを受け取れるようにする */
}

#logWindow .resize-handle.top-left {
  top: -10px; /* サイズ拡大に合わせて調整 */
  left: -10px;
  cursor: nwse-resize;
}

#logWindow .resize-handle.top-right {
  top: -10px;
  right: -10px; /* スクロールバーの外側に配置 */
  cursor: nesw-resize;
}

#logWindow .resize-handle.bottom-left {
  bottom: -10px;
  left: -10px;
  cursor: nesw-resize;
}

#logWindow .resize-handle.bottom-right {
  bottom: -10px;
  right: -10px; /* スクロールバーの外側に配置 */
  cursor: nwse-resize;
}

#logWindow .log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  background: rgba(64, 128, 64, 0.4);
  margin-bottom: 5px;
  cursor: move;
  user-select: none;
  padding: 2px 4px 2px 10px; /* 角のリサイズ範囲と重ならないように調整 */
}
#logWindow .log-header button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  margin-left: 5px;
}
.log-entry { white-space: pre-wrap; margin: 2px 0; }
.log-info { color: #ccc; }
.log-debug { color: #888; }
.log-warning { color: #f0ad4e; }
.log-error { color: #ff4c4c; font-weight: bold; }
  `;
  document.head.appendChild(style);

  const logWindow = document.createElement("div");
  logWindow.id = "logWindow";
  logWindow.innerHTML = `
    <div class="log-header">
      <span>Log</span>
      <div>
        <button id="closeBtn" onclick="hideLog()">✖</button>
      </div>
    </div>
    <div id="logContent"></div>
    <div class="resize-handle top-left"></div>
    <div class="resize-handle top-right"></div>
    <div class="resize-handle bottom-left"></div>
    <div class="resize-handle bottom-right"></div>
  `;
  document.body.appendChild(logWindow);

  const logContent = document.getElementById("logContent");

  function renderLogLine(line) {
    const div = document.createElement("div");
    div.className = "log-entry";

    if (line.includes("[ERROR]")) div.classList.add("log-error");
    else if (line.includes("[WARNING]")) div.classList.add("log-warning");
    else if (line.includes("[DEBUG]")) div.classList.add("log-debug");
    else div.classList.add("log-info");

    div.textContent = line;
    logContent.appendChild(div);

    // ログ末端にスクロール（非同期で安定させる）
    requestAnimationFrame(() => {
      logContent.scrollTop = logContent.scrollHeight;
    });
  }

  const sse = new EventSource("/logstream");
  sse.onmessage = (e) => {
    console.log("[SSE受信]", e.data);
    const lines = e.data.split("\n");
    lines.forEach(line => {
      if (line.trim()) renderLogLine(line);
    });
  };

  let isResizing = false;
  let isDragging = false;
  let resizeDirection = null;
  let startX, startY, startWidth, startHeight, startLeft, startTop;

  // オーバーレイ要素を作成
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "transparent";
  overlay.style.zIndex = "9998"; // logWindow より下に配置
  overlay.style.display = "none"; // 初期状態では非表示
  document.body.appendChild(overlay);

  // マウスダウンでリサイズまたはドラッグを開始
  logWindow.addEventListener("mousedown", (e) => {
    const target = e.target;

    // リサイズハンドルをクリックした場合
    if (target.classList.contains("resize-handle")) {
      isResizing = true;
      const rect = logWindow.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;

      // リサイズ方向を設定
      if (target.classList.contains("top-left")) resizeDirection = "top-left";
      else if (target.classList.contains("top-right")) resizeDirection = "top-right";
      else if (target.classList.contains("bottom-left")) resizeDirection = "bottom-left";
      else if (target.classList.contains("bottom-right")) resizeDirection = "bottom-right";

      logWindow.classList.add("resizing");
      overlay.style.display = "block"; // オーバーレイを表示
      e.stopPropagation();
      e.preventDefault();
      return; // リサイズ処理を優先
    }

    // ドラッグ処理を開始
    const header = e.target.closest(".log-header");
    if (header) {
      isDragging = true;
      startX = e.clientX - logWindow.offsetLeft;
      startY = e.clientY - logWindow.offsetTop;
      overlay.style.display = "block"; // オーバーレイを表示
      e.stopPropagation();
      e.preventDefault();
    }
  });

  // マウスムーブでリサイズまたはドラッグを実行
  document.addEventListener("mousemove", (e) => {
    if (isResizing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      switch (resizeDirection) {
        case "top-left":
          logWindow.style.width = `${Math.max(200, startWidth - dx)}px`;
          logWindow.style.height = `${Math.max(100, startHeight - dy)}px`;
          logWindow.style.left = `${startLeft + dx}px`;
          logWindow.style.top = `${startTop + dy}px`;
          break;
        case "top-right":
          logWindow.style.width = `${Math.max(200, startWidth + dx)}px`;
          logWindow.style.height = `${Math.max(100, startHeight - dy)}px`;
          logWindow.style.top = `${startTop + dy}px`;
          break;
        case "bottom-left":
          logWindow.style.width = `${Math.max(200, startWidth - dx)}px`;
          logWindow.style.height = `${Math.max(100, startHeight + dy)}px`;
          logWindow.style.left = `${startLeft + dx}px`;
          break;
        case "bottom-right":
          logWindow.style.width = `${Math.max(200, startWidth + dx)}px`;
          logWindow.style.height = `${Math.max(100, startHeight + dy)}px`;
          break;
      }
      e.preventDefault();
    }

    if (isDragging) {
      logWindow.style.left = `${e.clientX - startX}px`;
      logWindow.style.top = `${e.clientY - startY}px`;
      logWindow.style.bottom = "auto"; // bottom固定を解除
      logWindow.style.right = "auto";  // right固定を解除
      e.preventDefault();
    }
  });

  // マウスアップでリサイズまたはドラッグを終了
  document.addEventListener("mouseup", () => {
    if (isResizing || isDragging) {
      isResizing = false;
      isDragging = false;
      resizeDirection = null;
      logWindow.classList.remove("resizing");
      overlay.style.display = "none"; // オーバーレイを非表示
      logWindow.style.backgroundColor = ""; // 背景色をリセット
    }
  });
});

function showLog() {
  const logWindow = document.getElementById("logWindow");
  logWindow.style.display = "flex";
}

function hideLog() {
  const logWindow = document.getElementById("logWindow");
  logWindow.style.display = "none";
}

