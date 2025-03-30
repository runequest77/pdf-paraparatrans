// キーボードイベントのリスナーを追加
document.addEventListener('keydown', (event) => {

    // 高速編集モードがONの場合
    if (window.autoToggle.getState("QuickEditMode")) {
        // デフォルトの動作をキャンセル
        event.preventDefault();

        // 上下矢印キーでパラグラフを移動
        if (event.key === 'ArrowUp') {
            if (currentParagraphIndex > 0) {
                currentParagraphIndex--;
            }
        } else if (event.key === 'ArrowDown') {
            if (currentParagraphIndex < paragraphs.length - 1) {
                currentParagraphIndex++;
            }
        }

        // Ctrl+Alt+数字で block_tag を変更
        if (/^[1-6]$/.test(event.key)) {
            const blockTag = `h${event.key}`; // 例: Ctrl+Alt+1 で h1, Ctrl+Alt+2 で h2
            const blockTagSelect = currentParagraph.querySelector('.type-select');
            const blockTagSpan = currentParagraph.querySelector('.block-tag');

            if (blockTagSelect && blockTagSpan) {
                blockTagSelect.value = blockTag;
                blockTagSpan.innerText = blockTag;

                // クラス名を更新
                currentParagraph.className = currentParagraph.className.replace(/block-tag-\w+/g, `block-tag-${blockTag}`);

                // bookData を更新
                const paragraphId = parseInt(currentParagraph.id.replace('paragraph-', ''), 10);
                const paragraphData = bookData.paragraphs.find(p => p.id === paragraphId);
                if (paragraphData) {
                    paragraphData.block_tag = blockTag;
                }
                // サーバーに保存（必要に応じて）
                // saveParagraphData(paragraphData);
            }
        }

        // Ctrl+Alt+P で block_tag を 'p' に変更
        if (event.key === 'p') {
            const blockTag = 'p';
            const blockTagSelect = currentParagraph.querySelector('.type-select');
            const blockTagSpan = currentParagraph.querySelector('.block-tag');

            if (blockTagSelect && blockTagSpan) {
                blockTagSelect.value = blockTag;
                blockTagSpan.innerText = blockTag;

                // クラス名を更新
                currentParagraph.className = currentParagraph.className.replace(/block-tag-\w+/g, `block-tag-${blockTag}`);

                // bookData を更新
                const paragraphId = parseInt(currentParagraph.id.replace('paragraph-', ''), 10);
                const paragraphData = bookData.paragraphs.find(p => p.id === paragraphId);
                if (paragraphData) {
                    paragraphData.block_tag = blockTag;
                }
                // サーバーに保存（必要に応じて）
                // saveParagraphData(paragraphData);
            }
        }

        // Shift + 上/下矢印で選択範囲を拡大
        if (event.shiftKey && event.key === 'ArrowUp') {
            if (selectedParagraphRange.start === null) {
                selectedParagraphRange.start = currentParagraphIndex;
                selectedParagraphRange.end = currentParagraphIndex;
            } else {
                selectedParagraphRange.start = Math.max(0, selectedParagraphRange.start - 1);
            }
            updateSelectionHighlight();
        } else if (event.shiftKey && event.key === 'ArrowDown') {
            if (selectedParagraphRange.start === null) {
                selectedParagraphRange.start = currentParagraphIndex;
                selectedParagraphRange.end = currentParagraphIndex;
            } else {
                selectedParagraphRange.end = Math.min(paragraphs.length - 1, selectedParagraphRange.end + 1);
            }
            updateSelectionHighlight();
        }

        // Ctrl + 上/下矢印で選択パラグラフを移動
        if (event.ctrlKey && event.key === 'ArrowUp') {
            moveSelectedParagraphsUp();
        } else if (event.ctrlKey && event.key === 'ArrowDown') {
            moveSelectedParagraphsDown();
        }

        // Ctrl + Shift + 上/下矢印で選択パラグラフを最上/最下へ移動
        if (event.ctrlKey && event.shiftKey && event.key === 'ArrowUp') {
            moveSelectedParagraphsToTop();
        } else if (event.ctrlKey && event.shiftKey && event.key === 'ArrowDown') {
            moveSelectedParagraphsToBottom();
        }
    }

    // Ctrl + ← / →でページ送り
    if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        if (event.key === 'ArrowLeft') {
            prevPage();
        } else {
            nextPage();
        }
        return;
    }

    const paragraphs = document.querySelectorAll('.paragraph-box');
    if (paragraphs.length === 0) return;

    // 現在のパラグラフを取得
    let currentParagraph = paragraphs[currentParagraphIndex];

    // 現在のパラグラフをハイライト
    paragraphs.forEach(p => p.classList.remove('highlight'));
    currentParagraph = paragraphs[currentParagraphIndex];
    currentParagraph.classList.add('highlight');


    // Escで選択解除
    if (event.key === 'Escape') {
        clearSelection();
    }

    // Ctrl + Sで編集状態を保存
    if (event.ctrlKey && event.key === 's') {
        saveChanges();
    }
});

