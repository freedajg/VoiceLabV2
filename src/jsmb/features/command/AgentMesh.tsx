/**
 * The agent mesh — the centrepiece of the demo.
 *
 * Twelve agents at their hand-placed registry coordinates, grouped into the
 * three lanes of the business, with every static handoff path drawn between
 * them. A path that is live right now carries a packet travelling along it; an
 * agent that is working right now breathes.
 *
 * Everything is laid out inside a viewBox, so the whole board scales as one
 * object and never depends on a pixel width. Below `xl` — a laptop with the
 * rail open, a tablet, a phone — the graph would shrink past legibility, so it
 * is replaced by the same information as a stacked lane list rather than an
 * unreadable diagram.
 */
import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "../../ui/cn";
import {
  AGENT_STATE_LABEL,
  Badge,
  EYEBROW,
  agentStateIsLive,
  agentStateTone,
} from "../../ui";
import { TONE_FILL, wrapText } from "./lib";
import { useAgentStore } from "../../store/agentStore";
import { AGENTS, AGENT_BY_ID, LANES, MESH_EDGES } from "../../agents/registry";
import type {
  AgentDef,
  AgentId,
  AgentLane,
  AgentState,
} from "../../contracts/agents";

/* ── Geometry ──────────────────────────────────────────────────────────── */

const VIEW_W = 1080;
const VIEW_H = 580;
const PAD_X = 96;
const PAD_Y = 38;
const INNER_W = VIEW_W - PAD_X * 2;
const INNER_H = 540;

const NODE_W = 150;
const NODE_H = 50;
const HALF_W = NODE_W / 2;
const HALF_H = NODE_H / 2;

const BAND_X = 40;
const BAND_W = VIEW_W - BAND_X * 2;

interface Pt {
  x: number;
  y: number;
}

function nodeCentre(def: AgentDef): Pt {
  return { x: PAD_X + def.position.x * INNER_W, y: PAD_Y + def.position.y * INNER_H };
}

const CENTRES: Record<AgentId, Pt> = AGENTS.reduce(
  (acc, def) => ({ ...acc, [def.id]: nodeCentre(def) }),
  {} as Record<AgentId, Pt>,
);

interface Band {
  key: AgentLane;
  label: string;
  blurb: string;
  accent: string;
  top: number;
  bottom: number;
  count: number;
}

const BANDS: Band[] = LANES.map((lane) => {
  const members = AGENTS.filter((a) => a.lane === lane.key);
  const ys = members.map((a) => CENTRES[a.id].y);
  return {
    key: lane.key,
    label: lane.label,
    blurb: lane.blurb,
    accent: lane.accent,
    top: Math.min(...ys) - HALF_H - 26,
    bottom: Math.max(...ys) + HALF_H + 34,
    count: members.length,
  };
});

/** Where a straight run from `centre` towards `toward` leaves the node box. */
function rectExit(centre: Pt, toward: Pt, margin: number): Pt {
  const vx = toward.x - centre.x;
  const vy = toward.y - centre.y;
  const len = Math.hypot(vx, vy) || 1;
  const tx = vx === 0 ? Number.POSITIVE_INFINITY : HALF_W / Math.abs(vx);
  const ty = vy === 0 ? Number.POSITIVE_INFINITY : HALF_H / Math.abs(vy);
  const t = Math.min(tx, ty);
  return {
    x: centre.x + vx * t + (vx / len) * margin,
    y: centre.y + vy * t + (vy / len) * margin,
  };
}

interface EdgeGeometry {
  key: string;
  from: AgentId;
  to: AgentId;
  accent: string;
  /** The curve itself, trimmed to both node boundaries. */
  d: string;
  /** Filled triangle sitting on the target node's edge. */
  head: string;
}

