
function initPdfPanel() {
    console.log("Initializing PDF Panel");

    document.getElementById("togglePdfPanelCheckbox")
        .addEventListener("change", function(event) {
            togglePanel(event, "pdfPanel");
        });
}

function fitToWidth() {
    let iframe = document.getElementById("pdfIframe");
    if (!iframe) return;

    let viewerWin = iframe.contentWindow;
    if (!viewerWin || !viewerWin.PDFViewerApplication) {
        setTimeout(fitToWidth, 500);
        return;
    }

    viewerWin.PDFViewerApplication.pdfViewer.currentScaleValue = "page-width";
}
