"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 10;

export type DropTarget = { id: string; after: boolean };

type DragState<T> = {
  id: string | null;
  pointerId: number | null;
  origin: { x: number; y: number } | null;
  timer: ReturnType<typeof setTimeout> | null;
  active: boolean;
  drop: DropTarget | null;
  snapshot: T[] | null;
};

function hitRow(x: number, y: number, fromId: string): DropTarget | "self" | null {
  const el = document.elementFromPoint(x, y);
  const row = el?.closest("[data-extra-id]") as HTMLElement | null;
  const id = row?.dataset.extraId;
  if (!row || !id) return null;
  if (id === fromId) return "self";
  const rect = row.getBoundingClientRect();
  return { id, after: y >= rect.top + rect.height / 2 };
}

function placeItem<T extends { id: string }>(
  list: T[],
  fromId: string,
  targetId: string,
  after: boolean,
): T[] {
  const from = list.findIndex((item) => item.id === fromId);
  if (from < 0) return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) return list;
  let insertAt = next.findIndex((item) => item.id === targetId);
  if (insertAt < 0) return list;
  if (after) insertAt += 1;
  next.splice(insertAt, 0, moved);
  return next;
}

function sameOrder<T extends { id: string }>(a: T[], b: T[]) {
  return a.length === b.length && a.every((item, index) => item.id === b[index]?.id);
}

/**
 * Hold a row, then drag it onto another row. The list updates on release
 * so the row under the pointer is not re-mounted mid-gesture.
 */
export function useLongPressReorder<T extends { id: string }>(opts: {
  items: T[];
  setItems: (next: T[]) => void;
  onCommit: (next: T[], previous: T[]) => void | Promise<void>;
}) {
  const itemsRef = useRef(opts.items);
  const setItemsRef = useRef(opts.setItems);
  const onCommitRef = useRef(opts.onCommit);
  useLayoutEffect(() => {
    itemsRef.current = opts.items;
    setItemsRef.current = opts.setItems;
    onCommitRef.current = opts.onCommit;
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragRef = useRef<DragState<T>>({
    id: null,
    pointerId: null,
    origin: null,
    timer: null,
    active: false,
    drop: null,
    snapshot: null,
  });
  const detachRef = useRef<(() => void) | null>(null);

  const resetGestureChrome = () => {
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    document.documentElement.style.touchAction = "";
  };

  const clearTimer = () => {
    const state = dragRef.current;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    state.origin = null;
  };

  const finish = useCallback((commit: boolean) => {
    detachRef.current?.();
    detachRef.current = null;
    const state = dragRef.current;
    clearTimer();
    const wasActive = state.active;
    const id = state.id;
    const drop = state.drop;
    const snapshot = state.snapshot;
    state.active = false;
    state.id = null;
    state.pointerId = null;
    state.drop = null;
    state.snapshot = null;
    setDraggingId(null);
    setDropTarget(null);
    resetGestureChrome();
    if (wasActive) {
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        window.removeEventListener("click", swallow, true);
      };
      window.addEventListener("click", swallow, true);
      window.setTimeout(() => window.removeEventListener("click", swallow, true), 500);
    }
    if (!wasActive || !id || !snapshot) return;
    if (!commit || !drop || drop.id === id) return;
    const next = placeItem(snapshot, id, drop.id, drop.after);
    if (sameOrder(next, snapshot)) return;
    setItemsRef.current(next);
    void onCommitRef.current(next, snapshot);
  }, []);

  useEffect(() => {
    return () => {
      detachRef.current?.();
      clearTimer();
      resetGestureChrome();
    };
  }, []);

  const onPointerDown = (id: string, event: ReactPointerEvent) => {
    if (event.button !== 0 || dragRef.current.active) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea, label")) return;

    detachRef.current?.();
    clearTimer();

    const state = dragRef.current;
    state.pointerId = event.pointerId;
    state.origin = { x: event.clientX, y: event.clientY };
    state.id = id;
    state.drop = null;
    if (event.pointerType === "mouse") event.preventDefault();

    const publishDrop = (hit: DropTarget | null) => {
      state.drop = hit;
      setDropTarget((prev) => {
        if (prev?.id === hit?.id && prev?.after === hit?.after) return prev;
        return hit;
      });
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== dragRef.current.pointerId) return;
      const current = dragRef.current;
      if (!current.active) {
        if (!current.origin) return;
        const dx = Math.abs(ev.clientX - current.origin.x);
        const dy = Math.abs(ev.clientY - current.origin.y);
        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
          clearTimer();
          current.id = null;
          current.pointerId = null;
          detachRef.current?.();
          detachRef.current = null;
        }
        return;
      }
      ev.preventDefault();
      const hit = hitRow(ev.clientX, ev.clientY, current.id || id);
      if (hit === "self") publishDrop(null);
      else if (hit) publishDrop(hit);
      const edge = 72;
      if (ev.clientY < edge) window.scrollBy(0, -16);
      else if (ev.clientY > window.innerHeight - edge) window.scrollBy(0, 16);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== dragRef.current.pointerId) return;
      finish(true);
    };

    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== dragRef.current.pointerId) return;
      finish(false);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") finish(false);
    };

    const detach = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
      window.removeEventListener("keydown", onKey);
    };
    detachRef.current = detach;
    window.addEventListener("pointermove", onMove, { capture: true, passive: false });
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    window.addEventListener("keydown", onKey);

    state.timer = setTimeout(() => {
      const current = dragRef.current;
      if (current.pointerId == null || current.id !== id) return;
      current.active = true;
      current.snapshot = itemsRef.current;
      current.drop = null;
      setDraggingId(id);
      setDropTarget(null);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      document.documentElement.style.touchAction = "none";
    }, LONG_PRESS_MS);
  };

  const onContextMenu = (event: ReactMouseEvent) => {
    if (dragRef.current.active || dragRef.current.timer) event.preventDefault();
  };

  return { draggingId, dropTarget, onPointerDown, onContextMenu };
}
