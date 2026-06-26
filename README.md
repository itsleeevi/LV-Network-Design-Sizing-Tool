# LV Network Design & Sizing Tool

Browser-based tool for **distribution network design and sizing**. Lay out a low-voltage (0.4 kV) underground cable network — utility supply, main meter, and roadside distribution cabinets — as a schematic, connect it with cables, and instantly get cable cross-section sizing, voltage drop, loop impedance, and short-circuit calculations. Canvas rendered with React Flow, state managed with Zustand.

## Features

- **Interactive canvas** — drag, pan, and zoom a node-based schematic diagram
- **Network elements** — Utility Supply (ÁSZ), Main Meter (FM), Main Distributor (FE), and distribution cabinets / feeder pillars (ESZ)
- **Wire mode** — connect elements with cables by switching to wire mode
- **Auto layout** — automatically arrange the network into a clean schematic
- **Calculations** — cable sizing, voltage drop, loop impedance, and short-circuit current across the network
- **Save & open** — save projects to a file, with automatic localStorage autosave that survives refreshes
- **PDF export** — export the drawing to a print-ready PDF with a legend
- **Bilingual** — full Hungarian / English UI
- **Property editor** — select any element or cable to inspect and edit its data and computed values

## Tech Stack

| Layer     | Library                                           |
| --------- | ------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org)                  |
| Canvas    | [React Flow](https://reactflow.dev)               |
| State     | [Zustand](https://zustand-demo.pmnd.rs)           |
| UI        | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS |
| Language  | TypeScript                                        |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/          # Next.js app router pages
components/   # UI and flow canvas components
store/        # Zustand global state (flow-store.ts)
lib/          # Calculations and auto-layout logic
types/        # TypeScript types for electrical nodes and edges
```
