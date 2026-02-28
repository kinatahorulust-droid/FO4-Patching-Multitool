class SAKRBuilder {
    constructor(api) {
        this.api = api;
        this.records = [];
        this.currentSearchQuery = "";
        this.kywdIconByCategory = {};
        this.keywordLayout = [];
        this.templates = [];
    }

    async loadConfigFromApi() {
        const config = await this.api.loadToolConfig("configs/sakr.json", {
            requiredKeys: ["version", "kywdIconByCategory", "keywordLayout", "templates"]
        });
        this.applyConfig(config);
    }

    applyConfig(config = {}) {
        this.kywdIconByCategory = (config.kywdIconByCategory && typeof config.kywdIconByCategory === "object")
            ? { ...config.kywdIconByCategory }
            : {};
        this.keywordLayout = Array.isArray(config.keywordLayout) ? config.keywordLayout : [];
        this.templates = Array.isArray(config.templates) ? config.templates : [];
    }

    renderKeywordUI() {
        const container = document.getElementById("keywordContainer");
        if (!container) return;
        container.innerHTML = "";

        const modulesRoot = document.createElement("div");
        modulesRoot.className = "tag-modules";
        this.keywordLayout.forEach((rowModules) => {
            if (!Array.isArray(rowModules) || !rowModules.length) return;
            const row = document.createElement("div");
            row.className = "tag-modules-row";

            rowModules.forEach((module) => {
                if (!module || typeof module !== "object") return;
                const moduleEl = document.createElement("div");
                moduleEl.className = "tag-module";

                const title = document.createElement("h3");
                title.className = "tag-module-title";
                if (module.icon) {
                    const icon = document.createElement("img");
                    icon.className = "module-title-icon";
                    icon.src = module.icon;
                    icon.alt = "";
                    icon.setAttribute("aria-hidden", "true");
                    title.appendChild(icon);
                }
                title.appendChild(document.createTextNode(String(module.title || "")));
                moduleEl.appendChild(title);

                const groupName = String(module.name || "").trim();
                const radios = Array.isArray(module.radios) ? module.radios : [];
                const checks = Array.isArray(module.checks) ? module.checks : [];

                if (radios.length) {
                    const segmented = document.createElement("div");
                    segmented.className = "segmented module-switch";
                    radios.forEach((item) => {
                        const label = document.createElement("label");
                        label.className = "segmented-item";
                        const input = document.createElement("input");
                        input.type = "radio";
                        input.name = groupName;
                        input.value = String(item.value || "");
                        if (item.formIdOld) input.dataset.formidOld = String(item.formIdOld);
                        if (item.formIdNew) input.dataset.formidNew = String(item.formIdNew);
                        const span = document.createElement("span");
                        span.textContent = String(item.label || item.value || "");
                        label.appendChild(input);
                        label.appendChild(span);
                        segmented.appendChild(label);
                    });
                    moduleEl.appendChild(segmented);
                }

                if (checks.length) {
                    const checksWrap = document.createElement("div");
                    checksWrap.className = "top-mod-grid module-checks";
                    checks.forEach((item) => {
                        const label = document.createElement("label");
                        label.className = "segmented-check-item";
                        const input = document.createElement("input");
                        input.type = "checkbox";
                        input.name = groupName;
                        input.value = String(item.value || "");
                        if (item.formIdOld) input.dataset.formidOld = String(item.formIdOld);
                        if (item.formIdNew) input.dataset.formidNew = String(item.formIdNew);
                        const span = document.createElement("span");
                        span.textContent = String(item.label || item.value || "");
                        label.appendChild(input);
                        label.appendChild(span);
                        checksWrap.appendChild(label);
                    });
                    moduleEl.appendChild(checksWrap);
                }

                row.appendChild(moduleEl);
            });

            modulesRoot.appendChild(row);
        });
        container.appendChild(modulesRoot);
    }

    renderTemplates() {
        const container = document.getElementById("templateButtons");
        if (!container) return;
        container.innerHTML = "";
        this.templates.forEach((tpl) => {
            if (!tpl || typeof tpl !== "object") return;
            const btn = document.createElement("button");
            btn.className = "template-btn";
            btn.dataset.template = String(tpl.name || "");
            btn.dataset.keywords = Array.isArray(tpl.keywords) ? tpl.keywords.join(",") : "";
            btn.textContent = String(tpl.label || tpl.name || "Template");
            container.appendChild(btn);
        });
    }

    // ------------------- Import RobCo -------------------
    async promptRobCoVersionChoice() {
        let useOldVersion = false;
        const confirmContainer = document.createElement('div');
        confirmContainer.className = 'robco-confirm-overlay';
        confirmContainer.innerHTML = `
            <div class="robco-confirm-box" role="dialog" aria-modal="true" aria-label="RobCo version selection">
                <h3>RobCo Import</h3>
                <p>SAKR version could not be detected in this patch. Specify the version.</p>
                <p>If this RobCo Patch was created before 2026, choose Old.</p>
                <div class="robco-confirm-actions">
                    <button class="robco-btn-old" type="button">Old by twistedtrebla</button>
                    <button class="robco-btn-new" type="button">New Redux by Evi1Panda</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmContainer);

        await new Promise(resolve => {
            confirmContainer.querySelector('.robco-btn-old').addEventListener('click', () => {
                useOldVersion = true;
                document.body.removeChild(confirmContainer);
                resolve();
            });
            confirmContainer.querySelector('.robco-btn-new').addEventListener('click', () => {
                useOldVersion = false;
                document.body.removeChild(confirmContainer);
                resolve();
            });
        });

        return useOldVersion;
    }

    async importRobCoFile(file) {
        const result = await this.api.importRobCoIni(
            file,
            '#keywordContainer input',
            () => this.promptRobCoVersionChoice()
        );
        this.updateButtonHighlights();
        console.log('RobCo import finished, patched EDID count:', result.patchedCount, 'version isOld:', result.useOldVersion);
    }

    normalizeFormId(formId) { return this.api.normalizeFormId(formId); }

    sanitizeIdAndFileToken(value, fallback = "output") {
        const lettersDigitsSpacesOnly = String(value || "").replace(/[^A-Za-z0-9\s]+/g, "");
        const cleaned = lettersDigitsSpacesOnly.trim().replace(/\s+/g, "_");
        return cleaned || fallback;
    }

    parseArmorList(text) {
        return this.api.buildRecordListFromSectionedText(text, {
            parseLine: (line) => {
                if (line.includes('|')) {
                    const parts = line.split('|');
                    const edid = (parts[0] || '').trim();
                    const formId = this.normalizeFormId((parts[1] || '').trim());
                    const name = (parts.slice(2).join('|') || '').trim();
                    if (!edid) return null;
                    return { formId, edid, name };
                }

                return null;
            },
            normalizeRecord: (rec) => {
                const plugin = (rec.plugin || '').trim();
                const formId = this.normalizeFormId(rec.formId || '');
                const edid = (rec.edid || '').trim();
                if (!plugin || !edid || !formId) return null;
                return {
                    plugin,
                    formId,
                    edid,
                    name: (rec.name || '').trim()
                };
            },
            makeKey: (rec) => `${rec.plugin}|${rec.formId}|${rec.edid}`,
            sortFn: (a, b) => {
                const p = (a.plugin || '').localeCompare((b.plugin || ''), undefined, { sensitivity: "base" });
                if (p !== 0) return p;
                const an = (a.name || a.edid || '').toLowerCase();
                const bn = (b.name || b.edid || '').toLowerCase();
                return an.localeCompare(bn);
            }
        });
    }

    getUploadTitleText(fallbackFilename = "") {
        return this.api.getSessionUploadTitle(fallbackFilename, {
            loadedLabel: "TXT loaded",
            pluginsLabel: "plugins loaded"
        });
    }

    getRecordByKey(key) {
        return this.records.find(record => record.key === key) || null;
    }

    getEdidCellText(key) {
        return this.getRecordByKey(key)?.edid || key;
    }

    // ------------------- Инициализация DOM -------------------
    // ------------------- DOM Init -------------------
    init() {
        const setup = async () => {
            await this.loadConfigFromApi();
            this.renderKeywordUI();
            this.renderTemplates();

            window.KinataDebug = window.KinataDebug || {};
            window.KinataDebug.showRobCoVersionModal = () => this.promptRobCoVersionChoice();

            const edidTitle = document.getElementById("edidUploadTitle");
            this.api.bindPrimaryAndSecondaryUpload({
                inputId: "edidFile",
                primaryTriggerId: "edidBtn",
                secondaryTriggerId: "edidUploadAnother",
                onFile: async (file) => {
                    const result = await this.api.runTextImportFlow({
                        file,
                        parseRecords: (text) => this.parseArmorList(text),
                        mapToSessionItem: (record) => ({
                            editorId: record.key,
                            formId: record.formId,
                            edid: record.edid,
                            name: record.name || "",
                            plugin: record.plugin
                        }),
                        loadedLabel: "TXT loaded",
                        pluginsLabel: "plugins loaded",
                        emptyMessage: "No valid armor lines found. Check TXT format."
                    });
                    this.records = result.records || [];
                    this.currentSearchQuery = "";
                    if (edidTitle) edidTitle.textContent = result.uploadTitle || this.getUploadTitleText(file.name);
                    this.clearExportOutput();
                    this.renderEdidList();
                }
            });

            this.api.bindSimpleFileLinkUpload({
                inputId: "robcoFile",
                triggerId: "robcoBtn",
                onFile: async (file) => {
                    await this.importRobCoFile(file);
                }
            });

            this.api.bindStandardListControls({
                onMultiToggle: () => this.updateButtonHighlights(),
                onSearch: (value) => this.searchEdidTable(value),
                onFilterToggle: () => this.applyEdidTableFilters()
            });

            const fo4EditScriptLink = document.getElementById("sakrFo4EditScriptLink");
            if (fo4EditScriptLink) {
                fo4EditScriptLink.addEventListener("click", async (e) => {
                    e.preventDefault();
                    const sourceUrl = fo4EditScriptLink.dataset.downloadUrl || "";
                    if (!sourceUrl) return;
                    try {
                        const response = await fetch(sourceUrl, { cache: "no-store" });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const text = await response.text();
                        const blob = new Blob([text], { type: "application/octet-stream" });
                        const tmpUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = tmpUrl;
                        a.download = "ARMO_Export_For_SAKR.pas";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(tmpUrl);
                    } catch (_) {
                        alert("Could not download the script automatically. Open this page via local server and try again.");
                    }
                });
            }

            document.querySelectorAll('#keywordContainer input').forEach(input => {
                input.addEventListener('change', () => {
                    this.enforceGroupRadioLock(input.name);
                    this.api.updateKeywordsFromDOM();
                    this.updateButtonHighlights();
                });
            });

            document.querySelectorAll('#keywordContainer label').forEach(label => {
                const radio = label.querySelector('input[type="radio"]');
                if (!radio) return;
                label.addEventListener('mousedown', () => radio._wasChecked = radio.checked);
                label.addEventListener('click', e => {
                    if (radio._wasChecked) {
                        if (this.isRadioRequiredForGroup(radio.name)) {
                            e.preventDefault();
                            return;
                        }
                        radio.checked = false;
                        radio.dispatchEvent(new Event('change'));
                        this.updateButtonHighlights();
                        e.preventDefault();
                    }
                });
            });

            const copyBtn = document.getElementById("copyAddItemBtn");
            if (copyBtn) {
                copyBtn.addEventListener("click", () => {
                    const result = this.api.copyAddItem();
                    copyBtn.textContent = result ? "Copied!" : "Nothing selected";
                    setTimeout(() => copyBtn.textContent = "Copy AddItem", 2000);
                });
            }

            document.querySelectorAll('.template-btn').forEach(btn => {
                btn.addEventListener("click", () => {
                    const keywords = (btn.dataset.keywords || '').split(',').map(k => k.trim()).filter(k => k.length > 0);
                    this.api.applyTemplateKeywords(keywords);
                    this.enforceAllGroupRadioLocks();
                    this.api.updateKeywordsFromDOM();
                    this.updateButtonHighlights();
                });
            });

            this.enforceAllGroupRadioLocks();
            this.initExportModule();
        };

        const onError = (error) => {
            console.error("[SAKR] Config load failed. Tool initialization aborted.", error);
            alert("SAKR config could not be loaded. Check configs/sakr.json");
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                setup().catch(onError);
            }, { once: true });
        } else {
            setup().catch(onError);
        }
    }

    getGroupInputs(groupName) {
        const allInputs = Array.from(document.querySelectorAll('#keywordContainer input'));
        const groupInputs = allInputs.filter(input => input.name === groupName);
        return {
            radios: groupInputs.filter(input => input.type === 'radio'),
            checkboxes: groupInputs.filter(input => input.type === 'checkbox')
        };
    }

    isRadioRequiredForGroup(groupName) {
        if (!groupName) return false;
        const { radios, checkboxes } = this.getGroupInputs(groupName);
        if (!radios.length || !checkboxes.length) return false;
        return checkboxes.some(input => input.checked);
    }

    enforceGroupRadioLock(groupName) {
        if (!this.isRadioRequiredForGroup(groupName)) return;
        const { radios } = this.getGroupInputs(groupName);
        if (!radios.some(input => input.checked) && radios.length) {
            radios[0].checked = true;
        }
    }

    enforceAllGroupRadioLocks() {
        const names = new Set(
            Array.from(document.querySelectorAll('#keywordContainer input'))
                .map(input => input.name)
                .filter(Boolean)
        );
        names.forEach(name => this.enforceGroupRadioLock(name));
    }

    // ------------------- EDID List -------------------
    renderEdidList() {
        this.api.renderEdidTable({
            containerId: "edidList",
            thirdColumnTitle: "KYWD",
            groupByPlugin: true,
            getThirdCellHtml: (edid) => this.getKywdIconsMarkup(edid),
            onRowClick: (key, rowEl) => {
                const edidCell = rowEl.querySelector(".edid-col-edid");
                if (edidCell) edidCell.textContent = this.getEdidCellText(key);
                this.enforceAllGroupRadioLocks();
                this.api.updateKeywordsFromDOM();
                this.updateButtonHighlights();
            }
        });

        this.api.renderTableRowsState({
            rowsSelector: "#edidList tbody tr[data-key]",
            getEdidText: (key) => this.getEdidCellText(key)
        });

        this.updateButtonHighlights();
    }

    // ------------------- Highlights -------------------
    updateButtonHighlights() {
        this.api.updateEdidTableHighlights({
            getThirdCellHtml: (edid) => this.getKywdIconsMarkup(edid)
        });
        this.applyEdidTableFilters();
    }

    getKywdIconsMarkup(edid) {
        const keywords = this.api.edidRules[edid] || [];
        if (!keywords.length) return "";

        const categories = new Set();
        const inputs = document.querySelectorAll("#keywordContainer input");

        keywords.forEach(kw => {
            for (const input of inputs) {
                if (input.value !== kw) continue;
                if (input.name) categories.add(input.name.trim().toLowerCase());
                break;
            }
        });

        if (!categories.size) return "";

        const categoryList = Array.from(categories);
        return this.api.renderIconTokenList({
            items: categoryList.map(cat => ({
                token: cat,
                src: this.kywdIconByCategory[cat] || `icons/sakr/${cat}.svg`,
                label: cat
            })),
            maxVisible: 3,
            iconClass: "kywd-icon",
            moreClass: "kywd-more",
            moreTitle: "More categories selected",
            hideBrokenIcons: true
        });
    }

    searchEdidTable(query = "") {
        this.currentSearchQuery = query.trim();
        this.applyEdidTableFilters();
    }

    applyEdidTableFilters() {
        const showNotEditedToggle = document.getElementById("showNotEditedToggle");
        this.api.applyEdidTableFiltersEx({
            query: this.currentSearchQuery,
            showOnlyNotEdited: !!(showNotEditedToggle && showNotEditedToggle.checked),
            rowsSelector: "#edidList tbody tr[data-key]"
        });
    }

    clearExportOutput() {
        const outputEl = document.querySelector("#exportdataform textarea");
        if (outputEl) outputEl.value = "";
    }


    // ------------------- Модуль экспорта -------------------
    initExportModule() {
        this.api.bindExportControls({
            containerId: 'exportdataform',
            onGenerate: () => this.generateINI(),
            onExport: async () => {
                await this.exportZip();
            },
            copiedLabel: 'Copied!',
            emptyLabel: 'Nothing',
            copyIdleLabel: 'Copy',
            copyResetMs: 1500
        });
    }

    getConfiguredPluginMap() {
        return this.api.groupConfiguredByPlugin(this.records, {
            isConfigured: (record) => {
                const kws = this.api.edidRules[record.key] || [];
                return kws.length > 0;
            },
            getPlugin: (record) => record.plugin
        });
    }

    buildIniForPlugin(pluginName, records) {
        const author = document.getElementById("author")?.value.trim() || "Automated by Kinata";
        const espNameNoExt = pluginName.replace(/\.(esp|esm|esl)$/i, "");
        const idSafeName = this.sanitizeIdAndFileToken(espNameNoExt, "output");
        const formatEdidForExport = (edid) => {
            const value = String(edid || "").trim();
            if (!value) return "";
            if (/\s/.test(value)) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        };

        let out = "";
        out += `[Plugin]\n`;
        out += `id = cpp_SAKR_${idSafeName}\n`;
        out += `name = SAKR ${espNameNoExt}\n`;
        out += `desc = Tag armor, clothing with skimpy keywords (created with Kinata SAKR Builder).\n`;
        out += `author = ${author}\n`;
        out += `type = pluginRecordModifier\n`;
        out += `cachable = true\n`;
        out += `defaultRulesPriority = (1)\n`;
        out += `visibleDefault = false\n`;
        out += `activeDefault = true\n`;
        out += `useTagSet = FIS2\n`;
        out += `requiredFiles = ${pluginName}\n`;
        out += `requiredRecordTypes = ARMO\n`;
        out += `task = SAKR:${espNameNoExt}\n\n`;

        out += `[Mod.${espNameNoExt}.Rules.ARMO.prefilter]\n*=KEEP\n\n`;
        out += `[Mod.${espNameNoExt}.Rules.ARMO]\n\n`;

        const groups = {};
        records.forEach(record => {
            const kws = (this.api.edidRules[record.key] || [])
                .map(k => k.trim())
                .filter(k => k !== "")
                .sort();
            if (!kws.length) return;
            const keySignature = kws.join("|");
            if (!groups[keySignature]) {
                groups[keySignature] = { edids: [], keywords: kws };
            }
            groups[keySignature].edids.push(record.edid);
        });

        for (const sig in groups) {
            const group = groups[sig];
            const edidLine = group.edids.map(formatEdidForExport).join("|");
            const kwLine = group.keywords
                .map(k => `SPECIAL:AddKeyword:KEYWORDS:${k}`)
                .join(", ");
            out += `EDID equals ${edidLine} = ${kwLine}\n\n`;
        }

        return out;
    }

    generateINI() {
        const entries = this.api.resolveExportEntries({
            source: [this.getConfiguredPluginMap()],
            buildEntries: ([grouped]) => this.buildExportEntries(grouped),
            emptyMessage: "No armor entries configured yet.",
            clearOutputSelector: "#exportdataform textarea"
        });
        if (!entries.length) return;

        const rendered = this.api.renderExportPreviewToTextarea({
            entries,
            textareaSelector: "#exportdataform textarea",
            labelBuilder: (entry) => entry.pluginName,
            contentBuilder: (entry) => entry.content
        });
        if (!rendered) {
            console.warn("No export container found: #exportdataform textarea");
        }
    }

    async exportZip() {
        const entries = this.api.resolveExportEntries({
            source: [this.getConfiguredPluginMap()],
            buildEntries: ([grouped]) => this.buildExportEntries(grouped),
            emptyMessage: "No armor entries configured yet."
        });
        if (!entries.length) return;

        this.api.downloadZipFromEntries(entries, {
            zipFilename: "SAKR_export.zip",
            pathBuilder: (entry) => entry.path,
            contentBuilder: (entry) => entry.content
        });
    }

    buildExportEntries(grouped = null) {
        const source = grouped instanceof Map ? grouped : this.getConfiguredPluginMap();
        const pluginEntries = this.api.getSortedPluginEntries(source);
        return pluginEntries.map(([pluginName, records]) => {
            const espNameNoExt = pluginName.replace(/\.(esp|esm|esl)$/i, "");
            const safeBase = this.sanitizeIdAndFileToken(espNameNoExt, "output");
            const iniName = `SAKR_${safeBase}.ini`;
            return {
                pluginName,
                path: `Data/Complex Sorter/Plugins/${iniName}`,
                content: this.buildIniForPlugin(pluginName, records)
            };
        });
    }

}

const builder = new SAKRBuilder(window.KinataMemeAPI);
builder.init();
