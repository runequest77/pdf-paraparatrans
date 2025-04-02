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
  
    function walk(node) {
      if (node.block_tag !== "h0") { // skip root
  
        rows.push(`
          <tr>
            <td class="toc-page">${node.page}</td>
            <td class="toc-src toc-${node.block_tag}"><a href="#id${node.id}">${node.src_text}</a></td>
            <td class="toc-trans toc-${node.block_tag}"><a href="#id${node.id}">${node.trans_text}</a></td>
          </tr>
        `);
      }
  
      for (const child of node.children || []) {
        walk(child);
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

