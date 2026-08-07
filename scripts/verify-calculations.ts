/**
 * Verification harness for the electrical calculation engine.
 *
 * It rebuilds the fully-computed three-phase ("3F") example from
 * `UHK szamitas pelda.xlsx` as a node/edge graph, runs the real
 * `runCalculations`, and asserts every output matches the values that
 * Excel itself computed (read straight out of the spreadsheet's cached
 * formula results).
 *
 * Excel 3F reference (cables K3 and K4 are the only ones with a length,
 * so they are the only fully-computed rows):
 *
 *   K4 (row 6): L=130 m, A=25 mm², I=6 A
 *     J (allowed ΔU)       = 6.9282032 V
 *     K (required A_min)   = 3.2198825 mm²
 *     N (ΔU)               = 1.5455436 V
 *     O (ΔU%)              = 0.3863859 %
 *     P (loop impedance)   = 0.29744   Ω
 *     Q (short-circuit Iz) = 773.26520 A
 *
 *   K3 (row 9): L=200 m, A=25 mm², I=12 A
 *     J = 6.9282032 V
 *     K = 9.9073306 mm²
 *     N = 4.7555187 V
 *     O = 1.1888797 %
 *     P = 0.4576    Ω
 *     Q = 502.62238 A
 *
 * Topology: ASZ -> [K3] -> ESZ3 -> [K4] -> ESZ4
 *   ESZ4 own load: Véda 5A + Lidar 1A = 6A
 *   ESZ3 own load: TXT 6A   (plus child ESZ4 -> total 12A)
 *
 * Per-cabinet loop impedance and Iz follow the summary block of the
 * "1. körzet" sheets (the upper-right "Hurok IMP" / "Iz [A]" rows): the
 * cabinet's Rh is the SUM of the per-cable Rh values along the path back to
 * the source (e.g. `+P10+P29+P42` in `UHK szamitas pelda.xlsx`), and
 * Iz = 230 / that sum. Per-cable Rh / Iz (the cable rows' P/Q columns, Q/R in
 * the Rack workbook) stay per-segment on the edges.
 *
 * Known-bad reference cells: in `examples/UHK szamitas_Rack_v1.xlsx` an
 * inserted "Áram összesen" column shifted the cable rows' calculated columns
 * one to the right (Rh moved from P to Q), but the summary "Hurok IMP" row
 * (U5:Z5) kept summing column P, so it actually reports cumulative voltage
 * drop in percent, and the "Iz [A]" row below it (U6:Z6 = 230/U5...) is wrong
 * too. Do NOT verify against those cells; the expected cumulative values
 * below are sums of the (correct) per-cable Q-column cells, following the
 * formula pattern the older workbook's summary block uses correctly.
 *
 * The summary block's "Bizt" row (suggested max fuse rating, `+U6/8` etc.) is
 * downstream of that same broken "Iz [A]" row, so it inherits the bug too.
 * The expected values below are the correct cumulative Iz / 8 instead.
 */
import type { Node, Edge } from "@xyflow/react";
import { runCalculations } from "@/lib/calculations";
import type {
  CableEdgeData,
  CabinetNodeData,
  Device,
} from "@/types/electrical";
import { DEFAULT_ASZ_DATA } from "@/types/electrical";

const TOL = 1e-3; // absolute tolerance (Excel values are rounded for display)

let failures = 0;

function approx(actual: number | undefined, expected: number, label: string) {
  const a = actual ?? NaN;
  const ok = Math.abs(a - expected) <= TOL * Math.max(1, Math.abs(expected));
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(
    `  [${status}] ${label.padEnd(34)} expected=${expected
      .toFixed(5)
      .padStart(12)}  actual=${a.toFixed(5).padStart(12)}`,
  );
}

