/**
 * Human in the loop.
 *
 * When an agent raises an approval the run stops dead until it is answered, and
 * this card has to make that obvious across a boardroom: the system is not
 * thinking, it is waiting for the owner. Both answers are presented as real
 * choices at the same weight — the refusal is a branch of the story, not a
 * decoy button next to the one you are meant to press.
 */
import { AlertOctagon, Check, Clock3, ShieldX } from "lucide-react";
import { cn } from "../../ui/cn";
import { AgentChip, Badge, Button, EYEBROW, toneClasses } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { AGENT_BY_ID } from "../../agents/registry";
import { isDenial } from "../../agents/runtime";
import type { ApprovalOption, ApprovalRequest } from "../../contracts/agents";
import type { Tone } from "../../ui";
import { formatClock } from "./lib";

const OPTION_TONE: Record<ApprovalOption["tone"], Tone> = {
  primary: "primary",
  danger: "danger",
  neutral: "neutral",
};

function consequence(option: ApprovalOption): string {
  if (isDenial(option.id)) {
    return "Takes the refusal branch — the run keeps going, to a different ending.";
  }
  if (option.tone === "neutral") return "The run continues as planned.";
  return "Releases the run down the approved path.";
}

/* ── The blocking card ─────────────────────────────────────────────────── */

function PendingCard({ approval }: { approval: ApprovalRequest }) {
  const resolveApproval = useAgentStore((s) => s.resolveApproval);
  const def = AGENT_BY_ID[approval.agentId];

  return (
    <section
      aria-live="assertive"
      className={cn(
        "j-rise overflow-hidden rounded-[var(--j-radius)] border-2 border-j-warn/70 bg-j-console-2",
        "shadow-[0_0_0_1px_rgb(var(--j-warn)/0.2),0_28px_70px_-30px_rgb(var(--j-warn)/0.55)]",
      )}
    >
      {/* Halt bar — the loudest thing on the page while a decision is open. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-j-warn px-4 py-2.5">
        <span className="relative inline-flex h-3 w-3 shrink-0" aria-hidden="true">
          <span className="j-pulse-ring absolute inset-0 rounded-full bg-white" />
          <span className="relative h-full w-full rounded-full bg-white" />
        </span>
        <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-white">
          Run halted — waiting for Ajay
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-white/85">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="num j-mono">{formatClock(approval.createdAt)}</span>
        </span>
      </div>

      <div className="grid gap-x-8 gap-y-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <AgentChip id={approval.agentId} surface="console" size="sm" showRole />
            <Badge tone="warn" surface="console" size="xs">
              Needs a decision
            </Badge>
          </div>

          <h2 className="text-balance text-[22px] font-bold leading-[1.15] tracking-[-0.01em] text-j-console-ink sm:text-[27px]">
            {approval.title}
          </h2>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-j-console-ink-2">
            {approval.summary}
          </p>
          {def ? (
            <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-j-console-ink-2/75">
              <ShieldX className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {def.codename} stopped here on purpose. {def.guardrails[0]}
              </span>
            </p>
          ) : null}

          <div
            className={cn(
              "mt-5 grid gap-3",
              approval.options.length > 1 ? "sm:grid-cols-2" : "sm:max-w-sm",
            )}
          >
            {approval.options.map((option) => (
              <div key={option.id} className="flex flex-col gap-1.5">
                <Button
                  surface="console"
                  tone={OPTION_TONE[option.tone]}
                  variant="solid"
                  size="lg"
                  block
                  onClick={() => resolveApproval(approval.id, option.id)}
                  iconLeft={isDenial(option.id) ? <ShieldX /> : <Check />}
                >
                  {option.label}
                </Button>
                <span className="px-0.5 text-[11.5px] leading-snug text-j-console-ink-2/70">
                  {consequence(option)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Facts — everything the owner needs to answer without leaving. */}
        <div className="min-w-0 rounded-xl border border-j-console-line bg-j-console p-4">
          <h3 className={cn(EYEBROW, "mb-3 text-j-console-ink-2/70")}>What you are deciding on</h3>
          <dl className="divide-y divide-j-console-line/70">
            {approval.facts.map((fact) => (
              <div
                key={fact.label}
                className={cn(
                  "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2",
                  fact.emphasis && "-mx-2 rounded-md bg-j-warn/10 px-2",
                )}
              >
                <dt className="text-[12.5px] text-j-console-ink-2">{fact.label}</dt>
                <dd
                  className={cn(
                    "num text-right",
                    fact.emphasis
                      ? "text-[15px] font-bold text-j-warn-soft"
                      : "text-[13px] font-semibold text-j-console-ink",
                  )}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ── Public: pending + history ─────────────────────────────────────────── */

export function PendingApprovals({ className }: { className?: string }) {
  const approvals = useAgentStore((s) => s.approvals);
  const pending = approvals.filter((a) => a.resolvedOptionId === undefined);
  if (pending.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {pending.map((approval) => (
        <PendingCard key={approval.id} approval={approval} />
      ))}
    </div>
  );
}

export function DecisionLog({ className }: { className?: string }) {
  const approvals = useAgentStore((s) => s.approvals);
  const resolved = approvals.filter((a) => a.resolvedOptionId !== undefined);
  if (resolved.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--j-radius)] border border-j-console-line bg-j-console-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-j-console-line px-3.5 py-2.5">
        <AlertOctagon className="h-4 w-4 text-j-console-ink-2/70" aria-hidden="true" />
        <h3 className="text-[13.5px] font-semibold text-j-console-ink">Owner decisions</h3>
        <span className="num j-mono ml-auto text-[11px] text-j-console-ink-2/70">
          {resolved.length}
        </span>
      </div>
      <ul className="divide-y divide-j-console-line/70">
        {resolved.map((approval) => {
          const chosen = approval.options.find((o) => o.id === approval.resolvedOptionId);
          const tone: Tone = chosen ? OPTION_TONE[chosen.tone] : "neutral";
          const t = toneClasses(tone, "console");
          return (
            <li key={approval.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3.5 py-2.5">
              <span
                aria-hidden="true"
                className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", t.dot)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold leading-snug text-j-console-ink">
                  {approval.title}
                </p>
                <p className={cn("mt-0.5 text-[12px] leading-snug", t.text)}>
                  {chosen?.label ?? approval.resolvedOptionId}
                </p>
              </div>
              <span className="num j-mono shrink-0 text-[11px] text-j-console-ink-2/60">
                {formatClock(approval.resolvedAt ?? approval.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
