import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";

export default function WorkspacePage() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Saved on this device only.</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Saved research stays only in this browser. It will not appear on
          other devices, and clearing browser data will remove it.
        </p>
      </div>
      <WorkspaceClient />
    </div>
  );
}
