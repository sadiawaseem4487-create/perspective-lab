import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

const COLORS = {
  freire: "#c2410c",
  weber: "#1e40af",
  montessori: "#15803d",
  rogers: "#7c3aed",
};

function StageNode({ data }) {
  const { label, vaihe, role, status, selfCheck, color } = data;
  return (
    <div
      className={cn(
        "min-w-[160px] rounded-xl border px-3 py-3 shadow-lg backdrop-blur-sm",
        status === "active" && "ring-2 ring-orange-400",
        status === "done" && "border-emerald-500/40 bg-emerald-500/10",
        status === "pending" && "border-white/15 bg-slate-900/80",
        status === "active" && "border-orange-500/50 bg-orange-500/15"
      )}
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Vaihe {vaihe}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{String(role || "").replace(/_/g, " ")}</p>
      {selfCheck != null && (
        <p className={cn("mt-2 text-[10px] font-medium", selfCheck ? "text-emerald-400" : "text-amber-400")}>
          {selfCheck ? "Self-check ok" : "Needs review"}
        </p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

export function SequentialFlowGraph({
  stages,
  currentVaihe,
  responses,
  status,
  checkpointNote,
  onCheckpointNoteChange,
  onAdvance,
  loading,
  t,
}) {
  const responseByVaihe = useMemo(() => {
    const map = {};
    for (const response of responses || []) {
      const vaihe = response?.sequential_stage?.vaihe;
      if (vaihe) map[vaihe] = response;
    }
    return map;
  }, [responses]);

  const nodes = useMemo(() => {
    return (stages || []).map((stage, index) => {
      const response = responseByVaihe[stage.vaihe];
      const done = currentVaihe > stage.vaihe || Boolean(response);
      const active = currentVaihe === stage.vaihe;
      let nodeStatus = "pending";
      if (active) nodeStatus = "active";
      else if (done) nodeStatus = "done";
      return {
        id: String(stage.vaihe),
        type: "stage",
        position: { x: index * 220, y: 40 },
        data: {
          label: stage.label || stage.agent_id,
          vaihe: stage.vaihe,
          role: stage.role,
          status: nodeStatus,
          selfCheck: response?.self_check ? response.self_check.passed : null,
          color: COLORS[(stage.agent_id || stage.label || "").toLowerCase()] || "#78716c",
        },
        draggable: false,
      };
    });
  }, [stages, currentVaihe, responseByVaihe]);

  const edges = useMemo(() => {
    const list = [];
    for (let i = 0; i < (stages || []).length - 1; i += 1) {
      const a = stages[i];
      const b = stages[i + 1];
      list.push({
        id: `e-${a.vaihe}-${b.vaihe}`,
        source: String(a.vaihe),
        target: String(b.vaihe),
        animated: currentVaihe === a.vaihe && status === "running",
        style: { stroke: "#64748b" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
      });
    }
    return list;
  }, [stages, currentVaihe, status]);

  const onInit = useCallback((instance) => {
    instance.fitView({ padding: 0.2 });
  }, []);

  return (
    <div className="space-y-4">
      <div className="h-56 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll={false}
        >
          <Background color="#334155" gap={18} />
          <Controls showInteractive={false} className="!bg-slate-900 !border-white/10 !fill-slate-300" />
        </ReactFlow>
      </div>

      {status === "awaiting_review" && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <p className="text-sm font-semibold text-orange-200">
            {t?.("stage3.hitlTitle") || "Human review checkpoint"} — Vaihe {currentVaihe}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t?.("stage3.hitlDesc") ||
              "Approve this stage before the next theorist runs. Your note is injected into the next prompt."}
          </p>
          <textarea
            value={checkpointNote}
            onChange={(e) => onCheckpointNoteChange?.(e.target.value)}
            rows={2}
            className="mt-3 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder={t?.("stage3.checkpointPlaceholder") || "Optional note for the next agent…"}
          />
          <button
            type="button"
            onClick={onAdvance}
            disabled={loading}
            className="page-btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-50"
          >
            {currentVaihe >= 4
              ? t?.("stage3.completeWorkflow") || "Complete workflow"
              : t?.("stage3.approveContinue") || "Approve & continue"}
          </button>
        </div>
      )}
    </div>
  );
}
