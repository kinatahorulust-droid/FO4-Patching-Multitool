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

    async readFileTextSmart(file) {
        const buffer = await file.arrayBuffer();
        const utf8 = new TextDecoder("utf-8").decode(buffer);
        if (!utf8.includes("\uFFFD")) return utf8;
        return new TextDecoder("windows-1251").decode(buffer);
    }

    async loadToolConfig(path, { requiredKeys = [] } = {}) {
        const getFromRegistry = () => {
            const registry = (typeof window !== "undefined" && window.KinataToolConfigs && typeof window.KinataToolConfigs === "object")
                ? window.KinataToolConfigs
                : null;
            if (!registry) return null;
            const byExact = registry[path];
            if (byExact) return byExact;
            const normalizedPath = String(path || "").replace(/^\.?\//, "");
            if (registry[normalizedPath]) return registry[normalizedPath];
            const basename = normalizedPath.split("/").pop();
            if (basename && registry[basename]) return registry[basename];
            return null;
        };

        if (!path) return null;
        let json = null;
        const canUseFetch = (typeof window !== "undefined")
            ? !String(window.location?.protocol || "").toLowerCase().startsWith("file:")
            : true;

        if (canUseFetch) {
            try {
                const response = await fetch(path, { cache: "no-store" });
                if (!response.ok) {
                    throw new Error(`Config load failed: ${path} (${response.status})`);
                }
                json = await response.json();
            } catch (error) {
                json = getFromRegistry();
                if (!json) throw error;
            }
        } else {
            json = getFromRegistry();
            if (!json) {
                try {
                    const response = await fetch(path, { cache: "no-store" });
                    if (!response.ok) {
                        throw new Error(`Config load failed: ${path} (${response.status})`);
                    }
                    json = await response.json();
                } catch (error) {
                    throw error;
                }
            }
        }

        if (!json || typeof json !== "object" || Array.isArray(json)) {
            throw new Error(`Config is not an object: ${path}`);
        }
        requiredKeys.forEach((key) => {
            if (!(key in json)) {
                throw new Error(`Config missing key "${key}": ${path}`);
            }
        });
        return json;
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
        this.updateDOMKeywords(); // reset all keyword inputs

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
            const match = line.match(/filterByArmors=([^|:]+)\|([0-9A-Fa-f]+):keywordsToAdd=(.*)/);
            if (!match) continue;
            const kwPart = match[3].split(',').map(s => s.trim());
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

            const match = line.match(/filterByArmors=([^|:]+)\|([0-9A-Fa-f]+):keywordsToAdd=(.*)/);
            if (!match) return;

            const armorMaster = (match[1] || '').trim();
            const armorMasterLower = armorMaster.toLowerCase();
            const armorFormIdNorm = this.normalizeFormId(match[2]);
            const edObj = this.edidArray.find(e => {
                const samePlugin = ((e.plugin || this.currentEsp || '').toLowerCase() === armorMasterLower);
                return samePlugin && this.normalizeFormId(e.formId).endsWith(armorFormIdNorm);
            }) || this.edidArray.find(e =>
                this.normalizeFormId(e.formId).endsWith(armorFormIdNorm)
            );
            if (!edObj) return;

            const key = edObj.editorId;
            patchData[key] = { keywords: [], formId: edObj.formId };

            const kwPairs = match[3].split(',').map(s => s.trim());
            kwPairs.forEach(pair => {
                const kwFormIdNorm = this.normalizeFormId((pair.split('|')[1] || ''));
                const inputEl = keywordInputs.find(i =>
                    useOldVersion ? i.dataset.formidOld === kwFormIdNorm : i.dataset.formidNew === kwFormIdNorm
                );
                if (!inputEl) return;
                patchData[key].keywords.push(inputEl.value);
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

    bindBatchFileLinkUpload({ inputId, triggerId, onFiles }) {
        const input = document.getElementById(inputId);
        const trigger = document.getElementById(triggerId);
        if (!input || !trigger || typeof onFiles !== 'function') return;

        input.multiple = true;

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
            await onFiles(Array.from(input.files));
        });
    }

    parsePluginSectionedText(text, parseRecordLine) {
        const lines = String(text || '').split(/\r?\n/).map(line => line.trim());
        const out = [];
        let currentPlugin = '';

        lines.forEach(line => {
            if (!line || line.startsWith(';') || line.startsWith('#')) return;

            if (line.toLowerCase().startsWith('plugin:')) {
                currentPlugin = line.split(':').slice(1).join(':').trim();
                return;
            }

            if (typeof parseRecordLine !== 'function') {
                currentPlugin = line;
                return;
            }

            const rec = parseRecordLine(line);
            if (!rec) {
                currentPlugin = line;
                return;
            }

            out.push({
                ...rec,
                plugin: rec.plugin || currentPlugin || ''
            });
        });

        return out;
    }

    buildRecordListFromSectionedText(text, {
        parseLine,
        normalizeRecord,
        makeKey,
        sortFn
    } = {}) {
        const parsed = this.parsePluginSectionedText(text, parseLine);
        const out = [];
        const seen = new Set();

        parsed.forEach((record) => {
            let rec = record;
            if (typeof normalizeRecord === 'function') {
                rec = normalizeRecord(record);
            }
            if (!rec || typeof rec !== 'object') return;

            const key = (typeof makeKey === 'function')
                ? String(makeKey(rec) || '').trim()
                : String(rec.key || '').trim();
            if (!key || seen.has(key)) return;
            seen.add(key);

            out.push({ ...rec, key });
        });

        if (typeof sortFn === 'function') out.sort(sortFn);
        return out;
    }

    groupConfiguredByPlugin(records = [], {
        isConfigured,
        getPlugin
    } = {}) {
        const source = Array.isArray(records) ? records : [];
        const grouped = new Map();
        source.forEach((record) => {
            if (typeof isConfigured === 'function' && !isConfigured(record)) return;
            const plugin = (typeof getPlugin === 'function')
                ? String(getPlugin(record) || '').trim()
                : String(record?.plugin || '').trim();
            if (!plugin) return;
            if (!grouped.has(plugin)) grouped.set(plugin, []);
            grouped.get(plugin).push(record);
        });
        return grouped;
    }

    getSortedPluginEntries(groupedMap) {
        if (!(groupedMap instanceof Map)) return [];
        return Array.from(groupedMap.entries()).sort((a, b) =>
            String(a[0] || '').localeCompare(String(b[0] || ''), undefined, { sensitivity: 'base' })
        );
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

    bindExportControls({
        containerId = 'exportdataform',
        textareaSelector = 'textarea',
        generateSelector = '.generate-btn',
        copySelector = '.copy-btn',
        exportSelector = '.export-btn',
        onGenerate = null,
        onExport = null,
        copiedLabel = 'Copied!',
        emptyLabel = 'Nothing',
        copyIdleLabel = 'Copy',
        copyResetMs = 1500
    } = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const textarea = container.querySelector(textareaSelector);
        const generateBtn = container.querySelector(generateSelector);
        const copyBtn = container.querySelector(copySelector);
        const exportBtn = container.querySelector(exportSelector);

        if (generateBtn && typeof onGenerate === 'function') {
            generateBtn.addEventListener('click', () => onGenerate({ container, textarea }));
        }

        if (copyBtn && textarea) {
            copyBtn.addEventListener('click', () => {
                const text = textarea.value;
                if (text) navigator.clipboard.writeText(text);
                copyBtn.textContent = text ? copiedLabel : emptyLabel;
                setTimeout(() => {
                    copyBtn.textContent = copyIdleLabel;
                }, copyResetMs);
            });
        }

        if (exportBtn && typeof onExport === 'function') {
            exportBtn.addEventListener('click', () => onExport({ container, textarea }));
        }

        return { container, textarea, generateBtn, copyBtn, exportBtn };
    }

    getSortedEdidArray() {
        return [...this.edidArray].sort((a, b) => {
            const pluginCmp = (a.plugin || '').toLowerCase().localeCompare((b.plugin || '').toLowerCase());
            if (pluginCmp !== 0) return pluginCmp;
            return (a.editorId || '').toLowerCase().localeCompare((b.editorId || '').toLowerCase());
        });
    }

    setRecordSession(records = [], mapToEdidItem = null, { currentEsp = null } = {}) {
        const source = Array.isArray(records) ? records : [];
        const mapper = (typeof mapToEdidItem === 'function')
            ? mapToEdidItem
            : (item => item);

        this.edidArray = source
            .map(mapper)
            .filter(item => item && typeof item === 'object' && String(item.editorId || '').trim());

        this.edidRules = {};
        this.activeEdid = null;
        this.multiSelectionMode = false;
        this.multiSelectedEDIDs.clear();
        this.multiBaseKeywords = [];
        this.multiAnchorEdid = null;

        const plugins = [...new Set(this.edidArray.map(item => (item.plugin || '').trim()).filter(Boolean))];
        this.currentEsp = currentEsp !== null ? currentEsp : (plugins.length === 1 ? plugins[0] : '');

        this.updateDOMKeywords();
        this.enableAllUI();

        return {
            count: this.edidArray.length,
            plugins,
            currentEsp: this.currentEsp
        };
    }

    async runTextImportFlow({
        file,
        parseRecords,
        mapToSessionItem = null,
        currentEsp = null,
        resetMultiToggleId = 'multiSelectToggle',
        loadedLabel = 'TXT loaded',
        pluginsLabel = 'plugins loaded',
        emptyMessage = '',
        onAfterSession = null
    } = {}) {
        if (!file || typeof parseRecords !== 'function') {
            return { text: '', records: [], session: null, uploadTitle: '' };
        }

        const text = await this.readFileTextSmart(file);
        const records = parseRecords(text, file) || [];

        const multiToggle = document.getElementById(resetMultiToggleId);
        if (multiToggle) multiToggle.checked = false;

        const session = this.setRecordSession(records, mapToSessionItem, { currentEsp });
        const uploadTitle = this.getSessionUploadTitle(file.name, { loadedLabel, pluginsLabel });

        if (!session.count && emptyMessage) {
            alert(emptyMessage);
        }
        if (typeof onAfterSession === 'function') {
            onAfterSession({ text, records, session, uploadTitle, file });
        }

        return { text, records, session, uploadTitle, file };
    }

    getSessionUploadTitle(fallbackFilename = '', { loadedLabel = 'TXT loaded', pluginsLabel = 'plugins loaded' } = {}) {
        const plugins = [...new Set((this.edidArray || []).map(item => (item.plugin || '').trim()).filter(Boolean))];
        if (plugins.length === 1) return plugins[0];
        if (plugins.length > 1) return `${plugins.length} ${pluginsLabel}`;
        return fallbackFilename || loadedLabel;
    }

    renderEdidTable({
        containerId = 'edidList',
        firstColumnTitle = 'EDID',
        secondColumnTitle = 'Name',
        thirdColumnTitle = 'KYWD',
        getThirdCellHtml,
        onRowClick,
        groupByPlugin = false
    }) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const table = document.createElement('table');
        table.id = 'edidTable';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        [firstColumnTitle, secondColumnTitle, thirdColumnTitle].forEach(title => {
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
            tr.dataset.plugin = item.plugin || '';

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

        if (groupByPlugin) {
            this.rebuildRowsByPluginGroup();
            this.updatePluginSeparatorVisibility();
        }
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

    refreshEdidTableRows({
        rowsSelector = '#edidList tbody tr[data-key]',
        onRow
    } = {}) {
        if (typeof onRow !== 'function') return 0;
        const rows = document.querySelectorAll(rowsSelector);
        let count = 0;
        rows.forEach((row) => {
            const key = row.dataset.key || '';
            const edid = row.dataset.edid || '';
            const name = row.dataset.name || '';
            onRow({ row, key, edid, name });
            count++;
        });
        return count;
    }

    renderTableRowsState({
        rowsSelector = '#edidList tbody tr[data-key]',
        currentSearchQuery = '',
        getEdidText = null,
        getNameText = null,
        renderNameHtml = null,
        renderThirdHtml = null,
        respectSearchForEdid = false
    } = {}) {
        return this.refreshEdidTableRows({
            rowsSelector,
            onRow: ({ row, key }) => {
                const edidCell = row.querySelector('.edid-col-edid');
                const nameCell = row.querySelector('.edid-col-name');
                const thirdCell = row.querySelector('.edid-col-kywd');
                const edidText = (typeof getEdidText === 'function') ? String(getEdidText(key) || '') : '';
                const nameText = (typeof getNameText === 'function') ? String(getNameText(key) || '') : '';

                if (edidCell && (!respectSearchForEdid || !currentSearchQuery)) {
                    edidCell.textContent = edidText;
                }
                if (nameCell && typeof renderNameHtml === 'function') {
                    nameCell.innerHTML = String(renderNameHtml(key) || '');
                }
                if (thirdCell && typeof renderThirdHtml === 'function') {
                    thirdCell.innerHTML = String(renderThirdHtml(key) || '');
                }

                if (edidText) row.dataset.edid = edidText;
                if (nameText || typeof getNameText === 'function') row.dataset.name = nameText;
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

        this.updatePluginSeparatorVisibility();
    }

    applyEdidTableFiltersEx({
        query = '',
        showOnlyNotEdited = false,
        rowsSelector = '#edidList tbody tr',
        getSearchText = null,
        isEdited = null,
        renderVisibleRow = null
    } = {}) {
        const q = (query || '').trim().toLowerCase();
        const rows = document.querySelectorAll(rowsSelector);

        rows.forEach(row => {
            const key = row.dataset.key || '';
            const edid = row.dataset.edid || '';
            const name = row.dataset.name || '';

            const searchText = (typeof getSearchText === 'function')
                ? String(getSearchText({ row, key, edid, name }) || '')
                : `${edid} ${name}`;
            const rowIsEdited = (typeof isEdited === 'function')
                ? !!isEdited({ row, key, edid, name })
                : this.isEffectivelyEdited(key);

            const matchesSearch = !q || searchText.toLowerCase().includes(q);
            const passesEditedFilter = !showOnlyNotEdited || !rowIsEdited;
            if (!matchesSearch || !passesEditedFilter) {
                row.style.display = 'none';
                return;
            }

            row.style.display = '';

            if (typeof renderVisibleRow === 'function') {
                renderVisibleRow({
                    row,
                    key,
                    edid,
                    name,
                    query: q,
                    isSearching: !!q
                });
                return;
            }

            const edidCell = row.querySelector('.edid-col-edid');
            const nameCell = row.querySelector('.edid-col-name');
            if (!q) {
                if (edidCell) edidCell.textContent = edid;
                if (nameCell) nameCell.textContent = name;
                return;
            }
            if (edidCell) edidCell.innerHTML = this.highlightText(edid, q);
            if (nameCell) nameCell.innerHTML = this.highlightText(name, q);
        });

        this.updatePluginSeparatorVisibility();
    }

    renderIconTokenList({
        items = [],
        maxVisible = 3,
        iconClass = 'kywd-icon',
        moreClass = 'kywd-more',
        moreTitle = 'More',
        hideBrokenIcons = false
    } = {}) {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        if (!list.length) return '';

        const visible = list.slice(0, Math.max(1, Number(maxVisible) || 3));
        const hasMore = list.length > visible.length;

        let html = visible.map(item => {
            const src = String(item.src || '').trim();
            const label = String(item.label || item.token || '').trim();
            const escapedLabel = this.escapeHtml(label);
            if (!src) {
                return `<span class="${this.escapeHtml(moreClass)}" title="${escapedLabel}">${escapedLabel}</span>`;
            }
            const onErrorAttr = hideBrokenIcons ? ` onerror="this.style.display='none'"` : '';
            return `<img class="${this.escapeHtml(iconClass)}" src="${this.escapeHtml(src)}" alt="${escapedLabel}" title="${escapedLabel}"${onErrorAttr}>`;
        }).join(' ');

        if (hasMore) {
            html += ` <span class="${this.escapeHtml(moreClass)}" title="${this.escapeHtml(moreTitle)}">...</span>`;
        }

        return html.trim();
    }

    rebuildRowsByPluginGroup({
        tbodySelector = '#edidList tbody',
        tableSelector = '#edidTable',
        separatorClass = 'weap-plugin-separator',
        separatorLabelClass = 'weap-plugin-separator-label',
        gapClass = 'weap-plugin-gap',
        groupLastClass = 'weap-plugin-group-last',
        unknownPluginLabel = 'Unknown Plugin'
    } = {}) {
        const tbody = document.querySelector(tbodySelector);
        const table = document.querySelector(tableSelector);
        if (!tbody || !table) return;

        const byKey = new Map();
        tbody.querySelectorAll('tr[data-key]').forEach(row => {
            byKey.set(row.dataset.key, row);
        });

        const sorted = this.getSortedEdidArray().filter(item => byKey.has(item.editorId));
        const grouped = new Map();
        sorted.forEach(item => {
            const pluginName = (item.plugin || '').trim() || unknownPluginLabel;
            if (!grouped.has(pluginName)) grouped.set(pluginName, []);
            grouped.get(pluginName).push(item);
        });

        const colCount = table.querySelectorAll('thead th').length || 3;
        const frag = document.createDocumentFragment();
        const groups = Array.from(grouped.entries());

        groups.forEach(([pluginName, items], groupIndex) => {
            const sep = document.createElement('tr');
            sep.className = separatorClass;
            sep.dataset.plugin = pluginName;

            const sepCell = document.createElement('td');
            sepCell.colSpan = colCount;
            const label = document.createElement('span');
            label.className = separatorLabelClass;
            label.textContent = pluginName;
            sepCell.appendChild(label);
            sep.appendChild(sepCell);
            frag.appendChild(sep);

            items.forEach((item, idx) => {
                const row = byKey.get(item.editorId);
                if (!row) return;
                row.classList.remove(groupLastClass);
                if (idx === items.length - 1) row.classList.add(groupLastClass);
                frag.appendChild(row);
            });

            if (groupIndex < groups.length - 1) {
                const gap = document.createElement('tr');
                gap.className = gapClass;
                const gapCell = document.createElement('td');
                gapCell.colSpan = colCount;
                gap.appendChild(gapCell);
                frag.appendChild(gap);
            }
        });

        tbody.innerHTML = '';
        tbody.appendChild(frag);
    }

    updatePluginSeparatorVisibility({
        tbodySelector = '#edidList tbody',
        separatorClass = 'weap-plugin-separator',
        gapClass = 'weap-plugin-gap'
    } = {}) {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return;

        const rows = Array.from(tbody.children);
        const groups = [];
        let current = null;

        rows.forEach(row => {
            if (row.classList.contains(separatorClass)) {
                current = { sep: row, rows: [] };
                groups.push(current);
                return;
            }
            if (!current) return;
            if (row.classList.contains(gapClass)) return;
            if (!row.dataset.key) return;
            current.rows.push(row);
        });

        if (!groups.length) return;

        groups.forEach(group => {
            const hasVisibleRows = group.rows.some(r => r.style.display !== 'none');
            group.sep.style.display = hasVisibleRows ? '' : 'none';
        });

        rows.forEach((row, idx) => {
            if (!row.classList.contains(gapClass)) return;
            let prevVisible = false;
            let nextVisible = false;

            for (let i = idx - 1; i >= 0; i--) {
                if (rows[i].classList.contains(separatorClass)) {
                    prevVisible = rows[i].style.display !== 'none';
                    break;
                }
            }
            for (let i = idx + 1; i < rows.length; i++) {
                if (rows[i].classList.contains(separatorClass)) {
                    nextVisible = rows[i].style.display !== 'none';
                    break;
                }
            }

            row.style.display = (prevVisible && nextVisible) ? '' : 'none';
        });
    }

    createStoreZip(files) {
        const encoder = new TextEncoder();
        const chunks = [];
        const central = [];
        let offset = 0;

        const now = new Date();
        const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | ((Math.floor(now.getSeconds() / 2)) & 0x1F);
        const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

        files.forEach(file => {
            const nameBytes = encoder.encode(file.name);
            const dataBytes = encoder.encode(file.text);
            const crc = this.crc32(dataBytes);

            const local = new Uint8Array(30 + nameBytes.length);
            const ld = new DataView(local.buffer);
            ld.setUint32(0, 0x04034b50, true);
            ld.setUint16(4, 20, true);
            ld.setUint16(6, 0, true);
            ld.setUint16(8, 0, true);
            ld.setUint16(10, dosTime, true);
            ld.setUint16(12, dosDate, true);
            ld.setUint32(14, crc, true);
            ld.setUint32(18, dataBytes.length, true);
            ld.setUint32(22, dataBytes.length, true);
            ld.setUint16(26, nameBytes.length, true);
            ld.setUint16(28, 0, true);
            local.set(nameBytes, 30);

            const centralRec = new Uint8Array(46 + nameBytes.length);
            const cd = new DataView(centralRec.buffer);
            cd.setUint32(0, 0x02014b50, true);
            cd.setUint16(4, 20, true);
            cd.setUint16(6, 20, true);
            cd.setUint16(8, 0, true);
            cd.setUint16(10, 0, true);
            cd.setUint16(12, dosTime, true);
            cd.setUint16(14, dosDate, true);
            cd.setUint32(16, crc, true);
            cd.setUint32(20, dataBytes.length, true);
            cd.setUint32(24, dataBytes.length, true);
            cd.setUint16(28, nameBytes.length, true);
            cd.setUint16(30, 0, true);
            cd.setUint16(32, 0, true);
            cd.setUint16(34, 0, true);
            cd.setUint16(36, 0, true);
            cd.setUint32(38, 0, true);
            cd.setUint32(42, offset, true);
            centralRec.set(nameBytes, 46);

            chunks.push(local, dataBytes);
            central.push(centralRec);
            offset += local.length + dataBytes.length;
        });

        const centralSize = central.reduce((sum, c) => sum + c.length, 0);
        const end = new Uint8Array(22);
        const ed = new DataView(end.buffer);
        ed.setUint32(0, 0x06054b50, true);
        ed.setUint16(4, 0, true);
        ed.setUint16(6, 0, true);
        ed.setUint16(8, files.length, true);
        ed.setUint16(10, files.length, true);
        ed.setUint32(12, centralSize, true);
        ed.setUint32(16, offset, true);
        ed.setUint16(20, 0, true);

        const all = [...chunks, ...central, end];
        const total = all.reduce((sum, part) => sum + part.length, 0);
        const out = new Uint8Array(total);
        let pos = 0;
        all.forEach(part => {
            out.set(part, pos);
            pos += part.length;
        });
        return out;
    }

    buildEntriesPreview(entries = [], {
        headerBuilder = null,
        labelBuilder = (entry) => entry?.path || '',
        contentBuilder = (entry) => entry?.content || '',
        sectionPrefix = '; ===== ',
        sectionSuffix = ' ====='
    } = {}) {
        const list = Array.isArray(entries) ? entries : [];
        if (!list.length) return '';

        const sections = list.map((entry) => {
            const label = String(labelBuilder(entry) || '').trim();
            const content = String(contentBuilder(entry) || '');
            return `${sectionPrefix}${label}${sectionSuffix}\n${content}`;
        });

        const body = sections.join('\n\n').trim();
        if (typeof headerBuilder !== 'function') return body;

        const header = String(headerBuilder(list.length) || '').trim();
        if (!header) return body;
        return `${header}\n\n${body}`.trim();
    }

    renderExportPreviewToTextarea({
        entries = [],
        textareaSelector = '#exportdataform textarea',
        headerBuilder = null,
        labelBuilder = (entry) => entry?.path || '',
        contentBuilder = (entry) => entry?.content || ''
    } = {}) {
        const textarea = document.querySelector(textareaSelector);
        if (!textarea) return false;
        textarea.value = this.buildEntriesPreview(entries, {
            headerBuilder,
            labelBuilder,
            contentBuilder
        });
        return true;
    }

    downloadZipFromEntries(entries = [], {
        zipFilename = 'export.zip',
        pathBuilder = (entry) => entry?.path || '',
        contentBuilder = (entry) => entry?.content || ''
    } = {}) {
        const list = (Array.isArray(entries) ? entries : [])
            .map((entry) => ({
                name: String(pathBuilder(entry) || '').trim(),
                text: String(contentBuilder(entry) || '')
            }))
            .filter((file) => file.name.length > 0);

        if (!list.length) return false;

        const zipBytes = this.createStoreZip(list);
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = zipFilename;
        link.click();
        URL.revokeObjectURL(link.href);
        return true;
    }


    resolveExportEntries({
        source = [],
        buildEntries = null,
        emptyMessage = 'Nothing configured yet.',
        clearOutputSelector = null
    } = {}) {
        const input = Array.isArray(source) ? source : [];
        const entries = (typeof buildEntries === 'function')
            ? (buildEntries(input) || [])
            : input;
        const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
        if (list.length) return list;

        if (emptyMessage) alert(emptyMessage);
        if (clearOutputSelector) {
            const outputEl = document.querySelector(clearOutputSelector);
            if (outputEl) outputEl.value = '';
        }
        return [];
    }

    crc32(bytes) {
        if (!KinataMemeAPI.CRC_TABLE) {
            KinataMemeAPI.CRC_TABLE = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                KinataMemeAPI.CRC_TABLE[i] = c >>> 0;
            }
        }

        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            const idx = (crc ^ bytes[i]) & 0xFF;
            crc = (KinataMemeAPI.CRC_TABLE[idx] ^ (crc >>> 8)) >>> 0;
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

// ------------------- SELECTION -------------------

isEdited(edid) {
    const hasRules = Array.isArray(this.edidRules[edid]) && this.edidRules[edid].length > 0;
    if (!hasRules) return false;

    // In multi-select, currently selected rows are treated as temporary:
    // they should not be blocked as "edited" until multi-select is disabled.
    if (this.multiSelectionMode && this.multiSelectedEDIDs.has(edid)) {
        return false;
    }

    return true;
}

selectEdid(edid) {
    if (!edid) return;

    // If multi-select is active, delegate to multi-select click handler.
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

    // No-op if state did not change.
    if (newState === this.multiSelectionMode) {
        return;
    }

    this.multiSelectionMode = newState;

    if (!this.multiSelectionMode) {
        // Disable multi-select mode.
        this.multiSelectedEDIDs.clear();
        this.multiBaseKeywords = [];
        this.multiAnchorEdid = null;
        return;
    }

    // Enable multi-select mode.
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

    // Multi-select mode behavior.
    const hasRules = Array.isArray(this.edidRules[edid]) && this.edidRules[edid].length > 0;
    const isAnchor = this.multiAnchorEdid === edid;

    // Edited rows can only be added if they are the anchor
    // (the row that was active before multi-select was enabled).
    if (hasRules && !isAnchor && !this.multiSelectedEDIDs.has(edid)) {
        return;
    }

    if (this.multiSelectedEDIDs.has(edid)) {
        this.multiSelectedEDIDs.delete(edid);
    } else {
        this.multiSelectedEDIDs.add(edid);

        // When adding a row, apply current UI selection to it.
        const currentKws = this.collectKeywordsFromDOM();
        this.edidRules[edid] = [...currentKws];
        this.multiBaseKeywords = [...currentKws];
    }

    // If no active row exists yet, assign one.
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

    // If this is the active row, sync DOM inputs.
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

    // Multi-select apply.
    if (this.multiSelectionMode && this.multiSelectedEDIDs.size > 0) {
        this.multiBaseKeywords = [...kws];

        this.multiSelectedEDIDs.forEach(edid => {
            this.edidRules[edid] = [...kws];
        });

        return;
    }

    // Single-row apply.
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
    // textGeneratorFn: callback returning generated text (INI/TXT/etc).
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

