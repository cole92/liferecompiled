// src/constants/uiClasses.js

// Small helper (optional). If you do not want it, delete it.
export const cx = (...classes) => classes.filter(Boolean).join(" ");

// -----------------------------
// Avatar
// -----------------------------
export const AVATAR_FRAME_BASE = "bg-zinc-900/40 shadow-sm shadow-black/30";
export const AVATAR_RING_DEFAULT =
  "ring-1 ring-sky-200/20 ring-offset-2 ring-offset-zinc-950/60";
export const AVATAR_RING_TOP =
  "ring-2 ring-amber-300/75 ring-offset-2 ring-offset-zinc-950/70 shadow-[0_0_0_3px_rgba(251,191,36,0.10)]";

// -----------------------------
// Focus ring (a11y consistency)
// -----------------------------
export const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

// -----------------------------
// Pills / Chips (Category / Tags / Meta)
// -----------------------------
export const PILL_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
  "max-w-[12rem] truncate";

export const PILL_CATEGORY = `${PILL_BASE} border-zinc-800 bg-sky-500/5 text-zinc-200`;

export const PILL_TAG =
  "inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 " +
  "px-3 py-1 text-xs text-sky-200 max-w-[12rem] truncate";

export const PILL_META = `${PILL_BASE} border-zinc-800 bg-zinc-950/25 text-zinc-200`;

// -----------------------------
// Text tones
// -----------------------------
export const TEXT_MUTED = "text-zinc-400";
export const TEXT_HELP = "text-sm text-zinc-300";

// -----------------------------
// Surfaces (Dropdown / Drawer / Panels)
// Keep them consistent so everything feels like one system.
// -----------------------------
export const SURFACE_PANEL =
  "ui-card bg-zinc-950/95 shadow-2xl border border-zinc-800/80";

export const SURFACE_PANEL_INNER = "overflow-hidden rounded-xl p-1";

export const SURFACE_PANEL_ARROW =
  "absolute -top-1 right-5 w-3 h-3 bg-zinc-950/95 rotate-45 " +
  "border-l border-t border-zinc-800/80 z-0";

// -----------------------------
// Cards (generic). Home can keep its special gradient.
// -----------------------------
export const CARD_BASE =
  "ui-card relative w-full overflow-hidden p-4 shadow-sm ring-1 ring-zinc-100/5";

export const CARD_HOVER =
  "cursor-pointer hover:shadow-md transition-colors transition-shadow duration-200";

export const CARD_LOCKED =
  "opacity-60 grayscale saturate-0 bg-zinc-950/80 border-zinc-800/90 ring-zinc-100/5";
