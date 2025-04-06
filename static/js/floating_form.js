export function createFloatingForm(title = "📋 フォーム") {
    const style = document.createElement("style");
    style.textContent = `
  .floating-form {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 300px;
    background: rgba(0,0,0,0.7);
    color: white;
    resize: both;
    overflow: auto;
    border-radius: 8px;
    padding: 10px;
    backdrop-filter: blur(5px);
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    font-family: monospace;
    z-index: 9999;
  }
  .floating-form .header {
    cursor: move;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    user-select: none;
  }
    `;
    document.head.appendChild(style);
  
    const form = document.createElement("div");
    form.className = "floating-form";
  
    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <span>${title}</span>
      <button onclick="this.closest('.floating-form').remove()">✖</button>
    `;
  
    const content = document.createElement("div");
    content.className = "content";
    form.appendChild(header);
    form.appendChild(content);
    document.body.appendChild(form);
  
    // ドラッグ処理
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - form.offsetLeft;
      offsetY = e.clientY - form.offsetTop;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        form.style.left = `${e.clientX - offsetX}px`;
        form.style.top = `${e.clientY - offsetY}px`;
        form.style.bottom = "auto";
        form.style.right = "auto";
      }
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  
    return {
      root: form,
      addContentElement(el) {
        content.appendChild(el);
      }
    };
  }
  