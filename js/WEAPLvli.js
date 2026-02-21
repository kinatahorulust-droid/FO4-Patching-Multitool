class WEAPLvliBuilder {
    constructor(api) {
        this.api = api;
        this.records = []; // [{key, plugin, formId, edid, name, ammo, types}]
        this.currentSearchQuery = "";
        this.sourceName = "output";
        this.lvliLabelByValue = {};
        this.factionSelectorTokens = new Set([
            "FAC_RAIDERS",
            "FAC_GUNNERS",
            "FAC_BOS",
            "FAC_TRIGGERMEN",
            "FAC_RAILROAD",
            "FAC_DC_SECURITY",
            "FAC_CITIZEN",
            "FAC_BOTRAIDER",
            "FAC_TRAPPERS",
            "FAC_NUKA_WORLD",
            "FAC_MINUTEMEN",
            "FAC_INSTITUTE"
        ]);
        this.specialSelectorTokens = new Set([
            "SPEC_GRENADE",
            "SPEC_ENERGY_GRENADE",
            "SPEC_MINE",
            "SPEC_VENDORS"
        ]);
        this.distributeLvliMap = {
            DIST_PISTOL: [
                "LL_10mm_Pistol_SemiAuto",
                "LL_10mm_Pistol_Auto",
                "LL_44_Pistol",
                "DLC04_LL_Revolver"
            ],
            DIST_ASSAULT_RIFLE: [
                "LL_CombatRifle_Rifle_SemiAuto",
                "LL_CombatRifle_Rifle_Auto",
                "LL_CombatRifle_ShortRifle_SemiAuto",
                "LL_CombatRifle_RandomTemplate",
                "LL_SubmachineGun",
                "LL_AssaultRifle_Rifle_Auto",
                "LL_AssaultRifle_Rifle_SemiAuto",
                "LL_AssaultRifle_ShortRifle_SemiAuto",
                "LL_AssaultRifle_RandomTemplate_Rifle",
                "DLC03_LL_RadiumRifle_ShortRifle_SemiAuto",
                "DLC03_LL_RadiumRifle_Rifle_SemiAuto",
                "DLC03_LL_RadiumRifle_Rifle_Auto",
                "DLC03_LL_RadiumRifle_RandomTemplate",
                "DLC04_LL_HandmadeGun_ShortRifle_SemiAuto",
                "DLC04_LL_HandmadeGun_Rifle_SemiAuto",
                "DLC04_LL_HandmadeGun_Rifle_Auto",
                "DLC04_LL_HandmadeGun_RandomTemplate_Rifle"
            ],
            DIST_SNIPER_RIFLE: [
                "LL_CombatRifle_Sniper",
                "LL_AssaultRifle_Rifle_Sniper",
                "DLC03_LL_RadiumRifle_Sniper",
                "DLC04_LL_HandmadeGun_Rifle_Sniper",
                "LL_GaussRifle",
                "LL_GaussRifle_Sniper",
                "LL_HuntingRifle_ShortRifle",
                "LL_HuntingRifle_Rifle",
                "LL_HuntingRifle_Sniper",
                "LL_HuntingRifle_RandomTemplate",
                "LL_HuntingRifle_SimpleRifle",
                "LL_LaserMusket_Blunderbuss",
                "LL_LaserMusket_Long",
                "LL_LaserMusket_Marksman",
                "LL_LaserMusket_Short"
            ],
            DIST_SHOTGUN: [
                "LL_CombatShotgun_ShortRifle_SemiAuto",
                "LL_CombatShotgun_Rifle_SemiAuto",
                "LL_CombatShotgun_Rifle_Auto",
                "LL_CombatShotgun_RandomTemplate",
                "LL_DoubleBarrelShotgun"
            ],
            DIST_LASER_GUN: [
                "LL_LaserGun_Automatics",
                "LL_LaserGun_SemiAutoPistol",
                "LL_LaserGun_RifleShort_SemiAuto",
                "LL_LaserGun_Pistol_Auto",
                "LL_LaserGun_SniperRifle",
                "LL_LaserGun_Rifle_Auto",
                "LL_LaserGun_Shotgun_Rifle_SemiAuto",
                "LL_LaserGun_Rifle_SemiAuto"
            ],
            DIST_PLASMA_GUN: [
                "LL_PlasmaGun_Auto",
                "LL_PlasmaGun_Pistol_Auto",
                "LL_PlasmaGun_Pistol_SemiAuto",
                "LL_PlasmaGun_Pistol_Simple",
                "LL_PlasmaGun_RandomTemplate",
                "LL_PlasmaGun_Rifle_Auto",
                "LL_PlasmaGun_Rifle_Flamer",
                "LL_PlasmaGun_Rifle_SemiAuto",
                "LL_PlasmaGun_Rifle_Simple",
                "LL_PlasmaGun_SemiAuto",
                "LL_PlasmaGun_Shotgun_Rifle_SemiAuto",
                "LL_PlasmaGun_SniperRifle_SemiAuto"
            ],
            DIST_MINIGUN: [
                "LL_Minigun",
                "LL_Minigun_Gated",
                "LL_Minigun_Simple",
                "LL_GatlingLaser",
                "LL_GatlingLaser_Gated"
            ],
            DIST_MISSILE_LAUNCHER: [
                "LL_Fatman",
                "LL_MissileLauncher",
                "LL_Broadsider"
            ],
            DIST_KNUCKLES: [
                "LL_BoxingGlove",
                "LL_Knuckles",
                "LL_Knuckles10",
                "LL_Knuckles_Simple",
                "LL_Knuckles_Standard",
                "DLC03_LL_MeatHook",
                "DLC03_LL_Meat_HermitCrab75",
                "LL_Powerfist",
                "LL_Powerfist_Simple",
                "LL_DeathclawGauntlet",
                "LL_DeathclawGauntlet_Simple"
            ],
            DIST_2H_MELEE: [
                "LL_WalkingCane",
                "LL_WalkingCane_Simple",
                "LL_RollingPin",
                "LL_RollingPin_Simple",
                "LL_BaseballBat",
                "LL_BaseballBat_Simple",
                "LL_PoolCue",
                "LL_PoolCue_Simple",
                "LL_Board",
                "LL_Board_Simple",
                "LL_Shishkebab",
                "LL_Shishkebab_Simple"
            ],
            DIST_1H_MELEE: [
                "LL_Switchblade",
                "LL_Switchblade_Simple",
                "LL_Knife",
                "LL_Knife_Simple",
                "LL_RevolutionarySword_Simple",
                "LL_RevolutionarySword_ShemDrowne",
                "LL_ChineseOfficerSword",
                "LL_ChineseOfficerSword_Simple",
                "LL_Machete",
                "LL_Machete_Simple",
                "LL_TireIron",
                "LL_TireIron_Simple",
                "LL_LeadPipe",
                "LL_LeadPipe_Simple",
                "LL_Ripper",
                "LL_Ripper_Simple"
            ]
        };
        this.factionsLvliMap = {
            FAC_RAIDERS_MELEE: [
                "LLI_Raider_Melee_Standard",
                "LLI_Raider_Melee_Simple"
            ],
            FAC_RAIDERS_OTHER_GUNS: [
                "LLI_Raider_Weapons",
                "LLI_Raider_Weapons_Boss",
                "LLI_Raider_Auto"
            ],
            FAC_GUNNERS_MELEE: [
                "LLI_Gunner_Melee"
            ],
            FAC_GUNNERS_SHOTGUN: [
                "LLG_Gunner_Shotguns"
            ],
            FAC_GUNNERS_SNIPER: [
                "LLI_Gunner_Sniper"
            ],
            FAC_GUNNERS_OTHER_GUNS: [
                "LLI_Gunner_Auto",
                "LLI_Gunner_SemiAuto",
                "LLI_Gunner_SemiAuto_Boss",
                "LLI_Gunner_Weapon_High"
            ],
            FAC_BOS_MELEE: [
                "LLI_Hostile_BoS_Melee"
            ],
            FAC_BOS_MINIGUN: [
                "LLI_BoSSoldier_MinigunOrGatling"
            ],
            FAC_BOS_MISSILE: [
                "LLI_BoSSoldier_MissileLauncher"
            ],
            FAC_BOS_OTHER_GUNS: [
                "LLI_BoSScribe_Weapons",
                "LLI_BoSSoldier_Auto",
                "LLI_BoSSoldier_SemiAuto",
                "LLI_BoSSoldier_Weapons",
                "LLI_Hostile_BoS_Any",
                "LLI_Hostile_BoS_Ranged"
            ],
            FAC_TRIGGERMEN_PISTOL: [
                "LLI_Triggerman_Weapons_Pistol"
            ],
            FAC_TRIGGERMEN_ASSAULT: [
                "LLI_Triggerman_Weapons_Rifle_Auto"
            ],
            FAC_RAILROAD_ALL: [
                "LLI_RRAgent_Weapons"
            ],
            FAC_DC_SECURITY_ALL: [
                "LLI_DCsecurity_Weapon"
            ],
            FAC_CITIZEN_ALL: [
                "LLI_Weapons_Citizen"
            ],
            FAC_BOTRAIDER_MELEE: [
                "DLC01LLI_BotRaider_Weapons_Melee"
            ],
            FAC_BOTRAIDER_ALL_GUNS: [
                "DLC01LLI_BotRaider_Weapons"
            ],
            FAC_TRAPPERS_PISTOL_SHOTGUN: [
                "DLC03_LLI_Trapper_Weapons_Woods",
                "DLC03_LLI_Trapper_Weapons_Coast"
            ],
            FAC_TRAPPERS_ASSAULT_SNIPER: [
                "DLC03_LLI_Trapper_Weapons_Woods_Rifle",
                "DLC03_LLI_Trapper_Weapons_Coast_Rifle"
            ],
            FAC_TRAPPERS_HEAVY: [
                "DLC03_LLI_Trapper_Weapons_Woods_Boss",
                "DLC03_LLI_Trapper_Weapons_Coast_Boss"
            ],
            FAC_NUKA_WORLD_ALL: [
                "DLC04_LL_Weapon_Melee_Nukacade",
                "DLC04_LL_Weapons_Guns_Long_Nukacade",
                "DLC04_LL_Weapons_Guns_Short_Nukacade"
            ],
            FAC_MINUTEMEN_AUTO: [
                "LL_Minutemen_Weapons_Auto"
            ],
            FAC_MINUTEMEN_NONAUTO: [
                "LL_Minutemen_Weapons_NonAuto"
            ],
            FAC_INSTITUTE_SYNTHS: [
                "LLI_Synth_Weapons",
                "LLI_Synth_Weapons_Rifle",
                "LLI_Synth_Weapons_Shotgun",
                "LLI_Synth_Inst_MissileLauncher"
            ]
        };
        this.specialLvliMap = {
            SPEC_GRENADE: [
                "LLI_Grenade_frag_15",
                "LLI_Raider_Grenade_frag_15",
                "LLS_Grenade_Molotov",
                "LLS_Grenades_Frag",
                "LLS_Grenades_Nuka"
            ],
            SPEC_ENERGY_GRENADE: [
                "LLS_Grenades_Plasma",
                "LLS_Grenades_Pulse",
                "LLS_Grenades_Cryo"
            ],
            SPEC_MINE: [
                "LLS_Mine_plasma",
                "LLS_Mine_pulse",
                "LLS_Mine_cryo",
                "LLS_Mine_frag"
            ],
            SPEC_VENDORS: [
                "LL_Vendor_Weapon_GunBoS",
                "LL_Vendor_Weapon_GunGeneralStore",
                "LL_Vendor_Weapon_GunSpecialty"
            ]
        };
        this.lvliFormIdByEdid = {
            LL_10mm_Pistol_SemiAuto: "00100E30",
            LL_10mm_Pistol_Auto: "00100E34",
            LL_44_Pistol: "001ACFBB",
            DLC04_LL_Revolver: "0604F4DE",
            LL_CombatRifle_Rifle_SemiAuto: "000E0300",
            LL_CombatRifle_Rifle_Auto: "001790F6",
            LL_CombatRifle_ShortRifle_SemiAuto: "001790F5",
            LL_CombatRifle_RandomTemplate: "001790F4",
            LL_SubmachineGun: "00188A7B",
            LL_AssaultRifle_Rifle_Auto: "001C6F54",
            LL_AssaultRifle_Rifle_SemiAuto: "001C6F53",
            LL_AssaultRifle_ShortRifle_SemiAuto: "001C6F52",
            LL_AssaultRifle_RandomTemplate_Rifle: "001C6F50",
            DLC03_LL_RadiumRifle_ShortRifle_SemiAuto: "0304080C",
            DLC03_LL_RadiumRifle_Rifle_SemiAuto: "0304080B",
            DLC03_LL_RadiumRifle_Rifle_Auto: "0304080A",
            DLC03_LL_RadiumRifle_RandomTemplate: "03040809",
            DLC04_LL_HandmadeGun_ShortRifle_SemiAuto: "06037890",
            DLC04_LL_HandmadeGun_Rifle_SemiAuto: "06037892",
            DLC04_LL_HandmadeGun_Rifle_Auto: "06037893",
            DLC04_LL_HandmadeGun_RandomTemplate_Rifle: "06037894",
            LL_CombatRifle_Sniper: "000E0301",
            LL_AssaultRifle_Rifle_Sniper: "0023AC1C",
            DLC03_LL_RadiumRifle_Sniper: "0304080E",
            DLC04_LL_HandmadeGun_Rifle_Sniper: "06037891",
            LL_GaussRifle: "00188A75",
            LL_GaussRifle_Sniper: "0023AC1E",
            LL_HuntingRifle_ShortRifle: "000D9C99",
            LL_HuntingRifle_Rifle: "000D9C9A",
            LL_HuntingRifle_Sniper: "000D9C9B",
            LL_HuntingRifle_RandomTemplate: "0017819F",
            LL_HuntingRifle_SimpleRifle: "0017819E",
            LL_LaserMusket_Blunderbuss: "000ECE78",
            LL_LaserMusket_Long: "000ECE77",
            LL_LaserMusket_Marksman: "000ECE79",
            LL_LaserMusket_Short: "000ECE76",
            LL_CombatShotgun_ShortRifle_SemiAuto: "00186C16",
            LL_CombatShotgun_Rifle_SemiAuto: "00186C17",
            LL_CombatShotgun_Rifle_Auto: "00186C18",
            LL_CombatShotgun_RandomTemplate: "00186C15",
            LL_DoubleBarrelShotgun: "00188A71",
            LL_LaserGun_Automatics: "000D1925",
            LL_LaserGun_SemiAutoPistol: "001879EB",
            LL_LaserGun_RifleShort_SemiAuto: "001879E9",
            LL_LaserGun_Pistol_Auto: "001879E7",
            LL_LaserGun_SniperRifle: "000D1926",
            LL_LaserGun_Rifle_Auto: "001879EA",
            LL_LaserGun_Shotgun_Rifle_SemiAuto: "000D1924",
            LL_LaserGun_Rifle_SemiAuto: "000D1923",
            LL_PlasmaGun_Auto: "0023286B",
            LL_PlasmaGun_Pistol_Auto: "001BA313",
            LL_PlasmaGun_Pistol_SemiAuto: "00128D62",
            LL_PlasmaGun_Pistol_Simple: "001BA30D",
            LL_PlasmaGun_RandomTemplate: "001BA30F",
            LL_PlasmaGun_Rifle_Auto: "00128D66",
            LL_PlasmaGun_Rifle_Flamer: "001B637A",
            LL_PlasmaGun_Rifle_SemiAuto: "00128D63",
            LL_PlasmaGun_Rifle_Simple: "001BA30E",
            LL_PlasmaGun_SemiAuto: "0023286A",
            LL_PlasmaGun_Shotgun_Rifle_SemiAuto: "00128D64",
            LL_PlasmaGun_SniperRifle_SemiAuto: "00128D67",
            LL_Minigun: "00188A77",
            LL_Minigun_Gated: "001B2B00",
            LL_Minigun_Simple: "001C9922",
            LL_GatlingLaser: "00188A74",
            LL_GatlingLaser_Gated: "001B2B03",
            LL_Fatman: "001C6C0E",
            LL_MissileLauncher: "00188A78",
            LL_Broadsider: "00188A6E",
            LL_BoxingGlove: "00188A95",
            LL_Knuckles: "000E7C3D",
            LL_Knuckles10: "00245D55",
            LL_Knuckles_Simple: "00230310",
            LL_Knuckles_Standard: "0015073C",
            DLC03_LL_MeatHook: "0304FF72",
            DLC03_LL_Meat_HermitCrab75: "030540A9",
            LL_Powerfist: "00188A9C",
            LL_Powerfist_Simple: "00152185",
            LL_DeathclawGauntlet: "00188A97",
            LL_DeathclawGauntlet_Simple: "001507AC",
            LL_WalkingCane: "00188AA4",
            LL_WalkingCane_Simple: "0013F873",
            LL_RollingPin: "00188A9F",
            LL_RollingPin_Simple: "00149456",
            LL_BaseballBat: "00188A93",
            LL_BaseballBat_Simple: "000B9743",
            LL_PoolCue: "00188A9B",
            LL_PoolCue_Simple: "000CFF7F",
            LL_Board: "000E7C54",
            LL_Board_Simple: "00027FA3",
            LL_Shishkebab: "00188AA0",
            LL_Shishkebab_Simple: "0014EC67",
            LL_Switchblade: "00188AA2",
            LL_Switchblade_Simple: "0014BEDB",
            LL_Knife: "00188A98",
            LL_Knife_Simple: "0013AD47",
            LL_RevolutionarySword_Simple: "0013ADCA",
            LL_RevolutionarySword_ShemDrowne: "00238734",
            LL_ChineseOfficerSword: "00188A96",
            LL_ChineseOfficerSword_Simple: "0014A0F4",
            LL_Machete: "00188A9A",
            LL_Machete_Simple: "00150832",
            LL_TireIron: "00188AA3",
            LL_TireIron_Simple: "0013ADC7",
            LL_LeadPipe: "00188A99",
            LL_LeadPipe_Simple: "0013BCD2",
            LL_Ripper: "00188A9E",
            LL_Ripper_Simple: "000D0147",
            LLI_Raider_Melee_Standard: "00249D85",
            LLI_Raider_Melee_Simple: "00249D84",
            LLI_Raider_Weapons: "0005E8E5",
            LLI_Raider_Weapons_Boss: "0005F42F",
            LLI_Raider_Auto: "0023D8CA",
            LLI_Gunner_Melee: "00110042",
            LLG_Gunner_Shotguns: "0015BDD2",
            LLI_Gunner_Sniper: "00232869",
            LLI_Gunner_Auto: "000FD39F",
            LLI_Gunner_SemiAuto: "000FD39E",
            LLI_Gunner_SemiAuto_Boss: "00247551",
            LLI_Gunner_Weapon_High: "000FD3A7",
            LLI_Hostile_BoS_Melee: "001FA2D0",
            LLI_BoSSoldier_MinigunOrGatling: "00160157",
            LLI_BoSSoldier_MissileLauncher: "00160156",
            LLI_BoSScribe_Weapons: "00076A1F",
            LLI_BoSSoldier_Auto: "00160155",
            LLI_BoSSoldier_SemiAuto: "00160154",
            LLI_BoSSoldier_Weapons: "00076A1A",
            LLI_Hostile_BoS_Any: "001FA2CF",
            LLI_Hostile_BoS_Ranged: "001FA2C7",
            LLI_Triggerman_Weapons_Pistol: "0017412E",
            LLI_Triggerman_Weapons_Rifle_Auto: "00188B20",
            LLI_RRAgent_Weapons: "00183303",
            LLI_DCsecurity_Weapon: "00247975",
            LLI_Weapons_Citizen: "00023329",
            DLC01LLI_BotRaider_Weapons_Melee: "0100E6D3",
            DLC01LLI_BotRaider_Weapons: "0100E6D0",
            DLC03_LLI_Trapper_Weapons_Woods: "03020C4D",
            DLC03_LLI_Trapper_Weapons_Coast: "03020C4B",
            DLC03_LLI_Trapper_Weapons_Woods_Rifle: "03022531",
            DLC03_LLI_Trapper_Weapons_Coast_Rifle: "03022533",
            DLC03_LLI_Trapper_Weapons_Woods_Boss: "03027942",
            DLC03_LLI_Trapper_Weapons_Coast_Boss: "03027941",
            DLC04_LL_Weapon_Melee_Nukacade: "0305136B",
            DLC04_LL_Weapons_Guns_Long_Nukacade: "0305136C",
            DLC04_LL_Weapons_Guns_Short_Nukacade: "0305136A",
            LLI_Synth_Weapons: "0011B474",
            LLI_Synth_Weapons_Rifle: "001655D5",
            LLI_Synth_Weapons_Shotgun: "001655D3",
            LLI_Synth_Inst_MissileLauncher: "00176196",
            LLI_Grenade_frag_15: "000F2E1E",
            LLI_Raider_Grenade_frag_15: "0019FFBB",
            LLS_Grenade_Molotov: "00110031",
            LLS_Grenades_Frag: "0011002B",
            LLS_Grenades_Nuka: "001BBCBC",
            LLS_Grenades_Plasma: "0011002D",
            LLS_Grenades_Pulse: "00110030",
            LLS_Grenades_Cryo: "0011002F",
            LLS_Mine_plasma: "00110038",
            LLS_Mine_pulse: "00110039",
            LLS_Mine_cryo: "00110035",
            LLS_Mine_frag: "00110034",
            LL_Vendor_Weapon_GunBoS: "002049DB",
            LL_Vendor_Weapon_GunGeneralStore: "002049DD",
            LL_Vendor_Weapon_GunSpecialty: "0008531F",
            LL_Minutemen_Weapons_Auto: "001BF0B9",
            LL_Minutemen_Weapons_NonAuto: "001BF0B8"
        };
        // Auto-complete rules are intentionally empty now.
        // We'll fill these together with your final sorting logic.
        this.autoCompleteRules = {
            distribute: {
                WeaponTypePistol: [
                    "DIST_PISTOL"
                ],
                WeaponTypeAssaultRifle: [
                    "DIST_ASSAULT_RIFLE"
                ],
                WeaponTypeSniper: [
                    "DIST_SNIPER_RIFLE"
                ],
                WeaponTypeGaussRifle: [
                    "DIST_SNIPER_RIFLE"
                ],
                WeaponTypeShotgun: [
                    "DIST_SHOTGUN"
                ],
                WeaponTypeLaser: [
                    "DIST_LASER_GUN"
                ],
                WeaponTypePlasma: [
                    "DIST_PLASMA_GUN"
                ],
                WeaponTypeHeavyGun: [
                    "DIST_MINIGUN"
                ],
                WeaponTypeMinigun: [
                    "DIST_MINIGUN"
                ],
                WeaponTypeGatlingLaser: [
                    "DIST_MINIGUN"
                ],
                WeaponTypeFlamer: [
                    "DIST_MINIGUN"
                ],
                WeaponTypeFatman: [
                    "DIST_MISSILE_LAUNCHER"
                ],
                WeaponTypeMissileLauncher: [
                    "DIST_MISSILE_LAUNCHER"
                ],
                WeaponTypeUnarmed: [
                    "DIST_KNUCKLES"
                ],
                WeaponTypeHandToHand: [
                    "DIST_KNUCKLES"
                ],
                WeaponTypeBroadsider: [
                    "DIST_2H_MELEE"
                ],
                WeaponTypeMelee2H: [
                    "DIST_2H_MELEE"
                ],
                WeaponTypeMelee1H: [
                    "DIST_1H_MELEE"
                ],
                WeaponTypeRipper: [
                    "DIST_1H_MELEE"
                ],
                WeaponTypeShishkebab: [
                    "DIST_1H_MELEE"
                ]
            },
            factions: {}
        };
        this.typeIconByKeyword = {
            "00092A86": "Ballistic.svg",
            "0004C922": "Energy.svg",
            "00092A85": "Energy.svg",
            "00092A84": "Energy.svg",
            "0022575F": "Energy.svg",
            "00225762": "Energy.svg",
            "00225766": "2hmelee.svg",
            "0005240E": "2hmelee.svg",
            "00226453": "2hmelee.svg",
            "0004A0A5": "2hmelee.svg",
            "0004A0A4": "1hmelee.svg",
            "00225767": "1hmelee.svg",
            "00225768": "1hmelee.svg",
            "0010C414": "mine.svg",
            "00219686": "mine.svg",
            "00219687": "mine.svg",
            "0021968A": "mine.svg",
            "00219688": "mine.svg",
            "00219689": "mine.svg",
            "0021A29F": "molotov.svg",
            "0010C415": "grenade.svg",
            "0021968B": "grenade.svg",
            "0021968C": "grenade.svg",
            "0021968D": "grenade.svg",
            "0021968E": "grenade.svg",
            "0004A0A3": "Heavy.svg",
            "0022575D": "Heavy.svg",
            "0022575E": "Heavy.svg",
            "00225760": "Heavy.svg",
            "0022575C": "Louncher.svg",
            "0022575B": "Louncher.svg",
            "00226455": "Assault.svg",
            "0004A0A1": "Rifle.svg",
            "0004A0A0": "pistol.svg",
            "00226454": "Shotgun.svg",
            "001E325D": "sniper.svg",
            "00226456": "sniper.svg",
            "0004A0A2": "Ballistic.svg",
            "00225763": "Ballistic.svg",
            "00226452": "Musket.svg",
            "00225764": "Ballistic.svg",
            "00225765": "Ballistic.svg",
            "00225761": "Ballistic.svg",
            "0016968B": "Energy.svg"
        };
        this.typeEdidByKeyword = {
            "00092A86": "WeaponTypeBallistic",
            "0004C922": "WeaponTypeExplosive",
            "00092A85": "WeaponTypePlasma",
            "00092A84": "WeaponTypeLaser",
            "0022575F": "WeaponTypeCryolater",
            "00225762": "WeaponTypeGammaGun",
            "00225766": "WeaponTypeBroadsider",
            "0005240E": "WeaponTypeUnarmed",
            "00226453": "WeaponTypeHandToHand",
            "0004A0A5": "WeaponTypeMelee2H",
            "0004A0A4": "WeaponTypeMelee1H",
            "00225767": "WeaponTypeRipper",
            "00225768": "WeaponTypeShishkebab",
            "0010C414": "WeaponTypeMine",
            "00219686": "WeaponTypeCryoMine",
            "00219687": "WeaponTypePulseMine",
            "0021968A": "WeaponTypeBottlecapMine",
            "00219688": "WeaponTypeNukaMine",
            "00219689": "WeaponTypePlasmaMine",
            "0021A29F": "WeaponTypeMolotov",
            "0010C415": "WeaponTypeGrenade",
            "0021968B": "WeaponTypeCryoGrenade",
            "0021968C": "WeaponTypeNukaGrenade",
            "0021968D": "WeaponTypePlasmaGrenade",
            "0021968E": "WeaponTypePulseGrenade",
            "0004A0A3": "WeaponTypeHeavyGun",
            "0022575D": "WeaponTypeMinigun",
            "0022575E": "WeaponTypeGatlingLaser",
            "00225760": "WeaponTypeFlamer",
            "0022575C": "WeaponTypeFatman",
            "0022575B": "WeaponTypeMissileLauncher",
            "00226455": "WeaponTypeAssaultRifle",
            "0004A0A1": "WeaponTypeRifle",
            "0004A0A0": "WeaponTypePistol",
            "00226454": "WeaponTypeShotgun",
            "001E325D": "WeaponTypeSniper",
            "00226456": "WeaponTypeGaussRifle",
            "0004A0A2": "WeaponTypeAutomatic",
            "00225763": "WeaponTypeJunkJet",
            "00226452": "WeaponTypeLaserMusket",
            "00225764": "WeaponTypeRailwayRifle",
            "00225765": "WeaponTypeSyringer",
            "00225761": "WeaponTypeFlareGun",
            "0016968B": "WeaponTypeAlienBlaster"
        };
        this.typeIconPriority = {
            "Ballistic.svg": 0,
            "Energy.svg": 1,
            "Assault.svg": 10,
            "Rifle.svg": 11,
            "pistol.svg": 12,
            "Shotgun.svg": 13,
            "sniper.svg": 14,
            "Heavy.svg": 15,
            "Louncher.svg": 16,
            "1hmelee.svg": 17,
            "2hmelee.svg": 18,
            "mine.svg": 19,
            "grenade.svg": 20,
            "molotov.svg": 21,
            "Musket.svg": 22
        };
    }

    init() {
        document.addEventListener("DOMContentLoaded", () => {
            this.patchMultiSelectVendorsGuard();
            this.captureLvliLabels();

            const uploadTitle = document.getElementById("weapUploadTitle");
            this.api.bindPrimaryAndSecondaryUpload({
                inputId: "weapFile",
                primaryTriggerId: "weapBtn",
                secondaryTriggerId: "weapUploadAnother",
                onFile: async (file) => {
                    const text = await this.readFileTextSmart(file);
                    this.loadWeaponListText(text, file.name);
                    if (uploadTitle) uploadTitle.textContent = this.getUploadTitleText(file.name);
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
        });
    }

    patchMultiSelectVendorsGuard() {
        if (!this.api || this.api.__weapMultiGuardPatched) return;
        const original = this.api.handleEdidClick?.bind(this.api);
        if (typeof original !== "function") return;

        this.api.handleEdidClick = (edid) => {
            if (!edid) return original(edid);

            const rules = this.api.edidRules?.[edid] || [];
            const onlyVendors = rules.length > 0 && rules.every(token => token === "SPEC_VENDORS");
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

    async readFileTextSmart(file) {
        const buffer = await file.arrayBuffer();
        const utf8 = new TextDecoder("utf-8").decode(buffer);
        if (!utf8.includes("\uFFFD")) return utf8;

        // xEdit exports are often ANSI/Windows-1251 on RU systems.
        return new TextDecoder("windows-1251").decode(buffer);
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

    parseWeaponList(text) {
        const lines = text.split(/\r?\n/).map(line => line.trim());
        const parsed = [];
        const seen = new Set();
        let currentPlugin = "";

        for (const line of lines) {
            if (!line || line.startsWith(";") || line.startsWith("#")) continue;

            // Record format only: FormID-EDID-Payload
            // This avoids breaking on plugin names that contain '-' (e.g. A-Max.esp).
            const rec = line.match(/^([0-9A-Fa-f]{1,8})-([^-]+)-(.*)$/);
            if (!rec) {
                currentPlugin = line;
                continue;
            }
            if (!currentPlugin) continue;

            const formIdRaw = rec[1].trim();
            const edid = rec[2].trim();
            const payload = rec[3].trim();
            const { name, ammo, types } = this.parsePayload(payload);

            if (!formIdRaw || !edid) continue;

            const formId = this.normalizeFormId(formIdRaw);
            const recordKey = `${currentPlugin}|${formId}|${edid}`;
            if (seen.has(recordKey)) continue;
            seen.add(recordKey);

            parsed.push({
                key: recordKey,
                plugin: currentPlugin,
                formId,
                edid,
                name,
                ammo,
                types
            });
        }

        parsed.sort((a, b) => {
            const aText = (a.name || a.edid).toLowerCase();
            const bText = (b.name || b.edid).toLowerCase();
            return aText.localeCompare(bText);
        });

        return parsed;
    }

    parsePayload(payload) {
        let name = payload;
        let ammo = "";
        let types = [];

        const typeMarker = "|TYPE:";
        const typeIdx = name.indexOf(typeMarker);
        if (typeIdx !== -1) {
            const typeText = name.slice(typeIdx + typeMarker.length).trim();
            types = typeText
                .split(/[;,]/)
                .map(v => this.normalizeFormId(v.trim()).toUpperCase())
                .filter(Boolean);
            name = name.slice(0, typeIdx);
        }

        const ammoMarker = "|AMMO:";
        const ammoIdx = name.indexOf(ammoMarker);
        if (ammoIdx !== -1) {
            ammo = this.normalizeFormId(name.slice(ammoIdx + ammoMarker.length).trim());
            name = name.slice(0, ammoIdx);
        }

        return { name: name.trim(), ammo, types };
    }

    getRecordDisplayName(record) {
        return (record?.name || record?.edid || "").trim();
    }

    getRecordMeta(record) {
        if (!record) return "";
        return `${record.plugin}`;
    }

    loadWeaponListText(text, fallbackFilename = "") {
        this.records = this.parseWeaponList(text);

        this.api.edidArray = this.records.map(record => ({
            editorId: record.key,
            formId: record.formId,
            name: this.getRecordMeta(record)
        }));

        this.api.edidRules = {};
        this.api.activeEdid = null;
        this.api.multiSelectionMode = false;
        this.api.multiSelectedEDIDs.clear();
        this.api.multiBaseKeywords = [];
        this.api.multiAnchorEdid = null;

        const multiToggle = document.getElementById("multiSelectToggle");
        if (multiToggle) multiToggle.checked = false;

        this.sourceName = this.deriveSourceName(fallbackFilename);

        this.api.updateDOMKeywords();
        this.api.enableAllUI();

        if (!this.records.length) {
            alert("No valid weapon lines found. Check TXT format.");
        }
    }

    deriveSourceName(fallbackFilename = "") {
        const plugins = [...new Set(this.records.map(r => r.plugin).filter(Boolean))];
        if (plugins.length === 1) return plugins[0].replace(/\.(esp|esm|esl)$/i, "");
        return (fallbackFilename || "output").replace(/\.[^/.]+$/, "") || "output";
    }

    getUploadTitleText(fallbackFilename = "") {
        const plugins = [...new Set(this.records.map(r => r.plugin).filter(Boolean))];
        if (plugins.length === 1) return plugins[0];
        if (plugins.length > 1) return `${plugins.length} plugins loaded`;
        return fallbackFilename || "TXT loaded";
    }

    getRecordByKey(key) {
        return this.records.find(record => record.key === key) || null;
    }

    getEdidCellText(key) {
        const record = this.getRecordByKey(key);
        return record ? this.getRecordDisplayName(record) : key;
    }

    getNameCellText(key) {
        return this.getTypeCellText(key);
    }

    getSelectedTypeTokens(key) {
        const selected = this.api.edidRules[key] || [];
        return selected.filter(token => !!this.distributeLvliMap[token]);
    }

    getSelectedSpecialTypeTokens(key) {
        const selected = this.api.edidRules[key] || [];
        return selected.filter(token =>
            token === "SPEC_GRENADE" ||
            token === "SPEC_ENERGY_GRENADE" ||
            token === "SPEC_MINE"
        );
    }

    getSelectedFactionTokens(key) {
        const selected = this.api.edidRules[key] || [];
        return selected.filter(token => this.factionSelectorTokens.has(token));
    }

    getSelectedFactionSpecialTokens(key) {
        const selected = this.api.edidRules[key] || [];
        return selected.filter(token => token === "SPEC_VENDORS");
    }

    getCompactLabels(tokens = [], max = 3) {
        const labels = tokens.map(v => this.lvliLabelByValue[v] || v);
        const visible = labels.slice(0, max);
        const hasMore = labels.length > max;
        return { labels, visible, hasMore };
    }

    renderCompactCell(tokens = [], max = 3) {
        if (!tokens.length) return "";
        const { visible, hasMore } = this.getCompactLabels(tokens, max);
        let html = visible
            .map(label => `<span class="kywd-more" title="${this.api.escapeHtml(label)}">${this.api.escapeHtml(label)}</span>`)
            .join(" ");
        if (hasMore) html += ` <span class="kywd-more" title="More">...</span>`;
        return html;
    }

    getTypeCellText(key) {
        const typeTokens = this.getSelectedTypeTokens(key);
        const specialTypeTokens = this.getSelectedSpecialTypeTokens(key);
        const { labels } = this.getCompactLabels([...typeTokens, ...specialTypeTokens], 999);
        return labels.join(", ");
    }

    getTypeCellMarkup(key) {
        const tokens = [...this.getSelectedTypeTokens(key), ...this.getSelectedSpecialTypeTokens(key)];
        if (!tokens.length) return "";
        const priority = {
            DIST_PISTOL: 10,
            DIST_SHOTGUN: 20,
            DIST_ASSAULT_RIFLE: 30,
            DIST_SNIPER_RIFLE: 40,
            DIST_LASER_GUN: 50,
            DIST_PLASMA_GUN: 60,
            DIST_MINIGUN: 70,
            DIST_MISSILE_LAUNCHER: 80,
            DIST_1H_MELEE: 90,
            DIST_2H_MELEE: 100,
            DIST_KNUCKLES: 110,
            SPEC_GRENADE: 120,
            SPEC_ENERGY_GRENADE: 130,
            SPEC_MINE: 140
        };
        const iconByToken = {
            DIST_PISTOL: "icons/weaponTypes/pistol.svg",
            DIST_ASSAULT_RIFLE: "icons/weaponTypes/Assault.svg",
            DIST_SNIPER_RIFLE: "icons/weaponTypes/sniper.svg",
            DIST_SHOTGUN: "icons/weaponTypes/Shotgun.svg",
            DIST_LASER_GUN: "icons/weaponTypes/Energy.svg",
            DIST_PLASMA_GUN: "icons/weaponTypes/Plasma.svg",
            DIST_MINIGUN: "icons/weaponTypes/Heavy.svg",
            DIST_MISSILE_LAUNCHER: "icons/weaponTypes/Louncher.svg",
            DIST_KNUCKLES: "icons/weaponTypes/2hmelee.svg",
            DIST_2H_MELEE: "icons/weaponTypes/2hmelee.svg",
            DIST_1H_MELEE: "icons/weaponTypes/1hmelee.svg",
            SPEC_GRENADE: "icons/weaponTypes/grenade.svg",
            SPEC_ENERGY_GRENADE: "icons/weaponTypes/Energy.svg",
            SPEC_MINE: "icons/weaponTypes/mine.svg"
        };

        const unique = [];
        const seen = new Set();
        [...tokens].sort((a, b) => (priority[a] ?? 999) - (priority[b] ?? 999)).forEach(token => {
            const icon = iconByToken[token];
            if (!icon || seen.has(icon)) return;
            seen.add(icon);
            unique.push({ token, icon, label: this.lvliLabelByValue[token] || token });
        });
        const visible = unique.slice(0, 3);
        const hasMore = unique.length > 3;
        let html = visible.map(item =>
            `<img class="kywd-icon weap-type-icon" src="${this.api.escapeHtml(item.icon)}" alt="${this.api.escapeHtml(item.label)}" title="${this.api.escapeHtml(item.label)}">`
        ).join(" ");
        if (hasMore) html += ` <span class="kywd-more" title="More">...</span>`;
        return `<span class="weap-cell-slot"><span class="weap-cell-icons">${html}</span></span>`;
    }

    getFactionCellMarkup(key) {
        const tokens = [...this.getSelectedFactionTokens(key), ...this.getSelectedFactionSpecialTokens(key)];
        if (!tokens.length) return "";
        const priority = {
            FAC_MINUTEMEN: 10,
            FAC_BOS: 20,
            FAC_RAILROAD: 30,
            FAC_INSTITUTE: 40,
            FAC_RAIDERS: 50,
            FAC_GUNNERS: 60,
            FAC_TRIGGERMEN: 70,
            FAC_DC_SECURITY: 80,
            FAC_CITIZEN: 90,
            FAC_BOTRAIDER: 100,
            FAC_TRAPPERS: 110,
            FAC_NUKA_WORLD: 120,
            SPEC_VENDORS: 130
        };
        const iconByToken = {
            FAC_RAIDERS: "icons/factions/Raiders.svg",
            FAC_GUNNERS: "icons/factions/Gunners.svg",
            FAC_BOS: "icons/factions/BOS.svg",
            FAC_TRIGGERMEN: "icons/factions/Triggermen.svg",
            FAC_RAILROAD: "icons/factions/Railroad.svg",
            FAC_DC_SECURITY: "icons/factions/DaimondCity.svg",
            FAC_CITIZEN: "icons/factions/Citizens.svg",
            FAC_BOTRAIDER: "icons/factions/Robot.svg",
            FAC_TRAPPERS: "icons/factions/Knuckles.svg",
            FAC_NUKA_WORLD: "icons/factions/Nukaworld.svg",
            FAC_MINUTEMEN: "icons/factions/Minuteman.svg",
            FAC_INSTITUTE: "icons/factions/Institute.svg",
            SPEC_VENDORS: "icons/factions/shop.svg"
        };

        const ordered = [...tokens].sort((a, b) => (priority[a] ?? 999) - (priority[b] ?? 999));
        const visible = ordered.slice(0, 3);
        const hasMore = ordered.length > 3;
        let html = visible.map(token => {
            const label = this.lvliLabelByValue[token] || token;
            const icon = iconByToken[token];
            if (!icon) {
                return `<span class="kywd-more" title="${this.api.escapeHtml(label)}">${this.api.escapeHtml(label)}</span>`;
            }
            return `<img class="kywd-icon weap-type-icon" src="${this.api.escapeHtml(icon)}" alt="${this.api.escapeHtml(label)}" title="${this.api.escapeHtml(label)}">`;
        }).join(" ");
        if (hasMore) html += ` <span class="kywd-more" title="More">...</span>`;
        return `<span class="weap-cell-slot"><span class="weap-cell-icons">${html}</span></span>`;
    }

    toTypeFormKey(typeId) {
        const raw = String(typeId || "").toUpperCase().replace(/[^0-9A-F]/g, "");
        if (!raw) return "";
        const last6 = raw.length > 6 ? raw.slice(-6) : raw;
        return last6.padStart(8, "0");
    }

    getAvailableLvliSetForMode(mode) {
        const set = new Set();
        const root = document.querySelector(`#keywordContainer .weap-mode-panel[data-mode="${mode}"]`);
        root?.querySelectorAll("input[type='checkbox']").forEach(input => set.add(input.value));
        if (set.size) return set;

        if (mode === "factions") {
            this.factionSelectorTokens.forEach(key => set.add(key));
        } else {
            Object.keys(this.distributeLvliMap || {}).forEach(key => set.add(key));
        }
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
        const ordered = [
            "WeaponTypeBallistic",
            "WeaponTypeLaser",
            "WeaponTypePlasma",
            "WeaponTypeCryolater",
            "WeaponTypeGammaGun"
        ];
        let winner = "";
        ordered.forEach(typeId => {
            if (typeSet.has(typeId)) winner = typeId;
        });
        return winner;
    }

    getAutoListsForRecord(record, mode) {
        const rules = this.autoCompleteRules[mode] || {};
        const allowed = this.getAvailableLvliSetForMode(mode);
        const list = [];
        const seen = new Set();
        const typeEdids = this.getTypeEdidsForRecord(record);
        const typeSet = new Set(typeEdids);
        const dominantChannel = this.getDominantWeaponChannel(typeSet);
        const hasMissileOverride =
            typeSet.has("WeaponTypeFatman") ||
            typeSet.has("WeaponTypeMissileLauncher");
        this.getTypeEdidsForRecord(record).forEach(typeEdid => {
            if (
                typeEdid === "WeaponTypeBallistic" ||
                typeEdid === "WeaponTypeLaser" ||
                typeEdid === "WeaponTypePlasma" ||
                typeEdid === "WeaponTypeCryolater" ||
                typeEdid === "WeaponTypeGammaGun"
            ) {
                if (dominantChannel && dominantChannel !== typeEdid) return;
            }

            if (
                typeEdid === "WeaponTypePistol" ||
                typeEdid === "WeaponTypeAssaultRifle" ||
                typeEdid === "WeaponTypeSniper" ||
                typeEdid === "WeaponTypeGaussRifle" ||
                typeEdid === "WeaponTypeShotgun"
            ) {
                if (dominantChannel !== "WeaponTypeBallistic") return;
            }

            if (
                hasMissileOverride &&
                (
                    typeEdid === "WeaponTypeHeavyGun" ||
                    typeEdid === "WeaponTypeMinigun" ||
                    typeEdid === "WeaponTypeGatlingLaser" ||
                    typeEdid === "WeaponTypeFlamer"
                )
            ) {
                return;
            }

            if (
                typeEdid === "WeaponTypeMelee2H" &&
                (typeSet.has("WeaponTypeUnarmed") || typeSet.has("WeaponTypeHandToHand"))
            ) {
                return;
            }

            if (
                (
                    typeEdid === "WeaponTypeMelee1H" ||
                    typeEdid === "WeaponTypeRipper" ||
                    typeEdid === "WeaponTypeShishkebab"
                ) &&
                (typeSet.has("WeaponTypeUnarmed") || typeSet.has("WeaponTypeHandToHand"))
            ) {
                return;
            }

            if (typeEdid === "WeaponTypeLaser") {
                const laserExcluded =
                    typeSet.has("WeaponTypeHeavyGun") ||
                    typeSet.has("WeaponTypeMinigun") ||
                    typeSet.has("WeaponTypeGatlingLaser") ||
                    typeSet.has("WeaponTypeFlamer");
                if (laserExcluded) return;
            }
            if (typeEdid === "WeaponTypePlasma") {
                const plasmaExcluded =
                    typeSet.has("WeaponTypeHeavyGun") ||
                    typeSet.has("WeaponTypeMinigun") ||
                    typeSet.has("WeaponTypeGatlingLaser") ||
                    typeSet.has("WeaponTypeFlamer");
                if (plasmaExcluded) return;
            }
            (rules[typeEdid] || []).forEach(lvli => {
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

        const isMelee = typeSet.has("DIST_1H_MELEE") || typeSet.has("DIST_2H_MELEE");
        const isShotgun = typeSet.has("DIST_SHOTGUN");
        const isSniper = typeSet.has("DIST_SNIPER_RIFLE");
        const isAssault = typeSet.has("DIST_ASSAULT_RIFLE");
        const isPistol = typeSet.has("DIST_PISTOL");
        const isMissile = typeSet.has("DIST_MISSILE_LAUNCHER");
        const isMinigun = typeSet.has("DIST_MINIGUN");
        const isLaserOrPlasma = typeSet.has("DIST_LASER_GUN") || typeSet.has("DIST_PLASMA_GUN");

        if (factionSet.has("FAC_RAIDERS")) {
            if (isMelee) add("FAC_RAIDERS_MELEE");
            else add("FAC_RAIDERS_OTHER_GUNS");
        }

        if (factionSet.has("FAC_GUNNERS")) {
            if (isMelee) add("FAC_GUNNERS_MELEE");
            else if (isShotgun) add("FAC_GUNNERS_SHOTGUN");
            else if (isSniper) add("FAC_GUNNERS_SNIPER");
            else add("FAC_GUNNERS_OTHER_GUNS");
        }

        if (factionSet.has("FAC_BOS")) {
            if (isMelee) add("FAC_BOS_MELEE");
            else if (isMissile) add("FAC_BOS_MISSILE");
            else if (isMinigun) add("FAC_BOS_MINIGUN");
            else add("FAC_BOS_OTHER_GUNS");
        }

        if (factionSet.has("FAC_TRIGGERMEN")) {
            if (isPistol) add("FAC_TRIGGERMEN_PISTOL");
            if (isAssault) add("FAC_TRIGGERMEN_ASSAULT");
        }

        if (factionSet.has("FAC_RAILROAD") && !isMelee) add("FAC_RAILROAD_ALL");
        if (factionSet.has("FAC_DC_SECURITY") && !isMelee) add("FAC_DC_SECURITY_ALL");
        if (factionSet.has("FAC_CITIZEN")) add("FAC_CITIZEN_ALL");

        if (factionSet.has("FAC_BOTRAIDER")) {
            if (isMelee) add("FAC_BOTRAIDER_MELEE");
            else add("FAC_BOTRAIDER_ALL_GUNS");
        }

        if (factionSet.has("FAC_TRAPPERS")) {
            if (isMinigun || isMissile) add("FAC_TRAPPERS_HEAVY");
            else if (isAssault || isSniper) add("FAC_TRAPPERS_ASSAULT_SNIPER");
            else if (isPistol || isShotgun) add("FAC_TRAPPERS_PISTOL_SHOTGUN");
        }

        if (factionSet.has("FAC_NUKA_WORLD")) add("FAC_NUKA_WORLD_ALL");
        if (factionSet.has("FAC_MINUTEMEN")) {
            if (isMinigun || isAssault || typeSet.has("DIST_LASER_GUN")) {
                add("FAC_MINUTEMEN_AUTO");
            }
            if (isPistol || isShotgun || isSniper) {
                add("FAC_MINUTEMEN_NONAUTO");
            }
        }
        if (factionSet.has("FAC_INSTITUTE") && isLaserOrPlasma) add("FAC_INSTITUTE_SYNTHS");

        return out;
    }

    getSpecialAutoTokensForRecord(record) {
        const typeSet = new Set(this.getTypeEdidsForRecord(record));
        const out = [];
        const add = (token) => {
            if (!out.includes(token)) out.push(token);
        };

        const hasBasicGrenade =
            typeSet.has("WeaponTypeGrenade") ||
            typeSet.has("WeaponTypeMolotov");
        if (hasBasicGrenade) add("SPEC_GRENADE");

        const hasEnergyGrenade =
            typeSet.has("WeaponTypeCryoGrenade") ||
            typeSet.has("WeaponTypeNukaGrenade") ||
            typeSet.has("WeaponTypePlasmaGrenade") ||
            typeSet.has("WeaponTypePulseGrenade");
        if (hasEnergyGrenade) add("SPEC_ENERGY_GRENADE");

        const hasMine =
            typeSet.has("WeaponTypeMine") ||
            typeSet.has("WeaponTypeCryoMine") ||
            typeSet.has("WeaponTypePulseMine") ||
            typeSet.has("WeaponTypeBottlecapMine") ||
            typeSet.has("WeaponTypeNukaMine") ||
            typeSet.has("WeaponTypePlasmaMine");
        if (hasMine) add("SPEC_MINE");

        add("SPEC_VENDORS");
        return out;
    }

    expandLvliSelection(selected = [], mode = null) {
        const out = [];
        const seen = new Set();
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
                    if (seen.has(lvli)) return;
                    seen.add(lvli);
                    out.push(lvli);
                });
            });
        }

        [...resolvedCategories, ...legacyCategoryTokens].forEach(category => {
            (this.factionsLvliMap[category] || []).forEach(lvli => {
                if (seen.has(lvli)) return;
                seen.add(lvli);
                out.push(lvli);
            });
        });
        specialTokens.forEach(token => {
            (this.specialLvliMap[token] || []).forEach(lvli => {
                if (seen.has(lvli)) return;
                seen.add(lvli);
                out.push(lvli);
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
            if (seen.has(item)) return;
            seen.add(item);
            out.push(item);
        });
        return out;
    }

    toRobCoLvliValue(lvliValue) {
        const mapped = this.lvliFormIdByEdid[lvliValue];
        if (mapped) return mapped.toUpperCase();
        return lvliValue;
    }

    getLvliMasterFile(lvliEdid) {
        if (!lvliEdid) return "Fallout4.esm";
        const id = String(lvliEdid);
        if (id.startsWith("DLC01")) return "DLCRobot.esm";
        if (id.startsWith("DLC03")) return "DLCCoast.esm";
        if (id.startsWith("DLC04")) return "DLCNukaWorld.esm";
        return "Fallout4.esm";
    }

    autoCompleteAll() {
        if (!this.records.length) {
            alert("Load weapon list first.");
            return;
        }

        const typeAllowed = this.getAvailableLvliSetForMode("distribute");
        let changed = 0;

        this.records.forEach(record => {
            const autoTypes = this.getAutoListsForRecord(record, "distribute")
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

    injectTypeColumn() {
        const table = document.getElementById("edidTable");
        if (!table) return;
        table.classList.add("weap-edid-table");

        const headRow = table.querySelector("thead tr");
        if (headRow && !headRow.querySelector(".edid-col-type-header")) {
            const th = document.createElement("th");
            th.className = "edid-col-type-header";
            th.textContent = "Type";
            headRow.insertBefore(th, headRow.firstChild);
        }

        table.querySelectorAll("tbody tr").forEach(row => {
            if (row.querySelector(".edid-col-type")) return;
            const key = row.dataset.key || "";
            const typeCell = document.createElement("td");
            typeCell.className = "edid-col-type";
            typeCell.innerHTML = this.getTypeCellMarkup(key);
            row.insertBefore(typeCell, row.firstChild);
        });
    }

    rebuildRowsByPluginGroup() {
        const tbody = document.querySelector("#edidList tbody");
        const table = document.getElementById("edidTable");
        if (!tbody || !table) return;

        const byKey = new Map();
        tbody.querySelectorAll("tr[data-key]").forEach(row => {
            byKey.set(row.dataset.key, row);
        });

        const sorted = [...this.records].sort((a, b) => {
            const p = (a.plugin || "").localeCompare((b.plugin || ""), undefined, { sensitivity: "base" });
            if (p !== 0) return p;
            return this.getRecordDisplayName(a).localeCompare(this.getRecordDisplayName(b), undefined, { sensitivity: "base" });
        });

        const grouped = new Map();
        sorted.forEach(record => {
            const plugin = record.plugin || "Unknown Plugin";
            if (!grouped.has(plugin)) grouped.set(plugin, []);
            grouped.get(plugin).push(record);
        });

        const groups = Array.from(grouped.entries());
        const frag = document.createDocumentFragment();
        let currentPlugin = null;
        const colCount = table.querySelectorAll("thead th").length || 4;

        groups.forEach(([pluginName, records], groupIndex) => {
            currentPlugin = pluginName;
            const sep = document.createElement("tr");
            sep.className = "weap-plugin-separator";
            sep.dataset.plugin = currentPlugin || "";
            const td = document.createElement("td");
            td.colSpan = colCount;
            const label = document.createElement("span");
            label.className = "weap-plugin-separator-label";
            label.textContent = currentPlugin || "Unknown Plugin";
            td.appendChild(label);
            sep.appendChild(td);
            frag.appendChild(sep);

            records.forEach((record, idx) => {
                const row = byKey.get(record.key);
                if (!row) return;
                row.classList.remove("weap-plugin-group-last");
                if (idx === records.length - 1) {
                    row.classList.add("weap-plugin-group-last");
                }
                frag.appendChild(row);
            });

            if (groupIndex < groups.length - 1) {
                const gap = document.createElement("tr");
                gap.className = "weap-plugin-gap";
                const gapTd = document.createElement("td");
                gapTd.colSpan = colCount;
                gap.appendChild(gapTd);
                frag.appendChild(gap);
            }
        });

        tbody.innerHTML = "";
        tbody.appendChild(frag);
    }

    updatePluginSeparatorVisibility() {
        const tbody = document.querySelector("#edidList tbody");
        if (!tbody) return;

        const rows = Array.from(tbody.children);
        const separators = [];
        let current = null;

        rows.forEach(row => {
            if (row.classList.contains("weap-plugin-separator")) {
                current = { sep: row, rows: [] };
                separators.push(current);
                return;
            }

            if (!current) return;
            if (row.classList.contains("weap-plugin-gap")) return;
            if (!row.dataset.key) return;
            current.rows.push(row);
        });

        separators.forEach(group => {
            const hasVisibleRows = group.rows.some(r => r.style.display !== "none");
            group.sep.style.display = hasVisibleRows ? "" : "none";
        });

        rows.forEach((row, idx) => {
            if (!row.classList.contains("weap-plugin-gap")) return;
            let prevVisible = false;
            let nextVisible = false;

            for (let i = idx - 1; i >= 0; i--) {
                if (rows[i].classList.contains("weap-plugin-separator")) {
                    prevVisible = rows[i].style.display !== "none";
                    break;
                }
            }
            for (let i = idx + 1; i < rows.length; i++) {
                if (rows[i].classList.contains("weap-plugin-separator")) {
                    nextVisible = rows[i].style.display !== "none";
                    break;
                }
            }

            row.style.display = (prevVisible && nextVisible) ? "" : "none";
        });
    }

    renderTable() {
        this.api.renderEdidTable({
            containerId: "edidList",
            thirdColumnTitle: "Faction",
            getThirdCellHtml: (key) => this.getLvliCellMarkup(key),
            onRowClick: (key, rowEl) => {
                const edidCell = rowEl.querySelector(".edid-col-edid");
                if (edidCell) edidCell.textContent = this.getEdidCellText(key);
                const nameCell = rowEl.querySelector(".edid-col-name");
                if (nameCell) nameCell.textContent = this.getNameCellText(key);

                this.api.updateKeywordsFromDOM();
                this.updateTableState();
            }
        });

        const headers = document.querySelectorAll("#edidList thead th");
        if (headers[0]) headers[0].textContent = "Name";
        if (headers[1]) headers[1].textContent = "Type";
        if (headers[2]) headers[2].textContent = "Faction";

        document.querySelectorAll("#edidList tbody tr").forEach(row => {
            const key = row.dataset.key;
            if (!key) return;
            const edidCell = row.querySelector(".edid-col-edid");
            if (edidCell) edidCell.textContent = this.getEdidCellText(key);
            const nameCell = row.querySelector(".edid-col-name");
            if (nameCell) nameCell.innerHTML = this.getTypeCellMarkup(key);
            const thirdCell = row.querySelector(".edid-col-third");
            if (thirdCell) thirdCell.innerHTML = this.getLvliCellMarkup(key);
            row.dataset.edid = this.getEdidCellText(key);
            row.dataset.name = this.getNameCellText(key);
        });

        this.rebuildRowsByPluginGroup();
        this.updateTableState();
    }

    removeSourceColumn() {
        const table = document.getElementById("edidTable");
        if (!table) return;

        const headerRow = table.querySelector("thead tr");
        if (headerRow && headerRow.children.length >= 4) {
            // Current order before removal: Type | Name | Source | LVLI
            headerRow.removeChild(headerRow.children[2]);
        }

        table.querySelectorAll("tbody tr[data-key]").forEach(row => {
            const sourceCell = row.querySelector(".edid-col-name");
            if (sourceCell) sourceCell.remove();
        });
    }

    getLvliCellMarkup(key) {
        return this.getFactionCellMarkup(key);
    }

    updateTableState() {
        this.api.updateEdidTableHighlights({
            getThirdCellHtml: (key) => this.getLvliCellMarkup(key)
        });

        document.querySelectorAll("#edidList tbody tr[data-key]").forEach(row => {
            const key = row.dataset.key;
            const edidCell = row.querySelector(".edid-col-edid");
            const nameCell = row.querySelector(".edid-col-name");
            const thirdCell = row.querySelector(".edid-col-third");
            if (edidCell && !this.currentSearchQuery) {
                edidCell.textContent = this.getEdidCellText(key);
            }
            if (nameCell) nameCell.innerHTML = this.getTypeCellMarkup(key);
            if (thirdCell) thirdCell.innerHTML = this.getLvliCellMarkup(key);
        });

        this.applyFilters();
    }

    searchTable(query = "") {
        this.currentSearchQuery = query.trim();
        this.applyFilters();
    }

    isOnlyVendorsSelection(key) {
        const selected = this.api.edidRules[key] || [];
        return selected.length > 0 && selected.every(token => token === "SPEC_VENDORS");
    }

    isEditedForShowFilter(key) {
        if (this.isOnlyVendorsSelection(key)) return false;
        return this.api.isEffectivelyEdited(key);
    }

    applyFilters() {
        const showOnlyNotEdited = !!document.getElementById("showNotEditedToggle")?.checked;
        const q = this.currentSearchQuery.toLowerCase();

        document.querySelectorAll("#edidList tbody tr[data-key]").forEach(row => {
            const key = row.dataset.key || "";
            const edidCell = row.querySelector(".edid-col-edid");
            const nameCell = row.querySelector(".edid-col-name");
            if (!edidCell) return;

            const edidText = this.getEdidCellText(key);
            const nameText = this.getNameCellText(key);
            const haystack = `${edidText} ${nameText}`.toLowerCase();
            const matchesSearch = !q || haystack.includes(q);
            const isEdited = this.isEditedForShowFilter(key);
            const passesEditedFilter = !showOnlyNotEdited || !isEdited;
            if (!matchesSearch || !passesEditedFilter) {
                row.style.display = "none";
                return;
            }

            row.style.display = "";
            if (!this.currentSearchQuery) {
                edidCell.textContent = edidText;
                if (nameCell) nameCell.innerHTML = this.getTypeCellMarkup(key);
                const thirdCell = row.querySelector(".edid-col-third");
                if (thirdCell) thirdCell.innerHTML = this.getLvliCellMarkup(key);
            } else {
                edidCell.innerHTML = this.api.highlightText(edidText, q);
                if (nameCell) nameCell.innerHTML = this.getTypeCellMarkup(key);
                const thirdCell = row.querySelector(".edid-col-third");
                if (thirdCell) thirdCell.innerHTML = this.getLvliCellMarkup(key);
            }
        });
        this.updatePluginSeparatorVisibility();
    }

    clearExportOutput() {
        const outputEl = document.querySelector("#exportdataform textarea");
        if (outputEl) outputEl.value = "";
    }

    initExportModule() {
        const container = document.getElementById("exportdataform");
        if (!container) return;

        const textarea = container.querySelector("textarea");
        const generateBtn = container.querySelector(".generate-btn");
        const copyBtn = container.querySelector(".copy-btn");
        const exportBtn = container.querySelector(".export-btn");

        generateBtn?.addEventListener("click", () => this.generateINI());

        copyBtn?.addEventListener("click", () => {
            const text = textarea.value;
            if (text) navigator.clipboard.writeText(text);
            copyBtn.textContent = text ? "Copied!" : "Nothing";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        });

        exportBtn?.addEventListener("click", () => {
            this.exportZip();
        });
    }

    generateINI() {
        const outputEl = document.querySelector("#exportdataform textarea");
        if (!outputEl) return;

        const usedRecords = this.records.filter(r => (this.api.edidRules[r.key] || []).length > 0);
        if (!usedRecords.length) {
            alert("No weapon entries configured yet.");
            outputEl.value = "";
            return;
        }

        const entries = this.buildExportEntries(usedRecords);
        let out = `; Files to export: ${entries.length}\n\n`;
        entries.forEach(entry => {
            out += `; ===== ${entry.path} =====\n`;
            out += `${entry.content}\n\n`;
        });
        outputEl.value = out.trim();
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
        expandedLists.forEach(lvliEdid => {
            const lvliMaster = this.getLvliMasterFile(lvliEdid);
            const lvliFormId = this.toRobCoLvliValue(lvliEdid);
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
        const usedRecords = this.records.filter(r => (this.api.edidRules[r.key] || []).length > 0);
        if (!usedRecords.length) {
            alert("No weapon entries configured yet.");
            return;
        }

        const entries = this.buildExportEntries(usedRecords);
        const files = entries.map(entry => ({ name: entry.path, text: entry.content }));
        const zipBytes = this.createStoreZip(files);
        const blob = new Blob([zipBytes], { type: "application/zip" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${this.sanitizePatchToken(this.sourceName || "output")}_weap_lvli.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
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

    crc32(bytes) {
        if (!WEAPLvliBuilder.CRC_TABLE) {
            WEAPLvliBuilder.CRC_TABLE = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                WEAPLvliBuilder.CRC_TABLE[i] = c >>> 0;
            }
        }

        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            const idx = (crc ^ bytes[i]) & 0xFF;
            crc = (WEAPLvliBuilder.CRC_TABLE[idx] ^ (crc >>> 8)) >>> 0;
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
}

const weapLvliBuilder = new WEAPLvliBuilder(window.KinataMemeAPI);
weapLvliBuilder.init();
