import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";

export default function WorkspacePage() {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-ui-6">
      <div className="rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 text-ui-body-sm text-ui-text-secondary sm:p-ui-6">
        <p className="font-semibold text-ui-text">Saved on this device only.</p>
        <p className="mt-ui-1 text-ui-text-muted">
          Saved research stays only in this browser. It will not appear on
          other devices, and clearing browser data will remove it.
        </p>
      </div>
      <WorkspaceClient />
    </div>
  );
}
