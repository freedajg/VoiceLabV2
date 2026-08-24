import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogIn, Layers, ShoppingCart, Store, Truck, UserRound } from "lucide-react";
import { Badge, Button, IconButton, cn } from "../../ui";
import { useBrand } from "../../app/brand";
import { useCartStore } from "../../store/cartStore";
import { toKg, tons } from "../../domain";
import { OtpModal } from "./OtpModal";

/**
 * The shop chrome.
 *
 * Mobile-first and deliberately small: one 56 px bar with the wordmark, the
 * basket and the account, and a three-item tab row under it. Everything a
 * buyer needs is one tap from here at 360 px, and nothing in it can push the
 * page sideways.
 */

interface ShopChrome {
  /** Opens the phone + OTP sheet. Pass what should happen once signed in. */
  openSignIn: (onSignedIn?: () => void, reason?: string) => void;
}

const ChromeContext = createContext<ShopChrome>({ openSignIn: () => {} });

export function useShopChrome(): ShopChrome {
  return useContext(ChromeContext);
}

const TABS = [
  { to: "/shop", label: "Home", icon: Store, end: true },
  { to: "/shop/catalogue", label: "All boards", icon: Layers, end: false },
  { to: "/shop/enquiry", label: "Bulk 20 t+", icon: Truck, end: false },
] as const;

export interface ShopFrameProps {
  children: ReactNode;
  /** Wider column for the catalogue grid and the invoice. */
  width?: "reading" | "wide";
  className?: string;
}

export function ShopFrame({ children, width = "reading", className }: ShopFrameProps) {
  const brand = useBrand();
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const session = useCartStore((s) => s.session);

  const [signIn, setSignIn] = useState<{ open: boolean; reason?: string; after?: () => void }>({
    open: false,
  });

  const chrome = useMemo<ShopChrome>(
    () => ({
      openSignIn: (onSignedIn, reason) => setSignIn({ open: true, reason, after: onSignedIn }),
    }),
    [],
  );

  const cartCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const cartKg = lines.reduce((sum, l) => sum + toKg(l.unit, l.qty), 0);

  return (
    <ChromeContext.Provider value={chrome}>
      <div className={cn("min-h-full bg-j-canvas pb-16", className)}>
        <header className="sticky top-0 z-30 border-b border-j-line bg-j-surface/95 backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
            <a href="#/shop" className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-j-primary text-[13px] font-bold text-white"
              >
                {brand.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold leading-tight text-j-ink">
                  {brand.company}
                </span>
                <span className="block truncate text-[11px] leading-tight text-j-ink-3">
                  {brand.tagline}
                </span>
              </span>
            </a>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate("/shop/cart")}
                className={cn(
                  "relative inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold",
                  "bg-j-ink/[0.055] text-j-ink-2 transition-colors hover:bg-j-ink/[0.09]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-canvas",
                )}
                aria-label={`Cart — ${cartCount} items, ${tons(cartKg)}`}
              >
                <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
                {cartCount > 0 ? (
                  <span className="num tabular-nums text-j-ink">{cartCount}</span>
                ) : null}
                {cartKg > 0 ? (
                  <span className="num hidden tabular-nums text-j-ink-3 sm:inline">{tons(cartKg)}</span>
                ) : null}
              </button>

              {session?.verified ? (
                <IconButton
                  label={`Account — ${session.name}`}
                  icon={<UserRound />}
                  variant="soft"
                  tone="accent"
                  onClick={() => navigate("/shop/account")}
                />
              ) : (
                <Button
                  size="sm"
                  variant="soft"
                  tone="primary"
                  iconLeft={<LogIn />}
                  onClick={() => chrome.openSignIn()}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>

          <nav aria-label="Shop" className="mx-auto flex max-w-6xl border-t border-j-line px-2 sm:px-4">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-j-primary",
                    isActive
                      ? "text-j-primary shadow-[inset_0_-2px_0_rgb(var(--j-primary))]"
                      : "text-j-ink-3 hover:text-j-ink-2",
                  )
                }
              >
                <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </header>

        <div
          className={cn(
            "mx-auto w-full px-4 py-5 sm:px-6 sm:py-7",
            width === "wide" ? "max-w-6xl" : "max-w-3xl",
          )}
        >
          {children}
        </div>

        <footer className="mx-auto max-w-6xl border-t border-j-line px-4 py-6 sm:px-6 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" size="sm">
              GST invoice with every order
            </Badge>
            <Badge tone="accent" size="sm">
              Telangana &amp; Andhra Pradesh
            </Badge>
            <Badge tone="neutral" size="sm">
              Up to 20 t online
            </Badge>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-j-ink-3">
            {brand.legalName} · {brand.city} · 1 bundle = 25 kg · 1 lot = 20 bundles = 500 kg.
            Prices are factory-direct and exclude GST until checkout.
          </p>
        </footer>
      </div>

      <OtpModal
        open={signIn.open}
        reason={signIn.reason}
        onClose={() => setSignIn({ open: false })}
        onSignedIn={() => {
          const after = signIn.after;
          setSignIn({ open: false });
          after?.();
        }}
      />
    </ChromeContext.Provider>
  );
}