function buildGraph(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: "asz",
      type: "asz",
      position: { x: 0, y: 0 },
      data: { ...DEFAULT_ASZ_DATA, voltage: 400, allowedVoltageDrop: 4 },
    },
    {
      id: "esz3",
      type: "cabinet",
      position: { x: 0, y: 100 },
      data: {
        label: "ESZ3",
        kmMarker: "",
        side: "",
        devices: [{ type: "TXT", current: 6 }],
      } as CabinetNodeData,
    },
    {
      id: "esz4",
      type: "cabinet",
      position: { x: 0, y: 200 },
      data: {
        label: "ESZ4",
        kmMarker: "",
        side: "",
        devices: [
          { type: "Véda", current: 5 },
          { type: "Lidar", current: 1 },
        ],
      } as CabinetNodeData,
    },
  ];

  const edges: Edge[] = [
    {
      id: "K3",
      source: "asz",
      target: "esz3",
      type: "wire",
      data: { length: 200, crossSection: 25 } as CableEdgeData,
    },
    {
      id: "K4",
      source: "esz3",
      target: "esz4",
      type: "wire",
      data: { length: 130, crossSection: 25 } as CableEdgeData,
    },
  ];

  return { nodes, edges };
}

/**
 * The branching network of `examples/UHK szamitas_Rack_v1.xlsx`
 * ("1. körzet" sheet), with the exact cable lengths from column I and the
 * chosen 50 mm² cross-section from column M:
 *
 *   ASZ -> [K-FE-1, 3 m] -> FE1.1 -> [K1-1, 271.5 m] -> ESZ1-1
 *                           FE1.1 -> [K1-2, 87.1 m]  -> ESZ1-2
 *                                    ESZ1-2 -> [K1-3, 278.8 m] -> ESZ1-3
 *                                    ESZ1-2 -> [K1-4, 52.3 m]  -> ESZ1-4
 *                                              ESZ1-4 -> [K1-5, 293 m] -> ESZ1-5
 *
 * Devices carry the RAW currents from the workbook's E/F columns, placed at
 * the cabinet they physically belong to (the workbook lists downstream loads
 * again at the feeding cabinet, e.g. ESZ1-2's 38 A total is ESZ1-4's 32+1
 * plus ESZ1-3's 5). With design-current mode on (`useDesignCurrent`), each
 * cable's current is the downstream raw total × 1.2 / 3, which reproduces
 * the workbook's G column, and the raw subtree totals reproduce its H
 * column.
 *
 * Known exception: the workbook's K1-5 row skips the ×1.2/3 factor (G10 is
 * `+G9`, the raw 1 A, unlike every other cable row), so for K1-5 the engine's
 * uniform rule gives 0.4 A instead of the workbook's 1 A. K1-5's current,
 * ΔU, and everything downstream of it (ESZ1-5's cumulative ΔU) are asserted
 * against the engine's uniform rule, not that inconsistent row.
 */
function buildRackGraph(): { nodes: Node[]; edges: Edge[] } {
  const cabinet = (id: string, label: string, devices: Device[]): Node => ({
    id,
    type: "cabinet",
    position: { x: 0, y: 0 },
    data: { label, kmMarker: "", side: "", devices } as CabinetNodeData,
  });

  const wire = (
    id: string,
    source: string,
    target: string,
    length: number,
  ): Edge => ({
    id,
    source,
    target,
    type: "wire",
    data: { length, crossSection: 50 } as CableEdgeData,
  });

  const nodes: Node[] = [
    {
      id: "asz",
      type: "asz",
      position: { x: 0, y: 0 },
      data: {
        ...DEFAULT_ASZ_DATA,
        voltage: 400,
        allowedVoltageDrop: 4,
        useDesignCurrent: true,
      },
    },
    cabinet("fe11", "FE1.1", []),
    cabinet("esz11", "ESZ1-1", [{ type: "VJT-P", current: 33 }]),
    cabinet("esz12", "ESZ1-2", []),
    cabinet("esz13", "ESZ1-3", [{ type: "RACK", current: 5 }]),
    cabinet("esz14", "ESZ1-4", [{ type: "VJT-P", current: 32 }]),
    cabinet("esz15", "ESZ1-5", [{ type: "LAD,RAD", current: 1 }]),
  ];

  const edges: Edge[] = [
    wire("K-FE-1", "asz", "fe11", 3),
    wire("K1-1", "fe11", "esz11", 271.5),
    wire("K1-2", "fe11", "esz12", 87.1),
    wire("K1-3", "esz12", "esz13", 278.8),
    wire("K1-4", "esz12", "esz14", 52.3),
    wire("K1-5", "esz14", "esz15", 293),
  ];

  return { nodes, edges };
}