function buildEdge(key: string): EdgeGeometry | null {
  const [fromId, toId] = key.split(">") as [AgentId, AgentId];
  const from = CENTRES[fromId];
  const to = CENTRES[toId];
  const source = AGENT_BY_ID[fromId];
  if (!from || !to || !source) return null;

  const dy = to.y - from.y;
  const dx = to.x - from.x;

  let c1: Pt;
  let c2: Pt;
  if (Math.abs(dy) < 40) {
    // Same row: arc over the top so the run is visible between the two chips
    // rather than hidden behind them.
    const lift = 48;
    c1 = { x: from.x + dx * 0.3, y: from.y - lift };
    c2 = { x: from.x + dx * 0.7, y: to.y - lift };
  } else {
    const off = Math.min(150, Math.max(48, Math.abs(dy) * 0.52)) * Math.sign(dy);
    c1 = { x: from.x, y: from.y + off };
    c2 = { x: to.x, y: to.y - off };
  }

  const start = rectExit(from, c1, 4);
  const end = rectExit(to, c2, 7);

  const hx = end.x - c2.x;
  const hy = end.y - c2.y;
  const hlen = Math.hypot(hx, hy) || 1;
  const ux = hx / hlen;
  const uy = hy / hlen;
  const backX = end.x - ux * 10;
  const backY = end.y - uy * 10;
  const px = -uy * 4.8;
  const py = ux * 4.8;

  return {
    key,
    from: fromId,
    to: toId,
    accent: source.accent,
    d: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    head: `M ${end.x.toFixed(1)} ${end.y.toFixed(1)} L ${(backX + px).toFixed(1)} ${(backY + py).toFixed(1)} L ${(backX - px).toFixed(1)} ${(backY - py).toFixed(1)} Z`,
  };
}

const EDGES: EdgeGeometry[] = MESH_EDGES.map(buildEdge).filter(
  (e): e is EdgeGeometry => e !== null,
);

export const MESH_EDGE_COUNT = EDGES.length;

/* ── Edge ──────────────────────────────────────────────────────────────── */

function MeshEdge({ edge, live, reduced }: { edge: EdgeGeometry; live: boolean; reduced: boolean }) {
  if (!live) {
    return (
      <g opacity={0.42}>
        <path d={edge.d} fill="none" stroke={edge.accent} strokeWidth={1.75} strokeLinecap="round" />
        <path d={edge.head} fill={edge.accent} />
      </g>
    );
  }

  return (
    <g>
      {/* Halo: a wide, soft copy of the run underneath the bright one. */}
      <path
        d={edge.d}
        fill="none"
        stroke={edge.accent}
        strokeWidth={9}
        strokeLinecap="round"
        opacity={0.16}
      />
      <path d={edge.d} fill="none" stroke={edge.accent} strokeWidth={2.5} strokeLinecap="round" />
      <path d={edge.head} fill={edge.accent} />
      {reduced ? null : (
        <motion.path
          d={edge.d}
          fill="none"
          stroke="rgb(var(--j-console-ink))"
          strokeWidth={5}
          strokeLinecap="round"
          initial={{ pathLength: 0.13, pathOffset: 0 }}
          animate={{ pathLength: 0.13, pathOffset: 1 }}
          transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
        />
      )}
    </g>
  );
}

/* ── Node ──────────────────────────────────────────────────────────────── */

interface MeshNodeProps {
  def: AgentDef;
  state: AgentState;
  message?: string;
  invocations: number;
}

