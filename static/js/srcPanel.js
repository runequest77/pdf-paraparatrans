let selectedParagraphs = new Set(); // 選択されたパラグラフのIDを格納

function initSrcPanel() {
    // ドラッグ用ハンドルのみ有効にするために handle オプションを指定
    $("#srcParagraphs").sortable({
        handle: ".drag-handle"
    });
}

// 編集ボックスの単文での翻訳
function onTransButtonClick(event, paragraph, divSrc) {
    fetch('/api/translate', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: paragraph.src_replaced })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            paragraph.trans_auto = data.translation;
            paragraph.trans_text = data.translation;
            paragraph.trans_status = "auto";
            divSrc.querySelector('.trans-auto').innerHTML = paragraph.trans_auto;
            divSrc.querySelector('.trans-text').innerHTML = paragraph.trans_text;
            let autoRadio = divSrc.querySelector(`input[name='status-${paragraph.id}'][value='auto']`);
            if (autoRadio) { autoRadio.checked = true; }
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

// 編集ボックスの保存
function onSaveButtonClick(event, paragraph, divSrc, srcText, transText, blockTagSelect, blockTagSpan) {
    divSrc.classList.remove('editing');
    srcText.contentEditable = false;
    transText.contentEditable = false;
    divSrc.querySelector('.edit-ui').style.display = 'none';
    divSrc.querySelector('.edit-button').style.visibility = 'visible'; // visibilityを直接操作
    $("#srcParagraphs").sortable("enable");
    divSrc.style.cursor = 'move';

    let selectedStatus = divSrc.querySelector(`input[name='status-${paragraph.id}']:checked`);
    if (selectedStatus) {
        paragraph.trans_status = selectedStatus.value;
    }
    const prevIdInput = divSrc.querySelector('.prev-id-input');
    if (prevIdInput) {
        const parsed = parseInt(prevIdInput.value, 10);
        paragraph.prev_id = isNaN(parsed) ? undefined : parsed;
    }

    paragraph.src_text = srcText.innerHTML;
    paragraph.trans_text = transText.innerHTML;
    paragraph.block_tag = blockTagSelect.value;
    blockTagSpan.innerText = paragraph.block_tag;

    // パラグラフの背景をblock_tagに基づいて更新
    let blockTagClass = `block-tag-${paragraph.block_tag}`;
    divSrc.className = `paragraph-box ${blockTagClass} status-${paragraph.trans_status}`;
    
    // サーバー保存とクライアント更新を統合
    saveParagraphData(paragraph);
    updateEditUiBackground(divSrc, paragraph.trans_status);
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

    bookData.paragraphs.sort((a, b) => (a.page === b.page ? a.order - b.order : a.page - b.page));

    for (let i = 0; i < bookData.paragraphs.length; i++) {
        let p = bookData.paragraphs[i];
        if (p.page !== currentPage) continue;

        let divSrc = document.createElement("div");
        let blockTagClass = `block-tag-${p.block_tag}`;
        // prev_idがnullか自分自身でなければ、+マーカーを表示
        let joinClass = (p.prev_id || p.id) !== p.id ? 'show' : 'hide';

        let statusClass = `status-${p.trans_status}`;
        divSrc.className = `paragraph-box ${blockTagClass}`;

        // グループ情報に基づいてクラスを付与
        if (p.group_id) {
            const prev = bookData.paragraphs[i - 1];
            const next = bookData.paragraphs[i + 1];
            const sameGroupPrev = prev?.group_id === p.group_id && prev?.page === currentPage;
            const sameGroupNext = next?.group_id === p.group_id && next?.page === currentPage;

            if (!sameGroupPrev && sameGroupNext) {
                divSrc.classList.add('group-start');
            } else if (sameGroupPrev && sameGroupNext) {
                divSrc.classList.add('group-middle');
            } else if (sameGroupPrev && !sameGroupNext) {
                divSrc.classList.add('group-end');
            } else {
                // 単体グループ（前後なし） → start + end
                divSrc.classList.add('group-start', 'group-end');
            }

            divSrc.classList.add(`group-id-${p.group_id}`);
        }

        divSrc.id = `paragraph-${p.id}`; // パラグラフIDをIDとして設定
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
                    <label>連結ID:
                        <input type="number" class="prev-id-input" value="${p.prev_id ?? ''}" />
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
        // editButton.addEventListener('click', (event) => onEditButtonClick(event));
        transButton.addEventListener('click', (e) => onTransButtonClick(e, p, divSrc));
        saveButton.addEventListener('click', (e) => onSaveButtonClick(e, p, divSrc, srcText, transText, blockTagSelect, blockTagSpan));
        // editCancel.addEventListener('click', (e) => onEditCancelClick(e, p, divSrc, srcText, transText, blockTagSpan));
        document.addEventListener('keydown', (e) => onKeyDown(e, divSrc, p, srcText, transText, blockTagSpan));

        setCurrentParagraph(0);
        // ラジオボタンの変更イベントを登録
        addRadioChangeListener(divSrc, p);
    }
    window.autoToggle.dispatchAll();

    // restoreCheckboxStates();
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

// 編集パラグラフによる更新をParagraphs配列のマッチするidにセット
function updateParagraphData(paragraphs, updatedParagraph) {
    for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].id === updatedParagraph.id) {
            paragraphs[i] = updatedParagraph;
            break;
        }
    }
}