function updateSelectionHighlight() {
    const paragraphs = document.querySelectorAll('.paragraph-box');
    paragraphs.forEach((p, index) => {
        if (selectedParagraphRange.start !== null && index >= selectedParagraphRange.start && index <= selectedParagraphRange.end) {
            p.classList.add('selected');
        } else {
            p.classList.remove('selected');
        }
    });
}

function moveSelectedParagraphsUp() {
    if (selectedParagraphRange.start === null) return;

    const paragraphs = document.querySelectorAll('.paragraph-box');
    if (paragraphs.length === 0) return;

    const start = selectedParagraphRange.start;
    const end = selectedParagraphRange.end;

    if (start > 0) {
        // 選択されたパラグラフを上に移動する処理
        const temp = bookData.paragraphs.slice(start, end + 1);
        bookData.paragraphs.splice(start, end - start + 1);
        bookData.paragraphs.splice(start - 1, 0, ...temp);

        selectedParagraphRange.start--;
        selectedParagraphRange.end--;
        currentParagraphIndex = selectedParagraphRange.start;

        renderParagraphs();
        updateSelectionHighlight();
    }
}

function moveSelectedParagraphsDown() {
    if (selectedParagraphRange.start === null) return;

    const paragraphs = document.querySelectorAll('.paragraph-box');
    if (paragraphs.length === 0) return;

    const start = selectedParagraphRange.start;
    const end = selectedParagraphRange.end;

    if (end < paragraphs.length - 1) {
        // 選択されたパラグラフを下に移動する処理
        const temp = bookData.paragraphs.slice(start, end + 1);
        bookData.paragraphs.splice(start, end - start + 1);
        bookData.paragraphs.splice(end + 1, 0, ...temp);

        selectedParagraphRange.start++;
        selectedParagraphRange.end++;
        currentParagraphIndex = selectedParagraphRange.start;

        renderParagraphs();
        updateSelectionHighlight();
    }
}

function moveSelectedParagraphsToTop() {
    if (selectedParagraphRange.start === null) return;

    const paragraphs = document.querySelectorAll('.paragraph-box');
    if (paragraphs.length === 0) return;

    const start = selectedParagraphRange.start;
    const end = selectedParagraphRange.end;

    // 選択されたパラグラフを最上へ移動する処理
    const temp = bookData.paragraphs.slice(start, end + 1);
    bookData.paragraphs.splice(start, end - start + 1);
    bookData.paragraphs.unshift(...temp);

    selectedParagraphRange.start = 0;
    selectedParagraphRange.end = end - start;
    currentParagraphIndex = selectedParagraphRange.start;

    renderParagraphs();
    updateSelectionHighlight();
}

function moveSelectedParagraphsToBottom() {
    if (selectedParagraphRange.start === null) return;

    const paragraphs = document.querySelectorAll('.paragraph-box');
    if (paragraphs.length === 0) return;

    const start = selectedParagraphRange.start;
    const end = selectedParagraphRange.end;

    // 選択されたパラグラフを最下へ移動する処理
    const temp = bookData.paragraphs.slice(start, end + 1);
    bookData.paragraphs.splice(start, end - start + 1);
    bookData.paragraphs.push(...temp);

    selectedParagraphRange.start = paragraphs.length - (end - start + 1);
    selectedParagraphRange.end = paragraphs.length - 1;
    currentParagraphIndex = selectedParagraphRange.start;

    renderParagraphs();
    updateSelectionHighlight();
}

function clearSelection() {
    selectedParagraphRange.start = null;
    selectedParagraphRange.end = null;
    updateSelectionHighlight();
}

function saveChanges() {
    // 編集状態を保存する処理
    saveOrder();
}

