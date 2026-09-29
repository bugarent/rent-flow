/** Tiny client bus so any “Start chat” CTA can open the docked floating widget. */

type Listener = () => void;

const listeners = new Set<Listener>();

export function openLiveChatWidget() {
  listeners.forEach((fn) => fn());
}

export function subscribeLiveChatWidget(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
