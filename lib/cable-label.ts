import type { CableEdgeData, CablePdfFieldKey } from "@/types/electrical";
import { CABLE_PDF_FIELD_DEFAULTS } from "@/types/electrical";
import type { TranslationKey } from "@/lib/i18n";
import { formatCalc, formatLocaleNumber, formatStandardSize } from "@/lib/utils";
import type { Language } from "@/store/settings-store";

export type Translate = (key: TranslationKey) => string;

/** One rendered line of a cable's on-canvas info box. */
export type CableLabelLine = {
  /** Stable React key. */
  key: string;
  text: string;
  /** Tailwind classes for this line, on top of the box's own styling. */
  className: string;
};

/**
 * The lines a cable's info box shows, in display order. Single source of truth
 * for both the rendered label (wire-edge) and the label-size estimate the
 * collision-avoiding placement pass needs, so the two can never drift apart.
 *
 * Every line except the cross-section recommendation is opt-in per cable via
 * `pdfFields`, falling back to CABLE_PDF_FIELD_DEFAULTS when untouched.
 */
export function getCableLabelLines(
  data: CableEdgeData | undefined,
  t: Translate,
  language: Language,
): CableLabelLine[] {
  if (!data || !(data.length > 0)) return [];

  const show = (key: CablePdfFieldKey) =>
    data.pdfFields?.[key] ?? CABLE_PDF_FIELD_DEFAULTS[key];

  const lines: CableLabelLine[] = [];
  const calc = "font-medium text-blue-600";

  if (show("name") && data.name) {
    lines.push({ key: "name", text: data.name, className: "font-semibold" });
  }

  if (show("dimensions")) {
    lines.push({
      key: "dimensions",
      text: `${data.length} m • ${t("cable.installedCrossSection")}: ${formatStandardSize(data.crossSection, language)} mm²`,
      className: "font-medium",
    });
  }

  // Always shown, as a named pair: what this cable needs and the standard
  // size that covers it. The recommendation is colour-coded so an undersized
  // cable stands out.
  const recommended = data.recommendedCrossSection;
  if (recommended != null && recommended > 0) {
    const needed = data.networkRequiredCrossSection;
    if (needed != null && needed > 0) {
      lines.push({
        key: "calculatedCrossSection",
        text: `${t("canvas.calculatedCrossSection")}: ${formatLocaleNumber(needed, language, 2)} mm²`,
        className: "font-medium text-blue-600",
      });
    }
    lines.push({
      key: "recommendedCrossSection",
      text: `${t("canvas.recommendedCrossSection")}: ${formatStandardSize(recommended, language)} mm²`,
      className:
        data.crossSection >= recommended
          ? "font-semibold text-green-600"
          : "font-semibold text-amber-600",
    });
  }

  if (show("current") && data.current != null && data.current > 0) {
    lines.push({
      key: "current",
      text: `${t("canvas.current")}: ${formatCalc(data.current)} A`,
      className: calc,
    });
  }

  if (
    show("allowedVoltageDropV") &&
    data.allowedVoltageDropV != null &&
    data.allowedVoltageDropV > 0
  ) {
    lines.push({
      key: "allowedVoltageDropV",
      text: `${t("canvas.allowedDropV")}: ${formatCalc(data.allowedVoltageDropV)} V`,
      className: calc,
    });
  }

  // Skipped when the always-on pair above already showed this same number, so
  // ticking the checkbox cannot print the value twice.
  if (
    show("requiredCrossSection") &&
    data.requiredCrossSection != null &&
    data.requiredCrossSection > 0 &&
    !lines.some((l) => l.key === "calculatedCrossSection")
  ) {
    lines.push({
      key: "requiredCrossSection",
      text: `${t("canvas.minCrossSection")}: ${formatCalc(data.requiredCrossSection)} mm²`,
      className: calc,
    });
  }

  if (show("voltageDropV") && data.voltageDropV != null && data.voltageDropV > 0) {
    lines.push({
      key: "voltageDropV",
      text: `${t("calc.voltageDrop")}: ${formatCalc(data.voltageDropV)} V`,
      className: calc,
    });
  }

  if (
    show("voltageDropPercent") &&
    data.voltageDropPercent != null &&
    data.voltageDropPercent > 0
  ) {
    lines.push({
      key: "voltageDropPercent",
      text: `${t("calc.voltageDrop")}: ${formatCalc(data.voltageDropPercent)} %`,
      className: calc,
    });
  }

  if (show("impedance") && data.impedance != null && data.impedance > 0) {
    lines.push({
      key: "impedance",
      text: `${t("calc.loopImpedance")}: ${formatCalc(data.impedance)} Ω`,
      className: calc,
    });
  }

  if (
    show("shortCircuit") &&
    data.shortCircuitCurrent != null &&
    data.shortCircuitCurrent > 0
  ) {
    lines.push({
      key: "shortCircuit",
      text: `${t("canvas.iz")}: ${formatCalc(data.shortCircuitCurrent)} A`,
      className: calc,
    });
  }

  return lines;
}

/** Font metrics of the info box (text-[9px] leading-tight, px-1.5 py-1). */
const LINE_HEIGHT = 11;
const CHAR_WIDTH = 5.4;
const PADDING_X = 15;
const PADDING_Y = 9;

/** Estimated rendered size of an info box, used for collision avoidance. */
export function estimateCableLabelSize(lines: CableLabelLine[]): {
  width: number;
  height: number;
} {
  if (lines.length === 0) return { width: 0, height: 0 };
  const longest = lines.reduce((m, l) => Math.max(m, l.text.length), 0);
  return {
    width: longest * CHAR_WIDTH + PADDING_X,
    height: lines.length * LINE_HEIGHT + PADDING_Y,
  };
}
