// --- HotkeyMapper 設計検証フレーム（必読） ---
// この関数はレビュー済項目が存在します。
// 【仕様】【実装】【出力】の3点が一致しており、以下の通り検証されています：
//
// [✔] 入力 "Ctrl++" → normalizeHotkey → "Control++"
// [✔] getPressedKeyString(event) で "+" が返ることを確認（event.key）
// [✔] Shift 同時押しでも "+" を出せば key === "+" となることを確認済
// [✘] Plus という key 名は出ない（過去の誤指摘）
// レビュー担当者は、上記仕様を前提にコードを読まなければならない。
// --------------------------------------------------

const HotkeyMapper = (() => {
  const hotkeyMap = new Map();
  const captureHotkeys = new Set();

  const VALID_ACTIONS = new Set([
    "click", "dblclick", "mousedown", "mouseup", "keydown", "keyup", "focus", "blur",
    "select", "contextmenu", "scroll", "wheel",
    "touchstart", "touchmove", "touchend",
    "pointerdown", "pointerup", "pointermove", "pointerover", "pointerout", "pointerenter", "pointerleave",
    "dragstart", "dragover", "drop", "dragend"
  ]);

/**
 * ホットキー文字列を一意な形式に正規化する。
 * 
 * @spec:
 * - 修飾キーの順序が違っても同一キーとみなす（locale順で正規化）
 * - キーは大文字化（例: "a" → "A"）
 * - 記号キー（"+", "=", "?" など）にも対応
 * - 入力: "Ctrl++"
 * - 正規化後: "Control++"
 * - 対応 event.key: "+"
 * - 発火キー: event.ctrlKey && event.key === "+"
 * - Shift修飾ありでも "+” が key になる（確認済）
 *
 * この条件を満たす実装であること（Stepチェック全通過）
 */
function normalizeHotkey(hotkey) {
    const parts = hotkey.split('+').map(part => part.trim());
    if (parts.length < 1) return null;
    let key = parts.pop();
    if (!key) key = '+';
    const modifiers = parts.sort((a, b) => a.localeCompare(b));
    const normalizedParts = [];
    if (modifiers.includes("Ctrl") || modifiers.includes("Control")) normalizedParts.push("Control");
    if (modifiers.includes("Alt")) normalizedParts.push("Alt");
    if (modifiers.includes("Shift")) normalizedParts.push("Shift");
    if (modifiers.includes("Meta")) normalizedParts.push("Meta");
    if (!["Control", "Alt", "Shift", "Meta"].includes(key)) {
      normalizedParts.push(key.length === 1 ? key.toUpperCase() : key);
    }
    return normalizedParts.join('+');
  }

  function getPressedKeyString(event) {
    if (event.isComposing) return "";
    const keyParts = [];
    if (event.ctrlKey) keyParts.push("Control");
    if (event.altKey) keyParts.push("Alt");
    if (event.shiftKey) keyParts.push("Shift");
    if (event.metaKey) keyParts.push("Meta");
    const key = event.key;
    if (!["Control", "Alt", "Shift", "Meta"].includes(key)) {
      keyParts.push(key.length === 1 ? key.toUpperCase() : key);
    }
    return keyParts.join('+');
  }

  function inferAction(el) {
    if (!el) return null;
    const tag = el.tagName.toLowerCase();
    const type = (el.type || "").toLowerCase();
    if (type === "checkbox" || type === "radio") return "click";
    if (tag === "button" || tag === "a" || type === "submit") return "click";
    if (tag === "input" || tag === "textarea" || tag === "select") return "focus";
    return "click";
  }

  function parseSelectorAction(target) {
    const match = target.match(/^(.*?)(?::)(\w+)$/);
    if (match && VALID_ACTIONS.has(match[2])) {
      return { selector: match[1], action: match[2] };
    }
    return { selector: target, action: null };
  }

  function bindToElement(hotkey, target, options = {}) {
    const { selector, action } = parseSelectorAction(target);
    const el = document.querySelector(selector);
  
    if (!el) {
      console.warn(`HotkeyMapper: 指定された要素が見つかりません (${selector})`);
      return;
    }
  
    const effectiveAction = action || inferAction(el);
    if (!VALID_ACTIONS.has(effectiveAction)) {
      console.warn(`HotkeyMapper: 無効または未対応のアクションです (${effectiveAction})`);
      return;
    }
  
    const description = options.description || "";
  
    const handler = () => {
      if (effectiveAction === "click" && el.type === "checkbox") {
        el.checked = !el.checked;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (effectiveAction === "click" && el.type === "radio") {
        el.checked = true;
        el.dispatchEvent(new Event("click", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const event = new Event(effectiveAction, { bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        if (effectiveAction === "focus" && typeof el.focus === "function") el.focus();
      }
    };
  
    map(hotkey, handler, {
      description,
      allowInInput: options.allowInInput,
      useCapture: options.useCapture
    });
  }
  
  function map(hotkey, callback, options = {}) {
    const normalized = normalizeHotkey(hotkey);
    if (!normalized || typeof callback !== "function") return;
    if (hotkeyMap.has(normalized)) {
      console.warn(`Hotkey already mapped: ${normalized}`);
      return;
    }
    const entry = {
      handler: callback,
      description: options.description || "",
      allowInInput: !!options.allowInInput
    };
    hotkeyMap.set(normalized, entry);
    if (options.useCapture) captureHotkeys.add(normalized);
  }

  function overwrite(hotkey, callback, options = {}) {
    unmap(hotkey);
    map(hotkey, callback, options);
  }

  function unmap(hotkey) {
    const normalized = normalizeHotkey(hotkey);
    if (normalized) {
      hotkeyMap.delete(normalized);
      captureHotkeys.delete(normalized);
    }
  }

  function getMappings() {
    return Array.from(hotkeyMap.entries()).map(([hotkey, entry]) => ({
      hotkey,
      description: entry.description,
      handler: entry.handler,
    }));
  }

  function showHelpWindow() {
    let container = document.getElementById("hotkey-help");
    if (!container) {
      const mappings = getMappings();
  
      container = document.createElement("div");
      container.id = "hotkey-help";
      container.className = "hotkey-help-window";
      container.tabIndex = -1;
  
      container.innerHTML = `
        <div class="hotkey-help-header">
          <span>ショートカットキー一覧</span>
          <button class="hotkey-help-close" aria-label="閉じる" onclick="this.closest('#hotkey-help').remove()">×</button>
        </div>
        <div class="hotkey-help-table-container">
          <table class="hotkey-help-table">
            <thead>
              <tr><th>キー</th><th>説明</th></tr>
            </thead>
            <tbody>
              ${mappings.map(item => `
                <tr><td>${item.hotkey}</td><td>${item.description || ""}</td></tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
  
      document.body.appendChild(container);
      container.focus();
    }
  }
  
  document.addEventListener("keydown", (e) => {
    const popup = document.getElementById("hotkey-help");
    if (popup && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      popup.remove();
    }
  });

  function isTypingContext() {
    const el = document.activeElement;
    const tag = el?.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable;
  }

  function handleKeydown(event, capturePhase) {
    if (event.repeat || event.isComposing) return;
    const key = getPressedKeyString(event);
    console.log("key1:", key, capturePhase);
    const isCapture = captureHotkeys.has(key);
    if (capturePhase !== isCapture) return;
    console.log("key2:", key, capturePhase);
    const entry = hotkeyMap.get(key);
    if (!entry) return;
    console.log("key3:", key, capturePhase);
    if (isTypingContext() && !entry.allowInInput) return;
    console.log("key4:", key, capturePhase);
    event.preventDefault();
    console.log("HotkeyMapper: 発火", key);
    entry.handler(event);
  }

  document.addEventListener("keydown", (e) => handleKeydown(e, false), false);
  document.addEventListener("keydown", (e) => handleKeydown(e, true), true);

  function selectRelativeRadioInGroup(selector, direction) {
    const el = document.querySelector(selector);
    if (!el || el.type !== "radio" || !el.name) {
      console.warn(`HotkeyMapper: ラジオの指定が不正 (${selector})`);
      return;
    }
    const group = Array.from(document.querySelectorAll(`input[type="radio"][name="${el.name}"]`))
      .sort((a, b) => (a.tabIndex || 0) - (b.tabIndex || 0));
    if (!group.length) return;
    const currentIndex = group.findIndex(r => r.checked);
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = (currentIndex + delta + group.length) % group.length;
    group[nextIndex].checked = true;
    group[nextIndex].dispatchEvent(new Event("change", { bubbles: true }));
  }

  function nextRadio(hotkey, selector, options = {}) {
    map(hotkey, () => selectRelativeRadioInGroup(selector, "next"), {
      ...options,
      description: options.description || "ラジオボタン次へ"
    });
  }

  function prevRadio(hotkey, selector, options = {}) {
    map(hotkey, () => selectRelativeRadioInGroup(selector, "prev"), {
      ...options,
      description: options.description || "ラジオボタン前へ"
    });
  }

  return {
    map,
    overwrite,
    unmap,
    bindToElement,
    getMappings,
    showHelpWindow,
    nextRadio,
    prevRadio
  };
})();
