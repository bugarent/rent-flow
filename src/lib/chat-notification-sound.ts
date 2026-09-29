/** Client-side chat notification tones (Web Audio — no asset files). */

export const CHAT_SOUND_PRESETS = [
  { id: "chime", label: "Chime" },
  { id: "ping", label: "Ping" },
  { id: "soft", label: "Soft bell" },
  { id: "alert", label: "Alert" },
  { id: "double", label: "Double beep" },
] as const;

export type ChatSoundId = (typeof CHAT_SOUND_PRESETS)[number]["id"];

export const DEFAULT_CHAT_SOUND: ChatSoundId = "chime";

const ADMIN_SOUND_KEY = "rac_admin_chat_sound";
const ADMIN_MUTED_KEY = "rac_admin_chat_muted_ids";
const GUEST_SOUND_KEY = "rac_guest_chat_sound";

export function isChatSoundId(value: string | null | undefined): value is ChatSoundId {
  return CHAT_SOUND_PRESETS.some((p) => p.id === value);
}

export function getAdminChatSoundId(): ChatSoundId {
  if (typeof window === "undefined") return DEFAULT_CHAT_SOUND;
  try {
    const raw = localStorage.getItem(ADMIN_SOUND_KEY);
    return isChatSoundId(raw) ? raw : DEFAULT_CHAT_SOUND;
  } catch {
    return DEFAULT_CHAT_SOUND;
  }
}

export function setAdminChatSoundId(id: ChatSoundId) {
  try {
    localStorage.setItem(ADMIN_SOUND_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getGuestChatSoundId(): ChatSoundId {
  if (typeof window === "undefined") return DEFAULT_CHAT_SOUND;
  try {
    const raw = localStorage.getItem(GUEST_SOUND_KEY);
    return isChatSoundId(raw) ? raw : DEFAULT_CHAT_SOUND;
  } catch {
    return DEFAULT_CHAT_SOUND;
  }
}

export function getAdminMutedChatIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADMIN_MUTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function setAdminChatMuted(chatId: string, muted: boolean) {
  try {
    const set = new Set(getAdminMutedChatIds());
    if (muted) set.add(chatId);
    else set.delete(chatId);
    localStorage.setItem(ADMIN_MUTED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export function isAdminChatMuted(chatId: string): boolean {
  return getAdminMutedChatIds().includes(chatId);
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.55,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.min(gainPeak, 0.85), start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playChatSound(soundId: ChatSoundId = DEFAULT_CHAT_SOUND) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const t0 = ctx.currentTime + 0.01;
    if (soundId === "ping") {
      tone(ctx, 880, t0, 0.16, "triangle", 0.65);
      tone(ctx, 1175, t0 + 0.08, 0.2, "triangle", 0.5);
    } else if (soundId === "soft") {
      tone(ctx, 523.25, t0, 0.28, "sine", 0.5);
      tone(ctx, 659.25, t0 + 0.1, 0.35, "sine", 0.45);
    } else if (soundId === "alert") {
      tone(ctx, 740, t0, 0.12, "square", 0.45);
      tone(ctx, 740, t0 + 0.16, 0.12, "square", 0.45);
      tone(ctx, 880, t0 + 0.32, 0.2, "square", 0.55);
    } else if (soundId === "double") {
      tone(ctx, 660, t0, 0.12, "sine", 0.65);
      tone(ctx, 990, t0 + 0.16, 0.18, "sine", 0.7);
    } else {
      // chime — louder multi-tone
      tone(ctx, 523.25, t0, 0.22, "sine", 0.55);
      tone(ctx, 659.25, t0 + 0.1, 0.28, "sine", 0.6);
      tone(ctx, 783.99, t0 + 0.2, 0.4, "sine", 0.65);
      tone(ctx, 1046.5, t0 + 0.28, 0.35, "triangle", 0.4);
    }
    window.setTimeout(() => void ctx.close(), 1600);
  } catch {
    /* autoplay / audio blocked */
  }
}
