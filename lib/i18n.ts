import { useSettingsStore, type Language } from "@/store/settings-store";

const hu = {
  // Toolbar
  "toolbar.move": "Mozgatás",
  "toolbar.wire": "Kötés",
  "toolbar.addElement": "Elem hozzáadása",
  "toolbar.addCabinet": "Szekrény (ESZ)",
  "toolbar.calculate": "Számítás",
  "toolbar.autoLayout": "Rendezés",

  // Menu
  "menu.new": "Új",
  "menu.open": "Megnyitás",
  "menu.save": "Mentés",
  "menu.pdf": "PDF",
  "menu.legend": "Jelmagyarázat",
  "menu.confirmNew":
    "Új rajz létrehozása? A jelenlegi nem mentett munka elveszhet.",
  "menu.errorOpen": "Nem sikerült megnyitni a fájlt.",
  "menu.errorPdf": "Nem sikerült a PDF exportálása.",

  // Legend / abbreviations
  "legend.title": "Jelmagyarázat",
  "legend.subtitle": "A rajzon használt rövidítések és jelölések.",
  "legend.elements": "Elemek",
  "legend.cables": "Kábelek",
  "legend.values": "Számított értékek",
  "legend.units": "Mértékegységek és jelölések",
  "legend.asz": "Transzformátor",
  "legend.fm": "Tervezett földre telepített mérőszekrény",
  "legend.fe": "Főelosztó",
  "legend.esz": "Tervezett földre telepített elosztószekrény",
  "legend.cable04": "Tervezett 0,4 kV-os földkábel",
  "legend.cableUhe": "Tervezett 0,4 kV-os földkábel",
  "legend.iz": "Számított zárlati áram",
  "legend.loop": "Hurok-impedancia",
  "legend.drop": "Feszültségesés",
  "legend.kmsz": "Szelvény / kilométer-pozíció",
  "legend.side": "Szekrény oldala (bal / jobb)",

  // App name + welcome
  "app.name": "KIF Hálózattervező és Méretező",
  "welcome.subtitle":
    "Elosztóhálózatok tervezése és méretezése. Kezdj egy új projektet, vagy nyiss meg egy mentettet.",
  "welcome.newProject": "Új projekt",
  "welcome.openProject": "Projekt megnyitása fájlból",
  "welcome.tip": "Tipp: használd a bal felső eszköztárat elemek hozzáadásához.",
  "welcome.language": "Nyelv",

  // Sidebar
  "sidebar.properties": "Tulajdonságok",

  // Common fields
  "field.name": "Név",
  "field.label": "Megnevezés",
  "field.position": "Pozíció (km szelvény)",
  "field.positionPlaceholder": "pl. M1 42+963 kmsz.",
  "field.tag": "Jelölés (kimenő irány)",
  "field.side": "Oldal",
  "field.choose": "Válassz...",
  "side.left": "Bal",
  "side.right": "Jobb",

  // Element display names — abbreviations used on the drawing
  "node.asz.name": "ÁSZ",
  "node.fm.name": "FM",
  "node.fe.name": "FE",
  "cabinet.defaultLabel": "ESZ",

  // Cabinet
  "cabinet.title": "Szekrény",
  "cabinet.devices": "Berendezés / Áram [A]",
  "cabinet.noDevices": "Nincs berendezés",
  "cabinet.nameAria": "Szekrény neve",
  "cabinet.renameTitle": "Kattints az átnevezéshez",
  "common.new": "Új",
  "device.type": "Típus",
  "device.km": "km szelvény (pl. 41+940)",
  "tag.autoHint": "Üresen hagyva automatikusan:",
  "tag.noneHint": "Üresen hagyva nem jelenik meg (nincs kimenő kábel).",
  "tag.placeholderNone": "nincs kimenő irány",

  // Calculated values (shared short labels)
  "calc.title": "Számított értékek",
  "calc.current": "Áram [A]",
  "calc.totalCurrent": "Áram összesen [A]",
  "calc.voltageDrop": "Fesz. esés",
  "calc.loopImpedance": "Hurok IMP",
  "calc.iz": "Iz [A]",
  "calc.maxFuse": "Bizt [A]",

  // ÁSZ
  "asz.title": "Áramszolgáltató (ÁSZ)",
  "asz.phaseMode": "Fázisszám",
  "asz.phase3": "Háromfázisú (3F · 400 V)",
  "asz.phase1": "Egyfázisú (1F · 230 V)",
  "asz.voltage": "Hálózati feszültség (V)",
  "asz.scPower": "Rövidzárlati teljesítmény (MVA)",
  "asz.allowedDrop": "Megengedett feszültségesés ε [%]",
  "asz.useDesignCurrent": "Mértékadó áram számítása",
  "asz.useDesignCurrentHint":
    "A kábelek árama a mögöttes berendezések összárama × szorzó / fázisok száma. Kikapcsolva a beírt áramok változatlanul összegződnek.",
  "asz.designCurrentSafetyFactor": "Mértékadó áram szorzója",
  "asz.designCurrentSafetyFactorHint": "Alapértelmezett: 1,2.",
  "asz.maxCurrentDensity": "Max. áramsűrűség [A/mm²]",
  "asz.maxCurrentDensityHint":
    "Hőterhelési alsó határ a keresztmetszet-ajánláshoz. Alapértelmezett: 2 A/mm²; 0 = kikapcsolva.",

  // Node titles
  "node.fm": "Főmérő (FM)",
  "node.fe": "Főelosztó (FE)",
  "node.feed": "Főmérő (FM)",

  // Cable
  "cable.title": "Kábel",
  "cable.name": "Kábel neve / jelölése",
  "cable.namePlaceholder": "pl. K1-1",
  "cable.length": "Kábel hossza [m]",
  "cable.allowedDrop": "Megengedett feszültségesés ε [%]",
  "cable.allowedDropHint": "Üresen hagyva az ÁSZ globális értékét használja.",
  "cable.allowedDropV": "Megengedett mértékadó feszültségesés ε [V]",
  "cable.skipDesignCurrentFactor": "Mértékadó áram szorzó nélkül",
  "cable.skipDesignCurrentFactorHint":
    "Ennél a kábelnél a mögöttes berendezések nyers összárama számít, szorzó nélkül.",
  "cable.resistivity": "AL fajlagos ellenállása Ω mm² / m",
  "cable.crossSection": "Választott kábel keresztmetszete [mm²]",
  "cable.parallelCount": "Párhuzamos",
  "cable.minCrossSection": "Szükséges minimális keresztmetszet [mm²]",
  "cable.recommendedCrossSection": "Javasolt kábel keresztmetszete [mm²]",
  "cable.dropV": "Választott kábel feszültségesése ε [V]",
  "cable.dropPercent": "Választott kábel feszültségesése ε [%]",
  "cable.impedance": "Számított hurok-impedancia (Rh) [Ω]",
  "cable.iz": "Számított zárlati áram (Iz) [A]",

  // PDF export field visibility
  "pdf.fieldsTitle": "Megjelenített adatok",
  "pdf.fieldsHint":
    "A bejelölt sorok a rajzon és a PDF exportban is megjelennek.",
  "pdf.fieldDimensions": "Méret (hossz · mm²)",

  // Units / canvas labels
  "unit.side": "oldal",
  "unit.kmsz": "kmsz.",
  "unit.kmer": "kmér.",
  "canvas.current": "Áram",
  "canvas.iz": "Iz",
  "canvas.allowedDropV": "Megeng. fesz.esés",
  "canvas.minCrossSection": "Min. keresztm.",
  "canvas.calculatedCrossSection": "Szükséges min.",
  "canvas.recommendedCrossSection": "Javasolt",
  "reason.current": "áram alapján",
  "reason.voltageDrop": "feszültségesés alapján",
  "reason.grading": "lépcsőzetesség miatt",

  // Cable markings (drawing)
  "cable.kv04": "0,4kV",
  "cable.uhe": "ÜH-E",
} as const;