const MeshNode = memo(function MeshNode({ def, state, message, invocations }: MeshNodeProps) {
  const { x, y } = CENTRES[def.id];
  const tone = agentStateTone(state);
  const live = agentStateIsLive(state);
  const idle = state === "idle";
  const caption = live && message ? wrapText(message, 30, 2) : [];

  return (
    <a
      href={`#/agents/${def.id}`}
      className="group focus:outline-none"
      aria-label={`${def.codename} — ${def.name}. ${AGENT_STATE_LABEL[state]}.`}
    >
      {live ? (
        <rect
          x={x - HALF_W - 5}
          y={y - HALF_H - 5}
          width={NODE_W + 10}
          height={NODE_H + 10}
          rx={15}
          fill="none"
          stroke={def.accent}
          strokeWidth={6}
          opacity={0.18}
        />
      ) : null}

      <rect
        x={x - HALF_W}
        y={y - HALF_H}
        width={NODE_W}
        height={NODE_H}
        rx={11}
        className="fill-j-console-2"
        stroke={live ? def.accent : "rgb(var(--j-console-line))"}
        strokeWidth={live ? 1.75 : 1.25}
      />
      {live ? (
        <rect
          x={x - HALF_W}
          y={y - HALF_H}
          width={NODE_W}
          height={NODE_H}
          rx={11}
          fill={def.accent}
          opacity={0.1}
        />
      ) : null}

      {/* Hover wash and keyboard focus ring, both drawn rather than borrowed
          from the browser so they read the same on a projector. */}
      <rect
        x={x - HALF_W}
        y={y - HALF_H}
        width={NODE_W}
        height={NODE_H}
        rx={11}
        fill={def.accent}
        className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-[0.14]"
      />
      <rect
        x={x - HALF_W - 4}
        y={y - HALF_H - 4}
        width={NODE_W + 8}
        height={NODE_H + 8}
        rx={14}
        fill="none"
        stroke="rgb(var(--j-primary-bright))"
        strokeWidth={2}
        className="pointer-events-none opacity-0 group-focus-visible:opacity-100"
      />

      {/* State dot, with the breathing halo while the agent is working. */}
      {live ? (
        <circle
          cx={x - HALF_W + 15}
          cy={y - 8}
          r={5}
          fill={def.accent}
          className="j-pulse-ring"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ) : null}
      <circle
        cx={x - HALF_W + 15}
        cy={y - 8}
        r={4}
        fill={def.accent}
        opacity={idle ? 0.45 : 1}
      />

      <text
        x={x - HALF_W + 26}
        y={y - 4}
        className="fill-j-console-ink"
        fontSize={13.5}
        fontWeight={700}
      >
        {def.codename}
      </text>
      <text
        x={x + HALF_W - 11}
        y={y - 4}
        textAnchor="end"
        className="j-mono fill-j-console-ink-2"
        fontSize={9.5}
        opacity={0.85}
      >
        {def.id}
      </text>

      <text x={x - HALF_W + 15} y={y + 14} className={TONE_FILL[tone]} fontSize={10.5}>
        {AGENT_STATE_LABEL[state]}
      </text>
      {invocations > 0 ? (
        <text
          x={x + HALF_W - 11}
          y={y + 14}
          textAnchor="end"
          className="j-mono fill-j-console-ink-2"
          fontSize={9.5}
          opacity={0.7}
        >
          {invocations}×
        </text>
      ) : null}

      {caption.map((line, i) => (
        <text
          key={line + String(i)}
          x={x}
          y={y + HALF_H + 15 + i * 12}
          textAnchor="middle"
          className="fill-j-console-ink-2"
          fontSize={10}
        >
          {line}
        </text>
      ))}
    </a>
  );
});

/* ── The graph ─────────────────────────────────────────────────────────── */

function MeshGraph({ heightClass }: { heightClass: string }) {
  const states = useAgentStore((s) => s.states);
  const lastMessage = useAgentStore((s) => s.lastMessage);
  const activeEdges = useAgentStore((s) => s.activeEdges);
  const invocations = useAgentStore((s) => s.invocations);
  const reduced = useReducedMotion() ?? false;

  const activeSet = useMemo(() => new Set(activeEdges), [activeEdges]);
  const idleEdges = EDGES.filter((e) => !activeSet.has(e.key));
  const liveEdges = EDGES.filter((e) => activeSet.has(e.key));

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block w-full", heightClass)}
      role="img"
      aria-label="Agent mesh: twelve agents in three lanes with their handoff paths."
    >
      {BANDS.map((band) => (
        <g key={band.key}>
          <rect
            x={BAND_X}
            y={band.top}
            width={BAND_W}
            height={band.bottom - band.top}
            rx={18}
            fill={band.accent}
            opacity={0.05}
          />
          <rect
            x={BAND_X}
            y={band.top}
            width={BAND_W}
            height={band.bottom - band.top}
            rx={18}
            fill="none"
            stroke={band.accent}
            strokeWidth={1.25}
            opacity={0.24}
          />
          <rect x={BAND_X} y={band.top + 14} width={3} height={26} rx={1.5} fill={band.accent} />
          <text
            x={BAND_X + 15}
            y={band.top + 26}
            fill={band.accent}
            fontSize={11.5}
            fontWeight={700}
            letterSpacing={1.6}
          >
            {band.label.toUpperCase()}
          </text>
          <text
            x={BAND_X + 15}
            y={band.top + 40}
            className="fill-j-console-ink-2"
            fontSize={10.5}
            opacity={0.75}
          >
            {band.count} agents
          </text>
        </g>
      ))}

      <g>
        {idleEdges.map((edge) => (
          <MeshEdge key={edge.key} edge={edge} live={false} reduced={reduced} />
        ))}
      </g>
      <g>
        {liveEdges.map((edge) => (
          <MeshEdge key={edge.key} edge={edge} live reduced={reduced} />
        ))}
      </g>

      {AGENTS.map((def) => (
        <MeshNode
          key={def.id}
          def={def}
          state={states[def.id] ?? "idle"}
          message={lastMessage[def.id]}
          invocations={invocations[def.id] ?? 0}
        />
      ))}
    </svg>
  );
}

