/** 画面に対するショートカットキーを */

HotkeyMapper.map("ArrowUp", () => moveCurrentParagraphUp(false), { description: "パラグラフを移動(上)"});
HotkeyMapper.map("ArrowDown", () => moveCurrentParagraphDown(false), { description: "パラグラフを移動(下)"});
HotkeyMapper.map("Shift+ArrowUp", () => moveCurrentParagraphUp(true), { description: "選択しならが移動(上)"});
HotkeyMapper.map("Shift+ArrowDown", () => moveCurrentParagraphDown(true), { description: "選択しながら移動(下)"});

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
HotkeyMapper.map("Alt+7", () => updateBlockTagForSelected("header"), { description: "header", useCapture : true });
HotkeyMapper.map("Alt+8", () => updateBlockTagForSelected("footer"), { description: "footer", useCapture : true });
HotkeyMapper.map("Alt+9", () => updateBlockTagForSelected("remove"), { description: "remove", useCapture : true });
HotkeyMapper.map("Alt+L", () => updateBlockTagForSelected("li"), { description: "li", useCapture : true });
HotkeyMapper.map("Alt+T", () => updateBlockTagForSelected("tr"), { description: "tr", useCapture : true });

HotkeyMapper.map("Alt+.", toggleGroupSelectedParagraphs, { description: "グループ化/解除" });
HotkeyMapper.map("Alt++", toggleJoinForSelected, { description: "結合/解除" });
HotkeyMapper.map("Alt+;", toggleJoinForSelected, { description: "結合/解除" });

HotkeyMapper.map("Alt+N", () => updateTransStatusForSelected("none"), { description: "none", useCapture : true });
HotkeyMapper.map("Alt+A", () => updateTransStatusForSelected("auto"), { description: "auto", useCapture : true });
HotkeyMapper.map("Alt+D", () => updateTransStatusForSelected("draft"), { description: "draft", useCapture : true });
HotkeyMapper.map("Alt+F", () => updateTransStatusForSelected("fixed"), { description: "fixed", useCapture : true });

HotkeyMapper.map("Alt+J", () => DictPopup.show(), { description: "対訳辞書登録", useCapture : true });
HotkeyMapper.map("Alt+C", resetTranslationForSelected, { description: "翻訳クリア", useCapture : true });

HotkeyMapper.map("Alt+ArrowUp", () => moveSelectedByOffset(-1), { description: "選択範囲を上へ"});
HotkeyMapper.map("Alt+ArrowDown", () => moveSelectedByOffset(1), { description: "選択範囲を下へ)"});
HotkeyMapper.map("Ctrl+Alt+ArrowUp", () => moveSelectedBefore(0), { description: "選択範囲を先頭へ"});
HotkeyMapper.map("Ctrl+Alt+ArrowDown", () => moveSelectedAfter(9999), { description: "選択範囲を末尾へ)"});

HotkeyMapper.map("F2", () => toggleEditUICurrent(), { description: "編集切り替え", useCapture : true });

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

function moveCurrentParagraphUp(shiftKey) {
    moveCurrentParagraphBy(-1, shiftKey);
}
function moveCurrentParagraphDown(shiftKey) {
    moveCurrentParagraphBy(1, shiftKey);
}

function toggleGroupSelectedParagraphsUp() {
    toggleGroupSelectedParagraphs(-1);
}
function toggleGroupSelectedParagraphsDown() {
    toggleGroupSelectedParagraphs(1);
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


