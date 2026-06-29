"use client";

import { useFlowStore } from "@/store/flow-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CabinetNodeData,
  FmNodeData,
  FeNodeData,
  CableEdgeData,
  AszNodeData,
  Device,
  CABLE_CROSS_SECTIONS,
  COMMON_DEVICES,
  ALUMINIUM_CABLE,
} from "@/types/electrical";
import { getDownstreamChildLabels, resolveDesignationTag } from "@/lib/downstream";
import { useT, useElementName } from "@/lib/i18n";
import { X, Trash2, Plus } from "lucide-react";

function DeviceRow({
  device,
  index,
  onUpdate,
  onDelete,
}: {
  device: Device;
  index: number;
  onUpdate: (index: number, device: Device) => void;
  onDelete: (index: number) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-1 rounded border p-1.5">
      <div className="flex items-center gap-1">
        <Input
          value={device.type}
          placeholder={t("device.type")}
          className="h-8 flex-1 text-sm"
          onChange={(e) => onUpdate(index, { ...device, type: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          step={0.01}
          value={device.current}
          className="h-8 w-14 text-sm"
          onChange={(e) =>
            onUpdate(index, { ...device, current: parseFloat(e.target.value) || 0 })
          }
        />
        <span className="text-xs text-muted-foreground">A</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Input
        value={device.kmMarker ?? ""}
        placeholder={t("device.km")}
        className="h-7 text-xs"
        onChange={(e) => onUpdate(index, { ...device, kmMarker: e.target.value })}
      />
    </div>
  );
}

function CabinetProperties({ nodeId, data }: { nodeId: string; data: CabinetNodeData }) {
  const t = useT();
  const elementName = useElementName();
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const devices = data.devices || [];
  const autoTag = resolveDesignationTag(undefined, getDownstreamChildLabels(nodeId, nodes, edges));

  const handleUpdateDevice = (index: number, device: Device) => {
    const newDevices = [...devices];
    newDevices[index] = device;
    updateNodeData(nodeId, { devices: newDevices });
  };

  const handleDeleteDevice = (index: number) => {
    const newDevices = devices.filter((_, i) => i !== index);
    updateNodeData(nodeId, { devices: newDevices });
  };

  const handleAddDevice = (preset?: { type: string; current: number }) => {
    const newDevice: Device = preset || { type: "", current: 0 };
    updateNodeData(nodeId, { devices: [...devices, newDevice] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("cabinet.title")}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteNode(nodeId)}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">{t("field.label")}</Label>
        <Input
          id="label"
          value={elementName(data.label, "cabinet")}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="kmMarker">{t("field.position")}</Label>
        <Input
          id="kmMarker"
          value={data.kmMarker ?? ""}
          placeholder={t("field.positionPlaceholder")}
          onChange={(e) => updateNodeData(nodeId, { kmMarker: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tag">{t("field.tag")}</Label>
        <Input
          id="tag"
          value={data.tag ?? ""}
          placeholder={autoTag || t("tag.placeholderNone")}
          onChange={(e) => updateNodeData(nodeId, { tag: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {autoTag ? (
            <>
              {t("tag.autoHint")} <span className="font-mono">{autoTag}</span>
            </>
          ) : (
            t("tag.noneHint")
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="side">{t("field.side")}</Label>
        <Select
          value={data.side || "none"}
          onValueChange={(v) =>
            updateNodeData(nodeId, { side: v === "none" ? "" : (v as "bal" | "jobb") })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("field.choose")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-</SelectItem>
            <SelectItem value="bal">{t("side.left")}</SelectItem>
            <SelectItem value="jobb">{t("side.right")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("cabinet.devices")}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddDevice()}
            className="h-7 px-2"
          >
            <Plus className="mr-1 h-3 w-3" />
            {t("common.new")}
          </Button>
        </div>

        {devices.length > 0 ? (
          <div className="space-y-1">
            {devices.map((device, i) => (
              <DeviceRow
                key={i}
                device={device}
                index={i}
                onUpdate={handleUpdateDevice}
                onDelete={handleDeleteDevice}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("cabinet.noDevices")}</p>
        )}

        {/* Quick add presets */}
        <div className="flex flex-wrap gap-1 pt-1">
          {COMMON_DEVICES.map((preset) => (
            <Button
              key={preset.type}
              variant="secondary"
              size="sm"
              onClick={() => handleAddDevice({ type: preset.type, current: preset.current })}
              className="h-6 px-2 text-xs"
            >
              +{preset.type}
            </Button>
          ))}
        </div>
      </div>

      {/* Calculated values display - matching Excel summary table */}
      {(data.ownCurrent !== undefined ||
        data.totalCurrent !== undefined ||
        data.loopImpedance !== undefined ||
        data.shortCircuitCurrent !== undefined ||
        data.cumulativeVoltageDrop !== undefined) && (
        <div className="rounded-md border bg-muted/50 p-2 space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">{t("calc.title")}</h4>
          {data.ownCurrent !== undefined && (
            <div className="text-sm">
              {t("calc.current")}: <span className="font-medium">{data.ownCurrent.toFixed(2)}</span>
            </div>
          )}
          {data.totalCurrent !== undefined && (
            <div className="text-sm">
              {t("calc.totalCurrent")}: <span className="font-medium">{data.totalCurrent.toFixed(2)}</span>
            </div>
          )}
          {data.cumulativeVoltageDrop !== undefined && (
            <div className="text-sm">
              {t("calc.voltageDrop")}: <span className="font-medium">{data.cumulativeVoltageDrop.toFixed(1)}</span>
            </div>
          )}
          {data.loopImpedance !== undefined && (
            <div className="text-sm">
              {t("calc.loopImpedance")}: <span className="font-medium">{data.loopImpedance.toFixed(1)}</span>
            </div>
          )}
          {data.shortCircuitCurrent !== undefined && (
            <div className="text-sm">
              {t("calc.iz")}: <span className="font-medium">{data.shortCircuitCurrent.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AszProperties({ nodeId, data }: { nodeId: string; data: AszNodeData }) {
  const t = useT();
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const phaseMode = data.phaseMode ?? "3F";

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{t("asz.title")}</h3>

      <div className="space-y-2">
        <Label htmlFor="phaseMode">{t("asz.phaseMode")}</Label>
        <Select
          value={phaseMode}
          onValueChange={(v) => {
            const next = v as "1F" | "3F";
            updateNodeData(nodeId, {
              phaseMode: next,
              voltage: next === "1F" ? 230 : 400,
            });
          }}
        >
          <SelectTrigger id="phaseMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3F">{t("asz.phase3")}</SelectItem>
            <SelectItem value="1F">{t("asz.phase1")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voltage">{t("asz.voltage")}</Label>
        <Input
          id="voltage"
          type="number"
          min={0}
          step={1}
          value={data.voltage || 400}
          onChange={(e) =>
            updateNodeData(nodeId, { voltage: parseFloat(e.target.value) || 400 })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortCircuitPower">{t("asz.scPower")}</Label>
        <Input
          id="shortCircuitPower"
          type="number"
          min={0}
          step={10}
          value={data.shortCircuitPower || 500}
          onChange={(e) =>
            updateNodeData(nodeId, { shortCircuitPower: parseFloat(e.target.value) || 500 })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedVoltageDrop">{t("asz.allowedDrop")}</Label>
        <Input
          id="allowedVoltageDrop"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={data.allowedVoltageDrop || 4}
          onChange={(e) =>
            updateNodeData(nodeId, { allowedVoltageDrop: parseFloat(e.target.value) || 4 })
          }
        />
      </div>
    </div>
  );
}

function FmFeProperties({
  nodeId,
  data,
  type,
}: {
  nodeId: string;
  data: FmNodeData | FeNodeData;
  type: "fm" | "fe" | "feed";
}) {
  const t = useT();
  const elementName = useElementName();
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);

  const titles = {
    fm: t("node.fm"),
    fe: t("node.fe"),
    feed: t("node.feed"),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{titles[type]}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteNode(nodeId)}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">{t("field.name")}</Label>
        <Input
          id="label"
          value={type === "fe" ? data.label : elementName(data.label, "fm")}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
        />
      </div>

      {type !== "feed" && "kmMarker" in data && (
        <>

          <div className="space-y-2">
            <Label htmlFor="side">{t("field.side")}</Label>
            <Select
              value={data.side || "none"}
              onValueChange={(v) =>
                updateNodeData(nodeId, { side: v === "none" ? "" : (v as "bal" | "jobb") })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("field.choose")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                <SelectItem value="bal">{t("side.left")}</SelectItem>
                <SelectItem value="jobb">{t("side.right")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

function CableProperties({ edgeId, data }: { edgeId: string; data: CableEdgeData }) {
  const t = useT();
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);
  const deleteEdge = useFlowStore((s) => s.deleteEdge);
  const nodes = useFlowStore((s) => s.nodes);

  const aszData = nodes.find((n) => n.type === "asz")?.data as
    | AszNodeData
    | undefined;
  const globalAllowedDrop = aszData?.allowedVoltageDrop ?? 4;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("cable.title")}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteEdge(edgeId)}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="length">{t("cable.length")}</Label>
        <Input
          id="length"
          type="number"
          min={0}
          step={1}
          value={data.length}
          onChange={(e) => updateEdgeData(edgeId, { length: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedDrop">{t("cable.allowedDrop")}</Label>
        <Input
          id="allowedDrop"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={data.allowedVoltageDropPercent ?? ""}
          placeholder={String(globalAllowedDrop)}
          onChange={(e) => {
            const raw = e.target.value;
            updateEdgeData(edgeId, {
              allowedVoltageDropPercent:
                raw === "" ? undefined : parseFloat(raw),
            });
          }}
        />
        <p className="text-xs text-muted-foreground">{t("cable.allowedDropHint")}</p>
      </div>

      <div className="rounded-md border bg-muted/40 px-2.5 py-2 text-xs leading-snug text-muted-foreground">
        <p className="font-medium text-foreground">
          {t("cable.resistivity")}
        </p>
        <p className="mt-0.5 font-mono">{ALUMINIUM_CABLE.resistivityOhmMm2PerM}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="crossSection">{t("cable.crossSection")}</Label>
        <Select
          value={String(data.crossSection)}
          onValueChange={(v) => updateEdgeData(edgeId, { crossSection: parseFloat(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CABLE_CROSS_SECTIONS.map((cs) => (
              <SelectItem key={cs} value={String(cs)}>
                {cs} mm²
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calculated values display - matching Excel columns exactly */}
      {(data.current !== undefined ||
        data.requiredCrossSection !== undefined ||
        data.voltageDropV !== undefined ||
        data.impedance !== undefined) && (
        <div className="rounded-md border bg-muted/50 p-2 space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">{t("calc.title")}</h4>
          {data.current !== undefined && data.current > 0 && (
            <div className="text-sm">
              {t("calc.totalCurrent")}: <span className="font-medium">{data.current.toFixed(2)}</span>
            </div>
          )}
          {data.allowedVoltageDropV !== undefined && data.allowedVoltageDropV > 0 && (
            <div className="text-sm">
              {t("cable.allowedDropV")}: <span className="font-medium">{data.allowedVoltageDropV.toFixed(2)}</span>
            </div>
          )}
          {data.requiredCrossSection !== undefined && data.requiredCrossSection > 0 && (
            <div className="text-sm">
              {t("cable.minCrossSection")}:{" "}
              <span
                className={
                  data.requiredCrossSection > (data.crossSection || 0)
                    ? "font-medium text-destructive"
                    : "font-medium text-green-600"
                }
              >
                {data.requiredCrossSection.toFixed(1)}
              </span>
            </div>
          )}
          {data.voltageDropV !== undefined && (
            <div className="text-sm">
              {t("cable.dropV")}: <span className="font-medium">{data.voltageDropV.toFixed(2)}</span>
            </div>
          )}
          {data.voltageDropPercent !== undefined && (
            <div className="text-sm">
              {t("cable.dropPercent")}: <span className="font-medium">{data.voltageDropPercent.toFixed(2)}</span>
            </div>
          )}
          {data.impedance !== undefined && (
            <div className="text-sm">
              {t("cable.impedance")}: <span className="font-medium">{data.impedance.toFixed(3)}</span>
            </div>
          )}
          {data.shortCircuitCurrent !== undefined && data.shortCircuitCurrent > 0 && (
            <div className="text-sm">
              {t("cable.iz")}: <span className="font-medium">{data.shortCircuitCurrent.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PropertySidebar() {
  const t = useT();
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  // Only mount the sidebar when something is selected; clicking empty space
  // clears the selection (see onPaneClick) which removes the panel entirely.
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  return (
    <div className="w-72 border-l bg-background p-4 overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t("sidebar.properties")}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {selectedNode && selectedNode.type === "cabinet" && (
        <CabinetProperties
          nodeId={selectedNode.id}
          data={selectedNode.data as CabinetNodeData}
        />
      )}

      {selectedNode && selectedNode.type === "asz" && (
        <AszProperties nodeId={selectedNode.id} data={selectedNode.data as AszNodeData} />
      )}

      {selectedNode && selectedNode.type === "fm" && (
        <FmFeProperties nodeId={selectedNode.id} data={selectedNode.data as FmNodeData} type="fm" />
      )}

      {selectedNode && selectedNode.type === "fe" && (
        <FmFeProperties nodeId={selectedNode.id} data={selectedNode.data as FeNodeData} type="fe" />
      )}

      {selectedNode && selectedNode.type === "feed" && (
        <FmFeProperties
          nodeId={selectedNode.id}
          data={selectedNode.data as FmNodeData}
          type="feed"
        />
      )}

      {selectedEdge && (
        <CableProperties
          edgeId={selectedEdge.id}
          data={
            (selectedEdge.data as CableEdgeData) || { length: 0, crossSection: 25 }
          }
        />
      )}
    </div>
  );
}
