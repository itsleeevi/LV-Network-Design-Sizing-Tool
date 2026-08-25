/** Device in a cabinet with its current draw */
export type Device = {
  type: string; // e.g. "AID-4", "VJT-Q", "AID-F", "AID-P"
  current: number; // Amperes
  /** Optional chainage / position marker, e.g. "41+940" (shown as "(41+940 kmsz.)") */
  kmMarker?: string;
};

/** Cabinet (ESZ - Elosztó Szekrény) node data */
export type CabinetNodeData = {
  label: string;
  /** Chainage / position marker, e.g. "41+947" (shown as "M1 41+947 kmsz.") */
  kmMarker: string;
  side: "bal" | "jobb" | "";
  /** Designation tag, e.g. "-ESZ3-7". When empty, auto-derived as "-" + label. */
  tag?: string;
  /** List of devices in this cabinet with their currents */
  devices: Device[];
  // Calculated values (filled by engine)
  /** Sum of device currents in this cabinet */
  ownCurrent?: number;
  /** Total current flowing through (own + downstream) */
  totalCurrent?: number;
  /** Cumulative loop impedance from source [Ω] */
  loopImpedance?: number;
  /** Short-circuit current at this point [A] */
  shortCircuitCurrent?: number;
  /** Cumulative voltage drop to this point [%] */
  cumulativeVoltageDrop?: number;
  /** Cumulative voltage drop to this point [V] */
  cumulativeVoltageDropV?: number;
  /** Allowed cumulative voltage drop [%] (the ÁSZ node's global ε), for display alongside cumulativeVoltageDrop. */
  cumulativeVoltageDropLimit?: number;
  /**
   * Suggested maximum fuse rating at this point [A] (Excel summary block
   * "Bizt" row: shortCircuitCurrent / FUSE_CURRENT_DIVISOR). A larger fuse
   * than this may not trip reliably on a fault this far from the source.
   */
  maxFuseRating?: number;
};

/**
 * Divisor applied to the short-circuit current to get a rule-of-thumb
 * maximum fuse rating (Excel "Bizt" row, e.g. `+U6/8`).
 */
export const FUSE_CURRENT_DIVISOR = 8;

/**
 * Phase mode for the whole network.
 * - "3F": three-phase (400 V, √3 factor) — the "1. körzet" / "3F" Excel sheets.
 * - "1F": single-phase (230 V, 2-conductor factor) — the "1F" Excel sheet.
 */
export type PhaseMode = "1F" | "3F";

/** ÁSZ (Áramszolgáltató) node data */
export type AszNodeData = {
  title: string;
  /** Grid short-circuit power [MVA] - typically 500 */
  shortCircuitPower: number;
  /** System voltage [V] - typically 400 (3-phase) or 230 (1-phase) */
  voltage: number;
  /** Allowed voltage drop [%] - typically 4% */
  allowedVoltageDrop: number;
  /** Single-phase ("1F") vs three-phase ("3F"). Defaults to "3F". */
  phaseMode?: PhaseMode;
  /**
   * When true, cable currents are design currents ("mértékadó áram"): the
   * downstream raw device total × designCurrentSafetyFactor / number of
   * phases (the Rack workbook's G column, e.g. `+G24*(1.2)/3`). Off by
   * default so projects with pre-derived currents keep their numbers.
   */
  useDesignCurrent?: boolean;
  /**
   * Safety factor applied to raw device totals in design-current mode.
   * Defaults to DESIGN_CURRENT_SAFETY_FACTOR (1.2, the Rack workbook's
   * factor) when unset, but is editable per project.
   */
  designCurrentSafetyFactor?: number;
  /**
   * Thermal sizing floor [A/mm²]: every cable's recommended (and számított)
   * cross-section is at least I / maxCurrentDensity. Defaults to
   * DEFAULT_MAX_CURRENT_DENSITY_A_PER_MM2. Set to 0 to disable. This is a
   * simple current-density rule, not a full ampacity table (installation /
   * soil / grouping are not modelled).
   */
  maxCurrentDensity?: number;
};

