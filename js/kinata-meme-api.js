class KinataMemeAPI {
    constructor() {
        this.edidArray = [];           // [{editorId, formId}]
        this.edidRules = {};           // {editorId: [keywords]}
        this.activeEdid = null;
        this.multiSelectionMode = false;
        this.multiSelectedEDIDs = new Set();
        this.currentEsp = null;
        this.multiBaseKeywords = [];
        this.multiAnchorEdid = null;
    }

    // ------------------- FormID -------------------
    normalizeFormId(formId) {
        if (!formId) return '';
        return formId.toUpperCase().replace(/^0+/, '');
    }

    escapeHtml(text = "") {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    highlightText(text = "", query = "") {
        if (!query) return this.escapeHtml(text);
        const lowerText = text.toLowerCase();
        const idx = lowerText.indexOf(query);
        if (idx === -1) return this.escapeHtml(text);

        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + query.length);
        const after = text.slice(idx + query.length);
        return `${this.escapeHtml(before)}<span class="search-highlight">${this.escapeHtml(match)}</span>${this.escapeHtml(after)}`;
    }

    // ------------------- EDID TXT -------------------
    async loadTxt(text) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        let espName = "";
        if (lines[0]?.toLowerCase().startsWith("plugin:")) {
            espName = lines[0].split(":")[1].trim();
            lines.shift();
        }

        this.edidArray = lines.map(line => {
            // Preferred SAKR format: EDID|FORMID|NAME
            if (line.includes("|")) {
                const parts = line.split("|");
                const editorId = (parts[0] || '').trim();
                const formId = (parts[1] || '').trim();
                const name = (parts.slice(2).join("|") || '').trim();
                return { editorId, formId, name };
            }

            // Legacy fallback: FORMID-EDID-NAME
            const legacy = line.match(/^([0-9A-Fa-f]{8})-([^-]+)-(.*)$/);
            if (legacy) {
                return {
                    editorId: (legacy[2] || '').trim(),
                    formId: (legacy[1] || '').trim(),
                    name: (legacy[3] || '').trim()
                };
            }

            // Minimal fallback: EDID only
            return { editorId: line.trim(), formId: '', name: '' };
        });

        this.edidRules = {};
        this.activeEdid = null;
        this.multiSelectionMode = false;
        this.multiSelectedEDIDs.clear();
        this.currentEsp = espName;

        this.enableAllUI();
        this.updateDOMKeywords(); // СЃР±СЂРѕСЃРёС‚СЊ РІСЃРµ РіР°Р»РѕС‡РєРё

        return { edidArray: this.edidArray, espName };
    }

    // ------------------- RobCo Patch -------------------
    applyRobCoPatch(edidKeyedData) {
        Object.entries(edidKeyedData).forEach(([edid, data]) => {
            const existing = this.edidArray.find(e => 
                e.editorId === edid &&
                this.normalizeFormId(e.formId).endsWith(this.normalizeFormId(data.formId))
            );
            if (existing) {
                this.edidRules[edid] = [...(data.keywords || [])];
                existing.formId = data.formId || existing.formId;
                this.updateDOMKeywords(edid);
            }
        });
    }

    async importRobCoIni(file, keywordInputSelector = '#keywordContainer input', resolveVersionChoice = null) {
        if (!file) return { patchedCount: 0, useOldVersion: false };

        const text = await file.text();
        const lines = text.split(/\r?\n/);

        this.activeEdid = null;
        this.multiSelectedEDIDs.clear();

        let useOldVersion = false;
        for (const line of lines) {
            const match = line.match(/filterByArmors=.*\|([0-9A-Fa-f]+):keywordsToAdd=(.*)/);
            if (!match) continue;
            const kwPart = match[2].split(',').map(s => s.trim());
            if (kwPart.some(k => this.normalizeFormId((k.split('|')[1] || '')).length > 3)) {
                useOldVersion = true;
                break;
            }
        }
        if (!useOldVersion && typeof resolveVersionChoice === 'function') {
            useOldVersion = !!(await resolveVersionChoice());
        }

        const patchData = {};
        const keywordInputs = Array.from(document.querySelectorAll(keywordInputSelector));

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith(';')) return;

            const match = line.match(/filterByArmors=.*\|([0-9A-Fa-f]+):keywordsToAdd=(.*)/);
            if (!match) return;

            const armorFormIdNorm = this.normalizeFormId(match[1]);
            const edObj = this.edidArray.find(e =>
                this.normalizeFormId(e.formId).endsWith(armorFormIdNorm)
            );
            if (!edObj) return;

            const edid = edObj.editorId;
            patchData[edid] = { keywords: [], formId: edObj.formId };

            const kwPairs = match[2].split(',').map(s => s.trim());
            kwPairs.forEach(pair => {
                const kwFormIdNorm = this.normalizeFormId((pair.split('|')[1] || ''));
                const inputEl = keywordInputs.find(i =>
                    useOldVersion ? i.dataset.formidOld === kwFormIdNorm : i.dataset.formidNew === kwFormIdNorm
                );
                if (!inputEl) return;
                patchData[edid].keywords.push(inputEl.value);
            });
        });

        this.applyRobCoPatch(patchData);
        return { patchedCount: Object.keys(patchData).length, useOldVersion };
    }

    bindPrimaryAndSecondaryUpload({
        inputId,
        primaryTriggerId,
        secondaryTriggerId,
        primaryDisabledClass = 'file-upload-primary-disabled',
        hiddenClass = 'is-hidden',
        onFile
    }) {
        const input = document.getElementById(inputId);
        const primary = document.getElementById(primaryTriggerId);
        const secondary = secondaryTriggerId ? document.getElementById(secondaryTriggerId) : null;
        if (!input || !primary || typeof onFile !== 'function') return;

        const openDialog = () => input.click();
        const canOpenFromPrimary = () => !(secondary && !secondary.classList.contains(hiddenClass));

        primary.addEventListener('click', () => {
            if (!canOpenFromPrimary()) return;
            openDialog();
        });
        primary.addEventListener('keydown', e => {
            if (!canOpenFromPrimary()) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDialog();
            }
        });

        if (secondary) {
            secondary.addEventListener('click', openDialog);
            secondary.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDialog();
                }
            });
        }

        input.addEventListener('change', async () => {
            if (!input.files.length) return;
            const file = input.files[0];
            await onFile(file);
            if (secondary) secondary.classList.remove(hiddenClass);
            primary.classList.add(primaryDisabledClass);
        });
    }

    bindSimpleFileLinkUpload({ inputId, triggerId, onFile }) {
        const input = document.getElementById(inputId);
        const trigger = document.getElementById(triggerId);
        if (!input || !trigger || typeof onFile !== 'function') return;

        const openDialog = () => input.click();
        trigger.addEventListener('click', openDialog);
        trigger.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDialog();
            }
        });

        input.addEventListener('change', async () => {
            if (!input.files.length) return;
            await onFile(input.files[0]);
        });
    }

    bindStandardListControls({
        multiToggleId = 'multiSelectToggle',
        searchInputId = 'edidSearch',
        showNotEditedToggleId = 'showNotEditedToggle',
        onMultiToggle,
        onSearch,
        onFilterToggle
    } = {}) {
        const multiToggle = document.getElementById(multiToggleId);
        const searchInput = document.getElementById(searchInputId);
        const showNotEditedToggle = document.getElementById(showNotEditedToggleId);

        if (multiToggle) {
            multiToggle.addEventListener('change', () => {
                this.toggleMultiSelection(multiToggle.checked);
                if (typeof onMultiToggle === 'function') onMultiToggle(multiToggle.checked);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', e => {
                if (typeof onSearch === 'function') onSearch(e.target.value);
            });
            searchInput.addEventListener('keydown', e => {
                if (e.key === 'Escape') {
                    e.target.value = '';
                    if (typeof onSearch === 'function') onSearch('');
                }
            });
        }

        if (showNotEditedToggle) {
            showNotEditedToggle.addEventListener('change', () => {
                if (typeof onFilterToggle === 'function') onFilterToggle(showNotEditedToggle.checked);
            });
        }
    }

    getSortedEdidArray() {
        return [...this.edidArray].sort((a, b) =>
            (a.editorId || '').toLowerCase().localeCompare((b.editorId || '').toLowerCase())
        );
    }

    renderEdidTable({ containerId = 'edidList', thirdColumnTitle = 'KYWD', getThirdCellHtml, onRowClick }) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const table = document.createElement('table');
        table.id = 'edidTable';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['EDID', 'Name', thirdColumnTitle].forEach(title => {
            const th = document.createElement('th');
            th.textContent = title;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);

        const tbody = document.createElement('tbody');
        this.getSortedEdidArray().forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.key = item.editorId;
            tr.dataset.edid = item.editorId || '';
            tr.dataset.name = item.name || '';
            tr.dataset.formid = item.formId || '';

            const edidCell = document.createElement('td');
            edidCell.className = 'edid-col-edid';
            edidCell.textContent = item.editorId || '';

            const nameCell = document.createElement('td');
            nameCell.className = 'edid-col-name';
            nameCell.textContent = item.name || '';

            const thirdCell = document.createElement('td');
            thirdCell.className = 'edid-col-kywd';
            thirdCell.innerHTML = typeof getThirdCellHtml === 'function' ? (getThirdCellHtml(item.editorId) || '') : '';

            tr.appendChild(edidCell);
            tr.appendChild(nameCell);
            tr.appendChild(thirdCell);

            tr.addEventListener('click', () => {
                this.handleEdidClick(item.editorId);
                if (typeof onRowClick === 'function') onRowClick(item.editorId, tr);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    updateEdidTableHighlights({ tableSelector = '#edidList tbody tr', getThirdCellHtml } = {}) {
        const rows = document.querySelectorAll(tableSelector);
        rows.forEach(row => {
            const edid = row.dataset.key;
            const selectedCell = row.querySelector('.edid-col-kywd');

            row.classList.remove('active', 'multi-selected');
            if (this.activeEdid === edid) row.classList.add('active');
            if (this.multiSelectedEDIDs.has(edid)) row.classList.add('multi-selected');

            if (selectedCell && typeof getThirdCellHtml === 'function') {
                selectedCell.innerHTML = getThirdCellHtml(edid) || '';
            }
        });
    }

    isEffectivelyEdited(edid) {
        const hasRules = (this.edidRules[edid] || []).length > 0;
        if (!hasRules) return false;
        if (this.multiSelectionMode && this.multiSelectedEDIDs.has(edid)) return false;
        return true;
    }

    applyEdidTableFilters({ query = '', showOnlyNotEdited = false, rowsSelector = '#edidList tbody tr' } = {}) {
        const q = (query || '').trim().toLowerCase();
        const rows = document.querySelectorAll(rowsSelector);

        rows.forEach(row => {
            const edid = row.dataset.edid || '';
            const name = row.dataset.name || '';
            const key = row.dataset.key || '';
            const haystack = `${edid} ${name}`.toLowerCase();
            const edidCell = row.querySelector('.edid-col-edid');
            const nameCell = row.querySelector('.edid-col-name');
            const isEdited = this.isEffectivelyEdited(key);

            const matchesSearch = !q || haystack.includes(q);
            const passesEditedFilter = !showOnlyNotEdited || !isEdited;
            if (!matchesSearch || !passesEditedFilter) {
                row.style.display = 'none';
                return;
            }

            row.style.display = '';
            if (!q) {
                if (edidCell) edidCell.textContent = edid;
                if (nameCell) nameCell.textContent = name;
                return;
            }
            if (edidCell) edidCell.innerHTML = this.highlightText(edid, q);
            if (nameCell) nameCell.innerHTML = this.highlightText(name, q);
        });
    }

// ------------------- SELECTION -------------------

isEdited(edid) {
    const hasRules = Array.isArray(this.edidRules[edid]) && this.edidRules[edid].length > 0;
    if (!hasRules) return false;

    // Р’ РјСѓР»СЊС‚РёСЃРµР»РµРєС‚Рµ РІС‹Р±СЂР°РЅРЅС‹Рµ Р·Р°РїРёСЃРё СЃС‡РёС‚Р°РµРј "РІСЂРµРјРµРЅРЅС‹РјРё":
    // РѕРЅРё РЅРµ РґРѕР»Р¶РЅС‹ Р±Р»РѕРєРёСЂРѕРІР°С‚СЊСЃСЏ РєР°Рє edited РґРѕ РІС‹С…РѕРґР° РёР· СЂРµР¶РёРјР°.
    if (this.multiSelectionMode && this.multiSelectedEDIDs.has(edid)) {
        return false;
    }

    return true;
}

selectEdid(edid) {
    if (!edid) return;

    // РµСЃР»Рё РјСѓР»СЊС‚РёСЃРµР»РµРєС‚ РІРєР»СЋС‡РµРЅ вЂ” СЂР°Р±РѕС‚Р°РµРј С‡РµСЂРµР· handler
    if (this.multiSelectionMode) {
        this.handleEdidClick(edid);
        return;
    }

    this.activeEdid = edid;
    this.updateDOMKeywords(edid);
}

toggleMultiSelection(forceState = null) {

    const newState = forceState !== null
        ? forceState
        : !this.multiSelectionMode;

    // РµСЃР»Рё СЃРѕСЃС‚РѕСЏРЅРёРµ РЅРµ РёР·РјРµРЅРёР»РѕСЃСЊ вЂ” РЅРёС‡РµРіРѕ РЅРµ РґРµР»Р°РµРј
    if (newState === this.multiSelectionMode) {
        return;
    }

    this.multiSelectionMode = newState;

    if (!this.multiSelectionMode) {
        // РІС‹РєР»СЋС‡Р°РµРј СЂРµР¶РёРј
        this.multiSelectedEDIDs.clear();
        this.multiBaseKeywords = [];
        this.multiAnchorEdid = null;
        return;
    }

    // РІРєР»СЋС‡Р°РµРј СЂРµР¶РёРј
    this.multiSelectedEDIDs.clear();

    this.multiAnchorEdid = this.activeEdid || null;

    if (this.activeEdid) {
        this.multiBaseKeywords = [...(this.edidRules[this.activeEdid] || [])];
        this.multiSelectedEDIDs.add(this.activeEdid);
    } else {
        this.multiBaseKeywords = [];
    }

}


handleEdidClick(edid) {
    if (!edid) return;

    if (!this.multiSelectionMode) {
        this.activeEdid = edid;
        this.updateDOMKeywords(edid);
        return;
    }

    // РІ СЂРµР¶РёРјРµ РјСѓР»СЊС‚РёСЃРµР»РµРєС‚Р°
    const hasRules = Array.isArray(this.edidRules[edid]) && this.edidRules[edid].length > 0;
    const isAnchor = this.multiAnchorEdid === edid;

    // РћС‚СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРЅС‹Рµ Р·Р°РїРёСЃРё РјРѕР¶РЅРѕ Р±СЂР°С‚СЊ С‚РѕР»СЊРєРѕ РµСЃР»Рё СЌС‚Рѕ anchor
    // (Р·Р°РїРёСЃСЊ Р±С‹Р»Р° Р°РєС‚РёРІРЅР° Р”Рћ РІРєР»СЋС‡РµРЅРёСЏ РјСѓР»СЊС‚РёСЃРµР»РµРєС‚Р°).
    if (hasRules && !isAnchor && !this.multiSelectedEDIDs.has(edid)) {
        return;
    }

    if (this.multiSelectedEDIDs.has(edid)) {
        this.multiSelectedEDIDs.delete(edid);
    } else {
        this.multiSelectedEDIDs.add(edid);

        // РїСЂРё РґРѕР±Р°РІР»РµРЅРёРё РїСЂРёРјРµРЅСЏРµРј С‚РµРєСѓС‰РёРµ С‚РµРіРё РёР· UI
        const currentKws = this.collectKeywordsFromDOM();
        this.edidRules[edid] = [...currentKws];
        this.multiBaseKeywords = [...currentKws];
    }

    // РµСЃР»Рё РµС‰С‘ РЅРµС‚ Р°РєС‚РёРІРЅРѕРіРѕ вЂ” РЅР°Р·РЅР°С‡Р°РµРј
    if (!this.activeEdid) {
        this.activeEdid = edid;
    }

    this.updateDOMKeywords(this.activeEdid);
}

getMultiSelection() {
    return Array.from(this.multiSelectedEDIDs);
}



// ------------------- TAGS -------------------

setKeywordsFor(edid, keywords = []) {
    if (!edid) return;

    this.edidRules[edid] = [...keywords];

    // РµСЃР»Рё СЌС‚Рѕ Р°РєС‚РёРІРЅС‹Р№ вЂ” РѕР±РЅРѕРІР»СЏРµРј DOM
    if (this.activeEdid === edid) {
        this.updateDOMKeywords(edid);
    }
}

collectKeywordsFromDOM(containerSelector = '#keywordContainer') {
    const selected = [];

    document.querySelectorAll(`${containerSelector} input[type="radio"]:checked`)
        .forEach(r => selected.push(r.value));

    document.querySelectorAll(`${containerSelector} input[type="checkbox"]:checked`)
        .forEach(c => selected.push(c.value));

    return selected;
}

updateKeywordsFromDOM(containerSelector = '#keywordContainer') {
    const kws = this.collectKeywordsFromDOM(containerSelector);

    // РјСѓР»СЊС‚РёСЃРµР»РµРєС‚
    if (this.multiSelectionMode && this.multiSelectedEDIDs.size > 0) {
        this.multiBaseKeywords = [...kws];

        this.multiSelectedEDIDs.forEach(edid => {
            this.edidRules[edid] = [...kws];
        });

        return;
    }

    // РѕРґРёРЅРѕС‡РЅС‹Р№ СЂРµР¶РёРј
    if (this.activeEdid) {
        this.edidRules[this.activeEdid] = [...kws];
    }
}

applyTemplateKeywords(keywords = []) {

    if (this.multiSelectionMode && this.multiSelectedEDIDs.size > 0) {
        this.multiBaseKeywords = [...keywords];

        this.multiSelectedEDIDs.forEach(edid => {
            this.edidRules[edid] = [...keywords];
        });

    } else if (this.activeEdid) {

        this.edidRules[this.activeEdid] = [...keywords];
    }

    if (this.activeEdid) {
        this.updateDOMKeywords(this.activeEdid);
    }
}




    // ------------------- DOM -------------------
    updateDOMKeywords(edid = null) {
        const kws = edid ? (this.edidRules[edid] || []) : [];
        document.querySelectorAll('#keywordContainer input').forEach(input => {
            input.checked = kws.includes(input.value);
        });
    }

    enableAllUI() {
        document.querySelectorAll('.disabled-ui').forEach(el => el.classList.remove('disabled-ui'));
    }

    searchEdid(query = '', containerSelector = '#edidList') {
        const q = query.trim().toLowerCase();
        const buttons = document.querySelectorAll(`${containerSelector} button`);
        buttons.forEach(btn => {
            const text = btn.dataset.key.toLowerCase();
            if (!q) {
                btn.style.display = '';
                btn.innerHTML = btn.dataset.key;
                return;
            }
            if (text.includes(q)) {
                const start = text.indexOf(q);
                const end = start + q.length;
                const before = btn.dataset.key.slice(0, start);
                const match = btn.dataset.key.slice(start, end);
                const after = btn.dataset.key.slice(end);
                btn.innerHTML = `${before}<span class="search-highlight">${match}</span>${after}`;
            } else btn.style.display = 'none';
        });
    }

    // ------------------- EXPORT / COPY / GENERATE -------------------
    // textGeneratorFn вЂ” РєРѕР»Р»Р±РµРє, РєРѕС‚РѕСЂС‹Р№ РІРѕР·РІСЂР°С‰Р°РµС‚ СЃС‚СЂРѕРєСѓ РґР»СЏ РіРµРЅРµСЂР°С†РёРё (INI, TXT Рё С‚Рґ)
    generateText(textGeneratorFn) {
        if (typeof textGeneratorFn !== 'function') return '';
        const result = textGeneratorFn(this.edidArray, this.edidRules, this.currentEsp);
        this._lastGenerated = result;
        return result;
    }

    copyGenerated() {
        if (!this._lastGenerated) return null;
        navigator.clipboard.writeText(this._lastGenerated);
        return this._lastGenerated;
    }

    exportGenerated(filename = 'output.txt') {
        if (!this._lastGenerated) return;
        const blob = new Blob([this._lastGenerated], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.KinataMemeAPI = new KinataMemeAPI();

