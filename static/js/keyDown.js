// キーボードイベントのリスナーを追加
document.addEventListener('keydown', (event) => {

    // 高速編集モードがONの場合
    if (window.autoToggle.getState("quickEditMode")) {
        // デフォルトの動作をキャンセル
        event.preventDefault();

        if (event.ctrlKey && !event.shiftKey && !event.altKey) {
            handleBlockTagShortcut(event.key);
        }

        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
            toggleGroupSelectedParagraphs();
        }

        // Ctrl + Alt + 上/下矢印で選択されているパラグラフを移動
        if (event.ctrlKey && event.altKey && event.key === 'ArrowUp') {
            moveSelectedByOffset(-1);
        } else if (event.ctrlKey && event.altKey && event.key === 'ArrowDown') {
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
        saveOrder();
    }
});
