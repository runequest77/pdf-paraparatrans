document.addEventListener("DOMContentLoaded", () => {
  console.log("floating_log.js loaded");

  const style = document.createElement("style");
  style.textContent = `
#logWindow {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 300px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 8px;
  padding: 10px;
  overflow-y: auto;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-family: monospace;
  z-index: 9999;
}
#logWindow.minimized {
  height: 30px;
  overflow: hidden;
}
#logWindow .log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  margin-bottom: 5px;
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
      <span>📜 ログ</span>
      <div>
        <button id="minimizeBtn">🔽</button>
        <button id="closeBtn">✖</button>
      </div>
    </div>
    <div id="logContent"></div>
  `;
  document.body.appendChild(logWindow);

  document.getElementById("minimizeBtn").onclick = () => {
    logWindow.classList.toggle("minimized");
  };
  document.getElementById("closeBtn").onclick = () => {
    logWindow.style.display = "none";
  };

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
    logContent.scrollTop = logContent.scrollHeight;
  }

  const sse = new EventSource("/logstream");
  sse.onmessage = (e) => {
    console.log("[SSE受信]", e.data);
    const lines = e.data.split("\\n");
    lines.forEach(line => {
      if (line.trim()) renderLogLine(line);
    });
  };
});
