import type { Edge, Node } from "@xyflow/react";
import type {
  AszNodeData,
  CabinetNodeData,
  CableEdgeData,
  PhaseMode,
} from "@/types/electrical";
import {
  CABLE_RESISTIVITY,
  DESIGN_CURRENT_SAFETY_FACTOR,
  FUSE_CURRENT_DIVISOR,
} from "@/types/electrical";
import {
  PHASE_VOLTAGE,
  calculateAllowedVoltageDropV,
  effectiveCrossSection,
  resolveParallelCount,
  runCalculations,
} from "@/lib/calculations";
import { buildNetworkTree, type NetworkTree } from "@/lib/downstream";
import { localizeDiagramText, translate } from "@/lib/i18n";
import type { Translate } from "@/lib/cable-label";
import { formatCalc, formatNumber } from "@/lib/utils";
import type { Language } from "@/store/settings-store";

/**
 * One calculated value, written out the way a reviewer checks it by hand:
 * the formula, the formula with this element's inputs substituted, and the
 * result. Results always come from a fresh `runCalculations` run, never from
 * re-deriving the formula here, so a formula text that disagrees with the
 * engine shows up as a visible mismatch instead of being hidden.
 */
export type CalcStep = {
  key: string;
  label: string;
  formula: string;
  substitution?: string;
  result: string;
  note?: string;
};

export type CalcExplanation = {
  steps: CalcStep[];
  /** The values stored on the element differ from a fresh calculation. */
  stale: boolean;
};

type Context = {
  nodes: Node[];
  edges: Edge[];
  tree: NetworkTree;
  source: AszNodeData;
  phaseMode: PhaseMode;
  voltage: number;
  allowedPercent: number;
  t: Translate;
  language: Language;
};

function buildContext(
  nodes: Node[],
  edges: Edge[],
  t: Translate,
  language: Language,
): Context | null {
  const sourceNode = nodes.find((n) => n.type === "asz");
  if (!sourceNode) return null;
  const source = sourceNode.data as AszNodeData;
  const phaseMode = source.phaseMode ?? "3F";
  return {
    nodes,
    edges,
    tree: buildNetworkTree(nodes, edges),
    source,
    phaseMode,
    voltage: source.voltage || (phaseMode === "1F" ? 230 : 400),
    allowedPercent: source.allowedVoltageDrop || 4,
    t,
    language,
  };
}

function sameNumber(a: number | undefined, b: number | undefined): boolean {
  return Math.abs((a ?? 0) - (b ?? 0)) <= 1e-9 * Math.max(1, Math.abs(b ?? 0));
}

/** Raw device total of `nodeId` and everything downstream of it [A]. */
function rawDownstreamCurrent(ctx: Context, nodeId: string): number {
  const node = ctx.nodes.find((n) => n.id === nodeId);
  const own =
    node?.type === "cabinet"
      ? ((node.data as CabinetNodeData).devices || []).reduce(
          (sum, d) => sum + (d.current || 0),
          0,
        )
      : 0;
  return (ctx.tree.children.get(nodeId) || []).reduce(
    (sum, childId) => sum + rawDownstreamCurrent(ctx, childId),
    own,
  );
}

function nodeLabel(ctx: Context, nodeId: string): string {
  const data = ctx.nodes.find((n) => n.id === nodeId)?.data as
    | { label?: string; title?: string }
    | undefined;
  return localizeDiagramText(data?.label || data?.title || "?", ctx.language);
}

/** Edges from the source down to `nodeId`, in path order. */
function pathEdges(ctx: Context, nodeId: string): Edge[] {
  const path: Edge[] = [];
  let cur: string | null | undefined = nodeId;
  while (cur) {
    const edgeId = ctx.tree.parentEdge.get(cur);
    const edge = edgeId ? ctx.edges.find((e) => e.id === edgeId) : undefined;
    if (edge) path.unshift(edge);
    cur = ctx.tree.parent.get(cur);
  }
  return path;
}

function cableName(ctx: Context, edge: Edge): string {
  const name = (edge.data as CableEdgeData | undefined)?.name;
  if (name) return localizeDiagramText(name, ctx.language);
  const child =
    ctx.tree.parentEdge.get(edge.target) === edge.id ? edge.target : edge.source;
  const parent = ctx.tree.parent.get(child);
  return `${parent ? nodeLabel(ctx, parent) : "?"}–${nodeLabel(ctx, child)}`;
}

