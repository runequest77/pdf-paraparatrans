window.autoToggle = (function () {
    // プライベートな状態キャッシュ
    const states = {};

    return {
        callbacks: [],
        registerCallback: function (cb) {
            this.callbacks.push(cb);
        },
        getState: function (key) {
            return states[key];
        },
        setState: function (key, value) {
            states[key] = value;
            console.log(`State updated: ${key} = ${value}`);
        },
        getAllStates: function () {
            return { ...states }; // 状態のコピーを返す
        }
    };
})();

// グローバルな状態キャッシュオブジェクト

document.addEventListener('DOMContentLoaded', () => {
    const shortcutMap = initializeToggleSwitches();
    setupShortcutListener(shortcutMap);
    // 必要であれば、他の初期化処理で toggleStates を参照できます
    console.log("Initial toggle states cache:", window.autoToggle.getAllStates());

    // --- 他のスクリプトからの参照例 (デモ用) ---
    /*
    document.addEventListener('keypress', (event) => {
        if (toggleStates.QuickEditMode) { // キャッシュから状態を参照
            console.log("高速編集モード ON でキー入力:", event.key);
            // 高速編集モード時の処理
        }
    });
    */
});

// data-auto-toggle 属性を解析するヘルパー関数
function parseAutoToggleData(dataAttribute) {
    const settings = {};
    if (!dataAttribute) return settings;

    dataAttribute.split(';').forEach(pair => {
        const parts = pair.split(':');
        if (parts.length === 2) {
            const key = parts[0].trim().toLowerCase();
            let value = parts[1].trim();

            // appearance は小文字に統一
            if (key === 'appearance') {
                value = value.toLowerCase();
            }

            // 'true'/'false' は boolean に変換
            if (value.toLowerCase() === 'true') {
                settings[key] = true;
            } else if (value.toLowerCase() === 'false') {
                settings[key] = false;
            } else {
                settings[key] = value; // それ以外は文字列のまま
            }
        }
    });
    return settings;
}

// トグルスイッチを初期化し、ショートカットキーとチェックボックスのマッピングを返す
function initializeToggleSwitches(options = {}) {
    const autoToggles = document.querySelectorAll('.auto-toggle');
    const shortcutMap = new Map(); // ショートカットキーとチェックボックス要素をマッピング
    const reset = options.reset === true; // reset オプションの取得

    if (reset) {
        // localStorage をクリア
        localStorage.clear();
        // window.autoToggle.states をクリア
        window.autoToggle.states = {};
        console.log('Toggle states and localStorage have been reset.');
    }

    autoToggles.forEach(container => {
        const containerId = container.id;
        if (!containerId) {
            console.warn('Auto toggle found without an ID. Skipping initialization.', container);
            return;
        }

        const labelText = container.textContent.trim();
        const dataAttribute = container.getAttribute('data-auto-toggle'); // data-auto-toggle 属性を取得
        const settings = parseAutoToggleData(dataAttribute); // ヘルパー関数でパース

        // 設定から値を取得（デフォルト値も設定）
        const storageType = settings.storage === 'local' ? 'localStorage' : 'sessionStorage';
        const storageKey = `auto-toggle-${containerId}`; // storageKeyを修正
        const shortcutKey = settings.shortcut;
        const defaultState = settings.default === true;
        const fireInitial = settings.fireinitial !== false;
        const appearance = settings.appearance === 'checkbox' ? 'checkbox' : 'toggle'; // appearance を取得、デフォルトは 'toggle'

        // コンテナの内容をクリアし、トグルスイッチとラベルを生成
        container.innerHTML = ''; // コンテナをクリア

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `auto-toggle-input-${containerId}`; // inputにもIDを付与
        checkbox.setAttribute('aria-label', labelText); // aria-labelはinputに設定

        const label = document.createElement('label'); // label要素は常に生成

        if (appearance === 'toggle') {
            // トグル表示の場合: label要素をスイッチ全体として使う
            label.classList.add('auto-toggle', 'switch');
            label.setAttribute('role', 'switch');
            label.htmlFor = checkbox.id; // inputと関連付け

            const slider = document.createElement('span');
            slider.classList.add('slider');

            const textLabelSpan = document.createElement('span');
            textLabelSpan.classList.add('text');
            textLabelSpan.textContent = labelText; // テキストはspanに入れる

            // labelの中にinput, slider, textを入れる
            label.appendChild(checkbox);
            label.appendChild(slider);
            label.appendChild(textLabelSpan);

            container.appendChild(label); // labelを元のコンテナに追加
        } else {
            // チェックボックス表示の場合
            label.htmlFor = checkbox.id; // inputと関連付け
            label.textContent = labelText; // labelにテキストを設定
            container.classList.add('auto-toggle-checkbox-container');
            container.appendChild(checkbox);
            container.appendChild(label); // inputの後にlabelを配置
        }

        // ストレージから状態を読み込み、なければデフォルト値を使用
        const storedState = window[storageType].getItem(storageKey);
        const initialState = storedState !== null ? storedState === 'true' : defaultState;
        checkbox.checked = initialState;
        if (appearance === 'toggle') {
            // トグルの場合、labelに初期aria-checkedを設定
            label.setAttribute('aria-checked', initialState.toString());
        }
        window.autoToggle.setState(containerId, initialState); // キャッシュ設定は共通

        // ストレージに値がない場合、デフォルト値を保存
        if (storedState === null) {
            window[storageType].setItem(storageKey, initialState.toString());
            console.log(`${containerId} initial state set to ${initialState} (default) and saved to ${storageType}.`);
        }

        // 初期状態のイベントを発火 (fireInitial が true の場合のみ)
        if (fireInitial) {
            const initialEvent = new CustomEvent('auto-toggle-change', {
                bubbles: true,
                detail: {
                    id: containerId,
                    newState: initialState
                }
            });
            container.dispatchEvent(initialEvent);
        }

        // コールバック関数を追加（状態変更時に呼び出される）
        // 注意: このリスナーは初期化時に一度だけ追加されますが、
        //       発火するのは 'auto-toggle-change' イベントが発生した時です。
        container.addEventListener('auto-toggle-change', (event) => {
            const { id, newState } = event.detail;
            console.log(`Toggle ${id} changed to ${newState}`);
            // ここに実際のコールバック処理を記述
        });

        // 状態変更時にストレージとキャッシュを更新
        checkbox.addEventListener('change', () => {
            const newState = checkbox.checked;
            window[storageType].setItem(storageKey, newState.toString());
            window.autoToggle.setState(containerId, newState); // キャッシュ更新は共通
            if (appearance === 'toggle') {
                // トグルの場合、labelのaria-checkedを更新
                 label.setAttribute('aria-checked', newState.toString());
            }
            console.log(`${containerId} state changed to ${newState}. Saved to ${storageType}. Cache updated. Appearance: ${appearance}`); // ログも修正

            // カスタムイベントを発火
            const event = new CustomEvent('auto-toggle-change', {
                bubbles: true,
                detail: {
                    id: containerId,
                    newState: newState
                }
            });
            container.dispatchEvent(event);
        });

        // ショートカットキーが指定されていればマップに追加
        if (shortcutKey) {
            const normalizedShortcut = normalizeShortcut(shortcutKey);
            if (normalizedShortcut) {
                shortcutMap.set(normalizedShortcut, checkbox);
                console.log(`Registered shortcut: ${normalizedShortcut} for ${containerId}`);
            } else {
                console.warn(`Invalid shortcut format: ${shortcutKey} for ${containerId}`);
            }
        }

        console.log(`Initialized control: ${containerId} (Appearance: ${appearance}, Storage: ${storageType}${shortcutKey ? `, Shortcut: ${shortcutKey}` : ''})`);
    });

    return shortcutMap; // マップを返す
}

