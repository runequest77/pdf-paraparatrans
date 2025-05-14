// dict.js

/**
 * 単語辞書登録ポップアップを管理するモジュール
 */
const DictPopup = {
    popupElement: null,
    originalWordInput: null,
    translatedWordInput: null,
    statusSelect: null,
    okButton: null,
    cancelButton: null,

    // 状態オプションの定義
    statusOptions: [
        { value: 0, text: "0:大文字小文字を区別しない" },
        { value: 1, text: "1:大文字小文字を区別する" },
        { value: 5, text: "5:対象外（再抽出防止）" },
        { value: 6, text: "6:自動翻訳済み（カタカナ)" },
        { value: 7, text: "7:自動翻訳済み（翻訳しても英字）" },
        { value: 8, text: "8:自動翻訳済み" },
        { value: 9, text: "9:未翻訳" },
    ],

    /**
     * ポップアップのHTML構造を生成し、bodyに追加する
     */
    init: function() {
        this.popupElement = document.createElement('div');
        this.popupElement.id = 'dict-popup';
        // スタイルは dict.css で定義されるため、ここではIDのみ設定

        this.popupElement.innerHTML = `
            <h3>単語辞書登録</h3>
            <div>
                <label for="original-word">原語:</label>
                <input type="text" id="original-word">
            </div>
            <div>
                <label for="translated-word">訳語:</label>
                <input type="text" id="translated-word">
            </div>
            <div>
                <label for="status">状態:</label>
                <select id="status"></select>
            </div>
            <div class="button-container">
                <button id="dict-ok">OK</button>
                <button id="dict-cancel">キャンセル</button>
            </div>
        `;

        document.body.appendChild(this.popupElement);

        // 要素への参照を取得
        this.originalWordInput = document.getElementById('original-word');
        this.translatedWordInput = document.getElementById('translated-word');
        this.statusSelect = document.getElementById('status');
        this.okButton = document.getElementById('dict-ok');
        this.cancelButton = document.getElementById('dict-cancel');

        // 状態コンボボックスにオプションを追加
        this.statusOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            this.statusSelect.appendChild(optionElement);
        });

        // イベントリスナーを設定
        this.okButton.addEventListener('click', this.handleOkClick.bind(this));
        this.cancelButton.addEventListener('click', this.hide.bind(this));
    },

    /**
     * ポップアップを表示し、クリップボードのテキストを取得して検索APIを呼び出す
     */
    show: async function() {
        this.popupElement.style.display = 'block'; // CSSで初期非表示にしているので、ここで表示
        this.translatedWordInput.value = ''; // 訳語をクリア
        this.statusSelect.value = 0; // 状態を既定値に

        try {
            const text = await navigator.clipboard.readText();
            this.originalWordInput.value = text.trim(); // クリップボードのテキストをセット

            // 辞書検索APIを呼び出し
            await this.searchDictionary(text.trim());

        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            this.originalWordInput.value = 'クリップボード取得エラー';
        }
    },

    /**
     * ポップアップを非表示にする
     */
    hide: function() {
        this.popupElement.style.display = 'none';
    },

    /**
     * 辞書検索APIを呼び出し、結果をポップアップに反映する
     * @param {string} word - 検索する単語
     */
    searchDictionary: async function(word) {
        if (!word) return;

        try {
            const response = await fetch('/api/dict/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word: word }),
            });

            const data = await response.json();

            if (data.status === 'ok' && data.found) {
                this.translatedWordInput.value = data.translated_word;
                this.statusSelect.value = data.status;
            } else {
                // 見つからなかった場合、訳語は空、状態は既定値(0)のまま
                console.log(`単語 '${word}' は辞書に見つかりませんでした。`);
            }

        } catch (error) {
            console.error('辞書検索API呼び出しエラー:', error);
            // エラー時も訳語は空、状態は既定値(0)のまま
        }
    },

    /**
     * OKボタンクリック時のハンドラ
     */
    handleOkClick: async function() {
        const originalWord = this.originalWordInput.value;
        const translatedWord = this.translatedWordInput.value;
        const status = parseInt(this.statusSelect.value, 10);

        if (!originalWord) {
            alert('原語が空です。');
            return;
        }

        try {
            const response = await fetch('/api/dict/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    original_word: originalWord,
                    translated_word: translatedWord,
                    status: status,
                }),
            });

            const data = await response.json();

            if (data.status === 'ok') {
                console.log('辞書更新成功:', data.message);
                this.hide(); // 成功したらポップアップを閉じる
            } else {
                console.error('辞書更新エラー:', data.message);
                alert('辞書更新に失敗しました: ' + data.message);
            }

        } catch (error) {
            console.error('辞書更新API呼び出しエラー:', error);
            alert('辞書更新API呼び出し中にエラーが発生しました。');
        }
    }
};

// ページロード時にポップアップを初期化
document.addEventListener('DOMContentLoaded', () => {
    DictPopup.init();
});

// 他のスクリプトから利用できるようにエクスポート
// 例: detail.js から DictPopup.show() を呼び出す
window.DictPopup = DictPopup;