export type TranslationKey = keyof typeof hu;

const en: Record<TranslationKey, string> = {
  // Toolbar
  "toolbar.move": "Move",
  "toolbar.wire": "Wire",
  "toolbar.addElement": "Add element",
  "toolbar.addCabinet": "Feeder Pillar (FP)",
  "toolbar.calculate": "Calculate",
  "toolbar.autoLayout": "Auto-layout",

  // Menu
  "menu.new": "New",
  "menu.open": "Open",
  "menu.save": "Save",
  "menu.pdf": "PDF",
  "menu.legend": "Legend",
  "menu.confirmNew":
    "Start a new drawing? Your current unsaved work may be lost.",
  "menu.errorOpen": "Could not open the file.",
  "menu.errorPdf": "Could not export the PDF.",

  // Legend / abbreviations
  "legend.title": "Legend",
  "legend.subtitle": "Abbreviations and symbols used on the drawing.",
  "legend.elements": "Elements",
  "legend.cables": "Cables",
  "legend.values": "Calculated values",
  "legend.units": "Units and markers",
  "legend.asz": "Transformer",
  "legend.fm": "Planned ground-mounted meter cabinet",
  "legend.fe": "Main distributor",
  "legend.esz": "Planned ground-mounted distribution cabinet",
  "legend.cable04": "Planned 0.4 kV underground cable",
  "legend.cableUhe": "Planned 0.4 kV underground cable",
  "legend.iz": "Calculated short-circuit current",
  "legend.loop": "Loop impedance",
  "legend.drop": "Voltage drop",
  "legend.kmsz": "Chainage / kilometre position",
  "legend.side": "Cabinet side (left / right)",

  // App name + welcome
  "app.name": "LV Network Design & Sizing Tool",
  "welcome.subtitle":
    "Distribution network design and sizing. Start a new project or open a saved one.",
  "welcome.newProject": "New project",
  "welcome.openProject": "Open project from file",
  "welcome.tip": "Tip: use the top-left toolbar to add elements.",
  "welcome.language": "Language",

  // Sidebar
  "sidebar.properties": "Properties",

  // Common fields
  "field.name": "Name",
  "field.label": "Name",
  "field.position": "Position (chainage)",
  "field.positionPlaceholder": "e.g. M1 42+963 km",
  "field.tag": "Designation (outgoing)",
  "field.side": "Side",
  "field.choose": "Select...",
  "side.left": "Left",
  "side.right": "Right",

  // Element display names — abbreviations used on the drawing
  "node.asz.name": "US",
  "node.fm.name": "MM",
  "node.fe.name": "MD",
  "cabinet.defaultLabel": "FP",

  // Cabinet
  "cabinet.title": "Feeder Pillar",
  "cabinet.devices": "Equipment / Current [A]",
  "cabinet.noDevices": "No equipment",
  "cabinet.nameAria": "Cabinet name",
  "cabinet.renameTitle": "Click to rename",
  "common.new": "New",
  "device.type": "Type",
  "device.km": "chainage (e.g. 41+940)",
  "tag.autoHint": "If left empty, auto:",
  "tag.noneHint": "If left empty, nothing is shown (no outgoing cable).",
  "tag.placeholderNone": "no outgoing direction",

  // Calculated values
  "calc.title": "Calculated values",
  "calc.current": "Current [A]",
  "calc.totalCurrent": "Total current [A]",
  "calc.voltageDrop": "Voltage drop",
  "calc.loopImpedance": "Loop imp.",
  "calc.iz": "Isc [A]",
  "calc.maxFuse": "Max fuse [A]",

  // Utility supply
  "asz.title": "Utility Supply (US)",
  "asz.phaseMode": "Phase mode",
  "asz.phase3": "Three-phase (400 V)",
  "asz.phase1": "Single-phase (230 V)",
  "asz.voltage": "Mains voltage (V)",
  "asz.scPower": "Short-circuit power (MVA)",
  "asz.allowedDrop": "Allowed voltage drop ε [%]",
  "asz.useDesignCurrent": "Use design current",
  "asz.useDesignCurrentHint":
    "Cable currents become the downstream device total × safety factor / number of phases. When off, entered currents are summed as-is.",
  "asz.designCurrentSafetyFactor": "Design current safety factor",
  "asz.designCurrentSafetyFactorHint": "Default: 1.2.",
  "asz.maxCurrentDensity": "Max. current density [A/mm²]",
  "asz.maxCurrentDensityHint":
    "Thermal floor for cross-section recommendations. Default: 2 A/mm². Set to 0 to disable.",

  // Node titles
  "node.fm": "Main Meter (MM)",
  "node.fe": "Main Distributor (MD)",
  "node.feed": "Main Meter (MM)",

  // Cable
  "cable.title": "Cable",
  "cable.name": "Cable name / designation",
  "cable.namePlaceholder": "e.g. C1-1",
  "cable.length": "Cable length [m]",
  "cable.allowedDrop": "Allowed voltage drop ε [%]",
  "cable.allowedDropHint":
    "Leave empty to use the global utility-supply value.",
  "cable.allowedDropV": "Allowed reference voltage drop ε [V]",
  "cable.skipDesignCurrentFactor": "Design current without safety factor",
  "cable.skipDesignCurrentFactorHint":
    "This cable uses the raw downstream device total, without the safety factor.",
  "cable.resistivity": "Aluminium resistivity Ω mm² / m",
  "cable.crossSection": "Selected cable cross-section [mm²]",
  "cable.parallelCount": "Parallel",
  "cable.minCrossSection": "Required minimum cross-section [mm²]",
  "cable.recommendedCrossSection": "Recommended cable cross-section [mm²]",
  "cable.dropV": "Selected cable voltage drop ε [V]",
  "cable.dropPercent": "Selected cable voltage drop ε [%]",
  "cable.impedance": "Calculated loop impedance [Ω]",
  "cable.iz": "Calculated short-circuit current (Isc) [A]",

  // PDF export field visibility
  "pdf.fieldsTitle": "Displayed values",
  "pdf.fieldsHint": "Ticked lines appear on the diagram and in the PDF export.",
  "pdf.fieldDimensions": "Size (length · mm²)",

  // Units / canvas labels
  "unit.side": "side",
  "unit.kmsz": "km",
  "unit.kmer": "km",
  "canvas.current": "Current",
  "canvas.iz": "Isc",
  "canvas.allowedDropV": "Allowed drop",
  "canvas.minCrossSection": "Min. cross-sec.",
  "canvas.calculatedCrossSection": "Required min.",
  "canvas.recommendedCrossSection": "Recommended",
  "reason.current": "based on current",
  "reason.voltageDrop": "based on voltage drop",
  "reason.grading": "due to grading",

  // Cable markings (drawing)
  "cable.kv04": "0.4kV",
  "cable.uhe": "LV-D",
};

