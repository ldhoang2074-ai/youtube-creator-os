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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-zinc-950/50" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-lg font-semibold">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close details"
            onClick={() => onCloseRef.current()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-w-0 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
