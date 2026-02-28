class WEAPLvliBuilder {
    constructor(api) {
        this.api = api;
        this.records = []; // [{key, plugin, formId, edid, name, ammo, types}]
        this.currentSearchQuery = "";
        this.sourceName = "output";
        this.lvliLabelByValue = {};

        // Loaded only from configs/weap.json via API.
        this.factionSelectorTokens = new Set();
        this.specialSelectorTokens = new Set();

        this.typeModules = {};
        this.specialModules = {};
        this.distributeLvliMap = {};
        this.factionsLvliMap = {};
        this.specialLvliMap = {};
        this.typeKeywordModules = {};
        this.typeEdidByKeyword = {};
        this.autoTypeTokensByTypeEdid = {};

        this.typeTokenMeta = {};
        this.factionTokenMeta = {};

        this.autoDecisionConfig = {};
        this.factionDecisionConfig = {};
        this.specialTypeTokens = new Set();
        this.vendorToken = "";
    }

    async loadConfigFromApi() {
        const config = await this.api.loadToolConfig("configs/weap.json", {
            requiredKeys: [
                "version",
                "factionModules",
                "typeModules",
                "specialModules",
                "typeKeywordModules",
                "autoDecisionConfig"
            ]
        });
        this.applyConfig(config);
    }

    applyConfig(config = {}) {
        const applyObject = (prop) => {
            if (config[prop] && typeof config[prop] === "object" && !Array.isArray(config[prop])) {
                this[prop] = { ...config[prop] };
            }
        };

        applyObject("typeModules");
        applyObject("specialModules");
        applyObject("autoDecisionConfig");

        this.applyTypeModules(config.typeModules, config.specialModules);
        this.vendorToken = String(this.autoDecisionConfig?.vendorToken || "").trim();
        const configuredTypeSpecialTokens = (Array.isArray(this.autoDecisionConfig?.typeSpecialTokens)
            ? this.autoDecisionConfig.typeSpecialTokens
            : [])
            .map(v => String(v || "").trim())
            .filter(Boolean);
        const derivedTypeSpecialTokens = Object.keys(this.specialModules || {})
            .map(v => String(v || "").trim())
            .filter(Boolean)
            .filter(token => token !== this.vendorToken);
        this.specialTypeTokens = new Set(
            configuredTypeSpecialTokens.length ? configuredTypeSpecialTokens : derivedTypeSpecialTokens
        );

        this.applyTypeKeywordModules(config.typeKeywordModules);

        this.applyFactionModules(config.factionModules, config.factionExtraMeta);
    }

    applyTypeModules(typeModules = {}, specialModules = {}) {
        const normTypeModules = (typeModules && typeof typeModules === "object" && !Array.isArray(typeModules))
            ? typeModules
            : {};
        const normSpecialModules = (specialModules && typeof specialModules === "object" && !Array.isArray(specialModules))
            ? specialModules
            : {};

        this.typeModules = normTypeModules;
        this.specialModules = normSpecialModules;
        this.distributeLvliMap = {};
        this.specialLvliMap = {};
        this.specialSelectorTokens = new Set();
        this.typeTokenMeta = {};
        this.autoTypeTokensByTypeEdid = {};

        Object.entries(normTypeModules).forEach(([token, module]) => {
            if (!module || typeof module !== "object") return;
            const lists = Array.isArray(module.lists)
                ? module.lists.map(item => this.normalizeLvliEntry(item)).filter(Boolean)
                : [];
            this.distributeLvliMap[token] = lists;
            this.typeTokenMeta[token] = {
                priority: Number.isFinite(module.displayOrder) ? module.displayOrder : 999,
                icon: String(module.icon || "")
            };
            const sourceTypes = Array.isArray(module.sourceTypeEdids)
                ? module.sourceTypeEdids.map(v => String(v || "").trim()).filter(Boolean)
                : [];
            sourceTypes.forEach((typeEdid) => {
                if (!this.autoTypeTokensByTypeEdid[typeEdid]) this.autoTypeTokensByTypeEdid[typeEdid] = [];
                if (!this.autoTypeTokensByTypeEdid[typeEdid].includes(token)) {
                    this.autoTypeTokensByTypeEdid[typeEdid].push(token);
                }
            });
        });

        Object.entries(normSpecialModules).forEach(([token, module]) => {
            if (!module || typeof module !== "object") return;
            this.specialSelectorTokens.add(token);
            const lists = Array.isArray(module.lists)
                ? module.lists.map(item => this.normalizeLvliEntry(item)).filter(Boolean)
                : [];
            this.specialLvliMap[token] = lists;
            this.typeTokenMeta[token] = {
                priority: Number.isFinite(module.displayOrder) ? module.displayOrder : 999,
                icon: String(module.icon || "")
            };
        });
    }

    applyTypeKeywordModules(typeKeywordModules = {}) {
        const modules = (typeKeywordModules && typeof typeKeywordModules === "object" && !Array.isArray(typeKeywordModules))
            ? typeKeywordModules
            : {};

        this.typeKeywordModules = modules;
        this.typeEdidByKeyword = {};

        Object.entries(modules).forEach(([typeEdid, module]) => {
            if (!module || typeof module !== "object") return;
            const canonical = String(typeEdid || "").trim();
            if (!canonical) return;
            const formIds = Array.isArray(module.formIds) ? module.formIds : [];
            formIds.forEach((formIdRaw) => {
                const formIdKey = this.toTypeFormKey(String(formIdRaw || ""));
                if (!formIdKey) return;
                this.typeEdidByKeyword[formIdKey] = canonical;
            });
        });
    }

    applyFactionModules(factionModules = {}, factionExtraMeta = {}) {
        const modules = (factionModules && typeof factionModules === "object" && !Array.isArray(factionModules))
            ? factionModules
            : {};
        const extraMeta = (factionExtraMeta && typeof factionExtraMeta === "object" && !Array.isArray(factionExtraMeta))
            ? factionExtraMeta
            : {};

        this.factionSelectorTokens = new Set();
        this.factionTokenMeta = {};
        this.factionsLvliMap = {};
        this.factionDecisionConfig = {};

        Object.keys(modules).forEach((factionToken) => {
            const module = modules[factionToken] || {};
            this.factionSelectorTokens.add(factionToken);
            this.factionTokenMeta[factionToken] = {
                priority: Number.isFinite(module.priority) ? module.priority : 999,
                icon: String(module.icon || "")
            };

            const rules = Array.isArray(module.rules) ? module.rules : [];
            const compiledRules = [];
            rules.forEach((rule, idx) => {
                if (!rule || typeof rule !== "object") return;
                const lists = Array.isArray(rule.lists)
                    ? rule.lists.map(item => this.normalizeLvliEntry(item)).filter(Boolean)
                    : [];
                if (!lists.length) return;

                const ruleId = String(rule.id || `RULE_${idx + 1}`).trim().replace(/[^\w-]+/g, "_");
                const categoryToken = `${factionToken}__${ruleId}`;
                const seenEntries = new Set();
                this.factionsLvliMap[categoryToken] = lists.filter((item) => {
                    const key = this.getLvliEntryKey(item);
                    if (!key || seenEntries.has(key)) return false;
                    seenEntries.add(key);
                    return true;
                });

                const decisionRule = { add: [categoryToken] };
                if (Array.isArray(rule.whenAnyType) && rule.whenAnyType.length) decisionRule.whenAnyType = [...rule.whenAnyType];
                if (Array.isArray(rule.whenAllType) && rule.whenAllType.length) decisionRule.whenAllType = [...rule.whenAllType];
                if (Array.isArray(rule.whenNoneType) && rule.whenNoneType.length) decisionRule.whenNoneType = [...rule.whenNoneType];
                if (rule.stop) decisionRule.stop = true;
                compiledRules.push(decisionRule);
            });
            this.factionDecisionConfig[factionToken] = compiledRules;
        });

        Object.entries(extraMeta).forEach(([token, meta]) => {
            if (!meta || typeof meta !== "object") return;
            this.factionTokenMeta[token] = {
                priority: Number.isFinite(meta.priority) ? meta.priority : 999,
                icon: String(meta.icon || "")
            };
        });
    }

    init() {
        document.addEventListener("DOMContentLoaded", () => {
            this.loadConfigFromApi().then(() => {
                this.patchMultiSelectVendorsGuard();
                this.captureLvliLabels();

                const uploadTitle = document.getElementById("weapUploadTitle");
                this.api.bindPrimaryAndSecondaryUpload({
                    inputId: "weapFile",
                    primaryTriggerId: "weapBtn",
                    secondaryTriggerId: "weapUploadAnother",
                    onFile: async (file) => {
                        const result = await this.api.runTextImportFlow({
                            file,
                            parseRecords: (text) => this.parseWeaponList(text),
                            mapToSessionItem: (record) => ({
                                editorId: record.key,
                                formId: record.formId,
                                name: record?.plugin || "",
                                plugin: record.plugin || ""
                            }),
                            loadedLabel: "TXT loaded",
                            pluginsLabel: "plugins loaded",
                            emptyMessage: "No valid weapon lines found. Check TXT format."
                        });
                        this.records = result.records || [];
                        this.currentSearchQuery = "";
                        this.sourceName = this.deriveSourceName(file.name);
                        if (uploadTitle) uploadTitle.textContent = result.uploadTitle || this.getUploadTitleText(file.name);
                        this.clearExportOutput();
                        this.renderTable();
                    }
                });

                this.api.bindStandardListControls({
                    onMultiToggle: () => this.updateTableState(),
                    onSearch: (value) => this.searchTable(value),
                    onFilterToggle: () => this.applyFilters()
                });

                const keywordContainer = document.getElementById("keywordContainer");
                keywordContainer?.addEventListener("change", (e) => {
                    if (!(e.target instanceof HTMLInputElement)) return;
                    if (e.target.type !== "checkbox") return;
                    this.api.updateKeywordsFromDOM();
                    this.updateTableState();
                });

                const autoBtn = document.getElementById("autoCompleteBtn");
                autoBtn?.addEventListener("click", () => this.autoCompleteAll());

                this.initExportModule();
            }).catch((error) => {
                console.error("[WEAP] Config load failed. Tool initialization aborted.", error);
                alert("WEAP config could not be loaded. Check configs/weap.json");
            });
        });
    }

    patchMultiSelectVendorsGuard() {
        if (!this.api || this.api.__weapMultiGuardPatched) return;
        const original = this.api.handleEdidClick?.bind(this.api);
        if (typeof original !== "function") return;

        this.api.handleEdidClick = (edid) => {
            if (!edid) return original(edid);

            const rules = this.api.edidRules?.[edid] || [];
            const onlyVendors = this.vendorToken && rules.length > 0 && rules.every(token => token === this.vendorToken);
            const blockedByOldGuard =
                this.api.multiSelectionMode &&
                onlyVendors &&
                !this.api.multiSelectedEDIDs?.has(edid) &&
                this.api.multiAnchorEdid !== edid;

            if (!blockedByOldGuard) {
                return original(edid);
            }

            // Temporarily clear "vendors-only" so API multi-guard treats this row as selectable.
            this.api.edidRules[edid] = [];
            original(edid);
        };

        this.api.__weapMultiGuardPatched = true;
    }

    captureLvliLabels() {
        this.lvliLabelByValue = {};
        document.querySelectorAll("#keywordContainer input[type='checkbox']").forEach(input => {
            const text = input.closest("label")?.textContent?.trim() || input.value;
            this.lvliLabelByValue[input.value] = text;
        });
    }

    normalizeFormId(formId) {
        return this.api.normalizeFormId(formId);
    }

    normalizeLvliEntry(entry) {
        if (!entry) return null;
        if (typeof entry === "string") {
            const edid = entry.trim();
            if (!edid) return null;
            return { edid, formId: "", master: "" };
        }
        if (typeof entry !== "object") return null;
        const edid = String(entry.edid || "").trim();
        const formId = this.normalizeFormId(String(entry.formId || "").trim());
        const master = String(entry.master || "").trim();
        if (!edid && !formId) return null;
        return { edid, formId, master };
    }

    getLvliEntryKey(entry) {
        const norm = this.normalizeLvliEntry(entry);
        if (!norm) return "";
        return `${(norm.master || "").toLowerCase()}|${norm.formId || ""}|${(norm.edid || "").toLowerCase()}`;
    }

    parseWeaponList(text) {
        return this.api.buildRecordListFromSectionedText(text, {
            parseLine: (line) => {
                const rec = line.match(/^([0-9A-Fa-f]{1,8})-([^-]+)-(.*)$/);
                if (!rec) return null;
                const formIdRaw = rec[1].trim();
                const edid = rec[2].trim();
                const payload = rec[3].trim();
                if (!formIdRaw || !edid) return null;
                const { name, ammo, types } = this.parsePayload(payload);
                return {
                    formId: this.normalizeFormId(formIdRaw),
                    edid,
                    name,
                    ammo,
                    types
                };
            },
            normalizeRecord: (record) => {
                const plugin = (record.plugin || '').trim();
                const formId = this.normalizeFormId(record.formId || '');
                const edid = (record.edid || '').trim();
                if (!plugin || !formId || !edid) return null;
                return {
                    plugin,
                    formId,
                    edid,
                    name: record.name || '',
                    ammo: record.ammo || '',
                    types: record.types || []
                };
            },
            makeKey: (rec) => `${rec.plugin}|${rec.formId}|${rec.edid}`,
            sortFn: (a, b) => {
                const aText = (a.name || a.edid).toLowerCase();
                const bText = (b.name || b.edid).toLowerCase();
                return aText.localeCompare(bText);
            }
        });
    }

    parsePayload(payload) {
        const raw = String(payload || "");
        const parts = raw.split("|").map(p => p.trim()).filter(Boolean);
        const nameParts = [];
        let ammo = "";
        let types = [];

        parts.forEach((part) => {
            const ammoMatch = part.match(/^ammo\s*:\s*(.+)$/i);
            if (ammoMatch) {
                ammo = this.normalizeFormId((ammoMatch[1] || "").trim());
                return;
            }

            const typeMatch = part.match(/^type\s*:\s*(.+)$/i);
            if (typeMatch) {
                types = String(typeMatch[1] || "")
                    .split(/[;,]/)
                    .map(v => this.normalizeFormId(v.trim()).toUpperCase())
                    .filter(Boolean);
                return;
            }

            nameParts.push(part);
        });

        return { name: nameParts.join(" | ").trim(), ammo, types };
    }

    getRecordDisplayName(record) {
        return (record?.name || record?.edid || "").trim();
    }

    deriveSourceName(fallbackFilename = "") {
        const plugins = [...new Set(this.records.map(r => r.plugin).filter(Boolean))];
        if (plugins.length === 1) return plugins[0].replace(/\.(esp|esm|esl)$/i, "");
        return (fallbackFilename || "output").replace(/\.[^/.]+$/, "") || "output";
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
        const record = this.getRecordByKey(key);
        return record ? this.getRecordDisplayName(record) : key;
    }

    getSelectedTokens(key, predicate) {
        const selected = this.api.edidRules[key] || [];
        if (typeof predicate !== "function") return selected;
        return selected.filter(predicate);
    }

    getSelectedTypeTokens(key) {
        return this.getSelectedTokens(key, token => !!this.distributeLvliMap[token]);
    }

    getSelectedFactionTokens(key) {
        return this.getSelectedTokens(key, token => this.factionSelectorTokens.has(token));
    }

    getSelectedSpecialTypeTokens(key) {
        return this.getSelectedTokens(key, (token) => {
            if (!token) return false;
            if (this.vendorToken && token === this.vendorToken) return false;
            return !!this.specialModules[token];
        });
    }

    getSelectedFactionSpecialTokens(key) {
        if (!this.vendorToken) return [];
        return this.getSelectedTokens(key, token => token === this.vendorToken);
    }

    getTypeSearchText(key) {
        const typeTokens = this.getSelectedTypeTokens(key);
        const specialTypeTokens = this.getSelectedSpecialTypeTokens(key);
        return [...typeTokens, ...specialTypeTokens]
            .map(v => this.lvliLabelByValue[v] || v)
            .join(", ");
    }

    getTypeCellMarkup(key) {
        const tokens = [...this.getSelectedTypeTokens(key), ...this.getSelectedSpecialTypeTokens(key)];
        if (!tokens.length) return "";

        const unique = [];
        const seen = new Set();
        [...tokens].sort((a, b) => (this.typeTokenMeta[a]?.priority ?? 999) - (this.typeTokenMeta[b]?.priority ?? 999)).forEach(token => {
            const icon = this.typeTokenMeta[token]?.icon;
            if (!icon || seen.has(icon)) return;
            seen.add(icon);
            unique.push({ token, icon, label: this.lvliLabelByValue[token] || token });
        });
        const html = this.api.renderIconTokenList({
            items: unique.map(item => ({
                token: item.token,
                src: item.icon,
                label: item.label
            })),
            maxVisible: 3,
            iconClass: "kywd-icon weap-type-icon",
            moreClass: "kywd-more",
            moreTitle: "More"
        });
        return `<span class="weap-cell-slot"><span class="weap-cell-icons">${html}</span></span>`;
    }

    getFactionCellMarkup(key) {
        const tokens = [...this.getSelectedFactionTokens(key), ...this.getSelectedFactionSpecialTokens(key)];
        if (!tokens.length) return "";
        const ordered = [...tokens].sort((a, b) => (this.factionTokenMeta[a]?.priority ?? 999) - (this.factionTokenMeta[b]?.priority ?? 999));
        const html = this.api.renderIconTokenList({
            items: ordered.map(token => {
            const label = this.lvliLabelByValue[token] || token;
            const icon = this.factionTokenMeta[token]?.icon;
                return { token, src: icon, label };
            }),
            maxVisible: 3,
            iconClass: "kywd-icon weap-type-icon",
            moreClass: "kywd-more",
            moreTitle: "More"
        });
        return `<span class="weap-cell-slot"><span class="weap-cell-icons">${html}</span></span>`;
    }

    toTypeFormKey(typeId) {
        const raw = String(typeId || "").toUpperCase().replace(/[^0-9A-F]/g, "");
        if (!raw) return "";
        const last6 = raw.length > 6 ? raw.slice(-6) : raw;
        return last6.padStart(8, "0");
    }

    getAvailableDistributeTokenSet() {
        const set = new Set();
        const root = document.querySelector(`#keywordContainer .weap-mode-panel[data-mode="distribute"]`);
        root?.querySelectorAll("input[type='checkbox']").forEach(input => set.add(input.value));
        if (set.size) return set;

        Object.keys(this.distributeLvliMap || {}).forEach(key => set.add(key));
        return set;
    }

    getTypeEdidsForRecord(record) {
        const out = [];
        const seen = new Set();
        (record?.types || []).forEach(typeId => {
            const key = this.toTypeFormKey(typeId);
            const edid = this.typeEdidByKeyword[key];
            if (!edid || seen.has(edid)) return;
            seen.add(edid);
            out.push(edid);
        });
        return out;
    }

    getDominantWeaponChannel(typeSet) {
        const ordered = this.autoDecisionConfig?.channelPriority || [];
        let winner = "";
        ordered.forEach(typeId => {
            if (typeSet.has(typeId)) winner = typeId;
        });
        return winner;
    }

    getAutoListsForRecord(record) {
        const allowed = this.getAvailableDistributeTokenSet();
        const list = [];
        const seen = new Set();
        const typeEdids = this.getTypeEdidsForRecord(record);
        const typeSet = new Set(typeEdids);
        const dominantChannel = this.getDominantWeaponChannel(typeSet);
        const ballisticChannelType = String(this.autoDecisionConfig?.ballisticChannelType || "").trim();
        const laserChannelType = String(this.autoDecisionConfig?.laserChannelType || "").trim();
        const plasmaChannelType = String(this.autoDecisionConfig?.plasmaChannelType || "").trim();
        const hasMissileOverride = (this.autoDecisionConfig?.missileOverrideTypes || [])
            .some(typeId => typeSet.has(typeId));
        typeEdids.forEach(typeEdid => {
            if ((this.autoDecisionConfig?.channelTypes || []).includes(typeEdid)) {
                if (dominantChannel && dominantChannel !== typeEdid) return;
            }

            if ((this.autoDecisionConfig?.ballisticOnlyTypes || []).includes(typeEdid)) {
                if (ballisticChannelType && dominantChannel !== ballisticChannelType) return;
            }

            if (
                hasMissileOverride &&
                (this.autoDecisionConfig?.suppressedByMissileTypes || []).includes(typeEdid)
            ) {
                return;
            }

            if (
                typeEdid === this.autoDecisionConfig?.melee2HType &&
                (this.autoDecisionConfig?.unarmedTypes || []).some(typeId => typeSet.has(typeId))
            ) {
                return;
            }

            if (
                (this.autoDecisionConfig?.oneHandMeleeTypes || []).includes(typeEdid) &&
                (this.autoDecisionConfig?.unarmedTypes || []).some(typeId => typeSet.has(typeId))
            ) {
                return;
            }

            if (laserChannelType && typeEdid === laserChannelType) {
                const laserExcluded = (this.autoDecisionConfig?.laserExcludedIfTypes || [])
                    .some(typeId => typeSet.has(typeId));
                if (laserExcluded) return;
            }
            if (plasmaChannelType && typeEdid === plasmaChannelType) {
                const plasmaExcluded = (this.autoDecisionConfig?.plasmaExcludedIfTypes || [])
                    .some(typeId => typeSet.has(typeId));
                if (plasmaExcluded) return;
            }
            (this.autoTypeTokensByTypeEdid[typeEdid] || []).forEach(lvli => {
                if (!allowed.has(lvli) || seen.has(lvli)) return;
                seen.add(lvli);
                list.push(lvli);
            });
        });
        return list;
    }

    resolveFactionCategoryTokens(typeTokens = [], factionTokens = []) {
        const typeSet = new Set(typeTokens);
        const factionSet = new Set(factionTokens);
        const out = [];
        const add = (token) => {
            if (!out.includes(token)) out.push(token);
        };
        if (!typeSet.size || !factionSet.size) return out;

        const rulesByFaction = this.factionDecisionConfig || {};
        const matchesRule = (rule) => {
            const any = Array.isArray(rule.whenAnyType) ? rule.whenAnyType : [];
            const all = Array.isArray(rule.whenAllType) ? rule.whenAllType : [];
            const none = Array.isArray(rule.whenNoneType) ? rule.whenNoneType : [];
            if (any.length && !any.some(token => typeSet.has(token))) return false;
            if (all.length && !all.every(token => typeSet.has(token))) return false;
            if (none.length && !none.every(token => !typeSet.has(token))) return false;
            return true;
        };

        factionSet.forEach((factionToken) => {
            const rules = Array.isArray(rulesByFaction[factionToken]) ? rulesByFaction[factionToken] : [];
            for (const rule of rules) {
                if (!rule || typeof rule !== "object") continue;
                if (!matchesRule(rule)) continue;
                const addTokens = Array.isArray(rule.add) ? rule.add : [];
                addTokens.forEach(add);
                if (rule.stop) break;
            }
        });

        return out;
    }

    getSpecialAutoTokensForRecord(record) {
        const typeSet = new Set(this.getTypeEdidsForRecord(record));
        const out = [];
        const add = (token) => {
            if (!out.includes(token)) out.push(token);
        };
        const rules = this.autoDecisionConfig?.specialAutoRules || {};
        Object.entries(rules).forEach(([token, rule]) => {
            if (!rule || typeof rule !== "object") return;
            if (rule.always) {
                add(token);
                return;
            }
            const anyTypes = Array.isArray(rule.anyTypeEdids) ? rule.anyTypeEdids : [];
            if (anyTypes.some(typeEdid => typeSet.has(typeEdid))) {
                add(token);
            }
        });
        return out;
    }

    expandLvliSelection(selected = [], mode = null) {
        const out = [];
        const seen = new Set();
        const addEntry = (entry) => {
            const key = this.getLvliEntryKey(entry);
            if (!key || seen.has(key)) return;
            seen.add(key);
            out.push(this.normalizeLvliEntry(entry));
        };
        const typeTokens = selected.filter(item => !!this.distributeLvliMap[item]);
        const factionTokens = selected.filter(item => this.factionSelectorTokens.has(item));
        const specialTokens = selected.filter(item => this.specialSelectorTokens.has(item));
        const resolvedCategories = this.resolveFactionCategoryTokens(typeTokens, factionTokens);
        const legacyCategoryTokens = selected.filter(item => !!this.factionsLvliMap[item]);

        // If no faction is selected, distribute by type directly.
        // If faction is selected, type acts only as a classifier for faction rules.
        const hasFactionContext = factionTokens.length > 0 || legacyCategoryTokens.length > 0;
        if (!hasFactionContext) {
            typeTokens.forEach(typeToken => {
                (this.distributeLvliMap[typeToken] || []).forEach(lvli => {
                    addEntry(lvli);
                });
            });
        }

        [...resolvedCategories, ...legacyCategoryTokens].forEach(category => {
            (this.factionsLvliMap[category] || []).forEach(lvli => {
                addEntry(lvli);
            });
        });
        specialTokens.forEach(token => {
            (this.specialLvliMap[token] || []).forEach(lvli => {
                addEntry(lvli);
            });
        });

        const controlTokens = new Set([
            ...Object.keys(this.distributeLvliMap),
            ...Object.keys(this.factionsLvliMap),
            ...Object.keys(this.specialLvliMap),
            ...this.factionSelectorTokens,
            ...this.specialSelectorTokens
        ]);
        selected.forEach(item => {
            if (controlTokens.has(item)) return;
            addEntry(item);
        });
        return out;
    }

    toRobCoLvliValue(lvliEntry) {
        const norm = this.normalizeLvliEntry(lvliEntry);
        if (!norm) return "";
        if (norm.formId) return norm.formId.toUpperCase();
        return String(norm.edid || "").toUpperCase();
    }

    getLvliMasterFile(lvliEntry) {
        const norm = this.normalizeLvliEntry(lvliEntry);
        if (!norm) return "";
        return String(norm.master || "").trim();
    }

    autoCompleteAll() {
        if (!this.records.length) {
            alert("Load weapon list first.");
            return;
        }

        const typeAllowed = this.getAvailableDistributeTokenSet();
        let changed = 0;

        this.records.forEach(record => {
            const autoTypes = this.getAutoListsForRecord(record)
                .filter(token => typeAllowed.has(token));
            const autoSpecial = this.getSpecialAutoTokensForRecord(record);
            const current = this.api.edidRules[record.key] || [];
            const factionSelections = current.filter(token => this.factionSelectorTokens.has(token));
            const merged = [...new Set([...autoTypes, ...autoSpecial, ...factionSelections])];
            if (
                current.length === merged.length &&
                current.every((v, i) => v === merged[i])
            ) {
                return;
            }
            this.api.edidRules[record.key] = merged;
            changed++;
        });

        this.updateTableState();
        if (this.api.activeEdid) {
            this.api.updateDOMKeywords(this.api.activeEdid);
        }

        alert(`Auto Complite done: ${changed} records updated.`);
    }

    renderTable() {
        this.api.renderEdidTable({
            containerId: "edidList",
            firstColumnTitle: "Name",
            secondColumnTitle: "Type",
            thirdColumnTitle: "Faction",
            groupByPlugin: true,
            getThirdCellHtml: (key) => this.getLvliCellMarkup(key),
            onRowClick: () => {
                this.api.updateKeywordsFromDOM();
                this.updateTableState();
            }
        });

        this.updateTableState();
    }

    getLvliCellMarkup(key) {
        return this.getFactionCellMarkup(key);
    }

    refreshRenderedRows({ respectSearchForEdid = false } = {}) {
        this.api.renderTableRowsState({
            rowsSelector: "#edidList tbody tr[data-key]",
            currentSearchQuery: this.currentSearchQuery,
            getEdidText: (key) => this.getEdidCellText(key),
            getNameText: (key) => this.getTypeSearchText(key),
            renderNameHtml: (key) => this.getTypeCellMarkup(key),
            renderThirdHtml: (key) => this.getLvliCellMarkup(key),
            respectSearchForEdid
        });
    }

    updateTableState() {
        this.api.updateEdidTableHighlights({
            getThirdCellHtml: (key) => this.getLvliCellMarkup(key)
        });
        this.refreshRenderedRows({ respectSearchForEdid: true });

        this.applyFilters();
    }

    searchTable(query = "") {
        this.currentSearchQuery = query.trim();
        this.applyFilters();
    }

    isOnlyVendorsSelection(key) {
        const selected = this.api.edidRules[key] || [];
        if (!this.vendorToken) return false;
        return selected.length > 0 && selected.every(token => token === this.vendorToken);
    }

    isEditedForShowFilter(key) {
        if (this.isOnlyVendorsSelection(key)) return false;
        return this.api.isEffectivelyEdited(key);
    }

    applyFilters() {
        const showOnlyNotEdited = !!document.getElementById("showNotEditedToggle")?.checked;
        this.api.applyEdidTableFiltersEx({
            query: this.currentSearchQuery,
            showOnlyNotEdited,
            rowsSelector: "#edidList tbody tr[data-key]",
            getSearchText: ({ key }) => {
                const edidText = this.getEdidCellText(key);
                const nameText = this.getTypeSearchText(key);
                return `${edidText} ${nameText}`;
            },
            isEdited: ({ key }) => this.isEditedForShowFilter(key),
            renderVisibleRow: ({ row, key, query }) => {
                const edidCell = row.querySelector(".edid-col-edid");
                const nameCell = row.querySelector(".edid-col-name");
                const thirdCell = row.querySelector(".edid-col-kywd");
                const edidText = this.getEdidCellText(key);

                if (!edidCell) return;
                if (!query) {
                    edidCell.textContent = edidText;
                } else {
                    edidCell.innerHTML = this.api.highlightText(edidText, query);
                }

                if (nameCell) nameCell.innerHTML = this.getTypeCellMarkup(key);
                if (thirdCell) thirdCell.innerHTML = this.getLvliCellMarkup(key);
            }
        });
    }

    clearExportOutput() {
        const outputEl = document.querySelector("#exportdataform textarea");
        if (outputEl) outputEl.value = "";
    }

    initExportModule() {
        this.api.bindExportControls({
            containerId: "exportdataform",
            onGenerate: () => this.generateINI(),
            onExport: () => this.exportZip(),
            copiedLabel: "Copied!",
            emptyLabel: "Nothing",
            copyIdleLabel: "Copy",
            copyResetMs: 1500
        });
    }

    generateINI() {
        const entries = this.api.resolveExportEntries({
            source: this.records,
            buildEntries: (records) => this.buildExportEntries(records.filter(r => (this.api.edidRules[r.key] || []).length > 0)),
            emptyMessage: "No weapon entries configured yet.",
            clearOutputSelector: "#exportdataform textarea"
        });
        if (!entries.length) return;

        this.api.renderExportPreviewToTextarea({
            entries,
            textareaSelector: "#exportdataform textarea",
            headerBuilder: (count) => `; Files to export: ${count}`,
            labelBuilder: (entry) => entry.path,
            contentBuilder: (entry) => entry.content
        });
    }

    sanitizePathSegment(value) {
        return (value || "unknown")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
            .replace(/\s+/g, " ")
            .trim();
    }

    sanitizePatchToken(value) {
        return (value || "unknown").replace(/[^\w.-]+/g, "_");
    }

    buildSingleIni(record, lists) {
        const pluginFile = this.sanitizePathSegment(record.plugin);

        let out = "";
        const expandedLists = this.expandLvliSelection(lists);
        expandedLists.forEach(lvliEntry => {
            const lvliMaster = this.getLvliMasterFile(lvliEntry);
            const lvliFormId = this.toRobCoLvliValue(lvliEntry);
            if (!lvliMaster || !lvliFormId) return;
            out += `filterByLLs=${lvliMaster}|${lvliFormId}:addToLLs=${pluginFile}|${record.formId}~1~1~0\n`;
        });
        return out;
    }

    buildExportEntries(usedRecords) {
        const basePath = "data/F4SE/Plugins/RobCo_Patcher/LeveledList/KinataSorter";
        const entries = [];

        usedRecords.forEach(record => {
            const lists = this.api.edidRules[record.key] || [];
            if (!lists.length) return;

            const pluginFile = this.sanitizePathSegment(record.plugin);
            const dirName = this.sanitizePathSegment(`${record.plugin}+${record.edid}`);
            const iniName = `${pluginFile}.ini`;
            const path = `${basePath}/${dirName}/${iniName}`;
            const content = this.buildSingleIni(record, lists);
            entries.push({ path, content, record });
        });

        return entries;
    }

    async exportZip() {
        const entries = this.api.resolveExportEntries({
            source: this.records,
            buildEntries: (records) => this.buildExportEntries(records.filter(r => (this.api.edidRules[r.key] || []).length > 0)),
            emptyMessage: "No weapon entries configured yet."
        });
        if (!entries.length) return;

        this.api.downloadZipFromEntries(entries, {
            zipFilename: `${this.sanitizePatchToken(this.sourceName || "output")}_weap_lvli.zip`,
            pathBuilder: (entry) => entry.path,
            contentBuilder: (entry) => entry.content
        });
    }
}

const weapLvliBuilder = new WEAPLvliBuilder(window.KinataMemeAPI);
weapLvliBuilder.init();
