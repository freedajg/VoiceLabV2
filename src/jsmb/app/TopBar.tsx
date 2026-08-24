import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  RotateCcw,
  Settings2,
  Smartphone,
  Store,
  PanelRightClose,
  PanelRightOpen,
  Presentation,
} from "lucide-react";
import { cn } from "../ui/cn";
import { Button, IconButton, Modal, SegmentedControl, Toggle } from "../ui";
import { useUiStore } from "../store/uiStore";
import { BrandMark } from "./BrandMark";
import { BRANDS } from "./brand";
import type { BrandKey } from "../contracts/stores";

/**
 * The three worlds. The presenter jumps between them constantly, so they are
 * always visible and always in the same order: the system, the shop, the books.
 */
const WORLDS = [
  { to: "/", label: "Command Centre", short: "Ops", icon: Activity, end: true },
  { to: "/shop", label: "Storefront", short: "Shop", icon: Store, end: false },
  { to: "/admin", label: "Admin", short: "Admin", icon: LayoutDashboard, end: false },
] as const;

export interface TopBarProps {
  /**
   * SEAM (wave 3): the architect wires Reset demo to
   * `useDataStore().resetDemo()` + `useAgentStore().clearTrace()` + cart clear.
   * Until then the button is present and inert so the layout is final.
   */
  onResetDemo?: () => void;
}

export function TopBar({ onResetDemo }: TopBarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const brand = useUiStore((s) => s.brand);
  const setBrand = useUiStore((s) => s.setBrand);
  const phoneFrame = useUiStore((s) => s.phoneFrame);
  const togglePhoneFrame = useUiStore((s) => s.togglePhoneFrame);
  const presenterMode = useUiStore((s) => s.presenterMode);
  const togglePresenterMode = useUiStore((s) => s.togglePresenterMode);
  const railOpen = useUiStore((s) => s.railOpen);
  const setRailOpen = useUiStore((s) => s.setRailOpen);
  const location = useLocation();
  const onShop = location.pathname.startsWith("/shop");

  const brandOptions = (Object.keys(BRANDS) as BrandKey[]).map((key) => ({
    value: key,
    label: BRANDS[key].initials,
    srLabel: BRANDS[key].company,
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-j-console-line bg-j-console text-j-console-ink">
      <div className="flex h-14 items-center gap-3 px-3 sm:h-16 sm:gap-4 sm:px-4 lg:px-6">
        <a
          href="#/"
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-console"
        >
          <BrandMark size="md" surface="console" className="max-w-[9rem] sm:max-w-none" />
        </a>

        {/* Desktop world switcher */}
        <nav aria-label="Sections" className="ml-2 hidden items-center gap-1 md:flex">
          {WORLDS.map((w) => (
            <NavLink
              key={w.to}
              to={w.to}
              end={w.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-console",
                  isActive
                    ? "bg-j-console-3 text-j-console-ink shadow-[inset_0_-2px_0_rgb(var(--j-primary))]"
                    : "text-j-console-ink-2 hover:bg-j-console-2 hover:text-j-console-ink",
                )
              }
            >
              <w.icon className="h-4 w-4" aria-hidden="true" />
              {w.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Presenter tools, inline from sm up */}
          <div className="hidden items-center gap-1.5 sm:flex">
            <SegmentedControl
              options={brandOptions}
              value={brand}
              onChange={setBrand}
              label="Brand"
              surface="console"
              size="sm"
            />
            <IconButton
              label="Phone frame"
              icon={<Smartphone />}
              surface="console"
              size="sm"
              pressed={phoneFrame}
              onClick={togglePhoneFrame}
            />
            <IconButton
              label="Presenter mode"
              icon={<Presentation />}
              surface="console"
              size="sm"
              pressed={presenterMode}
              onClick={togglePresenterMode}
            />
            <Button
              size="sm"
              variant="ghost"
              surface="console"
              iconLeft={<RotateCcw />}
              onClick={onResetDemo}
              className="hidden lg:inline-flex"
            >
              Reset demo
            </Button>
          </div>

          <IconButton
            label="Demo controls"
            icon={<Settings2 />}
            surface="console"
            size="sm"
            className="sm:hidden"
            onClick={() => setToolsOpen(true)}
          />

          <IconButton
            label={railOpen ? "Hide agent rail" : "Show agent rail"}
            icon={railOpen ? <PanelRightClose /> : <PanelRightOpen />}
            surface="console"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={() => setRailOpen(!railOpen)}
          />
        </div>
      </div>

      {/* Mobile world switcher — full-width, one tap, never scrolls sideways */}
      <nav
        aria-label="Sections"
        className="flex border-t border-j-console-line md:hidden"
      >
        {WORLDS.map((w) => (
          <NavLink
            key={w.to}
            to={w.to}
            end={w.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-j-primary",
                isActive
                  ? "bg-j-console-2 text-j-console-ink shadow-[inset_0_-2px_0_rgb(var(--j-primary))]"
                  : "text-j-console-ink-2",
              )
            }
          >
            <w.icon className="h-4 w-4" aria-hidden="true" />
            {w.short}
          </NavLink>
        ))}
      </nav>

      <Modal
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        title="Demo controls"
        description="Presenter-only switches. None of these change the business data."
        surface="console"
        size="sm"
        footer={
          <Button surface="console" tone="neutral" onClick={() => setToolsOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-j-console-ink">Brand</p>
            <SegmentedControl
              options={(Object.keys(BRANDS) as BrandKey[]).map((key) => ({
                value: key,
                label: BRANDS[key].company,
              }))}
              value={brand}
              onChange={setBrand}
              label="Brand"
              surface="console"
              fullWidth
            />
          </div>
          <Toggle
            surface="console"
            checked={phoneFrame}
            onChange={togglePhoneFrame}
            label="Phone frame"
            description={
              onShop
                ? "Wraps the storefront in a phone bezel."
                : "Applies on storefront routes."
            }
          />
          <Toggle
            surface="console"
            checked={presenterMode}
            onChange={togglePresenterMode}
            label="Presenter mode"
            description="Shows the scenario bar along the bottom."
          />
          <Button
            surface="console"
            tone="danger"
            variant="soft"
            block
            iconLeft={<RotateCcw />}
            onClick={onResetDemo}
          >
            Reset demo
          </Button>
        </div>
      </Modal>
    </header>
  );
}
