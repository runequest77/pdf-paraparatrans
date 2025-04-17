// detail.htmlのグローバル変数は3つ
pdfName = document.body.dataset.pdfName;
bookData = {}; // paragraphs プロパティは辞書形式になる
// paragraphMap は不要になったため削除
currentPage = 1;

// let selectedParagraphRange = { start: null, end: null };

window.onload = function() {
    initResizers();
    initTocPanel();
    initPdfPanel();
    initSrcPanel();
    fetchBookData();
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded");
    // 再描画ボタン（現在は非表示）
    document.getElementById('renderButton').addEventListener('click', renderParagraphs);
    // 構成保存
    document.getElementById('saveOrderButton').addEventListener('click', saveOrder);
    // ページ翻訳
    document.getElementById('pageTransButton').addEventListener('click', transPage);


    window.autoToggle.init();
    // トグル/チェックボックスのカスタムイベント
    document.addEventListener('auto-toggle-change', autoToggleChanged);
});

// すべてのauto-toggleの状態変化を監視する（toggleごとでもよいが、リスナーを増やさないことを選択）
function autoToggleChanged(event) {
    const id = event.detail.id;
    const newState = event.detail.newState;
    console.log(`トグルスイッチ ${id} が ${newState ? 'ON' : 'OFF'} に変更されました。`);

    if (id === 'toggleTocPanel') {
        // 目次パネルのON/OFF
        let panel = document.getElementById("tocPanel");
        let resizer = document.getElementById("resizer1");
        if (newState){
            panel.classList.remove("hidden");
            resizer.classList.remove("hidden");
            // showToc();
        } else {
            panel.classList.add("hidden");
            resizer.classList.add("hidden");
        }
    } else if (id==='togglePdfPanel') {
        // PDFパネルのON/OFF
        let panel = document.getElementById("pdfPanel");
        let resizer = document.getElementById("resizer2");
        if (newState){
            panel.classList.remove("hidden");
            resizer.classList.remove("hidden");
        } else {
            panel.classList.add("hidden");
            resizer.classList.add("hidden");
        }
    } else if (id === 'toggleSrcHtml') {
        // 「HTML」列のON/OFF
        document.querySelectorAll('.src-html').forEach(el => {
            el.style.display = newState ? 'block' : 'none';
        });
    } else if (id === 'toggleSrcText') {
        // 「原文」列のON/OFF
        document.querySelectorAll('.src-text').forEach(el => {
            el.style.display = newState ? 'block' : 'none';
        });
    } else if (id === 'toggleSrcReplaced') {
        // 「置換文」列のON/OFF
        document.querySelectorAll('.src-replaced').forEach(el => {
            el.style.display = newState ? 'block' : 'none';
        });
    } else if (id === 'toggleTransAuto') {
        // 「自動」列のON/OFF
        document.querySelectorAll('.trans-auto').forEach(el => {
            el.style.display = newState ? 'block' : 'none';
        });
    } else if (id === 'toggleTransText') {
        // 「訳文」列のON/OFF
        document.querySelectorAll('.trans-text').forEach(el => {
            el.style.display = newState ? 'block' : 'none';
        });
    } else if (id === 'toggleTocPage') {
        // 見出し「Page」のON/OFF
        document.querySelectorAll('.toc-page').forEach(el => {
            el.style.display = newState ? 'table-cell' : 'none';
        });
    } else if (id === 'toggleTocSrc') {
        // 「原文」見出しのON/OFF
        document.querySelectorAll('.toc-src').forEach(el => {
            el.style.display = newState ? 'table-cell' : 'none';
        });
    } else if (id === 'toggleTocTrans') {
        // 「訳文」見出しのON/OFF
        document.querySelectorAll('.toc-trans').forEach(el => {
            el.style.display = newState ? 'table-cell' : 'none';
        });
    }
    
}


// boookDataから「見出しスタイル一覧」を読み込み
function updateHeadStyles() {
    if (!bookData.head_styles) {
        console.warn("head_styles が存在しません");
        return;
    }

    const styleElement = document.querySelector("style.book-data-head-styles");
    if (!styleElement) {
        console.error("スタイルタグが見つかりません: .book-data-head-styles");
        return;
    }

    let newStyles = "";
    for (let className in bookData.head_styles) {
        if (bookData.head_styles.hasOwnProperty(className)) {
            newStyles += `.${className} { ${bookData.head_styles[className]} }\n`;
        }
    }

    styleElement.innerHTML = newStyles;
}

// 翻訳進捗状況を更新
function updateTransStatusCounts(counts) {
    document.getElementById("countNone").innerText = counts.none;
    document.getElementById("countAuto").innerText = counts.auto;
    document.getElementById("countDraft").innerText = counts.draft;
    document.getElementById("countFixed").innerText = counts.fixed;
}

