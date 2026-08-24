/**
 * The streaming trace console.
 *
 * This is the panel a prospect leans in and reads, so it is built like an
 * instrument: fixed-width simulated offsets, the agent in its own accent, a
 * one-word kind token, and the message in plain English. Every line opens to
 * show the structured payload the agent actually passed.
 *
 * Performance note — the trace runs to 500 entries and grows several times a
 * second during a run. Each row is memoised on the trace event, which is
 * immutable once emitted, so appending an entry re-renders exactly one row.
 * Callers hand in an already-sliced window rather than the whole log.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownToLine, ChevronRight, CornerDownRight } from "lucide-react";
import { cn } from "../../ui/cn";
import { EYEBROW, toneClasses } from "../../ui";
import { useUiStore } from "../../store/uiStore";
import { AGENT_BY_ID } from "../../agents/registry";
import type { TraceEvent } from "../../contracts/agents";
import { KIND_LABEL, KIND_TOKEN, formatDuration, formatOffset, formatPayload, levelTone } from "./lib";

/* ── One line ──────────────────────────────────────────────────────────── */

interface TraceRowProps {
  event: TraceEvent;
  expanded: boolean;
  onToggle: (id: string) => void;
}

const TraceRow = memo(function TraceRow({ event, expanded, onToggle }: TraceRowProps) {
  const tone = levelTone(event.level);
  const t = toneClasses(tone, "console");
  const accent = AGENT_BY_ID[event.agentId]?.accent ?? "rgb(var(--j-console-ink-2))";
  const target = event.targetAgentId ? AGENT_BY_ID[event.targetAgentId] : undefined;
  const hasPayload = event.payload !== undefined;

  return (
    <li className="relative border-b border-j-console-line/60 last:border-b-0">
      {event.level !== "info" ? (
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-[3px]", t.fill)} />
      ) : null}
      <button
        type="button"
        onClick={() => onToggle(event.id)}
        aria-expanded={expanded}
        className={cn(
          "grid w-full grid-cols-[auto_auto_auto_auto] items-start gap-x-2.5 gap-y-1 py-2 pl-3.5 pr-2 text-left transition-colors",
          "sm:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto]",
          "hover:bg-j-console-3/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-j-primary-bright",
          expanded && "bg-j-console-3/70",
        )}
      >
        <span className="j-mono num shrink-0 pt-[3px] text-[11px] leading-none text-j-console-ink-2/55">
          {formatOffset(event.atMs)}
        </span>
        <span
          className="j-mono shrink-0 pt-[3px] text-[11px] font-bold leading-none"
          style={{ color: accent }}
        >
          {event.agentId}
        </span>
        <span
          className={cn(
            "j-mono shrink-0 rounded px-1.5 py-[3px] text-[9.5px] font-semibold uppercase leading-none tracking-[0.09em]",
            t.soft,
          )}
          title={KIND_LABEL[event.kind]}
        >
          {KIND_TOKEN[event.kind]}
        </span>
        <span className="col-span-4 min-w-0 text-[12.5px] leading-snug text-j-console-ink sm:col-span-1">
          {target ? (
            <span className="j-mono mr-1.5 inline-flex items-center gap-1 align-[1px] text-[11px] font-semibold">
              <CornerDownRight className="h-3 w-3" aria-hidden="true" />
              <span style={{ color: target.accent }}>{target.id}</span>
            </span>
          ) : null}
          {event.message}
        </span>
        <span className="col-start-4 row-start-1 flex shrink-0 items-center gap-1.5 justify-self-end pt-[2px] sm:col-start-5">
          {event.toolName ? (
            <span className="j-mono hidden text-[10px] text-j-console-ink-2/60 lg:inline">
              {event.toolName}
            </span>
          ) : null}
          {hasPayload ? (
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-j-console-ink-2/50 transition-transform",
                expanded && "rotate-90",
              )}
              aria-hidden="true"
            />
          ) : (
            <span className="inline-block h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded ? (
        <div className="j-rise border-t border-j-console-line/60 bg-j-console px-3.5 py-3">
          <dl className="mb-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <div className="flex gap-1.5">
              <dt className="text-j-console-ink-2/60">Kind</dt>
              <dd className="text-j-console-ink-2">{KIND_LABEL[event.kind]}</dd>
            </div>
            {event.toolName ? (
              <div className="flex gap-1.5">
                <dt className="text-j-console-ink-2/60">Tool</dt>
                <dd className="j-mono text-j-console-ink">{event.toolName}</dd>
              </div>
            ) : null}
            {event.durationMs !== undefined ? (
              <div className="flex gap-1.5">
                <dt className="text-j-console-ink-2/60">Simulated</dt>
                <dd className="num j-mono text-j-console-ink-2">
                  {formatDuration(event.durationMs)}
                </dd>
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <dt className="text-j-console-ink-2/60">Seq</dt>
              <dd className="num j-mono text-j-console-ink-2">#{event.seq}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-j-console-ink-2/60">Run</dt>
              <dd className="j-mono text-j-console-ink-2">{event.runId}</dd>
            </div>
          </dl>
          {event.payload ? (
            <pre className="j-scroll j-mono max-h-64 overflow-auto rounded-lg border border-j-console-line bg-j-console-2 p-3 text-[11.5px] leading-relaxed text-j-console-ink-2">
              {formatPayload(event.payload)}
            </pre>
          ) : (
            <p className="text-[11.5px] text-j-console-ink-2/60">
              This beat carried no structured payload.
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
});

/* ── The console ───────────────────────────────────────────────────────── */

export interface TraceConsoleProps {
  /** Already filtered and sliced by the caller. Oldest first. */
  events: TraceEvent[];
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** Height of the scrolling body, e.g. "h-[440px]". */
  bodyClassName?: string;
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
}

export function TraceConsole({
  events,
  title = "Live trace",
  eyebrow,
  actions,
  bodyClassName = "h-[440px]",
  emptyTitle = "No activity yet",
  emptyHint = "Run a scenario and every tool call, handoff and decision streams here.",
  className,
}: TraceConsoleProps) {
  const inspectedTraceId = useUiStore((s) => s.inspectedTraceId);
  const inspectTrace = useUiStore((s) => s.inspectTrace);

  const bodyRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const onToggle = useCallback(
    (id: string) => {
      inspectTrace(useUiStore.getState().inspectedTraceId === id ? null : id);
    },
    [inspectTrace],
  );

  // Follow the tail while the reader is at the bottom; the moment they scroll
  // back to read something, stop yanking the view away from them.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stick.current = near;
    setAtBottom((prev) => (prev === near ? prev : near));
  }, []);

  const jumpToLatest = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    stick.current = true;
    setAtBottom(true);
    el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[var(--j-radius)] border border-j-console-line bg-j-console-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-j-console-line px-3.5 py-2.5">
        <div className="min-w-0">
          {eyebrow ? (
            <div className={cn(EYEBROW, "mb-0.5 text-j-console-ink-2/60")}>{eyebrow}</div>
          ) : null}
          <h3 className="text-[13.5px] font-semibold text-j-console-ink">{title}</h3>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className={cn("j-scroll overflow-y-auto", bodyClassName)}
        >
          {events.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
              <p className="text-[13px] font-semibold text-j-console-ink-2">{emptyTitle}</p>
              <p className="max-w-[42ch] text-[12px] leading-relaxed text-j-console-ink-2/70">
                {emptyHint}
              </p>
            </div>
          ) : (
            <ol>
              {events.map((event) => (
                <TraceRow
                  key={event.id}
                  event={event}
                  expanded={inspectedTraceId === event.id}
                  onToggle={onToggle}
                />
              ))}
            </ol>
          )}
        </div>

        {!atBottom && events.length > 0 ? (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-j-console-line bg-j-console-3 px-3 py-1.5 text-[11.5px] font-semibold text-j-console-ink shadow-lg transition-colors hover:bg-j-console-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
            Jump to latest
          </button>
        ) : null}
      </div>
    </div>
  );
}
