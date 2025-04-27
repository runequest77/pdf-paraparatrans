let selectedParagraphs = new Set(); // 選択されたパラグラフのIDを格納
// ページ内のパラグラフのインデックス
let currentParagraphIndex = 0;
//ページが編集されたことを表す変数
let isPageEdited = false;

function initSrcPanel() {
    $("#srcParagraphs").sortable({
    // ドラッグ用ハンドルのみ有効にするために handle オプションを指定
    handle: ".drag-handle",
        update: function (event, ui) {
            saveOrder();
        }
    });
}

// 編集ボックスの単文での翻訳
function onTransButtonClick(event, paragraph, divSrc) {
    transParagraph(paragraph, divSrc);
}

async function onSaveButtonClick(event, paragraph, divSrc, srcText, transText, blockTagSelect, blockTagSpan) {
    divSrc.classList.remove('editing');
    srcText.contentEditable = false;
    transText.contentEditable = false;
    divSrc.querySelector('.edit-ui').style.display = 'none';
    $("#srcParagraphs").sortable("enable");
    divSrc.style.cursor = 'move';

    const id = paragraph.id.toString();
    const selectedStatus = divSrc.querySelector(`input[name='status-${id}']:checked`);

    // bookData.paragraphsを直接更新
    if (bookData.paragraphs[id]) {
        bookData.paragraphs[id].src_text = srcText.innerHTML;
        bookData.paragraphs[id].trans_text = transText.innerHTML;
        bookData.paragraphs[id].block_tag = blockTagSelect.value;
        bookData.paragraphs[id].trans_status = selectedStatus ? selectedStatus.value : bookData.paragraphs[id].trans_status;
    } else {
        console.warn(`Paragraph with ID ${id} not found in bookData.paragraphs.`);
    }

    blockTagSpan.innerText = blockTagSelect.value;

    // パラグラフの背景をblock_tagに基づいて更新
    const blockTagClass = `block-tag-${blockTagSelect.value}`;
    divSrc.className = divSrc.className.replace(/block-tag-\S+/g, '').trim() + ` ${blockTagClass}`;

    const editBox = divSrc.querySelector('.edit-box');
    editBox.className = `edit-box status-${selectedStatus.value}`;

    //edit-box

// サーバー保存
    try {
        await saveParagraphData(bookData.paragraphs[id]);
        updateEditUiBackground(divSrc, bookData.paragraphs[id].trans_status);
    } catch (error) {
        console.error('Error saving paragraph:', error);
        alert('データ保存中にエラーが発生しました。詳細はコンソールを確認してください。');
    }
}

function onEditCancelClick(event, paragraph, divSrc, srcText, transText, blockTagSpan) {
    divSrc.classList.remove('editing');
    srcText.contentEditable = false;
    transText.contentEditable = false;
    divSrc.querySelector('.edit-ui').style.display = 'none';
    divSrc.querySelector('.edit-button').style.visibility = 'visible'; // visibilityを直接操作
    $("#srcParagraphs").sortable("enable");
    divSrc.style.cursor = 'move';

    srcText.innerHTML = paragraph.src_text;
    transText.innerHTML = paragraph.trans_text;
    paragraph.block_tag = blockTagSpan.innerText;

    // 元のtrans_statusに基づいて背景色を復元
    updateEditUiBackground(divSrc, paragraph.trans_status);
}