/** Safety factor applied to raw device totals in design-current mode. */
export const DESIGN_CURRENT_SAFETY_FACTOR = 1.2;

/**
 * Default thermal current-density floor [A/mm²] for aluminium UHK cables.
 * Not a verified ampacity rating; a tunable rule of thumb so a short trunk
 * carrying the whole network cannot grade down to a branch-sized section.
 */
export const DEFAULT_MAX_CURRENT_DENSITY_A_PER_MM2 = 2;

/** FM (Főmérő - Main Meter) node data */
export type FmNodeData = {
  label: string;
  kmMarker: string;
  side: "bal" | "jobb" | "";
  description: string;
};

/** FE (Főelosztó - Main Distribution) node data */
export type FeNodeData = {
  label: string;
  kmMarker: string;
  side: "bal" | "jobb" | "";
  description: string;
};

/** Feed/bus tap node data */
export type FeedNodeData = {
  label?: string;
};

/**
 * What determined a cable's `networkRequiredCrossSection`: the thermal
 * current-density floor ("áram"), or its own or the network's voltage drop
 * ("feszültségesés").
 */
export type CrossSectionReason = "current" | "voltageDrop";

/** Cable properties for edges (aluminium only, per UHK Excel) */
export type CableEdgeData = {
  /** Cable identifier/name, e.g. "K1-1" (the Excel "Megnevezés" / D column) */
  name?: string;
  /** Cable length [m] */
  length: number;
  /** Chosen cross-section [mm²] of each parallel run */
  crossSection: number;
  /**
   * Number of identical cables run in parallel on this segment (1 = single
   * cable). Effective area is crossSection × parallelCount, so voltage drop
   * and loop impedance scale as 1/n. Defaults to 1 when unset.
   */
  parallelCount?: number;
  /**
   * Allowed voltage drop ε [%] for sizing THIS cable's minimum cross-section.
   * When undefined, the global value from the ÁSZ node is used.
   */
  allowedVoltageDropPercent?: number;
  /**
   * Which detail lines are shown for this cable, both on the canvas label and
   * in the PDF export. A missing flag falls back to CABLE_PDF_FIELD_DEFAULTS.
   */
  pdfFields?: Partial<Record<CablePdfFieldKey, boolean>>;
  /**
   * When the ÁSZ node's design-current mode is on, this cable still carries
   * the raw downstream device total instead of being scaled by the safety
   * factor (the Rack workbook's K1-5 row, e.g. `+G9` with no ×1.2/3). Has no
   * effect when design-current mode is off. Off by default.
   */
  skipDesignCurrentFactor?: boolean;
  // Calculated values
  /** Total current flowing through [A] */
  current?: number;
  /** Allowed reference voltage drop é [V] used to size the min cross-section */
  allowedVoltageDropV?: number;
  /**
   * Required minimum cross-section [mm²] from this cable's own voltage drop
   * alone (Excel per-cable column). Continuous, not a standard size.
   */
  requiredCrossSection?: number;
  /**
   * Required minimum cross-section [mm²] with the rest of the network and the
   * thermal current-density floor accounted for: the largest of
   * `requiredCrossSection`, the thinnest this cable could be (others at their
   * recommended sizes) before a cabinet downstream exceeds the allowed
   * cumulative drop, and I / ÁSZ maxCurrentDensity when that density is on.
   * Continuous, not a standard size. This is the figure the recommendation
   * rounds up from, so it can still sit below `recommendedCrossSection` when
   * grading is what drives that instead. Undefined when the cable carries no
   * load.
   */
  networkRequiredCrossSection?: number;
  /**
   * Which requirement was largest (and so determined `networkRequiredCrossSection`):
   * the thermal current-density floor, or either voltage-drop term. Shown in
   * brackets next to the figure on the wire label.
   */
  networkRequiredCrossSectionReason?: CrossSectionReason;
  /** Standard cross-section [mm²] to install; the recommendation. */
  recommendedCrossSection?: number;
  /**
   * True when lépcsőzetesség (grading, being fed at least as large as the
   * largest cable it feeds) is the sole reason `recommendedCrossSection` sits
   * above `nextStandardCrossSection(networkRequiredCrossSection)`.
   */
  recommendedGradedUp?: boolean;
  /** Cable resistance [Ω] */
  resistance?: number;
  /** Cable reactance [Ω] */
  reactance?: number;
  /** Cable impedance [Ω] */
  impedance?: number;
  /** Voltage drop [V] */
  voltageDropV?: number;
  /** Voltage drop [%] */
  voltageDropPercent?: number;
  /** Short-circuit current at the cable's end [A] = 230 / impedance (Excel "Iz") */
  shortCircuitCurrent?: number;
};

