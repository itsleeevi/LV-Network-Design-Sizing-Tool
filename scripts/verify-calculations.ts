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
 */
import type { Node, Edge } from "@xyflow/react";
import { runCalculations } from "@/lib/calculations";
import type { CableEdgeData, CabinetNodeData } from "@/types/electrical";
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
  approx(esz4.loopImpedance, 0.29744, "loop impedance Rh [Ω]");
  approx(esz4.shortCircuitCurrent, 773.2652, "short-circuit Iz [A]");
  // cumulative ΔU% = K3% + K4% (the "Fesz esés összesen" total column)
  approx(
    esz4.cumulativeVoltageDrop,
    1.1888797 + 0.3863859,
    "cumulative ΔU [%]",
  );

  console.log("\n=== Cabinet ESZ3 (fed by K3) ===");
  const esz3 = node("esz3");
  approx(esz3.ownCurrent, 6, "own current [A]");
  approx(esz3.totalCurrent, 12, "total current [A]");
  approx(esz3.loopImpedance, 0.4576, "loop impedance Rh [Ω]");
  approx(esz3.shortCircuitCurrent, 502.62238, "short-circuit Iz [A]");
  approx(esz3.cumulativeVoltageDrop, 1.1888797, "cumulative ΔU [%]");

  console.log("\n" + "=".repeat(60));
  if (failures === 0) {
    console.log("ALL CHECKS PASSED — engine matches the Excel reference.");
  } else {
    console.log(`${failures} CHECK(S) FAILED — engine diverges from Excel.`);
    process.exitCode = 1;
  }
}

main();