/** @function renderParagraphs */
function renderParagraphs() {
    let srcContainer = document.getElementById("srcParagraphs");
    srcContainer.style.display = 'none'; // チラつき防止にいったん非表示
    srcContainer.innerHTML = "";

    // bookData.paragraphs は辞書なので、値を取得してソートする
    const paragraphsArray = Object.values(bookData.paragraphs);
    paragraphsArray.sort((a, b) => (a.page === b.page ? a.order - b.order : a.page - b.page));

    // 現在のページに表示するパラグラフのみをフィルタリング（ソート後に実施）
    const currentPageParagraphs = paragraphsArray.filter(p => p.page === currentPage);

    for (let i = 0; i < currentPageParagraphs.length; i++) {
        let p = currentPageParagraphs[i];

        let divSrc = document.createElement("div");
        let blockTagClass = `block-tag-${p.block_tag}`;
        let joinClass = p.join === 1 ? 'visible' : ''; // 修正: visible クラスのみ使用

        let statusClass = `status-${p.trans_status}`;
        divSrc.className = `paragraph-box ${blockTagClass}`;

        // グループ情報に基づいてクラスを付与
        if (p.group_id) {
            const prev = currentPageParagraphs[i - 1];
            const next = currentPageParagraphs[i + 1];
            const sameGroupPrev = prev?.group_id === p.group_id;
            const sameGroupNext = next?.group_id === p.group_id;

            if (!sameGroupPrev && sameGroupNext) {
                divSrc.classList.add('group-start');
            } else if (sameGroupPrev && sameGroupNext) {
                divSrc.classList.add('group-middle');
            } else if (sameGroupPrev && !sameGroupNext) {
                divSrc.classList.add('group-end');
            } else {
                divSrc.classList.add('group-start', 'group-end');
            }

            divSrc.classList.add(`group-id-${p.group_id}`);
        }

        divSrc.id = `paragraph-${p.id}`;
        divSrc.innerHTML = `
            <div class='src-html'>${p.src_html}</div>
            <div class='src-text' data-original="${p.src_text}">${p.src_text}</div>
            <div class='src-replaced'>${p.src_replaced}</div>
            <div class='trans-auto'>${p.trans_auto}</div>
            <div class='trans-text' data-original="${p.trans_text}">${p.trans_text}</div>
            <div class='edit-box ${statusClass}'>
                <div class='join ${joinClass}'></div>
                <button class='edit-button'>...</button>
                <div class="drag-handle">
                    <span class='paragraph-id'>${p.id}</span>
                    <span class="block-tag">${p.block_tag}</span>
                </div>
                <div class='edit-ui ${statusClass}'>
                    <label>種別:
                        <select class="type-select">
                            <option value="p">p</option>
                            <option value="h1">h1</option>
                            <option value="h2">h2</option>
                            <option value="h3">h3</option>
                            <option value="h4">h4</option>
                            <option value="h5">h5</option>
                            <option value="h6">h6</option>
                            <option value="li">li</option>
                            <option value="ul">ul</option>
                            <option value="dd">dd</option>
                            <option value="header">header</option>
                            <option value="footer">footer</option>
                        </select>
                    </label>
                    <button class='trans-button'>自動翻訳</button>
                    <label><input type='radio' name='status-${p.id}' value='none'> 未翻訳</label>
                    <label><input type='radio' name='status-${p.id}' value='auto'> 自動翻訳</label>
                    <label><input type='radio' name='status-${p.id}' value='draft'> 下訳</label>
                    <label><input type='radio' name='status-${p.id}' value='fixed'> 確定</label>
                    <button class='save-button'>保存</button>
                </div>
            </div>
        `;
        srcContainer.appendChild(divSrc);

        // イベントリスナーの登録
        let editButton = divSrc.querySelector('.edit-button');
        let transButton = divSrc.querySelector('.trans-button');
        let saveButton = divSrc.querySelector('.save-button');
        let srcText = divSrc.querySelector('.src-text');
        let transText = divSrc.querySelector('.trans-text');
        let blockTagSelect = divSrc.querySelector('.type-select');
        let blockTagSpan = divSrc.querySelector('.block-tag');

        blockTagSelect.value = p.block_tag;
        let statusRadio = divSrc.querySelector(`input[name='status-${p.id}'][value='${p.trans_status}']`);
        if (statusRadio) { statusRadio.checked = true; }

        editButton.addEventListener('click', () => toggleEditUI(divSrc));
        transButton.addEventListener('click', (e) => onTransButtonClick(e, p, divSrc));
        saveButton.addEventListener('click', (e) => onSaveButtonClick(e, p, divSrc, srcText, transText, blockTagSelect, blockTagSpan));

        // ラジオボタンの変更イベントリスナーを追加
        addRadioChangeListener(divSrc, p);
    }

    window.autoToggle.dispatchAll();
    srcContainer.style.display = 'block'; // 再表示
}

function toggleSrcHtml(event) {
    const checked = event.target.checked;
    document.querySelectorAll('.src-html').forEach(el => {
        el.style.display = checked ? 'block' : 'none';
    });
}

