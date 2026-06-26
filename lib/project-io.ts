import type { Node, Edge } from "@xyflow/react";
import type { Language } from "@/store/settings-store";

const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = ".wire.json";

export type WireProjectFile = {
  app: "wire-app";
  version: number;
  savedAt: string;
  language?: Language;
  nodes: Node[];
  edges: Edge[];
};

export type LoadedProject = {
  nodes: Node[];
  edges: Edge[];
  language?: Language;
};

/** Default, language-aware base name for a saved project file. */
function defaultProjectFileName(language: Language): string {
  const base = language === "hu" ? "halozatterv" : "network-design";
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}`;
}

/** Serialize the current diagram and trigger a download as a .wire.json file. */
export function saveProjectToFile(
  nodes: Node[],
  edges: Edge[],
  language: Language,
  fileName = defaultProjectFileName(language),
): void {
  const project: WireProjectFile = {
    app: "wire-app",
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    language,
    nodes,
    edges,
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(PROJECT_FILE_EXTENSION)
    ? fileName
    : `${fileName}${PROJECT_FILE_EXTENSION}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Read and validate a project file selected by the user. */
export async function readProjectFile(file: File): Promise<LoadedProject> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("A fájl nem érvényes JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as WireProjectFile).nodes) ||
    !Array.isArray((parsed as WireProjectFile).edges)
  ) {
    throw new Error("A fájl nem egy érvényes wire-app projekt.");
  }

  const project = parsed as WireProjectFile;
  const language =
    project.language === "hu" || project.language === "en"
      ? project.language
      : undefined;
  return { nodes: project.nodes, edges: project.edges, language };
}

/** Open a native file picker and resolve with the chosen project, or null. */
export function pickProjectFile(): Promise<LoadedProject | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await readProjectFile(file));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
