# AGENTS.md

Guide for AI coding agents (Claude, Cursor, Codex, etc.) working in this repository. Read this before making changes.

## Project Summary

A Next.js + React Flow application for designing low-voltage (0.4 kV) underground distribution networks as an interactive node/cable diagram, with a graph-based engine that calculates cable sizing, voltage drop, loop impedance, and short-circuit current for the whole network. See `README.md` for the full product description.

## Setup & Commands

```bash
pnpm install        # install dependencies
pnpm dev            # start the dev server at http://localhost:3000
pnpm build          # production build
pnpm lint           # ESLint
pnpm verify:calc    # run the calculation engine against the Excel reference (see below)
```

There is no automated test suite yet. `pnpm verify:calc` is the closest thing to one and must pass after any change to the calculation logic.

## Domain Glossary

The UI, code comments, and data model use Hungarian electrical-engineering abbreviations. Know these before editing:

| Term | Hungarian        | Meaning                                               |
| ---- | ---------------- | ----------------------------------------------------- |
| ÁSZ  | Áramszolgáltató  | Utility supply / transformer, the root of the network |
| FM   | Főmérő           | Main meter                                            |
| FE   | Főelosztó        | Main distributor                                      |
| ESZ  | Elosztó Szekrény | Distribution cabinet / roadside feeder pillar         |
| kmsz | km szelvény      | Chainage / position marker along a route              |
| 3F   |                  | Three-phase system, 400 V line voltage                |
| 1F   |                  | Single-phase system, 230 V                            |
| Bizt | Biztosíték       | Fuse; the suggested max. rating so it still trips reliably on a fault this far out (Iz / 8) |

## Architecture Map

- `app/` : Next.js App Router entry point (`page.tsx` just renders `FlowCanvas`).
- `components/flow/canvas/` : the React Flow canvas, toolbar, menu, legend, welcome screen.
- `components/flow/nodes/` : one component per electrical element type (`asz-node.tsx`, `fm-node.tsx`, `fe-node.tsx`, `cabinet-node.tsx`, `feed-node.tsx`), plus shared schematic port rendering.
- `components/flow/edges/wire-edge.tsx` : cable rendering, including on-canvas calculated-value labels.
- `components/flow/sidebar/property-sidebar.tsx` : the right-hand property editor for whatever node/edge is selected.
- `store/flow-store.ts` : the single source of truth for nodes and edges (Zustand, persisted to localStorage). All mutations (add element, connect wire, edit property, delete) go through this store.
- `store/settings-store.ts` : UI settings (currently just language), persisted separately.
- `lib/calculations.ts` : the calculation engine. Pure functions, no React, no DOM. This is the most safety-critical file in the repo.
- `lib/downstream.ts` : graph helper that derives downstream child labels from the edge list, used for auto-generating cabinet designation tags.
- `lib/auto-layout.ts` : lays out the whole network from the ÁSZ when "Rendezés" (auto layout) is triggered, so every cable is drawn at a consistent length (compact trunk hops, uniform wide cabinet-to-cabinet hops).
- `lib/cabinet-label-placement.ts` : picks which side of a node symbol to place its label on, avoiding the side a wire is attached to.
- `lib/cable-label.ts` : builds the lines of a cable's on-canvas info box and estimates its rendered size. Single source of truth for that label: `wire-edge.tsx` renders these lines and `cable-label-placement.ts` measures them, so the two cannot drift apart.
- `lib/cable-label-placement.ts` : decides where each cable's info box goes (which side of the wire, how far along) so the boxes miss each other, the node symbols, and the nodes' own labels. Solved for the whole diagram in one deterministic pass, since each wire renders independently but must agree on the result.
- `lib/pdf-export.ts` : rasterizes the live canvas and legend to PNG (`html-to-image`) and composes a print-ready PDF (`jsPDF`).
- `lib/project-io.ts` : serializes/deserializes the `.wire.json` project file format.
- `lib/i18n.ts` : Hungarian/English translation dictionary and lookup hooks.
- `types/electrical.ts` : all domain types (`AszNodeData`, `CabinetNodeData`, `CableEdgeData`, etc.) plus shared constants (cable resistivity, standard cross-sections, defaults).
- `scripts/verify-calculations.ts` : the Excel-verification harness (see below).
- `examples/*.wire.json` : real saved projects, useful as sample input when testing changes.