export const translations: Record<Language, Record<TranslationKey, string>> = {
  hu,
  en,
};

/** Translate a key for an explicit language (use outside React / in helpers). */
export function translate(language: Language, key: TranslationKey): string {
  return translations[language][key] ?? hu[key] ?? key;
}

/**
 * Replace a drawing abbreviation when it is not part of a longer word.
 * Digits and punctuation stay (ESZ1-3 → FP1-3, FE1.1 → MD1.1); FEED is left
 * alone because a letter follows.
 */
function replaceAbbrev(text: string, from: string, to: string): string {
  const re = new RegExp(`(?<!\\p{L})${from}(?!\\p{L})`, "gu");
  return text.replace(re, to);
}

/**
 * Localize well-known Hungarian (and English) drawing abbreviations in a
 * stored label or tag, without rewriting the saved project data.
 * Custom text that is not one of these abbreviations is left untouched.
 */
export function localizeDiagramText(text: string, language: Language): string {
  if (!text) return text;
  if (text === "Új szekrény") {
    return translate(language, "cabinet.defaultLabel");
  }
  if (language === "en") {
    return replaceAbbrev(
      replaceAbbrev(
        replaceAbbrev(
          replaceAbbrev(text, "ÁSZ", translate("en", "node.asz.name")),
          "ESZ",
          translate("en", "cabinet.defaultLabel"),
        ),
        "FM",
        translate("en", "node.fm.name"),
      ),
      "FE",
      translate("en", "node.fe.name"),
    );
  }
  return replaceAbbrev(
    replaceAbbrev(
      replaceAbbrev(
        replaceAbbrev(text, "US", translate("hu", "node.asz.name")),
        "FP",
        translate("hu", "cabinet.defaultLabel"),
      ),
      "MM",
      translate("hu", "node.fm.name"),
    ),
    "MD",
    translate("hu", "node.fe.name"),
  );
}