function allowedDropSteps(
  ctx: Context,
  percent: number,
): { formula: string; substitution: string } {
  const n = (v: number, d = 4) => formatNumber(v, ctx.language, d);
  const eps = n(percent / 100);
  return ctx.phaseMode === "1F"
    ? { formula: "é = U × ε / 2", substitution: `${n(ctx.voltage)} × ${eps} / 2` }
    : {
        formula: `é = ${n(0.75)} × U × ε / √3`,
        substitution: `${n(0.75)} × ${n(ctx.voltage)} × ${eps} / ${n(Math.sqrt(3), 3)}`,
      };
}

function explainCable(
  ctx: Context,
  stored: Edge,
  fresh: Edge,
): CalcExplanation {
  const { t, language } = ctx;
  const edgeId = stored.id;
  const d = (fresh.data ?? {}) as CableEdgeData;
  const old = (stored.data ?? {}) as CableEdgeData;
  const stale = !(
    sameNumber(old.current, d.current) &&
    sameNumber(old.voltageDropV, d.voltageDropV) &&
    sameNumber(old.impedance, d.impedance) &&
    sameNumber(old.recommendedCrossSection, d.recommendedCrossSection)
  );

  const n = (v: number, digits = 4) => formatNumber(v, language, digits);
  const r = (v: number | undefined) => formatCalc(v ?? 0, language);
  // Intermediate values carry more digits than results, so the substituted
  // formula reproduces the result when checked by hand.
  const s = (v: number | undefined) => formatNumber(v ?? 0, language, 5);
  const rho = n(CABLE_RESISTIVITY);
  const L = n(d.length || 0);
  const I = s(d.current);
  const parallel = resolveParallelCount(d.parallelCount);
  const area = effectiveCrossSection(d.crossSection || 25, parallel);
  const A = n(area);
  const steps: CalcStep[] = [];

  const child =
    ctx.tree.parentEdge.get(stored.target) === edgeId
      ? stored.target
      : stored.source;
  const raw = rawDownstreamCurrent(ctx, child);
  if (ctx.source.useDesignCurrent && !d.skipDesignCurrentFactor) {
    const k = ctx.source.designCurrentSafetyFactor ?? DESIGN_CURRENT_SAFETY_FACTOR;
    const phases = ctx.phaseMode === "3F" ? 3 : 1;
    steps.push({
      key: "current",
      label: t("calc.totalCurrent"),
      formula: phases > 1 ? "I = ΣI × k / 3" : "I = ΣI × k",
      substitution:
        phases > 1 ? `${n(raw)} × ${n(k)} / 3` : `${n(raw)} × ${n(k)}`,
      result: `${r(d.current)} A`,
      note: t("explain.designCurrent"),
    });
  } else {
    steps.push({
      key: "current",
      label: t("calc.totalCurrent"),
      formula: "I = ΣI",
      substitution: n(raw),
      result: `${r(d.current)} A`,
      note: d.skipDesignCurrentFactor
        ? t("explain.designCurrentSkipped")
        : t("explain.downstreamTotal"),
    });
  }

  if (parallel > 1) {
    steps.push({
      key: "area",
      label: t("explain.parallelArea"),
      formula: "A = n × A₁",
      substitution: `${parallel} × ${n(d.crossSection || 25)}`,
      result: `${A} mm²`,
    });
  }

  const cablePercent = d.allowedVoltageDropPercent ?? ctx.allowedPercent;
  steps.push({
    key: "allowed",
    label: t("cable.allowedDropV"),
    ...allowedDropSteps(ctx, cablePercent),
    result: `${r(d.allowedVoltageDropV)} V`,
    note:
      d.allowedVoltageDropPercent != null ? t("explain.cableOverride") : undefined,
  });

  steps.push({
    key: "minCrossSection",
    label: t("cable.minCrossSection"),
    formula: parallel > 1 ? "A_min = ρ × L × I / é / n" : "A_min = ρ × L × I / é",
    substitution:
      `${rho} × ${L} × ${I} / ${s(d.allowedVoltageDropV)}` +
      (parallel > 1 ? ` / ${parallel}` : ""),
    result: `${r(d.requiredCrossSection)} mm²`,
  });

  steps.push({
    key: "dropV",
    label: t("cable.dropV"),
    formula:
      ctx.phaseMode === "3F" ? "ΔU = √3 × ρ × L × I / A" : "ΔU = ρ × L × I / A",
    substitution:
      (ctx.phaseMode === "3F" ? `${n(Math.sqrt(3), 3)} × ` : "") +
      `${rho} × ${L} × ${I} / ${A}`,
    result: `${r(d.voltageDropV)} V`,
  });

  steps.push({
    key: "dropPercent",
    label: t("cable.dropPercent"),
    formula:
      ctx.phaseMode === "3F" ? "ΔU% = ΔU / U × 100" : "ΔU% = 2 × ΔU / U × 100",
    substitution:
      (ctx.phaseMode === "3F" ? "" : "2 × ") +
      `${s(d.voltageDropV)} / ${n(ctx.voltage)} × 100`,
    result: `${r(d.voltageDropPercent)} %`,
  });

  steps.push({
    key: "impedance",
    label: t("cable.impedance"),
    formula: "Rh = 2 × ρ × L / A",
    substitution: `2 × ${rho} × ${L} / ${A}`,
    result: `${r(d.impedance)} Ω`,
  });

  const isc = t("explain.symIsc");
  steps.push({
    key: "isc",
    label: t("cable.iz"),
    formula: `${isc} = ${PHASE_VOLTAGE} / Rh`,
    substitution: `${PHASE_VOLTAGE} / ${s(d.impedance)}`,
    result: `${r(d.shortCircuitCurrent)} A`,
  });

  if (d.recommendedCrossSection) {
    steps.push({
      key: "recommended",
      label: t("cable.recommendedCrossSection"),
      formula: t("explain.recommendedFormula"),
      result: `${n(d.recommendedCrossSection)} mm²`,
      note: t("explain.recommendedNote"),
    });
  }

  return { steps, stale };
}

