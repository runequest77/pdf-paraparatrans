function initTocPanel() {
  console.log("Initializing TOC Panel");
}

function headlineParagraphs() {
  // bookData.pages{}をループして、各ページの段落を取得
  // その中から、block_tagがh1〜h6のものを抽出して、数値化したページ番号、order順で配列に格納する
  const headlines = [];

  for (const [page_number, page] of Object.entries(bookData["pages"])) {
    for (const [id, paragraphDict] of Object.entries(page["paragraphs"])) {
      if (/^h[1-6]$/.test(paragraphDict["block_tag"])) {
        headlines.push({
          rowId: paragraphDict["page_number"] + "_" + paragraphDict["id"],
          page_number: paragraphDict["page_number"],
          id: paragraphDict["id"],
          order: paragraphDict["order"] || 0,
          column_order: paragraphDict["column_order"] || 0,
          y0: paragraphDict["bbox"][1],
          block_tag: paragraphDict["block_tag"],
          src_text:paragraphDict["src_text"],
          trans_text:paragraphDict["trans_text"]
        });
      }
    }
  }

  // ページ番号とorder順でソート
  headlines.sort((a, b) => {
    if (a.page_number !== b.page_number) {
      return a.page_number - b.page_number; // ページ番号でソート
    }
    if (a.order !== b.order) return a.order - b.order;
    if (a.column_order !== b.column_order) return a.column_order - b.column_order;
    return a.y0 - b.y0;
  });

  return headlines;
}

function showToc(isTrans) {
  const tbody = document.querySelector(".tocTable tbody");

  const paragraphsArray = headlineParagraphs();
  
  if (paragraphsArray.length === 0) {
    tbody.innerHTML = "";
  } else {
    // 辞書の値を配列にして buildTocTree に渡す
    const tocTree = buildTocTree(paragraphsArray);
    tbody.innerHTML = renderTocTableRows(tocTree);
    expandUpToLimit(30);
  }
}

function renderTocTableRows(tocNode) {
  const rows = [];

  function walk(node, parentId = null) {
    if (node.block_tag !== "h0") {
      const hasChildren = node.children && node.children.length > 0;
      const rowId = `toc-row-${node.rowId}`;
      const nestLevelClass = `nest-level-${node.nestLevel}`;
      const rowClass = parentId ? `child-of-${parentId}` : "";

      const toggleMarker = hasChildren
        ? `<span class="toc-toggle ${nestLevelClass}" data-target="${node.rowId}"></span>`
        : `<span class="toc-toggle-blank ${nestLevelClass}"></span>`;

      rows.push(`
        <tr id="${rowId}" class="${rowClass}" data-row-id="${node.rowId}" data-id="${node.id}" data-parent="${parentId || ""}" data-nest-level="${node.nestLevel}" data-open="true">
          <td class="toc-page">${node.page_number}</td>
          <td class="toc-src toc-${node.block_tag}">
            ${toggleMarker}<a href="#" data-id="${node.id}" data-page-number="${node.page_number}">${node.src_text}</a>
          <td class="toc-trans toc-${node.block_tag}">
            ${toggleMarker}<a href="#" data-id="${node.id}" data-page-number="${node.page_number}">${node.trans_text}</a>
          </td>
        </tr>
      `);
    }

    for (const child of node.children || []) {
      walk(child, node.rowId);
    }
  }

  walk(tocNode);
  return rows.join("\n");
}


function buildTocTree(paragraphsArray) { // 引数を配列として受け取る
  // 配列をフィルタリング
  const headlines = paragraphsArray.filter(p => /^h[1-6]$/.test(p.block_tag));

  const root = {
    rowId: "-1_-1", // ルートノードのIDは特別扱い
    id: "-1", // ルートノードのIDは特別扱い
    page_number: "-1",
    block_tag: "h0",
    src_text: "src_root",
    trans_text: "trans_root",
    level: 0,
    nestLevel: 0,
    children: [],
  };

  const stack = [root];

  for (const headline of headlines) {
    const level = parseInt(headline.block_tag.slice(1));
    const node = {
      rowId: headline.rowId,
      id: headline.id,
      page_number: headline.page_number,
      block_tag: headline.block_tag,
      src_text: headline.src_text,
      trans_text: headline.trans_text,
      level,
      nestLevel: 0,
      children: [],
    };

    // 適切な親を探す
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    node.nestLevel = parent.nestLevel + 1; // nestLevel を決定
    parent.children.push(node);
    stack.push(node);
  }

  return root;
}

// トグルクリックイベント
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("toc-toggle")) {
    const toggleEl = e.target;
    const targetId = toggleEl.dataset.target;
    console.log("Toggle clicked:", targetId);
    const parentRow = document.querySelector(`#toc-row-${targetId}`);

    const wasOpen = parentRow.getAttribute("data-open") === "true";
    parentRow.setAttribute("data-open", wasOpen ? "false" : "true");

    updateDescendantVisibility(targetId);
  }
});

// 子の表示制御を再帰的に行う
function updateDescendantVisibility(parentId) {
  const parentRow = document.querySelector(`#toc-row-${parentId}`);
  const isOpen = parentRow.getAttribute("data-open") === "true";

  const childRows = document.querySelectorAll(`.child-of-${parentId}`);

  childRows.forEach(row => {
    const isDirectChild = row.dataset.parent === parentId;

    if (isOpen && isDirectChild) {
      row.style.display = "table-row";
    } else {
      row.style.display = "none";
    }

    // すべての子に対して data-open=false をセット（開いてる親でも孫は非表示にするため）
    row.setAttribute("data-open", "false");

    // 再帰的に孫以下の表示状態を更新
    updateDescendantVisibility(row.dataset.rowId);
  });
}

//目次を指定した閾値を超えるネストレベルまで展開する関数
function expandUpToLimit(maxCount = 20) {
  const rows = [...document.querySelectorAll(".tocTable tbody tr")];
  const nestLevelCounts = {};
  let total = 0;
  let maxNestLevel = 6;

  // 各ネストレベルごとの件数をカウント
  for (const row of rows) {
    const nestLevel = parseInt(row.dataset.nestLevel);
    nestLevelCounts[nestLevel] = (nestLevelCounts[nestLevel] || 0) + 1;
  }

  // maxCount を超えない最大のネストレベルを算出
  for (let nestLevel = 1; nestLevel <= 6; nestLevel++) {
    total += nestLevelCounts[nestLevel] || 0;
    if (total > maxCount) {
      maxNestLevel = nestLevel - 1;
      break;
    }
  }

  // 少なくともネストレベル1は表示する
  if (maxNestLevel < 1) {
    maxNestLevel = 1;
  }

  // 各行の表示・トグル状態を設定
  for (const row of rows) {
    const nestLevel = parseInt(row.dataset.nestLevel);
    const show = nestLevel <= maxNestLevel;
    const open = nestLevel < maxNestLevel; // maxNestLevel の行は閉じた状態にする

    row.style.display = show ? "table-row" : "none";
    row.setAttribute("data-open", show ? (open ? "true" : "false") : "false");
  }
}

document.addEventListener("click", function (event) {
  const link = event.target.closest(".toc-src a, .toc-trans a");
  if (!link) return;

  event.preventDefault();
  const id = link.dataset.id;
  const page_number = parseInt(link.dataset.pageNumber);

  const scrollTo = () => {
    const el = document.getElementById(`paragraph-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (page_number !== currentPage) {
    jumpToPage(page_number);
    setTimeout(scrollTo, 500); // ページ描画完了後にスクロール
  } else {
    scrollTo();
  }
});
