function initTocPanel() {
    console.log("Initializing TOC Panel");
}


function showToc(isTrans) {

    const paragraphs = bookData.paragraphs; // 事前に取得されたデータを使用
    if (!paragraphs || paragraphs.length === 0) {
        document.querySelector(".tocTable tbody").innerHTML = "";
    } else {
        const tocTree = buildTocTree(bookData.paragraphs);  // 事前にツリー化されたノード
        const tableBodyHtml = renderTocTableRows(tocTree);
        document.querySelector(".tocTable tbody").innerHTML = tableBodyHtml;
    }
}

function renderTocTableRows(tocNode) {
  const rows = [];

  function walk(node, parentId = null) {
    if (node.block_tag !== "h0") {
      const hasChildren = node.children && node.children.length > 0;
      const rowId = `toc-row-${node.id}`;
      const rowClass = [
        parentId ? `child-of-${parentId}` : "",
        hasChildren ? "has-children" : "",
        parentId > 1 ? "collapsed" : "", // ← level2以上は折りたたみ
      ].join(" ");

      const toggleMarker = hasChildren
      ? `<span class="toc-toggle collapsed" data-target="${node.id}"></span>`
      : `<span class="toc-toggle-blank"></span>`;

      rows.push(`
        <tr id="${rowId}" class="${rowClass}" data-id="${node.id}" data-parent="${parentId || ""}">
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

    //block_tagがh1~h6のパラグラフをheadlinesとして取得
    const headlines = paragraphs.filter(p => /^h[1-6]$/.test(p.block_tag));

    const root = {
        id: -1,
        page: -1,
        block_tag: "h0",
        src_text: "src_root",
        trans_text: "trans_root",
        level: 0,
        children: []
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
            level: level,
            children: [],
        };
    
        // スタックを上から見て、親としてふさわしいノードを探す
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
    
        const parent = stack[stack.length - 1];
        parent.children.push(node);
    
        stack.push(node);
      }
    
      return root;    
}

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("toc-toggle")) {
    const toggleEl = e.target;
    const targetId = toggleEl.dataset.target;
    const parentRow = document.querySelector(`#toc-row-${targetId}`);
    const isNowCollapsed = parentRow.classList.toggle("collapsed");

    const childRows = document.querySelectorAll(`.child-of-${targetId}`);

    if (isNowCollapsed) {
      hideDescendants(targetId);
      toggleEl.classList.remove("expanded");
      toggleEl.classList.add("collapsed");
    } else {
      childRows.forEach(row => {
        const isDirectChild = row.dataset.parent === targetId;
        if (isDirectChild) {
          row.style.display = "table-row";
          row.classList.remove("collapsed");

          const marker = row.querySelector(".toc-toggle");
          if (marker && row.classList.contains("has-children")) {
            marker.classList.add("expanded");
            marker.classList.remove("collapsed");
          }
        } else {
          const marker = row.querySelector(".toc-toggle");
          if (marker && row.classList.contains("has-children")) {
            marker.classList.remove("expanded");
            marker.classList.add("collapsed");
          }
        }
      });

      toggleEl.classList.add("expanded");
      toggleEl.classList.remove("collapsed");
    }
  }
});


function hideDescendants(parentId) {
  const stack = [parentId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    const childRows = document.querySelectorAll(`.child-of-${currentId}`);

    childRows.forEach(row => {
      row.style.display = 'none';
      row.classList.add('collapsed');

      const childId = row.dataset.id;
      stack.push(childId);

      const marker = row.querySelector(".toc-toggle");
      if (marker && row.classList.contains("has-children")) {
        marker.classList.remove("expanded");
        marker.classList.add("collapsed");
      }
    });
  }
}
