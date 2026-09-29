"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

type Item = { id: string };

export function SortableAdminGrid<T extends Item>({
  items,
  onReorder,
  className,
  renderItem,
}: {
  items: T[];
  onReorder: (next: T[]) => void | Promise<void>;
  className?: string;
  renderItem: (item: T) => ReactNode;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const moveItem = (fromId: string, toId: string) => {
    if (fromId === toId) return items;
    const fromIndex = items.findIndex((i) => i.id === fromId);
    const toIndex = items.findIndex((i) => i.id === toId);
    if (fromIndex < 0 || toIndex < 0) return items;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const commitReorder = async (next: T[]) => {
    setSaving(true);
    try {
      await onReorder(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      {saving ? (
        <p className="mb-2 text-xs font-medium text-sky-700">Saving order…</p>
      ) : (
        <p className="mb-2 text-xs text-slate-500">Drag cards by the handle to change homepage order.</p>
      )}
      <div className={className}>
        {items.map((item) => {
          const isDragging = draggingId === item.id;
          const isOver = overId === item.id && draggingId !== item.id;
          return (
            <article
              key={item.id}
              draggable
              onDragStart={(e) => {
                setDraggingId(item.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", item.id);
                // Improve drag ghost opacity in some browsers
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.opacity = "0.55";
                }
              }}
              onDragEnd={(e) => {
                setDraggingId(null);
                setOverId(null);
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.opacity = "1";
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overId !== item.id) setOverId(item.id);
              }}
              onDragLeave={() => {
                if (overId === item.id) setOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/plain") || draggingId;
                setOverId(null);
                setDraggingId(null);
                if (!fromId) return;
                const next = moveItem(fromId, item.id);
                if (next !== items) void commitReorder(next);
              }}
              className={`overflow-hidden rounded-lg border bg-white transition duration-150 ${
                isDragging ? "scale-[1.02] shadow-xl ring-2 ring-sky-300" : "shadow-sm"
              } ${isOver ? "ring-2 ring-sky-400 ring-offset-2" : ""}`}
            >
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                <span
                  className="inline-flex cursor-grab items-center text-slate-400 active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-hidden
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Drag to reorder
                </span>
              </div>
              {renderItem(item)}
            </article>
          );
        })}
      </div>
    </div>
  );
}