function explainCabinet(
  ctx: Context,
  stored: Node,
  fresh: Node,
  freshEdges: Map<string, Edge>,
): CalcExplanation {
  const { t, language } = ctx;
  const nodeId = stored.id;
  const d = fresh.data as CabinetNodeData;
  const old = stored.data as CabinetNodeData;
  const stale = !(
    sameNumber(old.totalCurrent, d.totalCurrent) &&
    sameNumber(old.cumulativeVoltageDropV, d.cumulativeVoltageDropV) &&
    sameNumber(old.loopImpedance, d.loopImpedance)
  );

  const n = (v: number, digits = 4) => formatNumber(v, language, digits);
  const r = (v: number | undefined) => formatCalc(v ?? 0, language);
  const s = (v: number | undefined) => formatNumber(v ?? 0, language, 5);
  const sumOf = (values: string[]) => (values.length ? values.join(" + ") : "0");
  const steps: CalcStep[] = [];

  const devices = d.devices || [];
  steps.push({
    key: "ownCurrent",
    label: t("calc.current"),
    formula: "I = Σ I_dev",
    substitution: sumOf(devices.map((dev) => n(dev.current || 0))),
    result: `${r(d.ownCurrent)} A`,
  });

  const childTotals = (ctx.tree.children.get(nodeId) || []).map((id) =>
    rawDownstreamCurrent(ctx, id),
  );
  steps.push({
    key: "totalCurrent",
    label: t("calc.totalCurrent"),
    formula: "ΣI = I + Σ I_down",
    substitution: sumOf([n(d.ownCurrent ?? 0), ...childTotals.map((v) => n(v))]),
    result: `${r(d.totalCurrent)} A`,
    note: t("explain.totalCurrentNote"),
  });

  const path = pathEdges(ctx, nodeId)
    .map((e) => freshEdges.get(e.id) ?? e)
    .filter((e) => ((e.data as CableEdgeData | undefined)?.length ?? 0) > 0);
  const pathNote = `${t("explain.path")}: ${
    path.map((e) => cableName(ctx, e)).join(" → ") || "–"
  }`;
  const edgeValue = (e: Edge, key: "voltageDropV" | "impedance") =>
    s((e.data as CableEdgeData)[key]);

  steps.push({
    key: "dropV",
    label: `${t("calc.voltageDrop")} [V]`,
    formula: "ΣΔU = ΔU₁ + ΔU₂ + …",
    substitution: sumOf(path.map((e) => edgeValue(e, "voltageDropV"))),
    result: `${r(d.cumulativeVoltageDropV)} V`,
    note: pathNote,
  });

  const allowedV = calculateAllowedVoltageDropV(
    ctx.voltage,
    ctx.allowedPercent,
    ctx.phaseMode,
  );
  const allowed = allowedDropSteps(ctx, ctx.allowedPercent);
  steps.push({
    key: "dropPercent",
    label: `${t("calc.voltageDrop")} [%]`,
    formula: "ΔU% = ΣΔU / é × 100",
    substitution: `${s(d.cumulativeVoltageDropV)} / ${s(allowedV)} × 100`,
    result: `${r(d.cumulativeVoltageDrop)} %`,
    note: `${allowed.formula} = ${allowed.substitution} = ${r(allowedV)} V. ${t(
      "explain.sharePercentNote",
    )}`,
  });

  steps.push({
    key: "impedance",
    label: t("calc.loopImpedance"),
    formula: "ΣRh = Rh₁ + Rh₂ + …",
    substitution: sumOf(path.map((e) => edgeValue(e, "impedance"))),
    result: `${r(d.loopImpedance)} Ω`,
    note: pathNote,
  });

  const isc = t("explain.symIsc");
  steps.push({
    key: "isc",
    label: t("calc.iz"),
    formula: `${isc} = ${PHASE_VOLTAGE} / ΣRh`,
    substitution: `${PHASE_VOLTAGE} / ${s(d.loopImpedance)}`,
    result: `${r(d.shortCircuitCurrent)} A`,
  });

  steps.push({
    key: "maxFuse",
    label: t("calc.maxFuse"),
    formula: `${t("explain.symFuse")} = ${isc} / ${FUSE_CURRENT_DIVISOR}`,
    substitution: `${s(d.shortCircuitCurrent)} / ${FUSE_CURRENT_DIVISOR}`,
    result: `${r(d.maxFuseRating)} A`,
  });

  return { steps, stale };
}

