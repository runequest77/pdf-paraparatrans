async function fetchBookData() {
    try {
        let response = await fetch(`/api/book_data/${encodeURIComponent(pdfName)}`);
        bookData = await response.json();
        
        document.getElementById("titleInput").value = bookData.title;
        document.getElementById("pageCount").innerText = bookData.page_count;

        updateTransStatusCounts(bookData.trans_status_counts);
        updateHeadStyles();
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
    let container = document.getElementById('srcParagraphs');
    let children = container.children;
    let orderList = [];
    for (let i = 0; i < children.length; i++) {
        let idElem = children[i].querySelector('.paragraph-id');
        if (idElem) {
            let pId = idElem.innerText.trim();
            orderList.push({ id: pId, order: i + 1 });
        }
    }
    // orderListを /save_order に送信
    let formData = new URLSearchParams();
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
        alert('順序が保存されました');
        fetchBookData();
    })
    .catch(error => {
        console.error('Error saving order:', error);
        alert('順序保存中にエラーが発生しました');
    });
}

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