// ショートカットキーのリスナーを設定
function setupShortcutListener(shortcutMap) {
    document.addEventListener('keydown', (event) => {
        const pressedKey = getPressedKeyString(event);
        // console.log("Pressed:", pressedKey); // デバッグ用

        if (shortcutMap.has(pressedKey)) {
            event.preventDefault(); // ブラウザのデフォルト動作を抑制
            const checkbox = shortcutMap.get(pressedKey);
            // チェックボックスの状態を反転させる (これにより change イベントがトリガーされる)
            checkbox.checked = !checkbox.checked;
            // changeイベントを手動で発火させる (checkbox.checked の変更だけでは発火しない場合があるため)
            checkbox.dispatchEvent(new Event('change'));
            // change イベントハンドラ内でキャッシュも更新される
            console.log(`Shortcut ${pressedKey} triggered for ${checkbox.id}`);
        }
    });
}

// ショートカットキー文字列を正規化 (例: "ctrl+q" -> "Control+KeyQ")
function normalizeShortcut(shortcut) {
    const parts = shortcut.toLowerCase().split('+').map(part => part.trim());
    if (parts.length < 2) return null; // 修飾キー+キーが必要

    const key = parts.pop(); // 最後の要素がキー
    const modifiers = parts.sort(); // 修飾キーをソートして順序不問にする

    let normalized = "";
    if (modifiers.includes('ctrl')) normalized += "Control+";
    if (modifiers.includes('alt')) normalized += "Alt+";
    if (modifiers.includes('shift')) normalized += "Shift+";
    if (modifiers.includes('meta')) normalized += "Meta+"; // MacのCommandキーなど

    // 修飾キーがキー自身でないことを確認（例: "ctrl+ctrl" は無効）
    if (modifiers.includes(key)) return null;

    // キーコードを追加 (例: "KeyQ" や "Digit1")
    normalized += key.startsWith('key') || key.startsWith('digit') ? key : `Key${key.toUpperCase()}`;
    return normalized;
}

// KeyboardEventから押されたキーの文字列表現を取得 (event.code ベース)
function getPressedKeyString(event) {
    let keyString = "";
    if (event.ctrlKey) keyString += "Control+";
    if (event.altKey) keyString += "Alt+";
    if (event.shiftKey) keyString += "Shift+";
    if (event.metaKey) keyString += "Meta+";

    // event.code を使用してキーを取得
    const keyCode = event.code;
    if (keyCode && !keyCode.startsWith('Control') && !keyCode.startsWith('Alt') &&
        !keyCode.startsWith('Shift') && !keyCode.startsWith('Meta')) {
        keyString += keyCode;
    }

    return keyString.endsWith('+') ? "" : keyString; // 修飾キーのみの場合は空文字列を返す
}
