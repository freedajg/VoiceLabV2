import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CommandCentre } from "../src/jsmb/features/command";
import { AgentOps, AgentDetail } from "../src/jsmb/features/agentops";
import { useAgentStore } from "../src/jsmb/store/agentStore";

function at(path: string, element: JSX.Element, pattern: string) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("command surfaces render", () => {
  it("command centre", () => {
    const html = at("/", <CommandCentre />, "/");
    expect(html).toContain("Command Centre");
    expect(html).toContain("Samson");
    expect(html).toContain("Web order, end to end");
  });

  it("agent ops", () => {
    const html = at("/agents", <AgentOps />, "/agents");
    expect(html).toContain("Agent Ops");
    expect(html).toContain("Tolak");
  });

  it("agent detail", () => {
    const html = at("/agents/PAY", <AgentDetail />, "/agents/:agentId");
    expect(html).toContain("Lenden");
    expect(html).toContain("FR-W-13");
  });

  it("unknown agent id", () => {
    const html = at("/agents/NOPE", <AgentDetail />, "/agents/:agentId");
    expect(html).toContain("No agent by that name");
  });

  it("renders mid-run with an open approval", () => {
    useAgentStore.setState({
      status: "waiting-human",
      clockMs: 8400,
      activeEdges: ["PRC>PAY", "ORCH>CAT"],
      states: { ...useAgentStore.getState().states, PAY: "waiting-human", CAT: "tool" },
      lastMessage: { CAT: "Two variants matched: patterned thin sweet-box at Rs.690 a bundle." },
      trace: [
        {
          id: "t1", seq: 1, atMs: 420, runId: "r1", agentId: "ORCH", kind: "spawn",
          level: "info", message: "New web order landed.", payload: { channel: "storefront" },
          durationMs: 420,
        },
        {
          id: "t2", seq: 2, atMs: 900, runId: "r1", agentId: "PAY", kind: "tool-call",
          level: "warn", message: "Credit headroom is thin.", toolName: "credit.check",
          payload: { creditLimit: 150000 }, durationMs: 660,
        },
        {
          id: "t3", seq: 3, atMs: 1500, runId: "r1", agentId: "PAY", kind: "tool-result",
          level: "warn", message: "Only Rs.6,192 left.", toolName: "credit.check",
          payload: { headroomAfter: 6192 },
        },
      ],
      approvals: [
        {
          id: "ap-1", runId: "r1", agentId: "PAY",
          title: "Release Rs.1,43,808 on 30-day credit?",
          summary: "Anjali Traders wants this on their credit line.",
          facts: [{ label: "Payable", value: "Rs.1,43,808", emphasis: true }],
          options: [
            { id: "approve-credit-30d", label: "Release on 30-day credit", tone: "primary" },
            { id: "deny-require-prepay", label: "Decline", tone: "danger" },
          ],
          createdAt: 8400,
        },
      ],
    });
    // zustand v5 hands React `getInitialState` as the server snapshot, so an
    // SSR probe has to point that at the live state to see the run mid-flight.
    useAgentStore.getInitialState = useAgentStore.getState;
    expect(useAgentStore.getState().status).toBe("waiting-human");
    expect(useAgentStore.getState().approvals.length).toBe(1);
    const html = at("/", <CommandCentre />, "/");
    expect(html).toContain("Run halted");
    expect(html).toContain("Decline");
    expect(html).toContain("credit.check");
    const ops = at("/agents", <AgentOps />, "/agents");
    expect(ops).toContain("Tool calls, in order");
  });
});