function toggleSrc(event) {
    const checked = event.target.checked;
    document.querySelectorAll('.src-text').forEach(el => {
        el.style.display = checked ? 'block' : 'none';
    });
}

function toggleSrcReplaced(event) {
    const checked = event.target.checked;
    document.querySelectorAll('.src-replaced').forEach(el => {
        el.style.display = checked ? 'block' : 'none';
    });
}

function toggleTransAuto(event) {
    const checked = event.target.checked;
    document.querySelectorAll('.trans-auto').forEach(el => {
        el.style.display = checked ? 'block' : 'none';
    });
}

function toggleTrans(event) {
    const checked = event.target.checked;
    document.querySelectorAll('.trans-text').forEach(el => {
        el.style.display = checked ? 'block' : 'none';
    });
}

// 編集パラグラフのデータをJSONに保存
/** @function saveParagraphData */
async function saveParagraphData(paragraph) {
    try {
        const response = await fetch(`/api/update_paragraph/${encodeURIComponent(pdfName)}`, {
            method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
            body: JSON.stringify({
                paragraph_id: paragraph.id, // Ensure ID is sent correctly
                new_src_text: paragraph.src_text,
                new_trans_text: paragraph.trans_text,
                trans_status: paragraph.trans_status,
                block_tag: paragraph.block_tag
            })
        });
        const data = await response.json(); // await を追加

        console.log('Success:', data);

        if (data.status === "ok") {
            console.log('Success:', data);
            // サーバーへの保存が成功した場合のみクライアント側を更新
            // bookData.paragraphs は辞書なので直接更新
            if (bookData.paragraphs[paragraph.id.toString()]) {
                 Object.assign(bookData.paragraphs[paragraph.id.toString()], paragraph); // Update existing entry
            } else {
                 console.warn(`saveParagraphData: Paragraph with ID ${paragraph.id} not found in bookData.paragraphs during update.`);
            }
            updateTransStatusCounts(data.trans_status_counts); // サーバーからの最新カウントを使用
        } else {
            console.error('Error:', data.message);
            alert('データ保存中にエラーが発生しました: ' + data.message);
            // エラー時は元の状態に戻すなどの処理が必要な場合がある
        }
    } catch (error) { // catch ブロックを追加
        console.error('Error:', error);
        alert('データ保存中にエラーが発生しました。詳細はコンソールを確認してください。');
    }
}

// ラジオボタンの切り替えでedit-uiの背景色を変更
function updateEditUiBackground(divSrc, transStatus) {
    const editUi = divSrc.querySelector('.edit-ui');
    editUi.className = `edit-ui status-${transStatus}`;
}

// ラジオボタンの変更イベントを追加
function addRadioChangeListener(divSrc, paragraph) {
    const radios = divSrc.querySelectorAll(`input[name='status-${paragraph.id}']`);
    radios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const selectedStatus = event.target.value;
            updateEditUiBackground(divSrc, selectedStatus);
        });
    });
}

/** @function resetSelection */
function resetSelection() {
    document.querySelectorAll('.paragraph-box.selected').forEach(el => el.classList.remove('selected'));
}

/** @function selectParagraphRange */
// 範囲を指定してパラグラフを選択リストに追加
function selectParagraphRange(startIndex, endIndex) {
    const all = Array.from(document.querySelectorAll('.paragraph-box'));
    const [start, end] = [startIndex, endIndex].sort((a, b) => a - b);

    for (let i = 0; i < all.length; i++) {
        if (i >= start && i <= end) {
            all[i].classList.add('selected');
        } else {
            all[i].classList.remove('selected');
        }
    }
}

