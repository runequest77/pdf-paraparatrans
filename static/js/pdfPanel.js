// static/js/pdfPanel.js に追加

let currentHighlightLayer = null; // 現在のハイライト要素を保持する変数

function clearHighlights() {
    if (currentHighlightLayer) {
        currentHighlightLayer.remove();
        currentHighlightLayer = null;
    }
}

function highlightRectsOnPage(pageNumber, rects) {
    const iframe = document.getElementById("pdfIframe");
    // PDF Viewer Application と pdfViewer の存在を確認
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.PDFViewerApplication || !iframe.contentWindow.PDFViewerApplication.pdfViewer) {
        console.warn("PDF Viewer or PDFViewerApplication is not ready.");
        // 準備ができていない場合は何もしない（またはリトライロジック）
        // setTimeout(() => highlightRectsOnPage(pageNumber, rects), 500); // setTimeout は削除
        return;
    }

    const pdfViewer = iframe.contentWindow.PDFViewerApplication.pdfViewer;
    const pdfDocument = iframe.contentWindow.PDFViewerApplication.pdfDocument; // pdfDocument も確認した方が良いかも

    // 既存のハイライトをクリア
    clearHighlights();

    // --- PDFビューアは常に1ページなので、ページ番号 1 (インデックス 0) のビューを取得 ---
    const pageView = pdfViewer.getPageView(0); // 常にインデックス 0 を指定

    // pageView または textLayer がまだ利用できない場合 (初期ロード時など)
    if (!pageView || !pageView.div || !pageView.textLayer || !pageView.textLayer.div) {
         console.warn(`Page view or textLayer for page 1 not found or not rendered yet.`);

         // 'pagerendered' イベントを待機して、レンダリング後にハイライト処理を実行
         const onPageRendered = (event) => {
             // 常に1ページ目なのでページ番号チェックは不要 (event.detail.pageNumber === 1)
             console.log(`Page 1 rendered, attempting to highlight.`);
             // イベントリスナー内で再度 pageView を取得し、ハイライト処理を実行
             const renderedPageView = pdfViewer.getPageView(0);
             if (renderedPageView && renderedPageView.textLayer && renderedPageView.textLayer.div) {
                 drawHighlights(renderedPageView, rects); // ハイライト描画部分を別関数に分離
             } else {
                 console.error(`Failed to get pageView or textLayer for page 1 even after pagerendered event.`);
             }
         };
         // イベントリスナーを一度だけ実行するように { once: true } を追加
         iframe.contentWindow.document.addEventListener('pagerendered', onPageRendered, { once: true });

         return; // pageView がないのでここで処理を終了
     }

    // pageView が既に存在する場合は、ハイライトを描画 (スクロールは不要)
    drawHighlights(pageView, rects); // ハイライト描画処理を呼び出す
}

// 親ドキュメントのスタイルシートから指定されたセレクタのスタイルプロパティを取得するヘルパー関数
function getParentStyleProperties(selector) {
    const styles = {};
    try {
        const styleSheets = window.parent.document.styleSheets; // 親ウィンドウのスタイルシートにアクセス
        for (const sheet of styleSheets) {
            // CORS制限や読み込みエラーで rules にアクセスできない場合がある
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) continue;

                for (const rule of rules) {
                    if (rule.selectorText === selector) {
                        // position, left, top, width, height 以外を取得
                        for (let i = 0; i < rule.style.length; i++) {
                            const propName = rule.style[i];
                            if (!['position', 'left', 'top', 'width', 'height'].includes(propName)) {
                                styles[propName] = rule.style.getPropertyValue(propName);
                            }
                        }
                        // 見つかったらループを抜ける（複数の定義がある場合、最初のものを優先）
                        return styles;
                    }
                }
            } catch (e) {
                // console.warn(`Could not access rules from stylesheet: ${sheet.href}`, e);
                continue; // アクセスできないシートはスキップ
            }
        }
    } catch (e) {
        console.error("Error accessing parent stylesheets:", e);
    }
    return styles; // 見つからなかった場合は空のオブジェクトを返す
}


