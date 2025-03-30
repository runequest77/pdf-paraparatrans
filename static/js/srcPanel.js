var showSrc = true;
var showTrans = true;
var showSrcHtml = true;
var showTransAuto = true;
var showSrcReplaced = true;


function initSrcPanel() {
    document.getElementById('toggleSrcHtmlCheckbox').addEventListener('change', toggleSrcHtml);
    document.getElementById('toggleSrcCheckbox').addEventListener('change', toggleSrc);
    document.getElementById('toggleSrcReplacedCheckbox').addEventListener('change', toggleSrcReplaced);
    document.getElementById('toggleTransAutoCheckbox').addEventListener('change', toggleTransAuto);
    document.getElementById('toggleTransCheckbox').addEventListener('change', toggleTrans);

    // 各チェックボックスのイベントリスナーにsaveCheckboxStateを追加
    document.querySelectorAll('.restoreCheckboxState').forEach(checkbox => {
        checkbox.addEventListener('change', saveCheckboxState);
    });
    
    // ドラッグ用ハンドルのみ有効にするために handle オプションを指定
    $("#srcParagraphs").sortable({
        handle: ".drag-handle"
    });

}

// ------------------------------
// 切り出したハンドラ群
function onEditButtonClick(event) {
    const editButton = event.currentTarget;
    const divSrc = editButton.closest('.paragraph-box');
    const srcText = divSrc.querySelector('.src-text');
    const transText = divSrc.querySelector('.trans-text');
    const editUI = divSrc.querySelector('.edit-ui');
    
    divSrc.classList.add('editing');
    srcText.contentEditable = true;
    transText.contentEditable = true;
    editUI.style.display = 'block';
    editButton.style.visibility = 'hidden'; // visibilityを直接操作
    $("#srcParagraphs").sortable("disable");
    divSrc.style.cursor = 'text';
}

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
    .catch(error => console.error('Error:', error));
}

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

function onKeyDown(event, divSrc, paragraph, srcText, transText, blockTagSpan) {
    if (event.key === 'Escape' && divSrc.classList.contains('editing')) {
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
}

// ------------------------------
// renderParagraphsの変更部分
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
        let statusClass = `status-${p.trans_status}`;
        divSrc.className = `paragraph-box ${blockTagClass}`;
        divSrc.id = `paragraph-${p.id}`; // パラグラフIDをIDとして設定
        divSrc.innerHTML = `
            <div class='src-html'>${p.src_html}</div>
            <div class='src-text' data-original="${p.src_text}">${p.src_text}</div>
            <div class='src-replaced'>${p.src_replaced}</div>
            <div class='trans-auto'>${p.trans_auto}</div>
            <div class='trans-text' data-original="${p.trans_text}">${p.trans_text}</div>
            <div class='edit-box ${statusClass}'>
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
                    <button class='edit-cancel'>...</button>
                </div>
            </div>
        `;
        srcContainer.appendChild(divSrc);

        // イベントリスナーの登録
        let editButton = divSrc.querySelector('.edit-button');
        let transButton = divSrc.querySelector('.trans-button');
        let saveButton = divSrc.querySelector('.save-button');
        let editCancel = divSrc.querySelector('.edit-cancel');
        let srcText = divSrc.querySelector('.src-text');
        let transText = divSrc.querySelector('.trans-text');
        let blockTagSelect = divSrc.querySelector('.type-select');
        let blockTagSpan = divSrc.querySelector('.block-tag');

        blockTagSelect.value = p.block_tag;
        let statusRadio = divSrc.querySelector(`input[name='status-${p.id}'][value='${p.trans_status}']`);
        if (statusRadio) { statusRadio.checked = true; }

        editButton.addEventListener('click', (event) => onEditButtonClick(event));
        transButton.addEventListener('click', (e) => onTransButtonClick(e, p, divSrc));
        saveButton.addEventListener('click', (e) => onSaveButtonClick(e, p, divSrc, srcText, transText, blockTagSelect, blockTagSpan));
        editCancel.addEventListener('click', (e) => onEditCancelClick(e, p, divSrc, srcText, transText, blockTagSpan));
        document.addEventListener('keydown', (e) => onKeyDown(e, divSrc, p, srcText, transText, blockTagSpan));
        // ラジオボタンの変更イベントを登録
        addRadioChangeListener(divSrc, p);
    }
    restoreCheckboxStates();
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
