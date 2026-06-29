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
};

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
};

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

/** Cable properties for edges (aluminium only, per UHK Excel) */
export type CableEdgeData = {
  /** Cable length [m] */
  length: number;
  /** Chosen cross-section [mm²] */
  crossSection: number;
  /**
   * Allowed voltage drop ε [%] for sizing THIS cable's minimum cross-section.
   * When undefined, the global value from the ÁSZ node is used.
   */
  allowedVoltageDropPercent?: number;
  // Calculated values
  /** Total current flowing through [A] */
  current?: number;
  /** Allowed reference voltage drop é [V] used to size the min cross-section */
  allowedVoltageDropV?: number;
  /** Required minimum cross-section [mm²] */
  requiredCrossSection?: number;
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
};
