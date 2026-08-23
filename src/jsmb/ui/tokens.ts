/**
 * The one place a tone or a surface turns into Tailwind classes.
 *
 * Two surface families live in this app and the gap between them is the whole
 * aesthetic idea:
 *
 *   "product"  → kraft canvas, fired clay, big honest numbers. Storefront and
 *                admin. Light, warm, plain-spoken.
 *   "console"  → near-black instrument panel. Command centre, mesh, trace.
 *                Dark, alive, technical.
 *
 * Every primitive that can appear on both takes `surface` rather than being
 * duplicated. Nothing here uses a raw hex — only the `j-*` token namespace
 * defined in jsmb.css / tailwind.config.ts.
 */
import type { AgentLane, AgentState } from "../contracts/agents";

export type Tone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warn"
  | "danger"
  | "info";

export type Surface = "product" | "console";

export interface ToneClasses {
  /** Filled, high-emphasis: primary buttons, meter fills, active segments. */
  solid: string;
  /** Tinted, low-emphasis: badges, callouts, selected rows. */
  soft: string;
  /** Text-only, for inline emphasis and icon colour. */
  text: string;
  /** A 6–8px status dot. */
  dot: string;
  /** Hairline border to pair with `soft`. */
  border: string;
  /** Hover wash for transparent variants (outline / ghost). */
  hoverSoft: string;
  /** Background only, no text colour — for meter fills and bars. */
  fill: string;
}

/* ── Product surfaces ───────────────────────────────────────────────────── */

const PRODUCT_TONES: Record<Tone, ToneClasses> = {
  neutral: {
    solid: "bg-j-ink text-j-surface hover:bg-j-ink/90 active:bg-j-ink",
    soft: "bg-j-ink/[0.055] text-j-ink-2 hover:bg-j-ink/[0.09]",
    text: "text-j-ink-2",
    dot: "bg-j-ink-3",
    border: "border-j-line",
    hoverSoft: "hover:bg-j-ink/[0.06]",
    fill: "bg-j-ink-3",
  },
  primary: {
    solid: "bg-j-primary text-white hover:bg-j-primary/90 active:bg-j-primary",
    soft: "bg-j-primary-soft text-j-primary hover:bg-j-primary/15",
    text: "text-j-primary",
    dot: "bg-j-primary",
    border: "border-j-primary/30",
    hoverSoft: "hover:bg-j-primary/10",
    fill: "bg-j-primary",
  },
  accent: {
    solid: "bg-j-accent text-white hover:bg-j-accent/90 active:bg-j-accent",
    soft: "bg-j-accent-soft text-j-accent hover:bg-j-accent/15",
    text: "text-j-accent",
    dot: "bg-j-accent",
    border: "border-j-accent/30",
    hoverSoft: "hover:bg-j-accent/10",
    fill: "bg-j-accent",
  },
  success: {
    solid: "bg-j-success text-white hover:bg-j-success/90",
    soft: "bg-j-success-soft text-j-success hover:bg-j-success/15",
    text: "text-j-success",
    dot: "bg-j-success",
    border: "border-j-success/30",
    hoverSoft: "hover:bg-j-success/10",
    fill: "bg-j-success",
  },
  warn: {
    solid: "bg-j-warn text-white hover:bg-j-warn/90",
    soft: "bg-j-warn-soft text-j-warn hover:bg-j-warn/15",
    text: "text-j-warn",
    dot: "bg-j-warn",
    border: "border-j-warn/30",
    hoverSoft: "hover:bg-j-warn/10",
    fill: "bg-j-warn",
  },
  danger: {
    solid: "bg-j-danger text-white hover:bg-j-danger/90",
    soft: "bg-j-danger-soft text-j-danger hover:bg-j-danger/15",
    text: "text-j-danger",
    dot: "bg-j-danger",
    border: "border-j-danger/30",
    hoverSoft: "hover:bg-j-danger/10",
    fill: "bg-j-danger",
  },
  info: {
    solid: "bg-j-info text-white hover:bg-j-info/90",
    soft: "bg-j-info-soft text-j-info hover:bg-j-info/15",
    text: "text-j-info",
    dot: "bg-j-info",
    border: "border-j-info/30",
    hoverSoft: "hover:bg-j-info/10",
    fill: "bg-j-info",
  },
};

/* ── Console surfaces ───────────────────────────────────────────────────── */

/**
 * On the dark console the base status hues are too dark to read as text, so
 * the `-soft` token (a near-white tint of the same hue) becomes the ink and
 * the base hue stays on the dot and the fill. Same palette, inverted roles.
 */
