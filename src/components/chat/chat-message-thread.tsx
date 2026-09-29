"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TimedMessage = {
  id: string;
  createdAt: string;
  sender?: string;
  body?: string;
  imageUrl?: string | null;
};

/** Oldest → newest (latest messages at the bottom, near the input). */
export function messagesOldestFirst<T extends TimedMessage>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id);
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

type Props<T extends TimedMessage> = {
  messages: T[];
  className?: string;
  renderMessage: (message: T) => ReactNode;
};

export function ChatMessageThread<T extends TimedMessage>({
  messages,
  className,
  renderMessage,
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const ordered = useMemo(() => messagesOldestFirst(messages), [messages]);
  const newestId = ordered[ordered.length - 1]?.id ?? "";

  const scrollToLatest = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useLayoutEffect(() => {
    scrollToLatest();
  }, [newestId, ordered.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(id);
  }, [newestId, ordered.length]);

  return (
    <div ref={scrollerRef} className={cn("space-y-2 overflow-y-auto", className)}>
      {ordered.map((m) => (
        <div key={m.id}>{renderMessage(m)}</div>
      ))}
    </div>
  );
}
