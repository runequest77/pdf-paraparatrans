// キーボードイベントのリスナーを追加
document.addEventListener('keydown', (event) => {

    // 高速編集モードがONの場合
    if (window.autoToggle.getState("quickEditMode")) {
        // デフォルトの動作をキャンセル
        event.preventDefault();
        if (event.ctrlKey && !event.shiftKey && !event.altKey) {
            handleBlockTagShortcut(event.key);
        }
    }

    // Ctrl + 上/下矢印で選択パラグラフを移動
    if (event.ctrlKey && event.key === 'ArrowUp') {
        event.preventDefault();
        moveCurrentParagraphBy(-1, event.shiftKey);
    } else if (event.ctrlKey && event.key === 'ArrowDown') {
        event.preventDefault();
        moveCurrentParagraphBy(1, event.shiftKey);
    }
    // Ctrl + 上/下矢印で選択パラグラフを移動
    if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelectedByOffset(-1);
    } else if (event.ctrlKey && event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelectedByOffset(1);
    }

    // Ctrl + ← / →でページ送り
    if (event.ctrlKey && !event.shiftKey && !event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
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

// function updateSelectionHighlight() {
//     const paragraphs = document.querySelectorAll('.paragraph-box');
//     paragraphs.forEach((p, index) => {
//         if (selectedParagraphRange.start !== null && index >= selectedParagraphRange.start && index <= selectedParagraphRange.end) {
//             p.classList.add('selected');
//         } else {
//             p.classList.remove('selected');
//         }
//     });
// }

// function moveSelectedParagraphsUp() {
//     if (selectedParagraphRange.start === null) return;

//     const paragraphs = document.querySelectorAll('.paragraph-box');
//     if (paragraphs.length === 0) return;

//     const start = selectedParagraphRange.start;
//     const end = selectedParagraphRange.end;

//     if (start > 0) {
//         // 選択されたパラグラフを上に移動する処理
//         const temp = bookData.paragraphs.slice(start, end + 1);
//         bookData.paragraphs.splice(start, end - start + 1);
//         bookData.paragraphs.splice(start - 1, 0, ...temp);

//         selectedParagraphRange.start--;
//         selectedParagraphRange.end--;
//         currentParagraphIndex = selectedParagraphRange.start;

//         renderParagraphs();
//         updateSelectionHighlight();
//     }
// }

// function moveSelectedParagraphsDown() {
//     if (selectedParagraphRange.start === null) return;

//     const paragraphs = document.querySelectorAll('.paragraph-box');
//     if (paragraphs.length === 0) return;

//     const start = selectedParagraphRange.start;
//     const end = selectedParagraphRange.end;

//     if (end < paragraphs.length - 1) {
//         // 選択されたパラグラフを下に移動する処理
//         const temp = bookData.paragraphs.slice(start, end + 1);
//         bookData.paragraphs.splice(start, end - start + 1);
//         bookData.paragraphs.splice(end + 1, 0, ...temp);

//         selectedParagraphRange.start++;
//         selectedParagraphRange.end++;
//         currentParagraphIndex = selectedParagraphRange.start;

//         renderParagraphs();
//         updateSelectionHighlight();
//     }
// }

// function moveSelectedParagraphsToTop() {
//     if (selectedParagraphRange.start === null) return;

//     const paragraphs = document.querySelectorAll('.paragraph-box');
//     if (paragraphs.length === 0) return;

//     const start = selectedParagraphRange.start;
//     const end = selectedParagraphRange.end;

//     // 選択されたパラグラフを最上へ移動する処理
//     const temp = bookData.paragraphs.slice(start, end + 1);
//     bookData.paragraphs.splice(start, end - start + 1);
//     bookData.paragraphs.unshift(...temp);

//     selectedParagraphRange.start = 0;
//     selectedParagraphRange.end = end - start;
//     currentParagraphIndex = selectedParagraphRange.start;

//     renderParagraphs();
//     updateSelectionHighlight();
// }

// function moveSelectedParagraphsToBottom() {
//     if (selectedParagraphRange.start === null) return;

//     const paragraphs = document.querySelectorAll('.paragraph-box');
//     if (paragraphs.length === 0) return;

//     const start = selectedParagraphRange.start;
//     const end = selectedParagraphRange.end;

//     // 選択されたパラグラフを最下へ移動する処理
//     const temp = bookData.paragraphs.slice(start, end + 1);
//     bookData.paragraphs.splice(start, end - start + 1);
//     bookData.paragraphs.push(...temp);

//     selectedParagraphRange.start = paragraphs.length - (end - start + 1);
//     selectedParagraphRange.end = paragraphs.length - 1;
//     currentParagraphIndex = selectedParagraphRange.start;

//     renderParagraphs();
//     updateSelectionHighlight();
// }

// function clearSelection() {
//     selectedParagraphRange.start = null;
//     selectedParagraphRange.end = null;
//     updateSelectionHighlight();
// }

function saveChanges() {
    // 編集状態を保存する処理
    saveOrder();
}

