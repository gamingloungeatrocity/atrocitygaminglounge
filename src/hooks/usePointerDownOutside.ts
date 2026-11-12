import { useEffect, useRef, type RefObject } from "react";

type OutsideEntry = {
  id: symbol;
  refs: ReadonlyArray<RefObject<HTMLElement | null>>;
  onOutside: () => void;
};

const entries: OutsideEntry[] = [];
let listening = false;

function onPointerDown(event: PointerEvent) {
  const active = entries.at(-1);
  const target = event.target;
  if (!active || !(target instanceof Node)) return;

  if (active.refs.some((ref) => ref.current?.contains(target))) return;
  active.onOutside();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  const target = event.target;
  if (
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && ["date", "time", "datetime-local"].includes(target.type))
  ) {
    return;
  }
  const active = entries.at(-1);
  if (!active) return;

  event.preventDefault();
  active.onOutside();
}

function startListening() {
  if (listening) return;
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown);
  listening = true;
}

function stopListening() {
  if (!listening || entries.length > 0) return;
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKeyDown);
  listening = false;
}

/**
 * Closes the top-most registered surface when a mouse click or touch begins
 * outside its content or when Escape is pressed. Registration order provides
 * predictable nested-overlay behavior without closing every open surface.
 */
export function usePointerDownOutside(
  refs: RefObject<HTMLElement | null> | ReadonlyArray<RefObject<HTMLElement | null>>,
  enabled: boolean,
  onOutside: () => void,
) {
  const callbackRef = useRef(onOutside);
  callbackRef.current = onOutside;

  useEffect(() => {
    if (!enabled) return;

    const entry: OutsideEntry = {
      id: Symbol("outside-surface"),
      refs: Array.isArray(refs) ? refs : [refs],
      onOutside: () => callbackRef.current(),
    };
    entries.push(entry);
    startListening();

    return () => {
      const index = entries.findIndex((item) => item.id === entry.id);
      if (index >= 0) entries.splice(index, 1);
      stopListening();
    };
  }, [enabled, refs]);
}
