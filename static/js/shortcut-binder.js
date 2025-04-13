const ShortcutBinder = ((config = { absorbNumpad: true }) => {
    const shortcutMap = new Map();
    let absorbNumpad = config.absorbNumpad !== false;
    const captureShortcuts = new Set();
  
    const codeToSymbolMap = {
        Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
        Backslash: '\\', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/',
        Space: 'Space', Enter: 'Enter', Escape: 'Escape', Tab: 'Tab', Delete: 'Delete',
        ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'
      };

    function normalizeShortcut(shortcut) {
      const parts = shortcut.toLowerCase().split('+').map(part => part.trim());
      if (parts.length < 1) return null;
      const key = parts.pop();
      const modifiers = parts.sort();
      let normalized = "";
      if (modifiers.includes("ctrl")) normalized += "Control+";
      if (modifiers.includes("alt")) normalized += "Alt+";
      if (modifiers.includes("shift")) normalized += "Shift+";
      if (modifiers.includes("meta")) normalized += "Meta+";
  
      if (key.length === 1 && key.match(/[a-z0-9]/)) {
        normalized += "Key" + key.toUpperCase();
      } else if (Object.values(codeToSymbolMap).includes(key)) {
        const foundCode = Object.entries(codeToSymbolMap).find(([, v]) => v === key)?.[0];
        if (foundCode) normalized += foundCode;
        else normalized += capitalize(key);
      } else {
        normalized += capitalize(key);
      }
  
      return normalized;
    }
  
    function getPressedKeyString(event) {
        if (event.isComposing) return "";
        let keyString = "";
        if (event.ctrlKey) keyString += "Control+";
        if (event.altKey) keyString += "Alt+";
        if (event.shiftKey) keyString += "Shift+";
        if (event.metaKey) keyString += "Meta+";
      
        let code = event.code;
      
        // 吸収モードでNumPad置換
        if (absorbNumpad) {
          const codeAliasMap = {
            NumpadEnter: "Enter",
            Numpad0: "Digit0",
            Numpad1: "Digit1",
            Numpad2: "Digit2",
            Numpad3: "Digit3",
            Numpad4: "Digit4",
            Numpad5: "Digit5",
            Numpad6: "Digit6",
            Numpad7: "Digit7",
            Numpad8: "Digit8",
            Numpad9: "Digit9",
            NumpadAdd: "Equal",
            NumpadSubtract: "Minus",
            NumpadDecimal: "Period",
            NumpadDivide: "Slash",
            NumpadMultiply: "Digit8"
          };
          if (codeAliasMap[code]) {
            code = codeAliasMap[code];
          }
        }
      
        return keyString + code;
      }
        
      function getDisplayShortcutName(shortcutCode) {
        const parts = shortcutCode.split('+');
        const displayParts = parts.map(part => {
          if (["Control", "Alt", "Shift", "Meta"].includes(part)) return part;
          return codeToSymbolMap[part] || codeToReadableKey(part);
        });
        return displayParts.join('+');
      }
      
    function codeToReadableKey(code) {
        if (code.startsWith("Key")) return code.slice(3);
        if (code.startsWith("Digit")) return code.slice(5);
        if (code.startsWith("Arrow")) return code.slice(5);
        return code;
    }  

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
  
    function inferAction(el) {
      if (!el) return null;
      const tag = el.tagName.toLowerCase();
      const type = (el.type || "").toLowerCase();
      if (type === "checkbox" || type === "radio") return "toggle";
      if (tag === "button" || tag === "a" || type === "submit") return "click";
      if (tag === "input" || tag === "textarea" || tag === "select") return "focus";
      return "click";
    }
  
    /** @function ShortcutBinder.bindShortcut */
    function bindShortcut({
      shortcut,
      selector,
      description = "",
      action = null,
      useCapture = false,
      callback = null,
      allowInInput = false
    }) {
      const normalized = normalizeShortcut(shortcut);
      if (!normalized) return;
      if (shortcutMap.has(normalized)) {
        console.warn(`Shortcut already registered: ${normalized}`);
        return;
      }
  
      const el = document.querySelector(selector);
      const effectiveAction = (action === null || action === '') ? (callback ? "custom" : inferAction(el)) : action;
  
      const handler = (event) => {
        if (!el) return;
        switch (effectiveAction) {
          case "click":
            el.click();
            break;
          case "toggle":
            if ("checked" in el) {
              el.checked = !el.checked;
              el.dispatchEvent(new Event("change"));
            }
            break;
          case "focus":
            el.focus();
            break;
          case "custom":
            if (typeof callback === "function") {
              callback(event);
            }
            break;
          default:
            console.warn(`Unknown or missing action: ${effectiveAction}`);
        }
      };
  
      shortcutMap.set(normalized, { handler, description, allowInInput });
      if (useCapture === true) captureShortcuts.add(normalized);
    }
  
    /** @function ShortcutBinder.bindShortcutToElement */
    function bindShortcutToElement(shortcut, selector, description = "", action = null, allowInInput = false, useCapture = false, callback = null) {
      bindShortcut({ shortcut, selector, description, action, allowInInput, useCapture, callback });
    }
 
    function unbindShortcut(shortcut) {
      const normalized = normalizeShortcut(shortcut);
      if (normalized) {
        shortcutMap.delete(normalized);
        captureShortcuts.delete(normalized);
      }
    }
  
    function getShortcutList() {
      return Array.from(shortcutMap.entries()).map(([shortcut, entry]) => ({
        shortcut: getDisplayShortcutName(shortcut),
        description: entry.description,
        handler: entry.handler,
      }));
    }
  
    function showHelpWindow() {
      const list = getShortcutList();
      let container = document.getElementById("shortcut-help");
      if (!container) {
        container = document.createElement("div");
        container.id = "shortcut-help";
        container.className = "shortcut-help-window";
        document.body.appendChild(container);
      }
      container.innerHTML = `
        <div class="shortcut-help-header">
          <span>ショートカット一覧</span>
          <button class="shortcut-help-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <table class="shortcut-help-table">
          <thead><tr><th>キー</th><th>説明</th></tr></thead>
          <tbody>
            ${list.map(item => `<tr><td>${item.shortcut}</td><td>${item.description || ""}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    }
  
    function isTypingContext() {
      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable;
    }
  
    function handleKeydown(event, capturePhase) {
      if (event.repeat || event.isComposing) return;
      const key = getPressedKeyString(event); // 入力されたキー
      const normalizedKey = key.toLowerCase(); // 小文字化して比較用に変換
  
      // 大文字小文字を区別せずにcaptureShortcutsを確認
      const isCapture = Array.from(captureShortcuts).some(captureKey => captureKey.toLowerCase() === normalizedKey);
      if (capturePhase !== isCapture) return;
  
      // 大文字小文字を区別せずにshortcutMapを検索
      const entry = Array.from(shortcutMap.entries()).find(([registeredKey]) => 
          registeredKey.toLowerCase() === normalizedKey
      )?.[1];
  
      console.log(key, entry, shortcutMap);
      if (!entry) return;
      if (isTypingContext() && !entry.allowInInput) return;
      event.preventDefault();
      entry.handler(event);
  }
  
    document.addEventListener("keydown", (e) => handleKeydown(e, false), false);
    document.addEventListener("keydown", (e) => handleKeydown(e, true), true);
  
    function setAbsorbNumpad(value) {
      absorbNumpad = !!value;
    }
  
    return {
      bindShortcut,
      bindShortcutToElement,
      unbindShortcut,
      getShortcutList,
      showHelpWindow,
      setAbsorbNumpad
    };
  })();
  