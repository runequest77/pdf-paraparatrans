window.autoToggle = (function () {
    const states = {};
    const callbacks = [];
  
    function getState(key) {
      return states[key];
    }
  
    function setState(key, value) {
      states[key] = value;
      console.log(`State updated: ${key} = ${value}`);
    }
  
    function getAllStates() {
      return { ...states };
    }
  
    function registerCallback(cb) {
      callbacks.push(cb);
    }
  
    function dispatchAll() {
      const autoToggles = document.querySelectorAll('.auto-toggle');
      autoToggles.forEach(container => {
        const containerId = container.id;
        const newState = getState(containerId);
        const event = new CustomEvent('auto-toggle-change', {
          bubbles: true,
          detail: { id: containerId, newState: newState }
        });
        container.dispatchEvent(event);
        console.log(`Fired auto-toggle-change event for ${containerId} with state ${newState}`);
      });
    }
  
    function parseAutoToggleData(dataAttribute) {
      const settings = {};
      if (!dataAttribute) return settings;
  
      dataAttribute.split(';').forEach(pair => {
        const parts = pair.split(':');
        if (parts.length === 2) {
          const key = parts[0].trim().toLowerCase();
          let value = parts[1].trim();
          if (key === 'appearance') value = value.toLowerCase();
          if (value.toLowerCase() === 'true') value = true;
          else if (value.toLowerCase() === 'false') value = false;
          settings[key] = value;
        }
      });
      return settings;
    }
  
    function normalizeShortcut(shortcut) {
      const parts = shortcut.toLowerCase().split('+').map(part => part.trim());
      if (parts.length < 2) return null;
      const key = parts.pop();
      const modifiers = parts.sort();
      let normalized = "";
      if (modifiers.includes('ctrl')) normalized += "Control+";
      if (modifiers.includes('alt')) normalized += "Alt+";
      if (modifiers.includes('shift')) normalized += "Shift+";
      if (modifiers.includes('meta')) normalized += "Meta+";
      if (modifiers.includes(key)) return null;
      normalized += key.startsWith('key') || key.startsWith('digit') ? key : `Key${key.toUpperCase()}`;
      return normalized;
    }
  
    function getPressedKeyString(event) {
      let keyString = "";
      if (event.ctrlKey) keyString += "Control+";
      if (event.altKey) keyString += "Alt+";
      if (event.shiftKey) keyString += "Shift+";
      if (event.metaKey) keyString += "Meta+";
      const keyCode = event.code;
      if (keyCode && !keyCode.startsWith('Control') && !keyCode.startsWith('Alt') &&
        !keyCode.startsWith('Shift') && !keyCode.startsWith('Meta')) {
        keyString += keyCode;
      }
      return keyString.endsWith('+') ? "" : keyString;
    }
  
    function setupShortcutListener(shortcutMap) {
      document.addEventListener('keydown', (event) => {
        const pressedKey = getPressedKeyString(event);
        if (shortcutMap.has(pressedKey)) {
          event.preventDefault();
          const checkbox = shortcutMap.get(pressedKey);
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
          console.log(`Shortcut ${pressedKey} triggered for ${checkbox.id}`);
        }
      });
    }
  
    function initializeToggleSwitches(options = {}) {
      const autoToggles = document.querySelectorAll('.auto-toggle');
      const shortcutMap = new Map();
      const reset = options.reset === true;
  
      if (reset) {
        localStorage.clear();
        for (let key in states) delete states[key];
        console.log('Toggle states and localStorage have been reset.');
      }
  
      autoToggles.forEach(container => {
        const containerId = container.id;
        if (!containerId) return console.warn('Auto toggle found without an ID.', container);
  
        const labelText = container.textContent.trim();
        const settings = parseAutoToggleData(container.getAttribute('data-auto-toggle'));
        const storageType = settings.storage === 'local' ? 'localStorage' : 'sessionStorage';
        const storageKey = `auto-toggle-${containerId}`;
        const shortcutKey = settings.shortcut;
        const defaultState = settings.default === true;
        const fireInitial = settings.fireinitial !== false;
        const appearance = settings.appearance === 'checkbox' ? 'checkbox' : 'toggle';
  
        container.innerHTML = '';
  
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `auto-toggle-input-${containerId}`;
        checkbox.setAttribute('aria-label', labelText);
  
        const label = document.createElement('label');
  
        if (appearance === 'toggle') {
          label.classList.add('auto-toggle', 'switch');
          label.setAttribute('role', 'switch');
          label.htmlFor = checkbox.id;
          const slider = document.createElement('span');
          slider.classList.add('slider');
          const textLabelSpan = document.createElement('span');
          textLabelSpan.classList.add('text');
          textLabelSpan.textContent = labelText;
          label.appendChild(checkbox);
          label.appendChild(slider);
          label.appendChild(textLabelSpan);
          container.appendChild(label);
        } else {
          label.htmlFor = checkbox.id;
          label.textContent = labelText;
          label.classList.add('auto-toggle-checkbox-container', 'text');
          container.classList.add('auto-toggle-checkbox-container');
          container.appendChild(checkbox);
          container.appendChild(label);
        }
  
        const storedState = window[storageType].getItem(storageKey);
        const initialState = storedState !== null ? storedState === 'true' : defaultState;
        checkbox.checked = initialState;
        if (appearance === 'toggle') label.setAttribute('aria-checked', initialState.toString());
        setState(containerId, initialState);
  
        if (storedState === null) {
          window[storageType].setItem(storageKey, initialState.toString());
          console.log(`${containerId} initial state set to ${initialState}`);
        }
  
        if (fireInitial) {
          const initialEvent = new CustomEvent('auto-toggle-change', {
            bubbles: true,
            detail: { id: containerId, newState: initialState }
          });
          container.dispatchEvent(initialEvent);
        }
  
        container.addEventListener('auto-toggle-change', (event) => {
          const { id, newState } = event.detail;
          console.log(`Toggle ${id} changed to ${newState}`);
        });
  
        checkbox.addEventListener('change', () => {
          const newState = checkbox.checked;
          window[storageType].setItem(storageKey, newState.toString());
          setState(containerId, newState);
          if (appearance === 'toggle') label.setAttribute('aria-checked', newState.toString());
          const event = new CustomEvent('auto-toggle-change', {
            bubbles: true,
            detail: { id: containerId, newState: newState }
          });
          container.dispatchEvent(event);
        });
  
        if (shortcutKey) {
          const normalizedShortcut = normalizeShortcut(shortcutKey);
          if (normalizedShortcut) {
            shortcutMap.set(normalizedShortcut, checkbox);
            console.log(`Registered shortcut: ${normalizedShortcut} for ${containerId}`);
          } else {
            console.warn(`Invalid shortcut format: ${shortcutKey} for ${containerId}`);
          }
        }
  
        console.log(`Initialized control: ${containerId}`);
      });
  
      return shortcutMap;
    }
  
    function init(options = {}) {
      const shortcutMap = initializeToggleSwitches(options);
      setupShortcutListener(shortcutMap);
      console.log("Initial toggle states cache:", getAllStates());
    }
  
    return {
      getState,
      setState,
      getAllStates,
      registerCallback,
      dispatchAll,
      init
    };
  })();
  