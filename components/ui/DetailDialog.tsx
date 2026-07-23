"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DetailDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function DetailDialog({ open, onClose, title, description, children }: DetailDialogProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (dialog === null) {
        return;
      }

      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      const dialog = dialogRef.current;
      if (dialog !== null && !dialog.contains(event.target as Node)) {
        closeButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = previousBodyOverflow;

      const returnFocus = returnFocusRef.current;
      returnFocusRef.current = null;
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      }
    };
  }, [mounted, open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-ui-4 sm:p-ui-6">
      <div aria-hidden="true" className="absolute inset-0 bg-ui-bg/80 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-ui-dialog border border-ui-border bg-ui-panel text-ui-text shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex items-start justify-between gap-ui-4 border-b border-ui-border bg-ui-panel-elevated px-ui-4 py-ui-4 sm:px-ui-6">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-ui-section font-semibold tracking-tight text-ui-text sm:text-ui-page">
              {title}
            </h2>
            <p id={descriptionId} className="mt-ui-1 text-ui-body-sm text-ui-text-muted">
              {description}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close details"
            onClick={() => onCloseRef.current()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-ui-control border border-ui-border bg-ui-panel text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel-elevated"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-w-0 overflow-y-auto px-ui-4 py-ui-6 sm:px-ui-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