/**
 * Calculation steps for every cabinet and cable, keyed by node / edge id.
 * One calculation run serves the whole diagram; the last result is cached
 * because every cabinet and wire on the canvas asks for it independently.
 */
let cache:
  | {
      nodes: Node[];
      edges: Edge[];
      language: Language;
      result: Map<string, CalcExplanation>;
    }
  | null = null;

export function explainNetwork(
  nodes: Node[],
  edges: Edge[],
  language: Language,
): Map<string, CalcExplanation> {
  if (
    cache &&
    cache.nodes === nodes &&
    cache.edges === edges &&
    cache.language === language
  ) {
    return cache.result;
  }

  const result = new Map<string, CalcExplanation>();
  const ctx = buildContext(nodes, edges, (key) => translate(language, key), language);
  if (ctx) {
    const fresh = runCalculations(nodes, edges);
    const freshNodes = new Map(fresh.nodes.map((n) => [n.id, n]));
    const freshEdges = new Map(fresh.edges.map((e) => [e.id, e]));
    for (const node of nodes) {
      const freshNode = freshNodes.get(node.id);
      if (node.type === "cabinet" && freshNode) {
        result.set(node.id, explainCabinet(ctx, node, freshNode, freshEdges));
      }
    }
    for (const edge of edges) {
      const freshEdge = freshEdges.get(edge.id);
      if (freshEdge) result.set(edge.id, explainCable(ctx, edge, freshEdge));
    }
  }

  cache = { nodes, edges, language, result };
  return result;
}

/**
 * The compact one-line form shown on the canvas under a value:
 * "ΣΔU = 0,08441 + 3,55059". The formula's left-hand side names the value;
 * the substitution shows where the number comes from.
 */
function inlineStep(step: CalcStep): string | null {
  if (!step.substitution) return null;
  const lhs = step.formula.split(" = ")[0];
  return `${lhs} = ${step.substitution}`;
}

/** One canvas line under a value; `title` is the longer note (hover). */
export type CalcStepLine = { key: string; text: string; title?: string };

/** The canvas lines for the given steps of one element, in the order asked. */
export function calcStepLines(
  explanation: CalcExplanation,
  stepKeys: readonly string[],
): CalcStepLine[] {
  return stepKeys.flatMap((stepKey) => {
    const step = explanation.steps.find((s) => s.key === stepKey);
    const text = step && inlineStep(step);
    return text ? [{ key: `calc-${stepKey}`, text, title: step.note }] : [];
  });
}
