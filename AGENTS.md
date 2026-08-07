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
- `lib/pdf-export.ts` : rasterizes the live canvas and legend to PNG (`html-to-image`) and composes a print-ready PDF (`jsPDF`).
- `lib/project-io.ts` : serializes/deserializes the `.wire.json` project file format.
- `lib/i18n.ts` : Hungarian/English translation dictionary and lookup hooks.
- `types/electrical.ts` : all domain types (`AszNodeData`, `CabinetNodeData`, `CableEdgeData`, etc.) plus shared constants (cable resistivity, standard cross-sections, defaults).
- `scripts/verify-calculations.ts` : the Excel-verification harness (see below).
- `examples/*.wire.json` : real saved projects, useful as sample input when testing changes.

## Critical Safety Rule: The Calculation Engine

`lib/calculations.ts` and `lib/downstream.ts` implement formulas that were reverse-engineered from, and are verified against, existing Excel-based reference calculations: the `3F` sheet of `UHK szamitas pelda.xlsx` (a single cable chain) and the `1. körzet` sheet of `examples/UHK szamitas_Rack_v1.xlsx` (a branching network that fixes how per-cabinet loop impedance and short-circuit current accumulate along the path back to the source, and the design current factor: raw device total × 1.2 / phases, applied when the ÁSZ node's `useDesignCurrent` is on). The numbers must keep matching those spreadsheets.

Not every cell in every sheet is usable as a reference. The Rack workbook's summary block reports cumulative voltage drop in percent under its `Hurok IMP` label, because an inserted column shifted the calculated columns one to the right and that row's formula was never updated to follow. `scripts/verify-calculations.ts` documents which cells this affects and how the expected cumulative values are derived instead. Before treating a disagreement between the app and a spreadsheet as an engine bug, check whether the spreadsheet agrees with itself.

If you touch `runCalculations`, any function in `lib/calculations.ts`, or the graph traversal in `lib/downstream.ts`:

1. Read the comment block at the top of `scripts/verify-calculations.ts` first. It documents exactly which Excel cells each expected value came from and the network topology being checked.
2. Run `pnpm verify:calc` before and after your change. Every line must print `PASS`.
3. If a value legitimately needs to change (for example, a new phase mode or a corrected formula), update the expected values in `scripts/verify-calculations.ts` only alongside a clear explanation of why the Excel reference no longer applies. Do not silently change expected values to make a broken engine pass.
4. Do not guess at electrical formulas. Follow the existing code's structure (adjacency list, BFS for direction, post-order aggregation of current, pre-order propagation of voltage drop) rather than introducing a different traversal strategy.

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
