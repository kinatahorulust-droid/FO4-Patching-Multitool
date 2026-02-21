class SAKRBuilder {
    constructor(api) {
        this.api = api;
        this.currentSearchQuery = "";
        this.kywdIconByCategory = {
            armortop: "icons/sakr/armortop.svg",
            armorbot: "icons/sakr/armorbot.svg",
            top: "icons/sakr/top.svg",
            pants: "icons/sakr/pants.svg",
            skirt: "icons/sakr/skirt.svg",
            bra: "icons/sakr/bra.svg",
            panty: "icons/sakr/panty.svg",
            heels: "icons/sakr/heels.svg",
            stocking: "icons/sakr/stocking.svg"
        };
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

    // ------------------- Инициализация DOM -------------------
    init() {
        const setup = () => {
            window.KinataDebug = window.KinataDebug || {};
            window.KinataDebug.showRobCoVersionModal = () => this.promptRobCoVersionChoice();

            const edidTitle = document.getElementById("edidUploadTitle");
            this.api.bindPrimaryAndSecondaryUpload({
                inputId: "edidFile",
                primaryTriggerId: "edidBtn",
                secondaryTriggerId: "edidUploadAnother",
                onFile: async (file) => {
                    const text = await file.text();
                    await this.api.loadTxt(text);
                    if (edidTitle) {
                        edidTitle.textContent = this.api.currentEsp || file.name;
                    }
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



            document.querySelectorAll('#keywordContainer input').forEach(input=>{
                input.addEventListener('change',()=>{
                    this.enforceGroupRadioLock(input.name);
                    this.api.updateKeywordsFromDOM();
                    this.updateButtonHighlights();
                });
            });

            document.querySelectorAll('#keywordContainer label').forEach(label=>{
                const radio=label.querySelector('input[type="radio"]');
                if(!radio) return;
                label.addEventListener('mousedown',()=>radio._wasChecked=radio.checked);
                label.addEventListener('click', e=>{
                    if(radio._wasChecked){
                        if (this.isRadioRequiredForGroup(radio.name)) {
                            e.preventDefault();
                            return;
                        }
                        radio.checked=false;
                        radio.dispatchEvent(new Event('change'));
                        this.updateButtonHighlights();
                        e.preventDefault();
                    }
                });
            });

            const copyBtn = document.getElementById("copyAddItemBtn");
            if (copyBtn) {
                copyBtn.addEventListener("click",()=>{
                    const result = this.api.copyAddItem();
                    copyBtn.textContent = result ? "Copied!" : "Nothing selected";
                    setTimeout(()=>copyBtn.textContent="Copy AddItem",2000);
                });
            }

            document.querySelectorAll('.template-btn').forEach(btn=>{
                btn.addEventListener("click",()=>{
                    const keywords=(btn.dataset.keywords||'').split(',').map(k=>k.trim()).filter(k=>k.length>0);
                    this.api.applyTemplateKeywords(keywords);
                    this.enforceAllGroupRadioLocks();
                    this.api.updateKeywordsFromDOM();
                    this.updateButtonHighlights();
                });
            });


            // --- Модуль экспорта ---
            this.enforceAllGroupRadioLocks();
            this.initExportModule();
        };
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", setup, { once: true });
        } else {
            setup();
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
            getThirdCellHtml: (edid) => this.getKywdIconsMarkup(edid),
            onRowClick: () => {
                this.enforceAllGroupRadioLocks();
                this.api.updateKeywordsFromDOM();
                this.updateButtonHighlights();
            }
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
        const visible = categoryList.slice(0, 3);
        const hasMore = categoryList.length > 3;

        let markup = visible.map(cat => {
            const src = this.kywdIconByCategory[cat] || `icons/sakr/${cat}.svg`;
            return `<img class="kywd-icon" src="${this.api.escapeHtml(src)}" alt="${this.api.escapeHtml(cat)}" title="${this.api.escapeHtml(cat)}" onerror="this.style.display='none'">`;
        }).join("");

        if (hasMore) {
            markup += `<span class="kywd-more" title="More categories selected">...</span>`;
        }

        return markup;
    }

    searchEdidTable(query = "") {
        this.currentSearchQuery = query.trim();
        this.applyEdidTableFilters();
    }

    applyEdidTableFilters() {
        const showNotEditedToggle = document.getElementById("showNotEditedToggle");
        this.api.applyEdidTableFilters({
            query: this.currentSearchQuery,
            showOnlyNotEdited: !!(showNotEditedToggle && showNotEditedToggle.checked),
            rowsSelector: "#edidList tbody tr"
        });
    }

    clearExportOutput() {
        const outputEl = document.querySelector("#exportdataform textarea");
        if (outputEl) outputEl.value = "";
    }


    // ------------------- Модуль экспорта -------------------
    initExportModule() {
        const container = document.getElementById('exportdataform');
        if (!container) return;

        const textarea = container.querySelector('textarea');
        const generateBtn = container.querySelector('.generate-btn');
        const copyBtn = container.querySelector('.copy-btn');
        const exportBtn = container.querySelector('.export-btn');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateINI());
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const text = textarea.value;
                if (text) navigator.clipboard.writeText(text);
                copyBtn.textContent = text ? 'Copied!' : 'Nothing';
                setTimeout(()=>copyBtn.textContent='Copy', 1500);
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const espNameNoExt = this.api.currentEsp ? this.api.currentEsp.replace(/\.(esp|esm|esl)$/i,'') : 'output';
                const blob = new Blob([textarea.value], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${espNameNoExt}.ini`;
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }
    }


    generateINI() {
        if (!this.api.currentEsp) {
            alert("TXT must contain 'plugin:...' as first line");
            return;
        }

        const author = document.getElementById("author")?.value.trim() || "Automated by Kinata";
        const espNameNoExt = this.api.currentEsp.replace(/\.(esp|esm|esl)$/i, "");

        let out = "";
        out += `id = cpp_SAKR_${espNameNoExt}\n`;
        out += `name = SAKR ${espNameNoExt}\n`;
        out += `desc = Tag armor, clothing with skimpy keywords (created with Kinata SAKR Builder).\n`;
        out += `author = ${author}\n`;
        out += `type = pluginRecordModifier\n`;
        out += `cachable = true\n`;
        out += `defaultRulesPriority = (1)\n`;
        out += `visibleDefault = false\n`;
        out += `activeDefault = true\n`;
        out += `useTagSet = FIS2\n`;
        out += `requiredFiles = ${this.api.currentEsp}\n`;
        out += `requiredRecordTypes = ARMO\n`;
        out += `task = SAKR:${espNameNoExt}\n\n`;

        out += `[Mod.${espNameNoExt}.Rules.ARMO.prefilter]\n*=KEEP\n\n`;
        out += `[Mod.${espNameNoExt}.Rules.ARMO]\n\n`;

        const groups = {};

        for (const edid in this.api.edidRules) {
            const kws = (this.api.edidRules[edid] || [])
                .map(k => k.trim())
                .filter(k => k !== "")
                .sort();

            if (kws.length === 0) continue;

            const keySignature = kws.join("|");

            if (!groups[keySignature]) {
                groups[keySignature] = { edids: [], keywords: kws };
            }
            groups[keySignature].edids.push(edid);
        }

        for (const sig in groups) {
            const group = groups[sig];
            const edidLine = group.edids.join("|");
            const kwLine = group.keywords
                .map(k => `SPECIAL:AddKeyword:KEYWORDS:${k}`)
                .join(", ");

            out += `EDID equals ${edidLine} = ${kwLine}\n`;
        }

        const outputEl = document.querySelector("#exportdataform textarea");
        if (outputEl) {
            outputEl.value = out;
        } else {
            console.warn("No export container found: #exportdataform textarea");
        }
    }

}

const builder = new SAKRBuilder(window.KinataMemeAPI);
builder.init();
