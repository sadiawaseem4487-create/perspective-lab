import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "perspective_lab_workflow_mode";

export const WORKFLOW_MODES = ["parallel", "sequential", "sequential_hitl"];

const WorkflowModeContext = createContext(null);

function normalizeMode(value) {
  return WORKFLOW_MODES.includes(value) ? value : "parallel";
}

export function WorkflowModeProvider({ children }) {
  const [workflowMode, setWorkflowModeState] = useState(() => {
    try {
      return normalizeMode(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "parallel";
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, workflowMode);
  }, [workflowMode]);

  const setWorkflowMode = (next) => {
    setWorkflowModeState(normalizeMode(next));
  };

  const value = useMemo(
    () => ({
      workflowMode,
      setWorkflowMode,
      isParallel: workflowMode === "parallel",
      isChain: workflowMode === "sequential",
      isChainReview: workflowMode === "sequential_hitl",
    }),
    [workflowMode]
  );

  return (
    <WorkflowModeContext.Provider value={value}>{children}</WorkflowModeContext.Provider>
  );
}

export function useWorkflowMode() {
  const ctx = useContext(WorkflowModeContext);
  if (!ctx) throw new Error("useWorkflowMode must be used within WorkflowModeProvider");
  return ctx;
}