## Critical Safety Rule: The Calculation Engine

`lib/calculations.ts` and `lib/downstream.ts` implement formulas that were reverse-engineered from, and are verified against, existing Excel-based reference calculations: the `3F` sheet of `UHK szamitas pelda.xlsx` (a single cable chain) and the `1. körzet` sheet of `examples/UHK szamitas_Rack_v1.xlsx` (a branching network that fixes how per-cabinet loop impedance and short-circuit current accumulate along the path back to the source, and the design current factor: raw device total × safety factor (default 1.2, editable via the ÁSZ node's `designCurrentSafetyFactor`) / phases, applied when the ÁSZ node's `useDesignCurrent` is on). The numbers must keep matching those spreadsheets.

Not every cell in every sheet is usable as a reference. The Rack workbook's summary block reports cumulative voltage drop in percent under its `Hurok IMP` label, because an inserted column shifted the calculated columns one to the right and that row's formula was never updated to follow. `scripts/verify-calculations.ts` documents which cells this affects and how the expected cumulative values are derived instead. Before treating a disagreement between the app and a spreadsheet as an engine bug, check whether the spreadsheet agrees with itself.

Individual cables can also opt out of the design current factor entirely via `CableEdgeData.skipDesignCurrentFactor` (confirmed against the Rack workbook's K1-5 row, which deliberately carries the raw downstream total with no ×1.2/3). This is a genuine, per-cable engineering exception, not a spreadsheet mistake, so do not "fix" it by removing the flag or applying the factor uniformly.

`CableEdgeData.recommendedCrossSection` and `networkRequiredCrossSection` have no Excel counterpart; they are the app's own advice, computed at the end of `runCalculations` and shown together on the wire label as "Min. szükséges" and "Javasolt". Keep all three cross-section fields distinct:

- `requiredCrossSection`: the Excel per-cable formula (ρLI/é) for that segment alone. Verified against the spreadsheets, so do not change it.
- `networkRequiredCrossSection`: continuous need shown as "Szükséges min.". The largest of `requiredCrossSection`, the network voltage-drop need (others at recommended sizes), and `I / maxCurrentDensity` when density is on. This is what the recommendation rounds up from when voltage drop or thermal rules bind; grading can still push the recommendation higher. `networkRequiredCrossSectionReason` ("current" or "voltageDrop") records which of those won, and `recommendedGradedUp` records whether lépcsőzetesség alone pushed `recommendedCrossSection` above `nextStandardCrossSection(networkRequiredCrossSection)`; both are computed for future use but the wire label currently shows only the two numbers, no reason text.
- `recommendedCrossSection`: the standard size to install, after the network rules below.

Note that `é = 0.75 × U × ε / √3` puts a cable sitting exactly at `requiredCrossSection` at 75% of the entire allowed drop on its own (3% of a 4% budget), so the per-cable figure can never satisfy a cumulative limit across two or more cables. The recommendation resolves that as follows:

1. Round `requiredCrossSection` up to the next standard size, and raise to at least `nextStandard(I / maxCurrentDensity)` when the ÁSZ node's thermal density floor is on (default `DEFAULT_MAX_CURRENT_DENSITY_A_PER_MM2` = 2 A/mm²; set to 0 to disable).
2. Lépcsőzetesség: raise every cable to at least the largest cable it feeds.
3. For each cabinet over the allowed cumulative drop, multiply every cable on its path by `cumulativeDrop / allowedDrop` (valid because drop is inversely proportional to area), take the largest factor asked of each cable, round up to standard sizes, re-grade, and repeat until it settles.

Step 3 deliberately spreads the correction across the whole path. An earlier version stepped up only the single worst-dropping cable per pass, which satisfied the limit but produced badly graded results (a trunk cable four standard sizes above the branch it fed). If you change this, check the grading of the output, not just that the limit is met.

Keep `nextStandardCrossSection(networkRequiredCrossSection) <= recommendedCrossSection`, so the two figures on the label never contradict each other. They are equal whenever rounding the continuous need up is enough; the recommendation sits higher only when grading drives it further.

Do not make the recommendation write back into `crossSection`; cross-sections are the user's to set. It must also stay independent of the currently set `crossSection`, so it cannot drift when the engine re-runs on its own output.

Settled decisions for the recommendation / "Min. szükséges" pair:

- **"Szükséges min." includes thermal density, but not grading.** A short trunk carrying 28 A can no longer show ~3 mm² next to a large "Javasolt" for thermal reasons alone: density raises the continuous figure to `I / density`. A remaining gap to "Javasolt" still means grading (or discrete rounding from the cumulative-drop loop) is the driver. Folding grading into "Szükséges min." was considered and rejected.
- **The label shows the two numbers only, no reason text.** A bracketed reason word (`áram alapján` / `feszültségesés alapján` / `lépcsőzetesség miatt`) was tried and reverted: it made the boxes too wide and crowded the diagram. `networkRequiredCrossSectionReason` and `recommendedGradedUp` still carry that information on `CableEdgeData` for anything that wants it later (e.g. the sidebar), but `getCableLabelLines` (`lib/cable-label.ts`) does not render it. Do not re-add the reason text to the wire label without also revisiting cable-label-placement's collision handling.
- **Cross-section numbers on the label use two decimal places with a locale-aware separator** (`formatLocaleNumber` / `formatStandardSize` in `lib/utils.ts`: comma in Hungarian, dot in English), not the 3-decimal `formatCalc` used for the other calculated fields. Standard sizes (`recommendedCrossSection`, the installed `crossSection`) are trimmed of trailing zeros (`35`, not `35.00`); continuous figures (`networkRequiredCrossSection`) always show two decimals (`20,00`).
- **Current density is a configurable floor, not a verified ampacity table.** The ÁSZ node's `maxCurrentDensity` (default 2 A/mm²) exists so a trunk feeding many short branches cannot grade down to a branch-sized section while carrying the sum of their currents. It is deliberately a single editable number rather than a cable-type / installation / soil table: there is no verified rating table in the repo. Do not silently invent one; if the user needs a proper ampacity table, that is a separate feature with real source data.

If you touch `runCalculations`, any function in `lib/calculations.ts`, or the graph traversal in `lib/downstream.ts`:

1. Read the comment block at the top of `scripts/verify-calculations.ts` first. It documents exactly which Excel cells each expected value came from and the network topology being checked.
2. Run `pnpm verify:calc` before and after your change. Every line must print `PASS`.
3. If a value legitimately needs to change (for example, a new phase mode or a corrected formula), update the expected values in `scripts/verify-calculations.ts` only alongside a clear explanation of why the Excel reference no longer applies. Do not silently change expected values to make a broken engine pass.
4. Do not guess at electrical formulas. Follow the existing code's structure (adjacency list, BFS for direction, post-order aggregation of current, pre-order propagation of voltage drop) rather than introducing a different traversal strategy. See the settled decisions above on current density and on what "Számított" means before changing the cross-section recommendation.

## Code Conventions

- TypeScript everywhere, `@/` path alias resolves to the repo root.
- Zustand stores use the `set`/`get` pattern already established in `store/flow-store.ts`; do not introduce a second state-management library.
- UI components are function components using hooks; node/edge components read from `useFlowStore` selectors rather than prop drilling.
- All user-facing strings go through `lib/i18n.ts` (`translate` / the `useElementName` and related hooks), not hardcoded in JSX, so both Hungarian and English stay in sync.
- Keep calculation and graph logic in `lib/`, free of React and DOM APIs, so it stays independently testable and reusable by `scripts/verify-calculations.ts`.
- Do not add comments that just restate what the code does. Existing comments in `lib/calculations.ts` document non-obvious formula provenance (which Excel column/row a value corresponds to); follow that pattern when adding new formulas.
- Avoid the em dash character in prose, comments, and documentation; use a colon, comma, or parentheses instead.

## Making Changes Safely

- Prefer small, targeted diffs. This is a single-page app with a lot of shared state; a change to `store/flow-store.ts` or `types/electrical.ts` can ripple into every node component, the calculation engine, PDF export, and project file I/O.
- When adding a new node or edge data field, update `types/electrical.ts` first (including any `DEFAULT_*` constant), then the store, then the relevant component(s), then `lib/i18n.ts` for any new labels.
- When changing anything under `lib/calculations.ts` or `lib/downstream.ts`, always finish with `pnpm verify:calc`.
- Run `pnpm lint` before considering a change complete.
- There is no CI pipeline yet; treat `pnpm lint` and `pnpm verify:calc` as the required local checks for any pull request.
