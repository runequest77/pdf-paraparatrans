function initTocPanel() {
    console.log("Initializing TOC Panel");



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

function showToc(isTrans) {
    const tocContainer = document.getElementById("tocContent");
    if (!bookData || !bookData.paragraphs ) {
        console.warn("Book data is not available.");
        return;
    }
    if (window.autoToggle.getState("toggleTocPanel") === true) {
        tocContainer.innerHTML = "";
        const tocTree = buildTocTree(bookData.paragraphs, isTrans);
        tocContainer.appendChild(tocTree);
    }
}

function buildTocTree(paragraphs, isTrans) {
    if (!paragraphs || paragraphs.length === 0) {
        return;
    }

    const container = document.createElement("div");

    // 見出しレベルの初期値を、存在する最小の block_tag にする
    const headingLevels = paragraphs
        .filter(p => /^h[1-6]$/.test(p.block_tag))
        .map(p => parseInt(p.block_tag.replace("h", "")));

    const currentLevel = headingLevels.length > 0 ? Math.min(...headingLevels) : 1;

    let currentList = container;
    let currentLvl = currentLevel;

    paragraphs.forEach((p, index) => {
        if (!/^h[1-6]$/.test(p.block_tag)) {
            return;
        }

        const level = parseInt(p.block_tag.replace("h", ""));
        const hasChildren = paragraphs.slice(index + 1).some(next => {
            return /^h[1-6]$/.test(next.block_tag) && parseInt(next.block_tag.replace("h", "")) > level;
        });

        const tocItem = createTocItem(p, level, hasChildren, isTrans);

        if (level > currentLvl) {
            const childContainer = document.createElement("div");
            childContainer.className = "toc-children";
            childContainer.style.display = "none";
            currentList.appendChild(childContainer);
            currentList = childContainer;
        } else if (level < currentLvl) {
            while (currentLvl > level) {
                if (!currentList.parentElement || currentList === container) {
                    currentList = container;
                    currentLvl = level;
                    break;
                }
                currentList = currentList.parentElement;
                currentLvl--;
            }
        }

        currentList.appendChild(tocItem);
        currentLvl = level;
    });

    return container;
}

function createTocItem(p, level, hasChildren, isTrans) {
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
    item.textContent = isTrans ? p.trans_text : p.src_text; // 原文または訳文のテキスト

    // 見出しクリックで該当パラグラフにスクロールまたはページ遷移
    item.addEventListener("click", function () {
        // 👇 まず親の toc-children をすべて開く
        let parent = itemContainer.parentElement;
        while (parent && parent !== document) {
            if (parent.classList.contains("toc-children")) {
                parent.style.display = "block";
                const toggleIcon = parent.previousElementSibling?.querySelector(".toggle-icon");
                if (toggleIcon) toggleIcon.textContent = "▼"; // アイコンも開いた状態に
            }
            parent = parent.parentElement;
        }
    
        // 👇 既存のページ遷移とスクロール処理
        if (p.page !== currentPage) {
            jumpToPage(p.page);
            setTimeout(() => {
                const targetParagraph = document.getElementById(`paragraph-${p.id}`);
                if (targetParagraph) {
                    targetParagraph.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                    console.error(`Element with ID paragraph-${p.id} not found.`);
                }
            }, 500);
        } else {
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

document.addEventListener("click", function (event) {
    const link = event.target.closest(".toc-src a, .toc-trans a");
    if (!link) return;
  
    event.preventDefault();
    const id = parseInt(link.dataset.id);
    const page = parseInt(link.dataset.page);
  
    const scrollAndSet = () => {
      const el = document.getElementById(`paragraph-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const all = Array.from(document.querySelectorAll(".paragraph-box"));
        const index = all.indexOf(el);
        if (index !== -1) {
          setCurrentParagraph(index);
        }
      }
    };
  
    if (page !== currentPage) {
      jumpToPage(page);
      setTimeout(scrollAndSet, 500); // ページ描画完了待ち
    } else {
      scrollAndSet();
    }
  });
  