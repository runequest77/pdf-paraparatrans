// キーボードイベントのリスナーを追加
document.addEventListener('keydown', (event) => {

    // 高速編集モードがONの場合
    if (window.autoToggle.getState("quickEditMode")) {

        if (event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            handleBlockTagShortcut(event.key);
        }

        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
            event.preventDefault();
            toggleGroupSelectedParagraphs();
        }

        // Ctrl + Alt + 上/下矢印で選択されているパラグラフを移動
        if (event.ctrlKey && event.altKey && event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelectedByOffset(-1);
        } else if (event.ctrlKey && event.altKey && event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelectedByOffset(1);
        }

    }

    // Ctrl + 上/下矢印でカレントパラグラフを移動
    if (event.ctrlKey && !event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        moveCurrentParagraphBy(-1, event.shiftKey);
    } else if (event.ctrlKey && !event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        moveCurrentParagraphBy(1, event.shiftKey);
    }

    // Ctrl + ← / →でページ送り
    if (event.ctrlKey && !event.shiftKey && !event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            prevPage();
        } else {
            event.preventDefault();
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
        event.preventDefault();
        clearSelection();
    }

    // Ctrl + Sで編集状態を保存
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveOrder();
    }
});


function onKeyDown(event, divSrc, paragraph, srcText, transText, blockTagSpan) {
    if (event.key === 'Escape' && divSrc.classList.contains('editing')) {
        divSrc.classList.remove('editing');
        srcText.contentEditable = false;
        transText.contentEditable = false;
        divSrc.querySelector('.edit-ui').style.display = 'none';
        divSrc.querySelector('.edit-button').style.visibility = 'visible'; // visibilityを直接操作
        $("#srcParagraphs").sortable("enable");
        divSrc.style.cursor = 'move';

        srcText.innerHTML = paragraph.src_text;
        transText.innerHTML = paragraph.trans_text;
        paragraph.block_tag = blockTagSpan.innerText;

        // 元のtrans_statusに基づいて背景色を復元
        updateEditUiBackground(divSrc, paragraph.trans_status);
    }
}

