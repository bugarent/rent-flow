"use client";

import { useEffect } from "react";

const PRESSABLE =
  'button, [role="button"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], a[href], input[type="submit"], input[type="button"], input[type="reset"], summary';

/** A quick tap releases before the browser paints :active; keep the pressed look this long. */
const MIN_PRESSED_MS = 180;

function pressableFrom(target: EventTarget | null): HTMLElement | null {
  const el = (target as Element | null)?.closest?.(PRESSABLE);
  if (!(el instanceof HTMLElement)) return null;
  if (el.matches(":disabled, [aria-disabled='true']")) return null;
  return el;
}

/**
 * Marks the pressed control with `data-pressed` so every button and link on the site
 * visibly reacts to a tap or click (styles in globals.css), including fast taps on phones.
 */
export function PressFeedback() {
  useEffect(() => {
    let current: HTMLElement | null = null;
    let pressedAt = 0;
    let releaseTimer: number | null = null;

    const clearTimer = () => {
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      releaseTimer = null;
    };
    const press = (el: HTMLElement) => {
      clearTimer();
      if (current && current !== el) current.removeAttribute("data-pressed");
      current = el;
      pressedAt = performance.now();
      el.setAttribute("data-pressed", "");
    };
    const release = () => {
      const el = current;
      if (!el) return;
      const wait = Math.max(0, MIN_PRESSED_MS - (performance.now() - pressedAt));
      clearTimer();
      releaseTimer = window.setTimeout(() => {
        el.removeAttribute("data-pressed");
        if (current === el) current = null;
      }, wait);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const el = pressableFrom(event.target);
      if (el) press(el);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
      const el = pressableFrom(event.target);
      if (!el) return;
      press(el);
      release();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("pointerup", release, { capture: true, passive: true });
    document.addEventListener("pointercancel", release, { capture: true, passive: true });
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", release);
    return () => {
      clearTimer();
      current?.removeAttribute("data-pressed");
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", release, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", release);
    };
  }, []);

  return null;
}
