/** 画面に対するショートカットキーを */

HotkeyMapper.map("ArrowUp", moveCurrentParagraphUp, { description: "パラグラフを移動(上)"});
HotkeyMapper.map("ArrowDown", moveCurrentParagraphDown, { description: "パラグラフを移動(下)"});
HotkeyMapper.map("Shift+ArrowUp", moveCurrentParagraphUp, { description: "選択しならが移動(上)"});
HotkeyMapper.map("Shift+ArrowDown", moveCurrentParagraphDown, { description: "選択しながら移動(下)"});

HotkeyMapper.map("Ctrl+ArrowUp", () => focusNearestHeading(-1), { description: "前の見出し"});
HotkeyMapper.map("Ctrl+ArrowDown", () => focusNearestHeading(1), { description: "次の見出し"});
HotkeyMapper.map("Ctrl+Shift+ArrowUp", selectUntilPreviousHeading, { description: "前の見出しまで選択"});
HotkeyMapper.map("Ctrl+Shift+ArrowDown", selectUntilNextHeading, { description: "次の見出しまで選択"});

HotkeyMapper.map("ArrowLeft", prevPage, { description: "次のページ" });
HotkeyMapper.map("ArrowRight", nextPage, { description: "前のページ" });
HotkeyMapper.map("Ctrl+ArrowLeft", prevPage, { description: "次のページ" });
HotkeyMapper.map("Ctrl+ArrowRight", nextPage, { description: "前のページ" });
HotkeyMapper.map("Ctrl+Shift+ArrowLeft", prevPage, { description: "次のページ" });
HotkeyMapper.map("Ctrl+Shift+ArrowRight", nextPage, { description: "前のページ" });

// パラグラフに対する編集はAltキー
//moveSelectedByOffset
HotkeyMapper.map("Alt+0", () => updateBlockTagForSelected("p"), { description: "本文", useCapture : true });
HotkeyMapper.map("Alt+1", () => updateBlockTagForSelected("h1"), { description: "h1", useCapture : true });
HotkeyMapper.map("Alt+2", () => updateBlockTagForSelected("h2"), { description: "h2", useCapture : true });
HotkeyMapper.map("Alt+3", () => updateBlockTagForSelected("h3"), { description: "h3", useCapture : true });
HotkeyMapper.map("Alt+4", () => updateBlockTagForSelected("h4"), { description: "h4", useCapture : true });
HotkeyMapper.map("Alt+5", () => updateBlockTagForSelected("h5"), { description: "h5", useCapture : true });
HotkeyMapper.map("Alt+6", () => updateBlockTagForSelected("h6"), { description: "h6", useCapture : true });
HotkeyMapper.map("Alt+h", () => updateBlockTagForSelected("header"), { description: "header", useCapture : true });
HotkeyMapper.map("Alt+f", () => updateBlockTagForSelected("footer"), { description: "footer", useCapture : true });
HotkeyMapper.map("Alt+L", () => updateBlockTagForSelected("li"), { description: "li", useCapture : true });
HotkeyMapper.map("Alt+T", () => updateBlockTagForSelected("td"), { description: "td", useCapture : true });

HotkeyMapper.map("Alt+.", toggleGroupSelectedParagraphs, { description: "グループ化/解除" });
HotkeyMapper.map("Alt++", toggleJoinForSelected, { description: "結合/解除" });
HotkeyMapper.map("Alt+;", toggleJoinForSelected, { description: "結合/解除" });

HotkeyMapper.map("Alt+ArrowUp", () => moveSelectedByOffset(-1), { description: "選択範囲を上へ"});
HotkeyMapper.map("Alt+ArrowDown", () => moveSelectedByOffset(1), { description: "選択範囲を下へ)"});

//

HotkeyMapper.map("Escape", resetSelection, { description: "選択解除" });
HotkeyMapper.map("Ctrl+S", saveCurrentPageOrder, { description: "構造保存" });
HotkeyMapper.map("RollUp", rollUp, { description: "スクロールアップ" });
HotkeyMapper.map("RollDown", rollDown, { description: "スクロールダウン" });


function rollUp() {
    const srcPanel = document.getElementById('srcPanel'); // srcPanelの要素を取得
    srcPanel.focus();
    if (srcPanel) {
        srcPanel.scrollBy({ top: -srcPanel.clientHeight, behavior: 'smooth' }); // 1画面分上にスクロール
    }
}

function rollDown() {
    const srcPanel = document.getElementById('srcPanel'); // srcPanelの要素を取得
    srcPanel.focus();
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