/** Hook returning a `t(key)` function bound to the current language. */
export function useT(): (key: TranslationKey) => string {
  const language = useSettingsStore((s) => s.language);
  return (key) => translate(language, key);
}

/** Hook that localizes stored drawing abbreviations for display. */
export function useDiagramText(): (raw: string) => string {
  const language = useSettingsStore((s) => s.language);
  return (raw) => localizeDiagramText(raw, language);
}

/**
 * Localize a node's display name. Stored labels stay as saved (usually the
 * Hungarian defaults); only the well-known abbreviations (ÁSZ / FM / FE / ESZ
 * and the new-cabinet placeholder) are rewritten for the active language.
 */
export function useElementName(): (
  raw: string,
  kind?: "asz" | "fm" | "fe" | "cabinet",
) => string {
  const language = useSettingsStore((s) => s.language);
  return (raw, kind) => {
    if (!raw) {
      if (kind === "asz") return translate(language, "node.asz.name");
      if (kind === "fm") return translate(language, "node.fm.name");
      if (kind === "fe") return translate(language, "node.fe.name");
      if (kind === "cabinet") return translate(language, "cabinet.defaultLabel");
    }
    return localizeDiagramText(raw, language);
  };
}

/** Translate a stored side value ("bal" / "jobb") into the active language. */
export function useSideLabel(): (side: string) => string {
  const language = useSettingsStore((s) => s.language);
  return (side) => {
    if (side === "bal") return translate(language, "side.left").toLowerCase();
    if (side === "jobb") return translate(language, "side.right").toLowerCase();
    return side;
  };
}
