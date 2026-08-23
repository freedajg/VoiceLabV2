import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "../ui/cn";
import { useUiStore } from "../store/uiStore";
import { useDataStore } from "../store/dataStore";
import { useAgentStore } from "../store/agentStore";
import { TopBar } from "./TopBar";
import { AgentRail } from "./AgentRail";
import { AgentDetailDrawer } from "./AgentDetailDrawer";
import { PhoneFrame } from "./PhoneFrame";
import { PresenterBar, PRESENTER_BAR_HEIGHT } from "./PresenterBar";
import { PresenterControls } from "../features/presenter";

/**
 * The frame the whole demo lives in.
 *
 * Layout is a fixed top bar, a scrolling main column, and a persistent agent
 * rail pinned to the right. The rail is the reason the agent layer reads as
 * always-on: whichever world the presenter is in — shop, admin, command
 * centre — the twelve agents stay visible and keep reacting.
 *
 * Below `lg` the rail leaves the flow entirely and is reachable from the top
 * bar, so the storefront gets the full 360 px it needs (FR-W-03).
 */
export default function Shell() {
  const railOpen = useUiStore((s) => s.railOpen);
  const presenterMode = useUiStore((s) => s.presenterMode);
  const phoneFrame = useUiStore((s) => s.phoneFrame);
  const setRailOpen = useUiStore((s) => s.setRailOpen);
  const resetDemo = useDataStore((s) => s.resetDemo);
  const clearTrace = useAgentStore((s) => s.clearTrace);
  const location = useLocation();

  const onShop = location.pathname.startsWith("/shop");
  const framed = phoneFrame && onShop;

  // Every route change scrolls the main column back to the top. Without this a
  // presenter jumping from the bottom of the P&L into the storefront lands
  // mid-page, which reads as a glitch on a projector.
  useEffect(() => {
    document.getElementById("jsmb-main")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  /**
   * Reset demo — the single most important control in a live pitch. Restores
   * the pristine seeded dataset, clears the agent trace, and drops any cart
   * the previous run left behind, so the next prospect sees identical numbers.
   */
  function handleReset() {
    resetDemo();
    clearTrace();
    toast.success("Demo reset", { description: "Seeded data restored and the trace cleared." });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-j-canvas">
      <TopBar onResetDemo={handleReset} />

      <div className="flex min-h-0 flex-1">
        <main
          id="jsmb-main"
          className={cn(
            "j-scroll min-w-0 flex-1 overflow-y-auto",
            presenterMode && PRESENTER_BAR_HEIGHT,
          )}
        >
          {framed ? (
            <div className="flex min-h-full items-start justify-center bg-j-console px-4 py-8">
              <PhoneFrame>
                <Outlet />
              </PhoneFrame>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {/* Desktop: the rail holds real layout space rather than overlaying,
            so nothing the presenter is pointing at ever sits underneath it. */}
        <div
          className={cn(
            "hidden shrink-0 border-l border-j-console-line transition-[width] duration-200 lg:block",
            railOpen ? "w-[336px]" : "w-0 overflow-hidden border-l-0",
          )}
        >
          {railOpen && <AgentRail />}
        </div>
      </div>

      {/* Below lg the rail becomes a full-height sheet over the content. */}
      {railOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-label="Agent mesh">
          <button
            type="button"
            aria-label="Close agent mesh"
            className="flex-1 bg-j-console/60 backdrop-blur-sm"
            onClick={() => setRailOpen(false)}
          />
          <div className="w-[min(336px,88vw)] shadow-2xl">
            <AgentRail />
          </div>
        </div>
      )}

      {presenterMode && (
        <PresenterBar>
          <PresenterControls />
        </PresenterBar>
      )}

      <AgentDetailDrawer />
    </div>
  );
}
