function initTocPanel() {
    console.log("Initializing TOC Panel");

    document.getElementById("toggleTocPanelCheckbox")
        .addEventListener("change", function(event) {
            togglePanel(event, "tocPanel");
        });

    document.getElementById("tocPanel").addEventListener("click", function(event) {
        if (event.target.classList.contains("toc-item")) {
            const childList = event.target.nextElementSibling;
            if (childList && childList.classList.contains("toc-children")) {
                childList.style.display = (childList.style.display === "none") ? "block" : "none";
            }
        } else if (event.target.dataset.page) {
            jumpToPage(event.target.dataset.page);
        }
    });
}

function showToc(mode) {
    function createTocItem(p, level, hasChildren) {
        const itemContainer = document.createElement("div");
        itemContainer.className = "toc-item-container";
        itemContainer.style.setProperty("--level", level); // 階層レベルを設定

        if (hasChildren) {
            const toggleIcon = document.createElement("span");
            toggleIcon.className = "toggle-icon";
            toggleIcon.textContent = "▶"; // 初期状態は閉じたアイコン
            toggleIcon.style.cursor = "pointer";
            toggleIcon.addEventListener("click", function () {
                const childList = itemContainer.nextElementSibling;
                if (childList && childList.classList.contains("toc-children")) {
                    const isHidden = childList.style.display === "none";
                    childList.style.display = isHidden ? "block" : "none";
                    toggleIcon.textContent = isHidden ? "▼" : "▶"; // アイコンを切り替え
                }
            });
            itemContainer.appendChild(toggleIcon);
        }

        const item = document.createElement("span");
        item.className = `toc-item level-${level}`; // レベルごとのクラスを追加
        item.style.cursor = "pointer";
        item.dataset.page = p.page;
        // mode src/transによって表示内容を切り替え
        item.textContent = mode === "src" ? p.src_text : p.trans_text; // 原文または訳文のテキスト

        // 見出しクリックで該当パラグラフにスクロールまたはページ遷移
        item.addEventListener("click", function () {
            if (p.page !== currentPage) {
                // 異なるページの場合はページ遷移
                jumpToPage(p.page);
                setTimeout(() => {
                    const targetParagraph = document.getElementById(`paragraph-${p.id}`);
                    if (targetParagraph) {
                        targetParagraph.scrollIntoView({ behavior: "smooth", block: "center" });
                    } else {
                        console.error(`Element with ID paragraph-${p.id} not found.`);
                    }
                }, 500); // ページ遷移後に少し待機してスクロール
            } else {
                // 同じページの場合は直接スクロール
                const targetParagraph = document.getElementById(`paragraph-${p.id}`);
                if (targetParagraph) {
                    targetParagraph.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                    console.error(`Element with ID paragraph-${p.id} not found.`);
                }
            }
        });



        itemContainer.appendChild(item);
        return itemContainer;
    }

    function buildTocTree(paragraphs, parentTag = "h1") {
        const container = document.createElement("div");
        let currentLevel = parseInt(parentTag.replace("h", "")) || 1;
        let currentList = container;
    
        paragraphs.forEach((p, index) => {
            // h1～h6以外はスキップ
            if (!/^h[1-6]$/.test(p.block_tag)) {
                return;
            }
    
            const level = parseInt(p.block_tag.replace("h", ""));
            const hasChildren = paragraphs.slice(index + 1).some(next => {
                if (!/^h[1-6]$/.test(next.block_tag)) return false;
                return parseInt(next.block_tag.replace("h", "")) > level;
            });
    
            const tocItem = createTocItem(p, level, hasChildren);
    
            if (level > currentLevel) {
                // 階層が深くなった場合、新しい子コンテナを作成
                const childContainer = document.createElement("div");
                childContainer.className = "toc-children";
                childContainer.style.display = "none";
                currentList.appendChild(childContainer);
                currentList = childContainer;
            } else if (level < currentLevel) {
                // 階層が上がる場合、必要な分だけ親コンテナへ戻る
                while (currentLevel > level) {
                    if (!currentList.parentElement || currentList === container) {
                        // 親が存在しない場合はルートコンテナにリセットして許容する
                        console.warn("ルートコンテナに到達したため、現在の要素をルートにリセットします。");
                        currentList = container;
                        currentLevel = level;
                        break;
                    }
                    currentList = currentList.parentElement;
                    currentLevel--;
                }
            }
            // 現在のリストに見出しを追加
            currentList.appendChild(tocItem);
            // 現在のレベルを更新
            currentLevel = level;
        });
    
        return container;
    }
    
    const tocContainer = document.getElementById("tocContent");
    tocContainer.innerHTML = ""; // Clear existing content
    const tocTree = buildTocTree(bookData.paragraphs);
    tocContainer.appendChild(tocTree);
}

