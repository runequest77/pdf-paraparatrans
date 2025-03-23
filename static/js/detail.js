window.onload = function() {
    initResizers();
    initTocPanel();
    initPdfPanel();
    initSrcPanel();
    fetchBookData();
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded");
    // 描画ボタン
    document.getElementById('renderButton').addEventListener('click', renderParagraphs);
    // 順序保存
    document.getElementById('saveOrderButton').addEventListener('click', saveOrder);
    // ページ翻訳
    document.getElementById('pageTransButton').addEventListener('click', transPage);

    document.getElementById("togglePdfPanelCheckbox")
        .addEventListener("change", function(event) {
        togglePanel(event, "pdfPanel");
    });

    document.getElementById("toggleTocPanelCheckbox")
        .addEventListener("change", function(event) {
        togglePanel(event, "tocPanel");
    });

});

const app = Vue.createApp({
    components: {
        'toggle-switch': {
            props: ["label", "storageKey"],
            data() {
                return {
                    isOn: JSON.parse(localStorage.getItem(this.storageKey)) ?? false
                };
            },
            watch: {
                isOn(newValue) {
                    localStorage.setItem(this.storageKey, JSON.stringify(newValue));
                }
            },
            template: `
                <div class="toggle-container">
                    <label :for="storageKey">{{ label }}</label>
                    <label class="switch">
                        <input type="checkbox" :id="storageKey" v-model="isOn">
                        <span class="slider"></span>
                    </label>
                    <span>{{ isOn ? "ON" : "OFF" }}</span>
                </div>
            `
        }
    }
});

// boookDataからhead-stylesを読み込み
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

function updateTransStatusCounts(counts) {
    document.getElementById("countNone").innerText = counts.none;
    document.getElementById("countAuto").innerText = counts.auto;
    document.getElementById("countDraft").innerText = counts.draft;
    document.getElementById("countFixed").innerText = counts.fixed;
}

function togglePanel(event, panelId){
    console.log("togglePanel panelId:" + panelId);
    let cbox = event.target;
    let panel = document.getElementById(panelId);
    if(cbox.checked){
        panel.classList.remove("hidden");
    } else {
        panel.classList.add("hidden");
    }

    //resizer1のon/off
    if(panelId === "tocPanel"){
        let resizer1 = document.getElementById("resizer1");
        if (cbox.checked){
            resizer1.classList.remove("hidden");
        } else {
            resizer1.classList.add("hidden");
        }
    }
    if(panelId === "pdfPanel"){
        let resizer1 = document.getElementById("resizer2");
        if (cbox.checked){
            resizer1.classList.remove("hidden");
        } else {
            resizer1.classList.add("hidden");
        }
    }
    
}

function restoreCheckboxStates() {
    const checkboxes = document.querySelectorAll('.restoreCheckboxState');
    checkboxes.forEach(checkbox => {
        try {
            const storedValue = localStorage.getItem(checkbox.id);
            if (storedValue === null) {
                localStorage.setItem(checkbox.id, checkbox.checked);
            } else {
                checkbox.checked = storedValue === 'true';
            }
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        } catch (error) {
            console.error("Error processing checkbox:", checkbox, error);
        }
    });
}

function saveCheckboxState(event) {
    const checkbox = event.target;
    localStorage.setItem(checkbox.id, checkbox.checked);
}

/* ---------------------------------------
   「ウインドウ幅に合わせる」を外部から適用
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
    document.getElementById("pageInput").value = currentPage;

    // 「PDFファイルのURL」を作成
    const pdfUrl = encodeURIComponent(`/pdf_view/${pdfName}/${pageNum}`);
    console.log("jumpToPage: " + pdfUrl);
    // PDF.js ビューワをiframeに読み込み、?file= でPDFのURLを指定
    const viewerUrl = `/static/pdfjs/web/viewer.html?file=${pdfUrl}`;
    document.getElementById("pdfIframe").src = viewerUrl;

    setTimeout(fitToWidth, 600);

    renderParagraphs();
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