/* ── Small-screen fallback ─────────────────────────────────────────────── */

function LaneCard({
  def,
  state,
  message,
  invocations,
}: {
  def: AgentDef;
  state: AgentState;
  message?: string;
  invocations: number;
}) {
  const tone = agentStateTone(state);
  const live = agentStateIsLive(state);

  return (
    <a
      href={`#/agents/${def.id}`}
      className={cn(
        "group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border bg-j-console-2 p-3 pl-4 transition-colors",
        live ? "border-j-console-ink-2/40" : "border-j-console-line hover:border-j-console-ink-2/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: def.accent, opacity: live ? 1 : 0.5 }}
      />
      <span className="flex items-center gap-2">
        <span className="relative inline-flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {live ? (
            <span
              className="j-pulse-ring absolute inset-0 rounded-full"
              style={{ backgroundColor: def.accent }}
            />
          ) : null}
          <span
            className={cn("relative h-full w-full rounded-full", state === "idle" && "opacity-45")}
            style={{ backgroundColor: def.accent }}
          />
        </span>
        <span className="truncate text-sm font-semibold text-j-console-ink">{def.codename}</span>
        <span className="j-mono shrink-0 text-[10px] text-j-console-ink-2/80">{def.id}</span>
        {invocations > 0 ? (
          <span className="num j-mono ml-auto shrink-0 text-[10px] text-j-console-ink-2/70">
            {invocations}×
          </span>
        ) : null}
      </span>
      <Badge tone={tone} surface="console" size="xs" dot className="self-start">
        {AGENT_STATE_LABEL[state]}
      </Badge>
      {live && message ? (
        <span className="line-clamp-2 text-[12px] leading-snug text-j-console-ink-2">{message}</span>
      ) : null}
      {def.handsOffTo.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1 text-[11px] text-j-console-ink-2/70">
          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          {def.handsOffTo.map((id) => (
            <span key={id} className="j-mono">
              {AGENT_BY_ID[id]?.codename ?? id}
            </span>
          ))}
        </span>
      ) : null}
    </a>
  );
}

function MeshStack() {
  const states = useAgentStore((s) => s.states);
  const lastMessage = useAgentStore((s) => s.lastMessage);
  const invocations = useAgentStore((s) => s.invocations);

  return (
    <div className="space-y-5 p-4 sm:p-5">
      {LANES.map((lane) => (
        <section key={lane.key}>
          <h3 className="mb-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: lane.accent }}
            />
            <span className={cn(EYEBROW, "text-j-console-ink")}>{lane.label}</span>
            <span className="j-mono text-[10px] text-j-console-ink-2/70">
              {AGENTS.filter((a) => a.lane === lane.key).length}
            </span>
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.filter((a) => a.lane === lane.key).map((def) => (
              <LaneCard
                key={def.id}
                def={def}
                state={states[def.id] ?? "idle"}
                message={lastMessage[def.id]}
                invocations={invocations[def.id] ?? 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── Public component ──────────────────────────────────────────────────── */

export interface AgentMeshProps {
  /** `hero` keeps the board inside the fold; `full` gives the inspector room. */
  size?: "hero" | "full";
  className?: string;
}

export function AgentMesh({ size = "hero", className }: AgentMeshProps) {
  const heightClass = size === "full" ? "max-h-[74vh]" : "max-h-[58vh]";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--j-radius)] border border-j-console-line",
        className,
      )}
    >
      <div className="j-mesh-bg hidden xl:block">
        <MeshGraph heightClass={heightClass} />
      </div>
      <div className="j-mesh-bg xl:hidden">
        <MeshStack />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-j-console-line bg-j-console-2 px-4 py-2.5">
        <span className={cn(EYEBROW, "text-j-console-ink-2/70")}>
          {AGENTS.length} agents · {MESH_EDGE_COUNT} handoff paths
        </span>
        <span className="text-[11.5px] text-j-console-ink-2">
          A breathing dot is an agent working now. A packet on a line is a job changing hands.
        </span>
        <span className="ml-auto hidden text-[11.5px] text-j-console-ink-2/70 sm:block">
          Select an agent for its brief, tools and guardrails
        </span>
      </div>
    </div>
  );
}
