/** 画面に対するショートカットキーを */

HotkeyMapper.map("Ctrl+.", toggleGroupSelectedParagraphs, { description: "グループ化/解除" });
HotkeyMapper.map("Ctrl+ArrowUp", moveCurrentParagraphUp, { description: "パラグラフを移動(上)"});
HotkeyMapper.map("Ctrl+ArrowDown", moveCurrentParagraphDown, { description: "パラグラフを移動(下)"});
HotkeyMapper.map("Ctrl+Shift+ArrowUp", moveCurrentParagraphUp, { description: "選択しならが移動(上)"});
HotkeyMapper.map("Ctrl+Shift+ArrowDown", moveCurrentParagraphDown, { description: "選択しながら移動(下)"});
HotkeyMapper.map("Ctrl+Alt+ArrowUp", toggleGroupSelectedParagraphsUp, { description: "カレント行を選択(上)"});
HotkeyMapper.map("Ctrl+Alt+ArrowDown", toggleGroupSelectedParagraphsDown, { description: "カレント行を選択(下)"});
HotkeyMapper.map("ArrowLeft", prevPage, { description: "次のページ" });
HotkeyMapper.map("ArrowRight", nextPage, { description: "前のページ" });
HotkeyMapper.map("ArrowUp", moveCurrentParagraphUp, { description: "パラグラフを移動(上)"});
HotkeyMapper.map("ArrowDown", moveCurrentParagraphDown, { description: "パラグラフを移動(下)"});
HotkeyMapper.map("Ctrl+ArrowLeft", prevPage, { description: "次のページ" });
HotkeyMapper.map("Ctrl+ArrowRight", nextPage, { description: "前のページ" });
HotkeyMapper.map("Escape", resetSelection, { description: "選択解除" });
HotkeyMapper.map("Ctrl+S", saveOrder, { description: "構造保存" });
HotkeyMapper.map("ArrowUp", rollUp, { description: "スクロールアップ" });
HotkeyMapper.map("ArrowDown", rollDown, { description: "スクロールダウン" });

function rollUp() {
    const srcPanel = document.getElementById('srcPanel'); // srcPanelの要素を取得
    if (srcPanel) {
        srcPanel.scrollBy({ top: -srcPanel.clientHeight, behavior: 'smooth' }); // 1画面分上にスクロール
    }
}

function rollDown() {
    const srcPanel = document.getElementById('srcPanel'); // srcPanelの要素を取得
    if (srcPanel) {
        srcPanel.scrollBy({ top: srcPanel.clientHeight, behavior: 'smooth' }); // 1画面分下にスクロール
    }
}

function moveCurrentParagraphUp() {
    moveCurrentParagraphBy(-1, event.shiftKey);
}
function moveCurrentParagraphDown() {
    moveCurrentParagraphBy(1, event.shiftKey);
}

function toggleGroupSelectedParagraphsUp() {
    toggleGroupSelectedParagraphs(-1);
}
function toggleGroupSelectedParagraphsDown() {
    toggleGroupSelectedParagraphs(1);
}
function moveSelectedByOffsetUp(event) {
    moveSelectedByOffset(-1,event.shiftKey);
}
function moveSelectedByOffsetDown(event) {
    moveSelectedByOffset(1,event.shiftKey);
}


// キーボードイベントのリスナーを追加
document.addEventListener('keydown', (event) => {

    let key = event.key.toLowerCase();

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
    }

    const paragraphs = document.querySelectorAll('.paragraph-box');
    if (paragraphs.length === 0) return;

    // 現在のパラグラフを取得
    let currentParagraph = paragraphs[currentParagraphIndex];

    // 現在のパラグラフをハイライト
    paragraphs.forEach(p => p.classList.remove('highlight'));
    currentParagraph = paragraphs[currentParagraphIndex];
    currentParagraph.classList.add('highlight');

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