const CONSOLE_TONES: Record<Tone, ToneClasses> = {
  neutral: {
    solid: "bg-j-console-3 text-j-console-ink hover:bg-j-console-line",
    soft: "bg-j-console-ink/[0.07] text-j-console-ink-2 hover:bg-j-console-ink/[0.12]",
    text: "text-j-console-ink-2",
    dot: "bg-j-console-ink-2",
    border: "border-j-console-line",
    hoverSoft: "hover:bg-j-console-ink/[0.08]",
    fill: "bg-j-console-ink-2",
  },
  primary: {
    solid: "bg-j-primary text-white hover:bg-j-primary-bright",
    soft: "bg-j-primary/15 text-j-primary-bright hover:bg-j-primary/25",
    text: "text-j-primary-bright",
    dot: "bg-j-primary-bright",
    border: "border-j-primary/40",
    hoverSoft: "hover:bg-j-primary/20",
    fill: "bg-j-primary-bright",
  },
  accent: {
    solid: "bg-j-accent text-white hover:bg-j-accent/85",
    soft: "bg-j-accent/20 text-j-accent-soft hover:bg-j-accent/30",
    text: "text-j-accent-soft",
    dot: "bg-j-lane-back",
    border: "border-j-accent/40",
    hoverSoft: "hover:bg-j-accent/25",
    fill: "bg-j-lane-back",
  },
  success: {
    solid: "bg-j-success text-white hover:bg-j-success/85",
    soft: "bg-j-success/20 text-j-success-soft hover:bg-j-success/30",
    text: "text-j-success-soft",
    dot: "bg-j-success",
    border: "border-j-success/40",
    hoverSoft: "hover:bg-j-success/20",
    fill: "bg-j-success",
  },
  warn: {
    solid: "bg-j-warn text-white hover:bg-j-warn/85",
    soft: "bg-j-warn/20 text-j-warn-soft hover:bg-j-warn/30",
    text: "text-j-warn-soft",
    dot: "bg-j-warn",
    border: "border-j-warn/40",
    hoverSoft: "hover:bg-j-warn/20",
    fill: "bg-j-warn",
  },
  danger: {
    solid: "bg-j-danger text-white hover:bg-j-danger/85",
    soft: "bg-j-danger/20 text-j-danger-soft hover:bg-j-danger/30",
    text: "text-j-danger-soft",
    dot: "bg-j-danger",
    border: "border-j-danger/40",
    hoverSoft: "hover:bg-j-danger/20",
    fill: "bg-j-danger",
  },
  info: {
    solid: "bg-j-info text-white hover:bg-j-info/85",
    soft: "bg-j-info/20 text-j-info-soft hover:bg-j-info/30",
    text: "text-j-info-soft",
    dot: "bg-j-info",
    border: "border-j-info/40",
    hoverSoft: "hover:bg-j-info/20",
    fill: "bg-j-info",
  },
};

export function toneClasses(tone: Tone, surface: Surface = "product"): ToneClasses {
  return surface === "console" ? CONSOLE_TONES[tone] : PRODUCT_TONES[tone];
}

/* ── Shared surface chrome ──────────────────────────────────────────────── */

export interface SurfaceChrome {
  /** Page/panel background. */
  bg: string;
  /** Raised panel background. */
  panel: string;
  /** Card class from jsmb.css. */
  card: string;
  /** Primary ink. */
  ink: string;
  /** Secondary ink — captions, labels, axis text. */
  ink2: string;
  /** Tertiary ink — hints, disabled. */
  ink3: string;
  /** Hairline. */
  line: string;
  /** Divide utility for stacked rows. */
  divide: string;
  /** Colour to ring against, e.g. behind a focus ring or a chart end-dot. */
  ringOffset: string;
}

const CHROME: Record<Surface, SurfaceChrome> = {
  product: {
    bg: "bg-j-canvas",
    panel: "bg-j-surface",
    card: "j-card",
    ink: "text-j-ink",
    ink2: "text-j-ink-2",
    ink3: "text-j-ink-3",
    line: "border-j-line",
    divide: "divide-j-line",
    ringOffset: "ring-offset-j-canvas",
  },
  console: {
    bg: "bg-j-console",
    panel: "bg-j-console-2",
    card: "j-console-card",
    ink: "text-j-console-ink",
    ink2: "text-j-console-ink-2",
    ink3: "text-j-console-ink-2/70",
    line: "border-j-console-line",
    divide: "divide-j-console-line",
    ringOffset: "ring-offset-j-console",
  },
};

export function chrome(surface: Surface = "product"): SurfaceChrome {
  return CHROME[surface];
}

/** Keyboard-only focus ring. Every interactive primitive spreads this. */
export function focusRing(surface: Surface = "product"): string {
  return cnJoin(
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary",
    "focus-visible:ring-offset-2",
    CHROME[surface].ringOffset,
  );
}

/** Ring without an offset — for controls flush inside a tinted container. */
export function focusRingInset(): string {
  return "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-0";
}

function cnJoin(...parts: string[]): string {
  return parts.join(" ");
}

/* ── Agent vocabulary ───────────────────────────────────────────────────── */

/** Maps a live agent state onto the shared tone scale. */
export function agentStateTone(state: AgentState): Tone {
  switch (state) {
    case "idle":
      return "neutral";
    case "listening":
      return "info";
    case "thinking":
      return "primary";
    case "tool":
      return "accent";
    case "handoff":
      return "info";
    case "waiting-human":
      return "warn";
    case "done":
      return "success";
    case "error":
      return "danger";
  }
}

export const AGENT_STATE_LABEL: Record<AgentState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  tool: "Tool call",
  handoff: "Handing off",
  "waiting-human": "Needs you",
  done: "Done",
  error: "Error",
};

/** States that should breathe (`.j-pulse-ring` respects reduced motion). */
export function agentStateIsLive(state: AgentState): boolean {
  return state === "thinking" || state === "tool" || state === "handoff" || state === "listening";
}

export const LANE_LABEL: Record<AgentLane, string> = {
  "front-office": "Front office",
  "order-to-cash": "Order to cash",
  "back-office": "Back office",
};

export const LANE_DOT: Record<AgentLane, string> = {
  "front-office": "bg-j-lane-front",
  "order-to-cash": "bg-j-lane-otc",
  "back-office": "bg-j-lane-back",
};

export const LANE_TEXT: Record<AgentLane, string> = {
  "front-office": "text-j-lane-front",
  "order-to-cash": "text-j-lane-otc",
  "back-office": "text-j-lane-back",
};

export const LANE_ORDER: AgentLane[] = ["front-office", "order-to-cash", "back-office"];

/* ── Shared measurements ────────────────────────────────────────────────── */

/** Uppercase micro-label used above every stat, section and panel. */
export const EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.14em]";

/** Content gutter. Mobile-first: 16px, opening up on wider screens. */
export const GUTTER = "px-4 sm:px-6 lg:px-8";