// function restoreCheckboxStates() {
//     const checkboxes = document.querySelectorAll('.restoreCheckboxState');
//     checkboxes.forEach(checkbox => {
//         try {
//             const storedValue = localStorage.getItem(checkbox.id);
//             if (storedValue === null) {
//                 localStorage.setItem(checkbox.id, checkbox.checked);
//             } else {
//                 checkbox.checked = storedValue === 'true';
//             }
//             const event = new Event('change');
//             checkbox.dispatchEvent(event);
//         } catch (error) {
//             console.error("Error processing checkbox:", checkbox, error);
//         }
//     });
// }

// function saveCheckboxState(event) {
//     const checkbox = event.target;
//     localStorage.setItem(checkbox.id, checkbox.checked);
// }

/* ---------------------------------------
   PDFパネルに「ウインドウ幅に合わせる」を外部から適用
   - iframe.contentWindow.PDFViewerApplication を介して制御
--------------------------------------- */
function fitToWidth() {
    const iframe = document.getElementById("pdfIframe");
    if (!iframe) return;

    const viewerWin = iframe.contentWindow;
    // PDF.jsがまだロードされていない場合はリトライ
    if (!viewerWin ||
        !viewerWin.PDFViewerApplication ||
        !viewerWin.PDFViewerApplication.pdfViewer) {
        console.log("PDF.js not ready -> retry fitToWidth");
        setTimeout(fitToWidth, 300);
        return;
    }

    // 「ウインドウ幅に合わせる」と同じ設定
    viewerWin.PDFViewerApplication.pdfViewer.currentScaleValue = "page-width";
    console.log("fitToWidth: set page-width");
}

function prevPage() {
    console.log("prevPage");
    if (currentPage > 1) {
        currentPage--;
        jumpToPage(currentPage);
    }
}

function nextPage() {
    if (currentPage < parseInt(bookData.page_count,10)) {
        currentPage++;
        jumpToPage(currentPage);
    }
}

function jumpToPage(pageNum) {
    console.log("jumpToPage:pageNum " + pageNum);
    console.log("currentPage " + currentPage);
    console.log("pageInput.value" + document.getElementById("pageInput").value);

    currentPage = parseInt(pageNum,10);

    if (isPageEdited) {
        saveOrder();
    }
    document.getElementById("pageInput").value = currentPage;

    // 「PDFファイルのURL」を作成
    const pdfUrl = encodeURIComponent(`/pdf_view/${pdfName}/${pageNum}`);
    console.log("jumpToPage: " + pdfUrl);
    // PDF.js ビューワをiframeに読み込み、?file= でPDFのURLを指定
    const viewerUrl = `/static/pdfjs/web/viewer.html?file=${pdfUrl}`;
    document.getElementById("pdfIframe").src = viewerUrl;

    setTimeout(fitToWidth, 600);

    renderParagraphs();
    document.getElementById("srcPanel").focus();
}

function initResizers() {
    // 目次パネルとPDFパネルの間のリサイズ
    const resizer1 = document.getElementById('resizer1');
    const tocPanel = document.getElementById('tocPanel');
    const pdfPanel = document.getElementById('pdfPanel');
    const overlay = document.getElementById('overlay');

    let startX, startWidthToc;
    resizer1.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startWidthToc = tocPanel.getBoundingClientRect().width;
        document.addEventListener('mousemove', resizeToc);
        document.addEventListener('mouseup', stopResizeToc);
    });

    function resizeToc(e) {
        const dx = e.clientX - startX;
        tocPanel.style.width = (startWidthToc + dx) + 'px';
    }

    function stopResizeToc() {
        document.removeEventListener('mousemove', resizeToc);
        document.removeEventListener('mouseup', stopResizeToc);
    }

    // PDFパネルとsrcPanelの間のリサイズ
    const resizer2 = document.getElementById('resizer2');
    let startX2, startWidthPdf;
    const minPdfWidth = 200; // 最小幅を200pxに設定（必要に応じて調整）

    resizer2.addEventListener('mousedown', function(e) {
        e.preventDefault(); // ドラッグ中の不要な選択などを防止
        startX2 = e.clientX;
        startWidthPdf = pdfPanel.getBoundingClientRect().width;
        overlay.style.display = 'block'; // オーバーレイを表示
        document.addEventListener('mousemove', resizePdf);
        document.addEventListener('mouseup', stopResizePdf);
    });

    function resizePdf(e) {
        const dx = e.clientX - startX2;
        // 左方向のドラッグで幅が縮む
        let newWidth = startWidthPdf + dx;
        if (newWidth < minPdfWidth) {
            newWidth = minPdfWidth;
        }
        pdfPanel.style.width = newWidth + 'px';
    }

    function stopResizePdf() {
        overlay.style.display = 'none';
        document.removeEventListener('mousemove', resizePdf);
        document.removeEventListener('mouseup', stopResizePdf);
        // リサイズ完了後に「page-width」を再適用
        setTimeout(fitToWidth, 100);
    }
}