// ハイライト描画部分を分離
function drawHighlights(pageView, rects) {
    if (!pageView || !pageView.textLayer || !pageView.textLayer.div) {
        console.error("Cannot draw highlights: pageView or textLayer is missing.");
        return;
    }

     // 既存のハイライトをクリア（ここでも呼ぶと確実）
     clearHighlights();

    // --- ハイライトコンテナを pageView.div に直接追加するように変更 ---
    const highlightContainer = document.createElement('div');
    highlightContainer.className = 'custom-highlight-layer';
    // pageView.div を基準とするため、left/top は 0 に設定
    highlightContainer.style.position = 'absolute';
    highlightContainer.style.left = '0px'; // pageView.div の左上基準
    highlightContainer.style.top = '0px';  // pageView.div の左上基準
    highlightContainer.style.width = '100%'; // pageView.div の幅に合わせる
    highlightContainer.style.height = '100%';// pageView.div の高さに合わせる
    highlightContainer.style.zIndex = '10'; // テキストレイヤーより手前に表示
    highlightContainer.style.pointerEvents = 'none'; // クリックイベントを透過させる

    const viewport = pageView.viewport; // ページのビューポートを取得
    // --- PyMuPDF座標系からの変換に必要なページの元の高さを取得 ---
    // pageView.pdfPage.view 配列の4番目の要素が通常、元のページの高さ (pt)
    const pageHeightInPoints = pageView.pdfPage.view[3];
    if (typeof pageHeightInPoints !== 'number') {
         console.error("Could not determine original page height for coordinate conversion.");
         return;
    }


    rects.forEach(pymupdfBbox => { // 変数名を pymupdfBbox に変更
        // PyMuPDF bbox [x0, y0, x1, y1] (Y=0が上)
        if (!Array.isArray(pymupdfBbox) || pymupdfBbox.length !== 4) {
            console.warn("Invalid PyMuPDF bbox format:", pymupdfBbox);
            return; // 無効な形式の場合はスキップ
        }

        const [x0, y0, x1, y1] = pymupdfBbox;

        // --- PDF.js 標準座標系 [x0, y0, x1, y1] (Y=0が下) に変換 ---
        const pdfJsBbox = [
            x0,                      // x0 (left)
            pageHeightInPoints - y1, // y0 (bottom)
            x1,                      // x1 (right)
            pageHeightInPoints - y0  // y1 (top)
        ];

        // viewport.convertToViewportRectangle は PDF.js 標準座標系を受け取る
        const viewportRect = viewport.convertToViewportRectangle(pdfJsBbox);

        const highlightDiv = document.createElement('div');
        // --- 親CSSからスタイルを取得して適用 ---
        const highlightStyles = getParentStyleProperties('.pdf-highlight-rect');
        highlightDiv.style.position = 'absolute'; // position は必須
        // 取得したスタイルを適用
        for (const prop in highlightStyles) {
            highlightDiv.style[prop] = highlightStyles[prop];
        }
        // --- スタイル適用ここまで ---

        // ビューポート座標で位置とサイズを設定 (viewportRect は [x1, y1, x2, y2])
        highlightDiv.style.left = `${viewportRect[0]}px`;
        highlightDiv.style.top = `${viewportRect[1]}px`;
        highlightDiv.style.width = `${viewportRect[2] - viewportRect[0]}px`;
        highlightDiv.style.height = `${viewportRect[3] - viewportRect[1]}px`;

        highlightContainer.appendChild(highlightDiv);
    });

    // --- ハイライトコンテナの追加先を pageView.div に変更 ---
    if (pageView.div) {
        pageView.div.appendChild(highlightContainer);
        currentHighlightLayer = highlightContainer; // 現在のハイライトを保持
    } else {
        console.error("Cannot append highlight layer: pageView.div not found.");
    }
}


// pdfPanel.js の既存の関数も残す
function initPdfPanel() {
    console.log("Initializing PDF Panel");
    // 必要であれば初期化処理を追加
}

function fitToWidth() {
    let iframe = document.getElementById("pdfIframe");
    if (!iframe) return;

    let viewerWin = iframe.contentWindow;
    // PDFViewerApplication が読み込まれるまで待機
    const checkViewerApp = setInterval(() => {
        if (viewerWin && viewerWin.PDFViewerApplication && viewerWin.PDFViewerApplication.pdfViewer) {
            clearInterval(checkViewerApp);
            // スケール変更前にドキュメントがロードされているか確認
            if (viewerWin.PDFViewerApplication.pdfDocument) {
                 viewerWin.PDFViewerApplication.pdfViewer.currentScaleValue = "page-width";
            } else {
                // ドキュメントロード完了イベントを待機
                viewerWin.document.addEventListener('documentloaded', () => {
                     viewerWin.PDFViewerApplication.pdfViewer.currentScaleValue = "page-width";
                }, { once: true });
            }
        } else if (!viewerWin || !viewerWin.PDFViewerApplication) {
             // iframe がまだロードされていないか、PDFViewerApplication が未定義の場合
             console.log("Waiting for PDFViewerApplication...");
             // 必要に応じて再試行ロジックやエラーハンドリングを追加
        }
    }, 100); // 100msごとに確認
}

// 初期化時に幅合わせを実行
// fitToWidth(); // detail.js の loadPdf で呼び出されるのでここでは不要かも