document.addEventListener('click', (event) => {
    document.querySelectorAll('.edit-ui').forEach(editUI => {
        if (editUI.style.display === 'block') {
            const paragraphBox = editUI.closest('.paragraph-box');
            // ✨ そのパラグラフ外をクリックしたらキャンセル
            if (!paragraphBox.contains(event.target)) {
                cancelEditUI(paragraphBox);
            }
        }
    });

    const paragraphBox = event.target.closest('.paragraph-box');
    if (!paragraphBox) return;

    const paragraphs = Array.from(document.querySelectorAll('.paragraph-box'));
    const clickedIndex = paragraphs.indexOf(paragraphBox);

    if (event.shiftKey) {
        // Shiftキーが押されている場合、範囲選択
        const currentIndex = currentParagraphIndex;
        selectParagraphRange(currentIndex, clickedIndex);
    } else if (event.ctrlKey) {
        // Ctrlキーが押されている場合、選択をトグル
        setCurrentParagraph(clickedIndex, event.shiftKey);
    } else {
        // 通常クリックの場合、選択をリセットしてカレントを変更
        resetSelection();
        setCurrentParagraph(clickedIndex, event.shiftKey);
    }
});

/** @function moveSelectedAfter */
// 選択されたパラグラフを指定されたIDの後ろに移動
function moveSelectedAfter(targetId) {
    const container = document.getElementById('srcParagraphs');
    const all = Array.from(container.querySelectorAll('.paragraph-box'));
    const selected = getSelectedParagraphsInOrder();
    const unselected = all.filter(p => !p.classList.contains('selected'));

    const result = [];
    let inserted = false;

    for (const p of unselected) {
        result.push(p);
        if (p.id === targetId) {
            result.push(...selected);
            inserted = true;
        }
    }

    if (!inserted) result.push(...selected); // 末尾に入れる

    // 再配置（すでに要素なので remove/append でOK）
    for (const p of result) {
        container.appendChild(p);
    }

    isPageEdited = true; // ページが編集されたことを示すフラグを立てる
}

/** @function moveSelectedBefore */
function moveSelectedBefore(targetId) {
    const container = document.getElementById('srcParagraphs');
    const all = Array.from(container.querySelectorAll('.paragraph-box'));
    const selected = getSelectedParagraphsInOrder();
    const unselected = all.filter(p => !p.classList.contains('selected'));

    const result = [];
    let inserted = false;

    for (const p of unselected) {
        if (p.id === targetId) {
            result.push(...selected); // ここで先に入れる（前に）
            inserted = true;
        }
        result.push(p);
    }

    if (!inserted) result.push(...selected); // 最後に挿入

    for (const p of result) {
        container.appendChild(p);
    }

    isPageEdited = true; // ページが編集されたことを示すフラグを立てる
}