/**
 * Calculated cable values that can be toggled on/off. The order here is the
 * order they appear both in the properties checkbox list and on the wire label.
 */
export type CablePdfFieldKey =
  | "name"
  | "dimensions"
  | "current"
  | "allowedVoltageDropV"
  | "requiredCrossSection"
  | "voltageDropV"
  | "voltageDropPercent"
  | "impedance"
  | "shortCircuit";

/**
 * Whether each value is shown by default (on the canvas and in the PDF). All
 * values start hidden; enable the ones you want per cable.
 */
export const CABLE_PDF_FIELD_DEFAULTS: Record<CablePdfFieldKey, boolean> = {
  name: false,
  dimensions: false,
  current: false,
  allowedVoltageDropV: false,
  requiredCrossSection: false,
  voltageDropV: false,
  voltageDropPercent: false,
  impedance: false,
  shortCircuit: false,
};

/** Standard cable cross-sections (mm²) */
export const CABLE_CROSS_SECTIONS = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300,
] as const;

/**
 * Aluminium cable — fixed material for all UHK calculations (Excel M2).
 * ρ = specific resistivity in Ω·mm²/m at 20 °C.
 */
export const ALUMINIUM_CABLE = {
  name: "Alumínium",
  symbol: "Al",
  resistivityOhmMm2PerM: 0.0286,
  temperatureC: 20,
} as const;

/** Used in all cable / loop impedance formulas */
export const CABLE_RESISTIVITY = ALUMINIUM_CABLE.resistivityOhmMm2PerM;

/** Common device types with typical currents */
export const COMMON_DEVICES = [
  { type: "AID-4", current: 0.43 },
  { type: "VJT-Q", current: 1.5 },
  { type: "AID-F", current: 0.43 },
  { type: "AID-P", current: 12.6 },
] as const;

/** Default values for new nodes */
export const DEFAULT_CABINET_DATA: CabinetNodeData = {
  label: "Új szekrény",
  kmMarker: "",
  side: "",
  devices: [],
};

export const DEFAULT_ASZ_DATA: AszNodeData = {
  title: "ÁSZ",
  shortCircuitPower: 500,
  voltage: 400,
  allowedVoltageDrop: 4,
  phaseMode: "3F",
  useDesignCurrent: false,
  maxCurrentDensity: DEFAULT_MAX_CURRENT_DENSITY_A_PER_MM2,
};

export const DEFAULT_FM_DATA: FmNodeData = {
  label: "FM",
  kmMarker: "",
  side: "",
  description: "",
};

export const DEFAULT_FE_DATA: FeNodeData = {
  label: "FE",
  kmMarker: "",
  side: "",
  description: "",
};

export const DEFAULT_CABLE_DATA: CableEdgeData = {
  length: 0,
  crossSection: 25,
  parallelCount: 1,
};

/** Allowed parallel-cable multipliers shown in the property editor. */
export const CABLE_PARALLEL_COUNTS = [1, 2, 3, 4, 5, 6] as const;