// 編集パラグラフのデータをJSONに保存
/** @function saveParagraphData */
function saveParagraphData(paragraph) {
    fetch(`/api/update_paragraph/${encodeURIComponent(pdfName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            paragraph_id: paragraph.id,
            new_src_text: paragraph.src_text,
            new_trans_text: paragraph.trans_text,
            trans_status: paragraph.trans_status,
            block_tag: paragraph.block_tag
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);

        if (data.status === "ok") {
            console.log('Success:', data);
            // サーバーへの保存が成功した場合のみクライアント側を更新
            updateParagraphData(bookData.paragraphs, paragraph);
            updateTransStatusCounts(bookData.trans_status_counts);
        } else {
            console.error('Error:', data.message);
            alert('データ保存中にエラーが発生しました: ' + data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('データ保存中にエラーが発生しました。詳細はコンソールを確認してください。');
    });
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

    if (event.ctrlKey) {
        setCurrentParagraph(clickedIndex, event.shiftKey);
    } else {
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
}

/** @function moveSelectedByOffset */
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
}

/** @function getSelectedParagraphsInOrder */
function getSelectedParagraphsInOrder() {
    return Array.from(document.querySelectorAll('.paragraph-box.selected'));
}

/** @function: updateBlockTagForSelected */
function updateBlockTagForSelected(blockTag) {
    const selected = getSelectedParagraphsInOrder();
    const allData = bookData.paragraphs;

    selected.forEach(div => {
        const id = parseInt(div.id.replace('paragraph-', ''));
        const p = allData.find(p => p.id === id);
        if (!p) return;

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
    });
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


let currentParagraphIndex = 0;

function getAllParagraphs() {
    return Array.from(document.querySelectorAll('.paragraph-box'));
}

/** @function setCurrentParagraph */
function setCurrentParagraph(index, isShiftHeld = false) {
    const paragraphs = getAllParagraphs();

    // current・selectedの制御
    paragraphs.forEach(p => {
        p.classList.remove('current');
        if (!isShiftHeld) {
            p.classList.remove('selected');
        }
    });

    index = Math.max(0, Math.min(index, paragraphs.length - 1));
    currentParagraphIndex = index;

    const current = paragraphs[currentParagraphIndex];
    current.classList.add('current');

    // quickEditMode中は自動で選択も付ける
    if (window.autoToggle.getState("quickEditMode")) {
        current.classList.add('selected');
    }

    current.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/*** @function toggleCurrentParagraphSelection */
function toggleCurrentParagraphSelection() {
    const paragraphs = getAllParagraphs();
    const current = paragraphs[currentParagraphIndex];
    current.classList.toggle('selected');
}

/** @function moveCurrentParagraphBy */
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

/** @function getSelectedParagraphsInOrder */
function toggleGroupSelectedParagraphs() {
    const selected = getSelectedParagraphsInOrder();
    if (selected.length < 2) return;

    // 先頭のグループクラスとパラグラフidを取得
    const firstGroupId = selected[0].id.replace('paragraph-', '');
    const firstGroupClass = selected[0].classList.contains(`group-id-${firstGroupId}`) ? `group-id-${firstGroupId}` : null;

    // ✅ グループ解除：srcParagraphs 全体からfirstGroupIdに属するグループ を削除
    const all = getAllParagraphs();
    all.forEach(div => {
        if (div.classList.contains(firstGroupClass)) {
            div.classList.remove(firstGroupClass, 'group-start', 'group-middle', 'group-end');
        }
    });
    
    //グループが設定されていなかった場合は、選択範囲をグループ化
    if (!firstGroupClass) {
        const newGroupClass = `group-id-${firstGroupId}`;
        selected.forEach((div, index) => {
            // 既存のgroup-idを削除
            div.classList.remove(...Array.from(div.classList).filter(cls => cls.startsWith('group-id-')));
            // 新しいグループIDを追加
            div.classList.add(newGroupClass);
            if (index === 0) div.classList.add('group-start');
            else if (index === selected.length - 1) div.classList.add('group-end');
            else div.classList.add('group-middle');
        });
    }
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


/**
 * paragraphs: JSON内のparagraphs配列（配列参照を保持）
 * prev_id: 接続元のパラグラフのID
 * next_id: 接続先のパラグラフのID
 */
function linkParagraphs(paragraphs, prev_id, next_id) {
    const prev = paragraphs.find(p => p.id === prev_id);
    const next = paragraphs.find(p => p.id === next_id);
  
    if (!prev || !next) {
      console.warn(`片方のパラグラフが見つかりません: prev_id=${prev_id}, next_id=${next_id}`);
      return;
    }
  
    prev.next_id = next_id;
    next.prev_id = prev_id;
}

function connectToPrev(paragraph) {
    const all = [...bookData.paragraphs].sort((a, b) => a.page === b.page ? a.order - b.order : a.page - b.page);
    const srcContainer = document.getElementById("srcParagraphs");
    const containerList = Array.from(srcContainer.querySelectorAll(".paragraph-box"));
    const currentIndex = containerList.findIndex(div => parseInt(div.id.replace("paragraph-", "")) === paragraph.id);

    if (currentIndex === -1) return;

    let prevParagraph;
    if (currentIndex === 0) {
        // 前ページの最後のパラグラフ
        const indexInAll = all.findIndex(p => p.id === paragraph.id);
        if (indexInAll > 0) prevParagraph = all[indexInAll - 1];
    } else {
        // srcContainer内の1つ前
        const prevDiv = containerList[currentIndex - 1];
        const prevId = parseInt(prevDiv.id.replace("paragraph-", ""));
        prevParagraph = bookData.paragraphs.find(p => p.id === prevId);
    }

    if (prevParagraph) {
        paragraph.prev_id = prevParagraph.id;
        prevParagraph.next_id = paragraph.id;
    }
}

function connectToNext(paragraph) {
    const all = [...bookData.paragraphs].sort((a, b) => a.page === b.page ? a.order - b.order : a.page - b.page);
    const srcContainer = document.getElementById("srcParagraphs");
    const containerList = Array.from(srcContainer.querySelectorAll(".paragraph-box"));
    const currentIndex = containerList.findIndex(div => parseInt(div.id.replace("paragraph-", "")) === paragraph.id);

    if (currentIndex === -1) return;

    let nextParagraph;
    if (currentIndex === containerList.length - 1) {
        // 次ページの最初のパラグラフ
        const indexInAll = all.findIndex(p => p.id === paragraph.id);
        if (indexInAll >= 0 && indexInAll < all.length - 1) nextParagraph = all[indexInAll + 1];
    } else {
        // srcContainer内の1つ後
        const nextDiv = containerList[currentIndex + 1];
        const nextId = parseInt(nextDiv.id.replace("paragraph-", ""));
        nextParagraph = bookData.paragraphs.find(p => p.id === nextId);
    }

    if (nextParagraph) {
        paragraph.next_id = nextParagraph.id;
        nextParagraph.prev_id = paragraph.id;
    }
}
  
function togglePrevConnectionRange(fromIndex, toIndex) {
    const srcDivs = Array.from(document.getElementById("srcParagraphs").querySelectorAll(".paragraph-box"));
    const srcIds = srcDivs.map(div => parseInt(div.id.replace("paragraph-", "")));
    const [start, end] = [fromIndex, toIndex].sort((a, b) => a - b);

    for (let i = start; i <= end; i++) {
        const currentDiv = srcDivs[i];
        const currentId = srcIds[i];
        if (!currentDiv || isNaN(currentId)) continue;

        const paragraph = bookData.paragraphs.find(p => p.id === currentId);
        if (!paragraph) continue;

        let prevParagraph = null;

        if (i > 0 && !isNaN(srcIds[i - 1])) {
            const prevId = srcIds[i - 1];
            prevParagraph = bookData.paragraphs.find(p => p.id === prevId);
        } else {
            const all = [...bookData.paragraphs].sort((a, b) =>
                a.page === b.page ? a.order - b.order : a.page - b.page
            );
            const indexInAll = all.findIndex(p => p.id === paragraph.id);
            if (indexInAll > 0) {
                prevParagraph = all[indexInAll - 1];
            }
        }

        if (!prevParagraph) continue;

        if (paragraph.prev_id === prevParagraph.id) {
            paragraph.prev_id = undefined;
            prevParagraph.next_id = undefined;
        } else {
            paragraph.prev_id = prevParagraph.id;
            prevParagraph.next_id = paragraph.id;
        }

        // UI内のprev-id-inputを更新
        const input = currentDiv.querySelector('.prev-id-input');
        if (input) input.value = paragraph.prev_id ?? '';
    }
}

function togglePrevConnectionRange(fromIndex, toIndex) {
    const [start, end] = [fromIndex, toIndex].sort((a, b) => a - b);
    for (let i = start; i <= end; i++) {
        togglePrevConnectionByIndex(i);
    }
}

function connectSelectedParagraphsByPrevId() {
    const srcDivs = Array.from(document.getElementById("srcParagraphs").querySelectorAll('.paragraph-box'));
    const selectedDivs = srcDivs.filter(div => div.classList.contains('selected'));

    if (selectedDivs.length < 1) return;

    const indexes = selectedDivs.map(div => srcDivs.indexOf(div));
    const fromIndex = Math.min(...indexes);
    const toIndex = Math.max(...indexes);

    togglePrevConnectionRange(fromIndex, toIndex);
}

function togglePrevConnectionCurrent() {
    togglePrevConnectionByIndex(currentParagraphIndex);
}
