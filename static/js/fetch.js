async function fetchBookData() {
    try {
        let response = await fetch(`/api/book_data/${encodeURIComponent(pdfName)}`);
        if (response.status === 206) {
            confirm("まだパラグラフ抽出がされていません。"); // ユーザーへの通知
            return;
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        bookData = await response.json();

        document.getElementById("titleInput").value = bookData.title;
        document.getElementById("pageCount").innerText = bookData.page_count;

        updateTransStatusCounts(bookData.trans_status_counts); // この関数も辞書対応が必要か確認
        updateBookStyles();
        showToc();
        jumpToPage(currentPage);
    } catch (error) {
        console.error("Error fetching book data:", error);
        alert("書籍データの取得中にエラーが発生しました。"); // ユーザーへの通知
    }
}

/** @function transPage */
async function transPage() {
    await saveCurrentPageOrder(); // 順序を保存してから翻訳 (saveOrderもasyncにする必要あり)
    if (!confirm("現在のページを翻訳します。よろしいですか？")) return;

    try {
        const response = await fetch(`/api/paraparatrans/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: '&start_page=' + encodeURIComponent(currentPage) +
                '&end_page=' + encodeURIComponent(currentPage)
        });
        const data = await response.json();
        if (data.status === "ok") {
            console.log('翻訳が成功しました。');
        } else {
            console.error('エラー:', data.message);
            alert('翻訳エラー(response): ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('翻訳中にエラー(catch)');
    } finally {
        // 成功・失敗に関わらず必ず実行
        await fetchBookData(); // fetchBookDataもasyncなのでawait
    }
}

async function transAllPages() {
    const totalPages = bookData.page_count;
    if (!confirm(`全 ${totalPages} ページを翻訳します。よろしいですか？`)) return;
    await saveCurrentPageOrder(); // saveOrderもasyncにする必要あり

    try {
        const response = await fetch(`/api/paraparatrans/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: '&start_page=' + encodeURIComponent(1) +
                '&end_page=' + encodeURIComponent(totalPages)
        });
        const data = await response.json();
        if (data.status === "ok") {
            console.log('翻訳が成功しました。');
        } else {
            console.error('エラー:', data.message);
            alert('翻訳エラー(response): ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('翻訳中にエラー(catch)');
    } finally {
        // 成功・失敗に関わらず必ず実行
        await fetchBookData(); // fetchBookDataもasyncなのでawait
    }
}

async function extractParagraphs(){
    if(!confirm("PDFを解析してJSONを新規生成します。よろしいですか？")) return;
    let form = new FormData();
    try {
        const response = await fetch(`/api/extract_paragraphs/${encodeURIComponent(pdfName)}`, {
            method: "POST",
            body: form
        });
        const res = await response.json();
        if(res.status === "ok"){
            alert("パラグラフ抽出完了");
            location.reload(); // リロード前にfetchBookDataを呼ぶ意味は薄い
            // await fetchBookData(); // 必要ならリロード後に実行されるようにする
        } else {
            alert(res.message);
        }
    } catch (error) {
        console.error("extractParagraphs error:", error);
        alert("パラグラフ抽出中にエラーが発生しました。");
    }
}

async function dictReplaceAll() {
    let msg = "全ページに対して対訳辞書による置換を行います";
    msg += "\nこの処理は時間がかかります。";
    msg += "\n応答がなくてもページを閉じないでください。";
    msg += "\n\nよろしいですか？";
    if (!confirm(msg)) return;

    try {
        const response = await fetch(`/api/dict_replace_all/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await response.json();
        if (data.status === "ok") {
            await fetchBookData(); // fetchBookDataもasyncなのでawait
            alert("全対訳置換が成功しました");
        } else {
            console.error("対訳置換エラー:", data.message);
            alert("対訳置換エラー: " + data.message);
        }
    } catch (error) {
        console.error("dictReplaceAllエラー:", error);
        alert("dictReplaceAll エラー: " + error);
    }
}

async function autoTagging() {
    try {
        const response = await fetch(`/api/auto_tagging/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await response.json();
        if (data.status === "ok") {
            alert("自動タグ付けが成功しました");
            await fetchBookData(); // fetchBookDataもasyncなのでawait
        } else {
            alert("自動タグ付けエラー: " + data.message);
        }
    } catch (error) {
        console.error("autoTagging error:", error);
        alert("自動タグ付け中にエラーが発生しました");
    }
}

async function joinReplacedParagraphs() {
    try {
        const response = await fetch(`/api/join_replaced_paragraphs/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await response.json();
        if (data.status === "ok") {
            alert("置換文結合成功しました\n再読み込みを行います");
            await fetchBookData(); // fetchBookDataもasyncなのでawait
        } else {
            alert("置換文結合エラー: " + data.message);
        }
    } catch (error) {
        console.error("autoTagging error:", error);
        alert("置換文結合中にエラーが発生しました");
    }
}

async function dictCreate() {
    try {
        const response = await fetch(`/api/dict_create/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await response.json();
        if (data.status === "ok") {
            alert("辞書生成が成功しました");
        } else {
            alert("辞書生成エラー: " + data.message);
        }
    } catch (error) {
        console.error("dictCreate error:", error); // エラーログのタイポ修正
        alert("辞書生成中にエラーが発生しました");
    }
}

async function dictTrans() {
    try {
        const response = await fetch(`/api/dict_trans/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await response.json();
        if (data.status === "ok") {
            alert("辞書翻訳が成功しました");
        } else {
            alert("辞書翻訳エラー: " + data.message);
        }
    } catch (error) {
        console.error("dictTrans error:", error); // エラーログのタイポ修正
        alert("辞書翻訳中にエラーが発生しました");
    }
}

/** * @function updateTransStatusCounts
 * @param {Object} counts - 翻訳ステータスのカウントオブジェクト
 * ページ内順序再発行＆保存処理
 */
async function saveCurrentPageOrder() {
    const container = document.getElementById('srcParagraphs');
    const children = container.children;
    sendParagraphs = [];

    // ページ内のパラグラフをループして、順序を取得
    for (let i = 0; i < children.length; i++) {
        const divP = children[i];
        const idElem = divP.querySelector('.paragraph-id');
        if (!idElem) continue;

        const id = idElem.innerText.trim();
        const groupClass = Array.from(divP.classList).find(cls => cls.startsWith('group-id-'));
        // group_id は文字列として扱う（数値にパースしない）
        const groupId = groupClass ? groupClass.replace('group-id-', '') : undefined;

        paragraphDict = bookData["pages"][currentPage]["paragraphs"][id];
        // 本当はpを更新してるのでorder以外の更新は不要
        if (paragraphDict) {
            paragraphDict.order = i + 1; // 1-based index
            // bookData["pages"][currentPage]["paragraphs"][id].block_tag = blockTag;
            paragraphDict.group_id = groupId;
        } else {
            throw new Error(`saveOrder: Paragraph data not found for ID ${currentPage} ${id} in paragraphs`);
        }

        // 送信用配列にデータを追加
        sendParagraphs.push(
            {
                id: id,
                page_number: paragraphDict.page_number,
                order: paragraphDict.order,
                block_tag: paragraphDict.block_tag,
                group_id: paragraphDict?.group_id,
                join: paragraphDict?.join
            }
        );
    }

    console.log("saveOrder: Sending updates:", sendParagraphs.length);
    await updateParagraphs(sendParagraphs); // updateParagraphsもasyncなのでawait
}

async function exportHtml() {
    await saveCurrentPageOrder(); // saveOrderもasyncにする必要あり
    try {
        const response = await fetch(`/api/export_html/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: '' // 特に送信するデータがなければ空文字でOK
        });
        const data = await response.json();
        if (data.status === "ok") {
            alert("対訳HTMLが正常に出力されました。");
        } else {
            alert("エラー: " + data.message);
        }
    } catch (error) {
        console.error("Error exporting HTML:", error);
        alert("対訳HTML出力中にエラーが発生しました");
    }
}

// updateParagraphs も fetch を使うので async にする
async function updateParagraphs(sendParagraphs, title = null) {
    const payload = {
        paragraphs: sendParagraphs,
        title: title || document.getElementById('titleInput').value
    };

    try {
        const response = await fetch(`/api/update_paragraphs/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.status === "ok") {
            isPageEdited = false;
            console.log("パラグラフ更新が成功しました");
        } else {
            console.error("パラグラフ更新エラー:", data.message);
            alert("パラグラフ更新エラー: " + data.message);
        }
    } catch (error) {
        console.error("パラグラフ更新中にエラーが発生しました:", error);
        alert("パラグラフ更新中にエラーが発生しました");
    }
}

async function transParagraph(paragraph, divSrc) {
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: paragraph.src_replaced })
        });
        const data = await response.json();
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
    } catch (error) {
        // ユーザーにポップアップでエラーを通知
        console.error('Error:', error);
        alert('翻訳中にエラーが発生しました。詳細はコンソールを確認してください。');
    }
}

async function updateBookInfo() {
    try {
        const payload = {
            title: document.getElementById('titleInput').value,
            page_count: bookData.page_count, // ページ数を追加
            trans_status_counts: bookData.trans_status_counts // 翻訳ステータスカウントを追加
        };        
        const response = await fetch(`/api/update_book_info/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.status === "ok") {
            console.log("文書情報が正常に更新されました。");
        } else {
            console.error("文書情報更新エラー:", data.message);
            alert("文書情報更新エラー: " + data.message);
        }
    } catch (error) {
        console.error("文書情報更新中にエラーが発生しました:", error);
        alert("文書情報更新中にエラーが発生しました。");
    }
}