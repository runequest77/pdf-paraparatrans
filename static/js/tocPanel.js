
function initTocPanel() {
    console.log("Initializing TOC Panel");

    document.getElementById("toggleTocPanelCheckbox")
        .addEventListener("change", function(event) {
            togglePanel(event, "tocPanel");
        });

    document.getElementById("tocPanel").addEventListener("click", function(event) {
        if (event.target.dataset.page) {
            jumpToPage(event.target.dataset.page);
        }
    });
}

function showToc(mode) {
    let toc = "";
    for (let i = 0; i < bookData.paragraphs.length; i++) {
        let p = bookData.paragraphs[i];
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(p.block_tag)) {
            let indent = p.block_tag.replace("h", "");
            let txt = (mode === "src") ? p.src_text : p.trans_text;
            toc += "<div style='margin-left:" + (parseInt(indent) * 20) + "px; cursor:pointer;' onclick='jumpToPage(" + p.page + ")'>" + txt + "</div>";
        }
    }
    document.getElementById("tocContent").innerHTML = toc;
}