// Per-cable loop impedances straight from the Rack workbook's Q column.
const RACK_RH = {
  kfe1: 0.003432, //  Q29
  k11: 0.310596, //   Q25
  k12: 0.0996424, //  Q22
  k13: 0.3189472, //  Q17
  k14: 0.0598312, //  Q14
  k15: 0.335192, //   Q10
};

// Per-cable voltage drop [V] straight from the Rack workbook's O column.
const RACK_DU_V = {
  kfe1: 0.0844104569, //  O29
  k11: 3.5505891473, //   O25
  k12: 1.3116513153, //   O22
  k13: 0.5524327553, //   O17
  k14: 0.6839624766, //   O14
  // NOT O10 (0.2902847871): that cell uses the workbook's un-scaled 1 A
  // (see the K1-5 current exception above). This is ΔU at the engine's
  // uniformly-applied 0.4 A design current instead.
  k15: 0.1161139149,
};

function verifyRackGraph() {
  const { nodes, edges } = buildRackGraph();
  const result = runCalculations(nodes, edges);

  const edge = (id: string) =>
    result.edges.find((e) => e.id === id)!.data as CableEdgeData;
  const node = (label: string) =>
    result.nodes.find(
      (n) => (n.data as CabinetNodeData).label === label,
    )!.data as CabinetNodeData;

  console.log("\n=== Rack workbook cables (Q/R columns) ===");
  approx(edge("K-FE-1").impedance, RACK_RH.kfe1, "K-FE-1 Rh [Ω]");
  approx(edge("K-FE-1").shortCircuitCurrent, 67016.317016, "K-FE-1 Iz [A]");
  approx(edge("K1-1").impedance, RACK_RH.k11, "K1-1 Rh [Ω]");
  approx(edge("K1-1").shortCircuitCurrent, 740.5117902, "K1-1 Iz [A]");
  approx(edge("K1-2").impedance, RACK_RH.k12, "K1-2 Rh [Ω]");
  approx(edge("K1-2").shortCircuitCurrent, 2308.2543174, "K1-2 Iz [A]");
  approx(edge("K1-3").impedance, RACK_RH.k13, "K1-3 Rh [Ω]");
  approx(edge("K1-3").shortCircuitCurrent, 721.122493, "K1-3 Iz [A]");
  approx(edge("K1-4").impedance, RACK_RH.k14, "K1-4 Rh [Ω]");
  approx(edge("K1-4").shortCircuitCurrent, 3844.1482036, "K1-4 Iz [A]");
  approx(edge("K1-5").impedance, RACK_RH.k15, "K1-5 Rh [Ω]");
  approx(edge("K1-5").shortCircuitCurrent, 686.1738944, "K1-5 Iz [A]");

  console.log(
    "\n=== Rack workbook design currents (G column) and ΔU (O column) ===",
  );
  approx(edge("K-FE-1").current, 28.4, "K-FE-1 design current [A]"); //   G29
  approx(edge("K1-1").current, 13.2, "K1-1 design current [A]"); //       G25
  approx(edge("K1-2").current, 15.2, "K1-2 design current [A]"); //       G22
  approx(edge("K1-3").current, 2, "K1-3 design current [A]"); //          G17
  approx(edge("K1-4").current, 13.2, "K1-4 design current [A]"); //       G14
  // Workbook G10 shows 1 A because that row skips the ×1.2/3 factor; the
  // engine applies the rule uniformly: 1 × 1.2 / 3.
  approx(edge("K1-5").current, 0.4, "K1-5 design current [A]");
  approx(edge("K-FE-1").voltageDropV, 0.0844104569, "K-FE-1 ΔU [V]"); //  O29
  approx(edge("K1-1").voltageDropV, 3.5505891473, "K1-1 ΔU [V]"); //      O25
  approx(edge("K1-2").voltageDropV, 1.3116513153, "K1-2 ΔU [V]"); //      O22
  approx(edge("K1-3").voltageDropV, 0.5524327553, "K1-3 ΔU [V]"); //      O17
  approx(edge("K1-4").voltageDropV, 0.6839624766, "K1-4 ΔU [V]"); //      O14

  console.log("\n=== Rack workbook raw subtree totals (H column) ===");
  approx(node("FE1.1").totalCurrent, 71, "FE1.1 raw total [A]"); //   H29
  approx(node("ESZ1-1").totalCurrent, 33, "ESZ1-1 raw total [A]"); // H25
  approx(node("ESZ1-2").totalCurrent, 38, "ESZ1-2 raw total [A]"); // H22
  approx(node("ESZ1-3").totalCurrent, 5, "ESZ1-3 raw total [A]"); //  H17
  approx(node("ESZ1-4").totalCurrent, 33, "ESZ1-4 raw total [A]"); // H14
  approx(node("ESZ1-5").totalCurrent, 1, "ESZ1-5 raw total [A]"); //  H10

  console.log("\n=== Rack workbook cumulative ΔU% (path sums of column P) ===");
  // The workbook's shifted "Hurok IMP" summary row (U5:Z5) sums column P,
  // so it happens to be a valid reference for cumulative ΔU%.
  approx(node("FE1.1").cumulativeVoltageDrop, 0.0211026142, "FE1.1 ΔU [%]"); // Z5
  approx(node("ESZ1-1").cumulativeVoltageDrop, 0.9087499011, "ESZ1-1 ΔU [%]"); // Y5
  approx(node("ESZ1-2").cumulativeVoltageDrop, 0.3490154431, "ESZ1-2 ΔU [%]"); // X5
  approx(node("ESZ1-3").cumulativeVoltageDrop, 0.4871236319, "ESZ1-3 ΔU [%]"); // W5
  approx(node("ESZ1-4").cumulativeVoltageDrop, 0.5200060622, "ESZ1-4 ΔU [%]"); // V5

  console.log(
    "\n=== Rack workbook cabinets (cumulative Rh along path, Iz = 230/Rh) ===",
  );
  const cases: [string, number[]][] = [
    ["FE1.1", [RACK_RH.kfe1]],
    ["ESZ1-1", [RACK_RH.kfe1, RACK_RH.k11]],
    ["ESZ1-2", [RACK_RH.kfe1, RACK_RH.k12]],
    ["ESZ1-3", [RACK_RH.kfe1, RACK_RH.k12, RACK_RH.k13]],
    ["ESZ1-4", [RACK_RH.kfe1, RACK_RH.k12, RACK_RH.k14]],
    ["ESZ1-5", [RACK_RH.kfe1, RACK_RH.k12, RACK_RH.k14, RACK_RH.k15]],
  ];
  for (const [label, segments] of cases) {
    const rh = segments.reduce((sum, r) => sum + r, 0);
    const data = node(label);
    const iz = 230 / rh;
    approx(data.loopImpedance, rh, `${label} cumulative Rh [Ω]`);
    approx(data.shortCircuitCurrent, iz, `${label} Iz [A]`);
    // Correct Bizt = Iz / 8, NOT the workbook's own Z7:U7 cells (see header
    // comment: those divide the broken "Hurok IMP" summary row's Iz by 8).
    approx(data.maxFuseRating, iz / 8, `${label} Bizt [A]`);
  }

  console.log(
    "\n=== Rack workbook cabinets (cumulative ΔU [V], path sums of column O) ===",
  );
  const duCases: [string, number[]][] = [
    ["FE1.1", [RACK_DU_V.kfe1]],
    ["ESZ1-1", [RACK_DU_V.kfe1, RACK_DU_V.k11]],
    ["ESZ1-2", [RACK_DU_V.kfe1, RACK_DU_V.k12]],
    ["ESZ1-3", [RACK_DU_V.kfe1, RACK_DU_V.k12, RACK_DU_V.k13]],
    ["ESZ1-4", [RACK_DU_V.kfe1, RACK_DU_V.k12, RACK_DU_V.k14]],
    ["ESZ1-5", [RACK_DU_V.kfe1, RACK_DU_V.k12, RACK_DU_V.k14, RACK_DU_V.k15]],
  ];
  for (const [label, segments] of duCases) {
    const du = segments.reduce((sum, v) => sum + v, 0);
    approx(node(label).cumulativeVoltageDropV, du, `${label} cumulative ΔU [V]`);
  }
}

