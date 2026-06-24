# Wire App

A visual electrical schematic editor built with Next.js and React Flow. Design, connect, and calculate low-voltage electrical distribution networks directly in your browser.

## Features

- **Interactive canvas** — drag, pan, and zoom a node-based schematic diagram
- **Node types** — ASZ (main switchboard), Feed Modules (FM), Feed Elements (FE), and Cabinets
- **Wire mode** — connect nodes with cables by switching to wire mode
- **Auto layout** — automatically arrange nodes into a clean schematic
- **Calculations** — run electrical calculations across the entire network
- **Property editor** — select any node or edge to inspect and edit its data

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