/** @function moveSelectedByOffset 
 * 選択されたパラグラフ範囲を指定されたオフセット分だけ移動
 * 
 * ※ 実際には選択されたパラグラフではなく、その前後のパラグラフを操作する
*/
function moveSelectedByOffset(offset) {
    const container = document.getElementById('srcParagraphs');
    const all = Array.from(container.querySelectorAll('.paragraph-box'));
    const selected = getSelectedParagraphsInOrder();
    if (selected.length === 0) return;

    const firstIndex = all.indexOf(selected[0]);
    const lastIndex = all.indexOf(selected[selected.length - 1]);

    let targetIndex;
    if (offset < 0) {
        targetIndex = firstIndex - 1;
    } else {
        targetIndex = lastIndex + 1;
    }

    if (targetIndex < 0 || targetIndex >= all.length) return;

    const target = all[targetIndex];
    if (selected.includes(target)) return;

    if (offset < 0) {
        // 上へ → 前に挿入する
        moveSelectedBefore(target.id);
    } else {
        // 下へ → 後ろに挿入する
        moveSelectedAfter(target.id);
    }

    currentParagraphIndex = targetIndex;
    isPageEdited = true;

    // カレント行にスクロール
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** @function getSelectedParagraphsInOrder */
function getSelectedParagraphsInOrder() {
    return Array.from(document.querySelectorAll('.paragraph-box.selected'));
}

/** @function: updateBlockTagForSelected */
function updateBlockTagForSelected(blockTag) {
    const selected = getSelectedParagraphsInOrder();
    // 何も選択されていない場合はカレントレコードを更新
    if (selected.length === 0) {
        selected.push(document.querySelector('.paragraph-box.current'));
    }

    selected.forEach(div => {
        updateBlockTag(div, blockTag);
    });
}

/** @function: updateBlockTag */
function updateBlockTag(div, blockTag) {
    const idStr = div.id.replace('paragraph-', ''); // IDは文字列キーとして使用
    const p = bookData.paragraphs[idStr]; // 辞書アクセス
    if (!p) {
        console.error(`Paragraph with ID ${idStr} not found in bookData.paragraphs`);
        return;
    }
    
    p.block_tag = blockTag;

    const blockTagSpan = div.querySelector('.block-tag');
    const typeSelect = div.querySelector('.type-select');
    blockTagSpan.innerText = blockTag;
    if (typeSelect) typeSelect.value = blockTag;

    const currentStatus = p.trans_status;

    // クラス更新：既存の block-tag-* と status-* だけを更新
    div.classList.remove(
        ...Array.from(div.classList).filter(cls => cls.startsWith('block-tag-') || cls.startsWith('status-'))
    );
    div.classList.add(`block-tag-${blockTag}`, `status-${currentStatus}`);
    isPageEdited = true; // ページが編集されたことを示すフラグを立てる
}



function handleBlockTagShortcut(key) {
    const keyToTagMap = {
        '0': 'p',
        '1': 'h1',
        '2': 'h2',
        '3': 'h3',
        '4': 'h4',
        '5': 'h5',
        '6': 'h6',
        'p': 'p',
        'l': 'li',
        'u': 'ul',
        'd': 'dd',
        'h': 'header',
        'f': 'footer'
    };

    const tag = keyToTagMap[key.toLowerCase()];
    // 対象キー以外は無視される
    if (tag) {
        updateBlockTagForSelected(tag);
    }
}


function getAllParagraphs() {
    return Array.from(document.querySelectorAll('.paragraph-box'));
}

/** @function setCurrentParagraph 
 * 指定されたインデックスのパラグラフをカレントにする
*/
function setCurrentParagraph(index, isShiftHeld = false) {
    const paragraphs = getAllParagraphs();

    // 常にページ全体のパラグラフを処理
    paragraphs.forEach(p => {
        // カレントを解除
        p.classList.remove('current');
        if (!isShiftHeld) {
            // shiftキーが押されていなければ、選択を解除
            p.classList.remove('selected');
        }
    });

    index = Math.max(0, Math.min(index, paragraphs.length - 1));
    currentParagraphIndex = index;

    const current = paragraphs[currentParagraphIndex];

    if (!current) return; // インデックスが無効な場合は何もしない
    current.classList.add('current');
    current.classList.add('selected');

    current.scrollIntoView({ block: 'center', behavior: 'smooth' });

    // --- ここから追加 ---
    const paragraphIdStr = current.id.replace('paragraph-', '');
    const paragraphData = bookData.paragraphs[paragraphIdStr];

    // --- bbox を使うように修正 ---
    if (paragraphData && paragraphData.first_line_bbox && Array.isArray(paragraphData.first_line_bbox) && paragraphData.first_line_bbox.length === 4) {
        // pdfPanel.js の関数を呼び出してハイライト
        // highlightRectsOnPage は矩形の配列を期待するため、bbox を配列でラップする
        if (typeof highlightRectsOnPage === 'function') {
            // --- PDFビューアは常に1ページなので、ページ番号 1 を渡す ---
            highlightRectsOnPage(1, [paragraphData.first_line_bbox]);
            // --- 修正ここまで ---
        } else {
            console.warn("highlightRectsOnPage function is not defined in pdfPanel.js");
        }
    } else {
        // ハイライト情報がない場合は既存のハイライトをクリア
        if (typeof clearHighlights === 'function') {
            clearHighlights();
        }
        // console.warn(`Paragraph data or first_line_bbox not found for ID: ${paragraphIdStr}`);
    }
    // --- 修正ここまで ---
}

/*** @function toggleCurrentParagraphSelection */
function toggleCurrentParagraphSelection() {
    const paragraphs = getAllParagraphs();
    const current = paragraphs[currentParagraphIndex];
    current.classList.toggle('selected');
}

/** @function moveCurrentParagraphBy 
 * 現在のパラグラフを指定されたオフセット分だけ移動
 * expandSelection=true(通常はshiftキーが押されている場合)は選択範囲を拡張
*/
function moveCurrentParagraphBy(offset, expandSelection = false) {
    const paragraphs = getAllParagraphs();
    const nextIndex = currentParagraphIndex + offset;

    if (nextIndex < 0 || nextIndex >= paragraphs.length) return;

    if (expandSelection) {
        paragraphs[currentParagraphIndex].classList.add('selected');
        paragraphs[nextIndex].classList.add('selected');
    }

    setCurrentParagraph(nextIndex, expandSelection);
}

/** @function getSelectedParagraphsInOrder
 * 選択されたパラグラフに対するグループ化/解除
 */
function toggleGroupSelectedParagraphs() {
    const selected = getSelectedParagraphsInOrder();
    if (selected.length < 2) return;

    // 先頭のグループクラスとパラグラフidを取得
    const firstParagraphIdStr = selected[0].id.replace('paragraph-', '');
    const firstParagraph = bookData.paragraphs[firstParagraphIdStr]; // 辞書アクセス
    const firstGroupId = firstParagraph?.group_id; // 先頭のグループIDを取得 (数値またはundefined)
    const firstGroupIdStr = firstGroupId?.toString(); // クラス名比較用に文字列化

    // グループ化されているかどうかの判定（先頭要素がグループIDを持っているか）
    const isGrouped = !!firstGroupId;

    if (isGrouped) {
        // ✅ グループ解除：選択された要素が属するグループ全体を解除
        const all = getAllParagraphs(); // DOM要素のリスト
        all.forEach(div => {
            const idStr = div.id.replace('paragraph-', '');
            const p = bookData.paragraphs[idStr]; // 辞書アクセス
            // 解除対象のグループIDを持つパラグラフのデータを更新
            if (p && p.group_id === firstGroupId) {
                p.group_id = undefined; // または null
                // DOM要素のクラスも更新
                div.classList.remove(`group-id-${firstGroupIdStr}`, 'group-start', 'group-middle', 'group-end');
            }
        });
    } else {
        // ✅ グループ化：選択範囲を新しいグループにする
        // 新しいグループIDは選択範囲の先頭パラグラフのIDを使用 (文字列として)
        const newGroupId = firstParagraphIdStr;
        const newGroupClass = `group-id-${newGroupId}`;

        selected.forEach((div, index) => {
            const idStr = div.id.replace('paragraph-', '');
            const p = bookData.paragraphs[idStr]; // 辞書アクセス
            if (p) {
                p.group_id = newGroupId; // データ更新 (文字列IDをグループIDとして設定)
            }

            // 既存のgroup-idクラスを削除
            div.classList.remove(...Array.from(div.classList).filter(cls => cls.startsWith('group-id-')));
            // 新しいグループIDを追加
            div.classList.add(newGroupClass);
            if (index === 0) div.classList.add('group-start');
            else if (index === selected.length - 1) div.classList.add('group-end');
            else div.classList.add('group-middle');
        });
    }
    isPageEdited = true; // ページが編集されたことを示すフラグを立てる

}

/** @function toggleJoinForSelected
 * 選択されたパラグラフに対して join クラスをトグルする
 */
function toggleJoinForSelected() {
    const selectedParagraphs = getSelectedParagraphsInOrder(); // 選択されたパラグラフを取得
    if (selectedParagraphs.length === 0) {
        console.warn("選択されたパラグラフがありません。");
        return;
    }

    selectedParagraphs.forEach(divP => {
        const id = divP.id.replace('paragraph-', '');
        const p = bookData.paragraphs[id];
        const joinElement = divP.querySelector('.join');
        if (!joinElement) {
            console.warn(`パラグラフ ${divP.id} に join 要素が見つかりませんでした。`);
            return;
        }

        const isVisible = joinElement.classList.toggle('visible');
        p.join = isVisible ? 1 : 0; // データモデルを更新
    });

    isPageEdited = true; // ページが編集されたことを示すフラグを立てる
}


function toggleEditUI(divSrc) {
    const editUI = divSrc.querySelector('.edit-ui');
    if (!editUI) return;
    const isVisible = editUI && editUI.style.display === 'block';

    if (isVisible) {
        cancelEditUI(divSrc);
    } else {
        // 他を全部閉じる
        document.querySelectorAll('.edit-ui').forEach(ui => {
            const box = ui.closest('.paragraph-box');
            if (box !== divSrc) cancelEditUI(box);
        });

        divSrc.classList.add('editing');
        const srcText = divSrc.querySelector('.src-text');
        const transText = divSrc.querySelector('.trans-text');

        editUI.style.display = 'block';
        if (srcText) srcText.contentEditable = true;
        if (transText) transText.contentEditable = true;
        $("#srcParagraphs").sortable("disable");
        divSrc.style.cursor = 'text';
    }
}

function cancelEditUI(divSrc) {
    const editUI = divSrc.querySelector('.edit-ui');
    if (!editUI || editUI.style.display !== 'block') return;
    editUI.style.display = 'none';

    divSrc.classList.remove('editing');
    const srcText = divSrc.querySelector('.src-text');
    const transText = divSrc.querySelector('.trans-text');
    const editButton = divSrc.querySelector('.edit-button');
    if (srcText) {
        srcText.contentEditable = false;
        srcText.innerHTML = srcText.dataset.original;
    }
    if (transText) {
        transText.contentEditable = false;
        transText.innerHTML = transText.dataset.original;
    }
    // if (editButton) editButton.style.visibility = 'visible';
    $("#srcParagraphs").sortable("enable");
    divSrc.style.cursor = 'move';
}

/** @function focusNearestHeading */
function focusNearestHeading(direction) {
    const paragraphs = getAllParagraphs();
    let index = currentParagraphIndex;

    while (true) {
        index += direction;

        // 範囲外に出た場合
        if (index < 0) {
            console.warn('見出しが見つかりませんでした。先頭に移動します。');
            setCurrentParagraph(0); // 先頭パラグラフに移動
            return;
        }
        if (index >= paragraphs.length) {
            console.warn('見出しが見つかりませんでした。末尾に移動します。');
            setCurrentParagraph(paragraphs.length - 1); // 末尾パラグラフに移動
            return;
        }

        const paragraph = paragraphs[index];
        const idStr = paragraph.id.replace('paragraph-', '');
        const p = bookData.paragraphs[idStr]; // 辞書アクセス

        // 見出し (h1 ～ h6) の場合に移動
        if (p && /^h[1-6]$/.test(p.block_tag)) {
            setCurrentParagraph(index);
            return;
        }
    }
}

/** @function selectUntilNextHeading */
function selectUntilNextHeading() {
    const paragraphs = getAllParagraphs();
    let index = currentParagraphIndex;
    let foundHeading = false;

    while (index < paragraphs.length - 1) {
        index++;

        const paragraph = paragraphs[index];
        const idStr = paragraph.id.replace('paragraph-', '');
        const p = bookData.paragraphs[idStr]; // 辞書アクセス

        // 見出し (h1 ～ h6) に到達したら終了
        if (p && /^h[1-6]$/.test(p.block_tag)) {
            foundHeading = true;
            break;
        }

        // 選択状態にする
        paragraph.classList.add('selected');
    }

    // 見出しが見つからなければ末尾行まで選択
    if (!foundHeading) {
        for (let i = currentParagraphIndex + 1; i < paragraphs.length; i++) {
            paragraphs[i].classList.add('selected');
        }
    } else {
        // 見出しが見つかった場合、カレント行を見出しの手前に設定
        index--;
    }

    // 選択範囲の末尾をカレントにしてフォーカス
    setCurrentParagraph(index, true);
}

/** @function selectUntilPreviousHeading */
function selectUntilPreviousHeading() {
    const paragraphs = getAllParagraphs();
    let index = currentParagraphIndex;
    let foundHeading = false;

    while (index > 0) {
        index--;

        const paragraph = paragraphs[index];
        const idStr = paragraph.id.replace('paragraph-', '');
        const p = bookData.paragraphs[idStr]; // 辞書アクセス

        // 見出し (h1 ～ h6) に到達したら終了
        if (p && /^h[1-6]$/.test(p.block_tag)) {
            foundHeading = true;
            break;
        }

        // 選択状態にする
        paragraph.classList.add('selected');
    }

    // 見出しが見つからなければ先頭行まで選択
    if (!foundHeading) {
        for (let i = 0; i < currentParagraphIndex; i++) {
            paragraphs[i].classList.add('selected');
        }
    }

    // 選択範囲の先頭をカレントにしてフォーカス
    setCurrentParagraph(index, true);
}