function main() {
  const { nodes, edges } = buildGraph();
  const result = runCalculations(nodes, edges);

  const edge = (id: string) =>
    result.edges.find((e) => e.id === id)!.data as CableEdgeData;
  const node = (id: string) =>
    result.nodes.find((n) => n.id === id)!.data as CabinetNodeData;

  console.log("\n=== Cable K4 (L=130, A=25, I=6) vs Excel row 6 ===");
  const k4 = edge("K4");
  approx(k4.current, 6, "current [A]");
  approx(k4.requiredCrossSection, 3.2198825, "required cross-section [mm²]");
  approx(k4.voltageDropV, 1.5455436, "voltage drop [V]");
  approx(k4.voltageDropPercent, 0.3863859, "voltage drop [%]");
  approx(k4.impedance, 0.29744, "loop impedance Rh [Ω]");
  approx(k4.shortCircuitCurrent, 773.2652, "short-circuit Iz [A]");

  console.log("\n=== Cable K3 (L=200, A=25, I=12) vs Excel row 9 ===");
  const k3 = edge("K3");
  approx(k3.current, 12, "current [A]");
  approx(k3.requiredCrossSection, 9.9073306, "required cross-section [mm²]");
  approx(k3.voltageDropV, 4.7555187, "voltage drop [V]");
  approx(k3.voltageDropPercent, 1.1888797, "voltage drop [%]");
  approx(k3.impedance, 0.4576, "loop impedance Rh [Ω]");
  approx(k3.shortCircuitCurrent, 502.62238, "short-circuit Iz [A]");

  console.log("\n=== Cabinet ESZ4 (fed by K4) ===");
  const esz4 = node("esz4");
  approx(esz4.ownCurrent, 6, "own current [A]");
  approx(esz4.totalCurrent, 6, "total current [A]");
  // cumulative Rh = K3 + K4 segment impedances ("Hurok IMP" summary rule)
  approx(esz4.loopImpedance, 0.4576 + 0.29744, "loop impedance Rh [Ω]");
  approx(
    esz4.shortCircuitCurrent,
    230 / (0.4576 + 0.29744),
    "short-circuit Iz [A]",
  );
  // cumulative ΔU% = K3% + K4% (the "Fesz esés összesen" total column)
  approx(
    esz4.cumulativeVoltageDrop,
    1.1888797 + 0.3863859,
    "cumulative ΔU [%]",
  );
  approx(
    esz4.cumulativeVoltageDropV,
    4.7555187 + 1.5455436,
    "cumulative ΔU [V]",
  );

  console.log("\n=== Cabinet ESZ3 (fed by K3) ===");
  const esz3 = node("esz3");
  approx(esz3.ownCurrent, 6, "own current [A]");
  approx(esz3.totalCurrent, 12, "total current [A]");
  approx(esz3.loopImpedance, 0.4576, "loop impedance Rh [Ω]");
  approx(esz3.shortCircuitCurrent, 502.62238, "short-circuit Iz [A]");
  approx(esz3.cumulativeVoltageDrop, 1.1888797, "cumulative ΔU [%]");
  approx(esz3.cumulativeVoltageDropV, 4.7555187, "cumulative ΔU [V]");

  verifyRackGraph();

  console.log("\n" + "=".repeat(60));
  if (failures === 0) {
    console.log("ALL CHECKS PASSED — engine matches the Excel reference.");
  } else {
    console.log(`${failures} CHECK(S) FAILED — engine diverges from Excel.`);
    process.exitCode = 1;
  }
}

main();
