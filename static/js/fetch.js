async function fetchBookData() {
    try {
        let response = await fetch(`/api/book_data/${encodeURIComponent(pdfName)}`);
        bookData = await response.json();
        
        document.getElementById("titleInput").value = bookData.title;
        document.getElementById("pageCount").innerText = bookData.page_count;

        updateTransStatusCounts(bookData.trans_status_counts);
        updateHeadStyles();
        showToc();
        jumpToPage(currentPage);
    } catch (error) {
        console.error("Error fetching book data:", error);
    }
}

function transPage() {
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
                console.log('翻訳が成功しました。');
            } else {
                console.error('エラー:', data.message);
                alert('翻訳エラー: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('翻訳中にエラーが発生しました。詳細はコンソールを確認してください。');
        })
        .finally(() => {
            // 成功・失敗に関わらず必ず実行
            fetchBookData();
        });
}

function transAllPages() {
    const totalPages = bookData.page_count;
    if (!confirm(`全 ${totalPages} ページを翻訳します。よろしいですか？`)) return;

    fetch(`/api/paraparatrans/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: '&start_page=' + encodeURIComponent(1) +
            '&end_page=' + encodeURIComponent(totalPages)
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === "ok") {
                console.log('翻訳が成功しました。');
            } else {
                console.error('エラー:', data.message);
                alert('翻訳エラー: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('翻訳中にエラーが発生しました。詳細はコンソールを確認してください。');
        })
        .finally(() => {
            // 成功・失敗に関わらず必ず実行
            fetchBookData();
        });
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
            alert("全対訳置換が成功しました");
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

function autoTagging() {
    fetch(`/api/auto_tagging/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            alert("自動タグ付けが成功しました");
            // 必要に応じて、book_data の再取得などを実施
            fetchBookData();
        } else {
            alert("自動タグ付けエラー: " + data.message);
        }
    })
    .catch(error => {
        console.error("autoTagging error:", error);
        alert("自動タグ付け中にエラーが発生しました");
    });
}

function dictCreate() {
    fetch(`/api/dict_create/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            alert("辞書生成が成功しました");
        } else {
            alert("辞書生成エラー: " + data.message);
        }
    })
    .catch(error => {
        console.error("autoTagging error:", error);
        alert("辞書生成中にエラーが発生しました");
    });
}

function dictTrans() {
    fetch(`/api/dict_trans/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            alert("辞書翻訳が成功しました");
        } else {
            alert("辞書翻訳エラー: " + data.message);
        }
    })
    .catch(error => {
        console.error("autoTagging error:", error);
        alert("辞書翻訳中にエラーが発生しました");
    });
}


// 順序再発行＆保存処理
function saveOrder() {
    const container = document.getElementById('srcParagraphs');
    const children = container.children;
    const orderList = [];

    for (let i = 0; i < children.length; i++) {
        const paragraphDiv = children[i];
        const idElem = paragraphDiv.querySelector('.paragraph-id');
        if (!idElem) continue;

        const pId = idElem.innerText.trim();
        const blockTag = paragraphDiv.querySelector('.block-tag')?.innerText.trim() || "";
        const groupClass = Array.from(paragraphDiv.classList).find(cls => cls.startsWith('group-id-'));
        const groupId = groupClass ? parseInt(groupClass.replace('group-id-', '')) : null;

        orderList.push({
            id: pId,
            order: i+1,
            block_tag: blockTag,
            group_id: groupId
        });
    }

    const formData = new URLSearchParams();
    formData.append('order_json', JSON.stringify(orderList));
    formData.append('title', document.getElementById('titleInput').value);

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
        // fetchBookData();
    })
    .catch(error => {
        console.error('Error saving order:', error);
        alert('ページ構造保存中にエラーが発生しました');
    });
}

// function saveOrder() {
//     const container = document.getElementById("srcParagraphs");
//     const boxes = Array.from(container.querySelectorAll('.paragraph-box'));
//     const newOrder = [];


    
//     for (let i = 0; i < boxes.length; i++) {
//         const div = boxes[i];
//         const id = parseInt(div.id.replace('paragraph-', ''));
//         const groupClass = Array.from(div.classList).find(cls => cls.startsWith('group-id-'));
//         const groupId = groupClass ? parseInt(groupClass.replace('group-id-', '')) : null;

//         newOrder.push({
//             id: id,
//             order: i,
//             group_id: groupId
//         });
//     }

//     fetch(`/api/update_order/${encodeURIComponent(pdfName)}`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ order: newOrder })
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.status === "ok") {
//             console.log("順序とグループ情報を保存しました");
//         } else {
//             alert("保存に失敗しました: " + data.message);
//         }
//     })
//     .catch(err => {
//         console.error("保存中にエラー:", err);
//         alert("保存中にエラーが発生しました");
//     });
// }



function exportHtml() {
    fetch(`/api/export_html/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: '' // 特に送信するデータがなければ空文字でOK
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            alert("対訳HTMLが正常に出力されました。");
        } else {
            alert("エラー: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error exporting HTML:", error);
        alert("対訳HTML出力中にエラーが発生しました");
    });
}
