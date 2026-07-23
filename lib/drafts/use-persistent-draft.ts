import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getStorageSafely, readDraft, resolveDraftRestore, writeDraft } from "./storage";

export interface UsePersistentDraftOptions {
  /**
   * A value that must win over any stored draft (e.g. Opportunity Feed's
   * `initialInputs`, derived from the query string or Workspace). When
   * non-empty, it becomes both the field's initial value and the new
   * stored draft, and any previously stored draft is ignored.
   */
  readonly priorityValue?: string;
}

function getWindowHost(): { readonly localStorage: Storage } | undefined {
  return typeof window === "undefined" ? undefined : window;
}

/** Read-only; safe to call more than once per render (e.g. under StrictMode). */
function readStoredValue(storageKey: string): string {
  const storage = getStorageSafely(getWindowHost());
  if (!storage) {
    return "";
  }
  return readDraft(storage, storageKey) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

/**
 * Deliberately never subscribes to cross-tab storage changes: React may
 * call `getSnapshot` multiple times (e.g. under StrictMode, or to recheck
 * after hydration), but that read is side-effect-free, and this no-op
 * `subscribe` means those reads are the only thing that happens — the hook
 * never re-renders in response to another tab writing to the same key. That
 * keeps a draft the user is actively typing in this tab from being
 * overwritten by another tab's draft.
 */
function subscribeNoop(): () => void {
  return () => {};
}

/**
 * Persists a single text/textarea field's value to localStorage under
 * `storageKey`, restoring it on mount and clearing the key once the field is
 * emptied. SSR-safe: the value used to match server-rendered markup is
 * always the empty string (or `priorityValue`, which never touches
 * storage), and the real stored draft is only read on the client via
 * `useSyncExternalStore`, which resolves the hydration swap without an
 * effect-based `setState` call.
 */
export function usePersistentDraft(
  storageKey: string,
  options: UsePersistentDraftOptions = {},
): readonly [string, Dispatch<SetStateAction<string>>] {
  const { priorityValue = "" } = options;

  const storedValue = useSyncExternalStore(
    subscribeNoop,
    () => readStoredValue(storageKey),
    getServerSnapshot,
  );

  const action = resolveDraftRestore(priorityValue, storedValue.length > 0 ? storedValue : null);
  const externalValue = action.kind === "keep" ? "" : action.value;

  const [appliedExternalValue, setAppliedExternalValue] = useState(externalValue);
  const [value, setValueState] = useState(externalValue);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  // Persisting priorityValue must happen on the very first write (it's
  // already known synchronously, unlike a stored draft which is only
  // available after the client resync above); a restored/absent draft must
  // NOT be written on that same first pass, or it would overwrite the not
  // -yet-read stored draft with the SSR-safe empty placeholder.
  const skipNextWriteRef = useRef(action.kind !== "persist");

  // Adjust local state when the external value changes (e.g. once the real
  // client-side draft becomes available after hydration), without an
  // effect. Never overwrites a value the user has already started editing.
  if (externalValue !== appliedExternalValue && !hasUserEdited) {
    setAppliedExternalValue(externalValue);
    setValueState(externalValue);
  }

  const setValue = useCallback<Dispatch<SetStateAction<string>>>((next) => {
    setHasUserEdited(true);
    setValueState(next);
  }, []);

  useEffect(() => {
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    const storage = getStorageSafely(getWindowHost());
    if (storage) {
      writeDraft(storage, storageKey, value);
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}
