import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

export function WorkspacePanels({ sidebar, main, className }) {
  return (
    <PanelGroup direction="horizontal" className={cn("min-h-[480px] rounded-xl border bg-card", className)}>
      <Panel defaultSize={28} minSize={20} maxSize={40}>
        <div className="h-full overflow-y-auto border-r bg-muted/30 p-4">{sidebar}</div>
      </Panel>
      <PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/30" />
      <Panel defaultSize={72} minSize={50}>
        <div className="h-full overflow-y-auto p-4">{main}</div>
      </Panel>
    </PanelGroup>
  );
}
