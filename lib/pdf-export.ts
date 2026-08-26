import { toPng } from "html-to-image";
import { getNodesBounds, type Node } from "@xyflow/react";
import { jsPDF } from "jspdf";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { Language } from "@/store/settings-store";

const DIAGRAM_MARGIN_PX = 40; // padding around the diagram inside its capture
const TARGET_RASTER_PX = 3400; // long-edge pixel target for a crisp, print-grade raster

type Captured = { dataUrl: string; width: number; height: number };

/**
 * Capture the whole React Flow diagram (all nodes/edges, regardless of the
 * current pan/zoom) into a high-resolution PNG.
 */
async function captureDiagram(nodes: Node[]): Promise<Captured> {
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) {
    throw new Error("react-flow viewport not found");
  }

  const bounds = getNodesBounds(nodes);
  const width = Math.ceil(bounds.width) + DIAGRAM_MARGIN_PX * 2;
  const height = Math.ceil(bounds.height) + DIAGRAM_MARGIN_PX * 2;

  // Render at a higher device pixel ratio so the embedded image stays sharp
  // when scaled onto the page (print-grade resolution).
  const pixelRatio = Math.min(4, Math.max(2, TARGET_RASTER_PX / Math.max(width, height)));

  const dataUrl = await toPng(viewport, {
    backgroundColor: "#ffffff",
    width,
    height,
    pixelRatio,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${DIAGRAM_MARGIN_PX - bounds.x}px, ${DIAGRAM_MARGIN_PX - bounds.y}px)`,
    },
  });

  return { dataUrl, width, height };
}

/** Render an offscreen DOM element to a crisp PNG (uses real browser fonts). */
async function elementToPng(content: HTMLElement): Promise<Captured> {
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;top:0;left:-100000px;background:#ffffff;padding:0;margin:0;";
  content.style.background = "#ffffff";
  holder.appendChild(content);
  document.body.appendChild(holder);
  try {
    // Let layout settle before measuring/capturing.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const rect = content.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const options = { backgroundColor: "#ffffff", pixelRatio: 3, width, height };
    // Render twice: html-to-image occasionally returns a blank first paint for
    // freshly-created nodes.
    await toPng(content, options);
    const dataUrl = await toPng(content, options);
    return { dataUrl, width, height };
  } finally {
    document.body.removeChild(holder);
  }
}

const CABLE_04_SYMBOL = svg(
  `<line x1="3" y1="8" x2="43" y2="8" stroke="#000" stroke-width="1"/>` +
    [14, 23, 32]
      .map(
        (x) =>
          `<line x1="${x}" y1="4" x2="${x}" y2="12" stroke="#000" stroke-width="1"/>` +
          `<line x1="${x - 2.5}" y1="8" x2="${x + 2.5}" y2="8" stroke="#000" stroke-width="1"/>`,
      )
      .join(""),
);

const CABLE_LVD_SYMBOL = svg(
  `<line x1="3" y1="8" x2="43" y2="8" stroke="#000" stroke-width="1"/>` +
    [14, 23, 32]
      .map((x) => `<line x1="${x}" y1="4" x2="${x}" y2="12" stroke="#000" stroke-width="1"/>`)
      .join(""),
);

const CABINET_SYMBOL = svg(
  `<g transform="translate(15 2)">` +
    `<polygon points="0,0 0,12 16,12" fill="#000"/>` +
    `<rect x="0" y="0" width="16" height="12" fill="none" stroke="#000" stroke-width="1"/>` +
    `</g>`,
);

const METER_SYMBOL = svg(
  `<g transform="translate(15 2)">` +
    `<rect x="0" y="0" width="16" height="12" fill="none" stroke="#000" stroke-width="1"/>` +
    `<circle cx="8" cy="6" r="2.2" fill="#000"/>` +
    `</g>`,
);

const TRANSFORMER_SYMBOL = svg(
  `<rect x="10" y="2" width="26" height="12" fill="none" stroke="#000" stroke-width="1"/>` +
    `<circle cx="18" cy="8" r="5" fill="none" stroke="#000" stroke-width="1"/>` +
    `<circle cx="28" cy="8" r="5" fill="none" stroke="#000" stroke-width="1"/>`,
);

const DISTRIBUTOR_SYMBOL = svg(
  `<g transform="translate(15 2)">` +
    `<rect x="0" y="0" width="16" height="12" fill="none" stroke="#000" stroke-width="1"/>` +
    `<text x="8" y="10" text-anchor="middle" font-size="9" font-family="Arial" font-weight="700">E</text>` +
    `</g>`,
);

function svg(inner: string): string {
  return `<svg width="46" height="16" viewBox="0 0 46 16" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

/** Build the legend DOM, matching the canvas symbols and wording. */
function buildLegendElement(language: Language): HTMLElement {
  const t = (k: TranslationKey) => translate(language, k);

  const row = (symbol: string, mark: string, desc: string) => `
    <div style="display:flex;align-items:center;gap:10px;padding:2.5px 0;">
      <div style="width:46px;flex:0 0 auto;display:flex;justify-content:center;">${symbol}</div>
      <div style="flex:0 0 auto;min-width:34px;font-weight:600;color:#111;">${escapeHtml(mark)}</div>
      <div style="color:#374151;">${escapeHtml(desc)}</div>
    </div>`;

  const el = document.createElement("div");
  el.style.display = "inline-block";
  el.style.boxSizing = "border-box";
  el.style.fontFamily = "Arial, Helvetica, sans-serif";
  el.style.fontSize = "12px";
  el.style.lineHeight = "1.35";
  el.style.color = "#111";
  el.style.border = "1px solid #111";
  el.style.borderRadius = "4px";
  el.style.padding = "8px 12px";
  el.style.whiteSpace = "nowrap";
  el.innerHTML = `
    <div style="font-weight:700;font-size:13px;margin-bottom:5px;">${escapeHtml(t("legend.title"))}</div>
    ${row(CABLE_04_SYMBOL, t("cable.kv04"), t("legend.cable04"))}
    ${row(CABLE_LVD_SYMBOL, t("cable.uhe"), t("legend.cableUhe"))}
    ${row(CABINET_SYMBOL, t("cabinet.defaultLabel"), t("legend.esz"))}
    ${row(METER_SYMBOL, t("node.fm.name"), t("legend.fm"))}
    ${row(DISTRIBUTOR_SYMBOL, t("node.fe.name"), t("legend.fe"))}
    ${row(TRANSFORMER_SYMBOL, t("node.asz.name"), t("legend.asz"))}`;
  return el;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Export the whole diagram to a single-page, print-grade PDF (auto A4
 * orientation) with a title block, a bordered drawing frame, and a bilingual
 * legend that mirrors the on-canvas symbols.
 */
export async function exportDiagramToPdf(
  nodes: Node[],
  language: Language,
  fileName = "network-drawing",
): Promise<void> {
  const diagram = await captureDiagram(nodes);
  const legendImg = await elementToPng(buildLegendElement(language));

  const orientation = diagram.width >= diagram.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const margin = 24;
  const pad = 12;

  // Outer drawing frame.
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1);
  pdf.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);

  // Legend, bottom-left inside the frame.
  const legendW = Math.min(260, pageW - margin * 2 - pad * 2);
  const legendH = (legendImg.height / legendImg.width) * legendW;
  const legendX = margin + pad;
  const legendY = pageH - margin - pad - legendH;
  pdf.addImage(legendImg.dataUrl, "PNG", legendX, legendY, legendW, legendH, undefined, "FAST");

  // Diagram fitted into the remaining area.
  const areaLeft = margin + pad;
  const areaRight = pageW - margin - pad;
  const areaTop = margin + pad;
  const areaBottom = legendY - pad;
  const availW = areaRight - areaLeft;
  const availH = areaBottom - areaTop;

  const imgAspect = diagram.width / diagram.height;
  let drawW = availW;
  let drawH = drawW / imgAspect;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * imgAspect;
  }
  const drawX = areaLeft + (availW - drawW) / 2;
  const drawY = areaTop + (availH - drawH) / 2;
  pdf.addImage(diagram.dataUrl, "PNG", drawX, drawY, drawW, drawH, undefined, "FAST");

  pdf.save(`${fileName}.pdf`);
}
