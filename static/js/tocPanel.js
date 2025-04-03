function initTocPanel() {
  console.log("Initializing TOC Panel");
}

function showToc(isTrans) {
  const paragraphs = bookData.paragraphs;
  const tbody = document.querySelector(".tocTable tbody");

  if (!paragraphs || paragraphs.length === 0) {
    tbody.innerHTML = "";
  } else {
    const tocTree = buildTocTree(paragraphs);
    tbody.innerHTML = renderTocTableRows(tocTree);
    expandUpToLimit(30);    
  }
}

function renderTocTableRows(tocNode) {
  const rows = [];

  function walk(node, parentId = null) {
    if (node.block_tag !== "h0") {
      const hasChildren = node.children && node.children.length > 0;
      const rowId = `toc-row-${node.id}`;
      const nestLevelClass = `nest-level-${node.nestLevel}`;
      const rowClass = parentId ? `child-of-${parentId}` : "";

      const toggleMarker = hasChildren
        ? `<span class="toc-toggle ${nestLevelClass}" data-target="${node.id}"></span>`
        : `<span class="toc-toggle-blank ${nestLevelClass}"></span>`;

      rows.push(`
        <tr id="${rowId}" class="${rowClass}" data-id="${node.id}" data-parent="${parentId || ""}" data-nest-level="${node.nestLevel}" data-open="true">
          <td class="toc-page">${node.page}</td>
          <td class="toc-src toc-${node.block_tag}">
            ${toggleMarker}<a href="#id${node.id}">${node.src_text}</a>
          </td>
          <td class="toc-trans toc-${node.block_tag}">
            ${toggleMarker}<a href="#id${node.id}">${node.trans_text}</a>
          </td>
        </tr>
      `);
    }

    for (const child of node.children || []) {
      walk(child, node.id);
    }
  }

  walk(tocNode);
  return rows.join("\n");
}


function buildTocTree(paragraphs) {
  const headlines = paragraphs.filter(p => /^h[1-6]$/.test(p.block_tag));

  const root = {
    id: -1,
    page: -1,
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
      id: headline.id,
      page: headline.page,
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
    updateDescendantVisibility(row.dataset.id);
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
