// detail.htmlのグローバル変数は3つ
pdfName = document.body.dataset.pdfName;
bookData = {};
currentPage = 1;
    
async function fetchBookData() {
    try {
        let response = await fetch(`/api/book_data/${encodeURIComponent(pdfName)}`);
        bookData = await response.json();
        
        document.getElementById("titleInput").value = bookData.title;
        document.getElementById("pageCount").innerText = bookData.page_count;

        jumpToPage(currentPage);
    } catch (error) {
        console.error("Error fetching book data:", error);
    }
}

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
});

function transPage () {
    fetch(`/api/paraparatrans/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: '&start_page=' + encodeURIComponent(currentPage) +
            '&end_page=' + encodeURIComponent(currentPage)
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === "ok") {
                // JSONファイル再読み込み（ページ全体をリロード）
                fetchBookData();
            } else {
                console.error('エラー:', data.message);
            }
        })
        .catch(error => console.error('Error:', error));
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
}

function restoreCheckboxStates() {
    const checkboxes = document.querySelectorAll('.restoreCheckboxState');
    console.log("restoreCheckboxStates checkboxes.length:" + checkboxes.length);
    checkboxes.forEach(checkbox => {
        try {
            const checked = localStorage.getItem(checkbox.id) === 'true';
            console.log("checkbox.id:" + checkbox.id + " checked:" + checked);
            checkbox.checked = checked;
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        } catch (error) {
            console.error("Error processing checkbox:", checkbox, error);
        }
    });
}

function saveCheckboxState(event) {
    const checkbox = event.target;
    console.log("saveCheckboxState checkbox.id:" + checkbox.id + " checked:" + checkbox.checked);
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

function extractParagraphs(){
    if(!confirm("PDFを解析してJSONを新規生成します。よろしいですか？")) return;
    let form = new FormData();
    fetch(`/api/extract_paragraphs/${encodeURIComponent(pdfName)}`, {
        method: "POST",
        body: form
    }).then(r => r.json()).then(res => {
        if(res.status === "ok"){
            alert("パラグラフ抽出完了");
            location.reload();
            fetchBookData();
        } else {
            alert(res.message);
        }
    });
}  

function dictReplaceAll() {
    fetch(`/api/dict_replace_all/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            fetchBookData();
        } else {
            console.error("対訳置換エラー:", data.message);
            alert("対訳置換エラー: " + data.message);
        }
    })
    .catch(error => {
        console.error("dictReplaceAllエラー:", error);
        alert("dictReplaceAll エラー: " + error);
    });
}

// 順序再発行＆保存処理
function saveOrder() {
    let container = document.getElementById('srcParagraphs');
    let children = container.children;
    let orderList = [];
    for (let i = 0; i < children.length; i++) {
        let idElem = children[i].querySelector('.paragraph-id');
        if (idElem) {
            let pId = idElem.innerText.trim();
            orderList.push({ id: pId, order: i + 1 });
        }
    }
    // orderListを /save_order に送信
    let formData = new URLSearchParams();
    formData.append('order_json', JSON.stringify(orderList));

    fetch(`/api/save_order/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    })
    .then(response => response.json())
    .then(data => {
        console.log('Order saved:', data);
        alert('順序が保存されました');
    })
    .catch(error => {
        console.error('Error saving order:', error);
        alert('順序保存中にエラーが発生しました');
    });
}


