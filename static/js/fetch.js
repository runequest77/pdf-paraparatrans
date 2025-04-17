async function fetchBookData() {
    try {
        let response = await fetch(`/api/book_data/${encodeURIComponent(pdfName)}`);
        bookData = await response.json();
        
        document.getElementById("titleInput").value = bookData.title;
        document.getElementById("pageCount").innerText = bookData.page_count;

        // bookData.paragraphs は既に辞書形式で取得されるため、paragraphMap の作成は不要
        // if (bookData.paragraphs && typeof bookData.paragraphs === 'object' && !Array.isArray(bookData.paragraphs)) {
        //     console.log("bookData.paragraphs is a dictionary.");
        // } else {
        //     console.warn("bookData.paragraphs is not a dictionary or is missing.");
        //     // 必要であればエラーハンドリングやデータ形式変換を行う
        // }

        updateTransStatusCounts(bookData.trans_status_counts); // この関数も辞書対応が必要か確認
        updateHeadStyles();
        showToc();
        jumpToPage(currentPage);
    } catch (error) {
        console.error("Error fetching book data:", error);
    }
}

/** @function transPage */
function transPage() {
    saveOrder(); // 順序を保存してから翻訳
    if (!confirm("現在のページを翻訳します。よろしいですか？")) return;

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
                alert('翻訳エラー(response): ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('翻訳中にエラー(catch)');
        })
        .finally(() => {
            // 成功・失敗に関わらず必ず実行
            fetchBookData();
        });
}

function transAllPages() {
    const totalPages = bookData.page_count;
    if (!confirm(`全 ${totalPages} ページを翻訳します。よろしいですか？`)) return;
    saveOrder();

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
                alert('翻訳エラー(response): ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('翻訳中にエラー(catch)');
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

/** * @function updateTransStatusCounts
 * @param {Object} counts - 翻訳ステータスのカウントオブジェクト
 * ページ内順序再発行＆保存処理
 */
function saveOrder() {
    const container = document.getElementById('srcParagraphs');
    const children = container.children;
    const updatesDict = {}; // 配列ではなく辞書を作成

    // ページ内のパラグラフをループして、順序を取得
    for (let i = 0; i < children.length; i++) {
        const paragraphDiv = children[i];
        const idElem = paragraphDiv.querySelector('.paragraph-id');
        if (!idElem) continue;

        const pIdStr = idElem.innerText.trim(); // IDは文字列キーとして扱う
        const blockTag = paragraphDiv.querySelector('.block-tag')?.innerText.trim() || "p"; // デフォルトを 'p' に
        const groupClass = Array.from(paragraphDiv.classList).find(cls => cls.startsWith('group-id-'));
        // group_id は文字列として扱う（数値にパースしない）
        const groupId = groupClass ? groupClass.replace('group-id-', '') : undefined;
        // join は数値として扱う（空文字やNaNの場合は 0 とする）
        const joinStr = paragraphDiv.querySelector('.join')?.innerText.trim() || "0";
        const join = parseInt(joinStr, 10);
        const finalJoin = isNaN(join) ? 0 : join; // パース失敗時は 0

        // クライアント側の bookData.paragraphs (辞書) を直接更新
        if (bookData.paragraphs[pIdStr]) {
            bookData.paragraphs[pIdStr].order = i + 1; // 1-based index
            bookData.paragraphs[pIdStr].block_tag = blockTag;
            bookData.paragraphs[pIdStr].group_id = groupId; // 文字列またはundefined
            bookData.paragraphs[pIdStr].join = finalJoin; // 数値
        } else {
            console.warn(`saveOrder: Paragraph data not found for ID ${pIdStr} in bookData.paragraphs`);
        }

        // 送信用辞書にデータを追加
        updatesDict[pIdStr] = {
            // id はキーに含まれるので不要
            order: i + 1,
            block_tag: blockTag,
            group_id: groupId, // 文字列またはundefined
            join: finalJoin // 数値
        };
    }

    // updatesDict が空でない場合のみ送信
    if (Object.keys(updatesDict).length === 0) {
        console.log("saveOrder: No changes detected.");
        return;
    }
    console.log("saveOrder: Sending updates:", updatesDict);
    updateParagraphs(updatesDict); // 辞書を渡す
    isPageEdited = false; // 保存したので編集フラグをリセット
}

function exportHtml() {
    saveOrder(); // 順序を保存してからHTMLをエクスポート
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

function updateParagraphs(updates, title = null) {
    const payload = {
        updates: updates,
        title: title || document.getElementById('titleInput').value
    };

    fetch(`/api/update_paragraphs/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            console.log("パラグラフ更新が成功しました");
        } else {
            console.error("パラグラフ更新エラー:", data.message);
            alert("パラグラフ更新エラー: " + data.message);
        }
    })
    .catch(error => {
        console.error("パラグラフ更新中にエラーが発生しました:", error);
        alert("パラグラフ更新中にエラーが発生しました");
    });
}

function transParagraph(paragraph, divSrc) {
    fetch('/api/translate', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: paragraph.src_replaced })
    })
        .then(response => response.json())
        .then(data => {
            console.log("翻訳結果:", data.translated_text);
            if (data.status === "ok") {
                paragraph.trans_auto = data.translated_text;
                paragraph.trans_text = data.translated_text;
                paragraph.trans_status = "auto";
                divSrc.querySelector('.trans-auto').innerHTML = paragraph.trans_auto;
                divSrc.querySelector('.trans-text').innerHTML = paragraph.trans_text;
                let autoRadio = divSrc.querySelector(`input[name='status-${paragraph.id}'][value='auto']`);
                if (autoRadio) { autoRadio.checked = true; }
            } else {
                console.error("パラグラフ更新エラー:", data.message);
                alert("パラグラフ更新エラー: " + data.message);
            }
        })
        .catch(
            // ユーザーにポップアップでエラーを通知
            error => {
                console.error('Error:', error);
                alert('翻訳中にエラーが発生しました。詳細はコンソールを確認してください。');
            }
        );
}
