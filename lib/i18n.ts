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
  "calc.voltageDrop": "Fesz esés",
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
  "asz.allowedDrop": "Megengedett fesz esés ε [%]",
  "asz.useDesignCurrent": "Mértékadó áram számítása",
  "asz.useDesignCurrentHint":
    "A kábelek árama a mögöttes berendezések összárama × 1,2 / fázisok száma. Kikapcsolva a beírt áramok változatlanul összegződnek.",

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
  "cable.allowedDropV": "Megengedett mértékadó feszültségesés é [V]",
  "cable.resistivity": "AL fajlagos ellenállása Ω mm² / m",
  "cable.crossSection": "Választott kábel keresztmetszete [mm²]",
  "cable.minCrossSection": "Szükséges minimális keresztmetszet [mm²]",
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

  // Cable markings (drawing)
  "cable.kv04": "0.4kV",
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
  "legend.units": "Units & markers",
  "legend.asz": "Transformer",
  "legend.fm": "Planned ground-mounted meter cabinet",
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
  "calc.iz": "Iz [A]",
  "calc.maxFuse": "Max fuse [A]",

  // ÁSZ
  "asz.title": "Utility Supply",
  "asz.phaseMode": "Phase mode",
  "asz.phase3": "Three-phase (3F · 400 V)",
  "asz.phase1": "Single-phase (1F · 230 V)",
  "asz.voltage": "Mains voltage (V)",
  "asz.scPower": "Short-circuit power (MVA)",
  "asz.allowedDrop": "Allowed voltage drop ε [%]",
  "asz.useDesignCurrent": "Use design current",
  "asz.useDesignCurrentHint":
    "Cable currents become the downstream device total × 1.2 / number of phases. When off, entered currents are summed as-is.",

  // Node titles
  "node.fm": "Main Meter (MM)",
  "node.fe": "Main Distributor (FE)",
  "node.feed": "Main Meter (MM)",

  // Cable
  "cable.title": "Cable",
  "cable.name": "Cable name / designation",
  "cable.namePlaceholder": "e.g. K1-1",
  "cable.length": "Cable length [m]",
  "cable.allowedDrop": "Allowed voltage drop ε [%]",
  "cable.allowedDropHint": "Leave empty to use the global ÁSZ value.",
  "cable.allowedDropV": "Allowed reference voltage drop é [V]",
  "cable.resistivity": "AL resistivity Ω mm² / m",
  "cable.crossSection": "Selected cable cross-section [mm²]",
  "cable.minCrossSection": "Required minimum cross-section [mm²]",
  "cable.dropV": "Selected cable voltage drop ε [V]",
  "cable.dropPercent": "Selected cable voltage drop ε [%]",
  "cable.impedance": "Calculated loop impedance (Rh) [Ω]",
  "cable.iz": "Calculated short-circuit current (Iz) [A]",

  // PDF export field visibility
  "pdf.fieldsTitle": "Displayed values",
  "pdf.fieldsHint": "Ticked lines appear on the diagram and in the PDF export.",
  "pdf.fieldDimensions": "Size (length · mm²)",

  // Units / canvas labels
  "unit.side": "side",
  "unit.kmsz": "km",
  "unit.kmer": "km",
  "canvas.current": "Current",
  "canvas.iz": "Iz",
  "canvas.allowedDropV": "Allowed drop",
  "canvas.minCrossSection": "Min. cross-sec.",

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

/** Hook returning a `t(key)` function bound to the current language. */
export function useT(): (key: TranslationKey) => string {
  const language = useSettingsStore((s) => s.language);
  return (key) => translate(language, key);
}

/**
 * Localize a node's display name. Custom user labels are returned untouched;
 * only the well-known default labels (ÁSZ / FM / new cabinet) are translated so
 * switching language updates them live without rewriting stored data.
 */
export function useElementName(): (
  raw: string,
  kind: "asz" | "fm" | "cabinet",
) => string {
  const language = useSettingsStore((s) => s.language);
  return (raw, kind) => {
    if (kind === "asz" && raw === "ÁSZ")
      return translate(language, "node.asz.name");
    if (kind === "fm" && (raw === "FM" || raw === ""))
      return translate(language, "node.fm.name");
    if (kind === "cabinet" && raw === "Új szekrény")
      return translate(language, "cabinet.defaultLabel");
    return raw;
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
