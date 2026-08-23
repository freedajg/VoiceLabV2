import { create } from "zustand";
import type { BrandKey, UiStore } from "../contracts/stores";

/**
 * Chrome state: brand, presenter affordances, the agent rail and the two
 * inspectors. Deliberately holds no business data — resetting the demo must
 * never disturb what the presenter has on screen.
 */

/**
 * The white-label switch is a CSS token swap, not a re-render: flipping
 * `data-brand` on <html> repoints every `--j-*` variable, so the whole app —
 * including charts, which read the same variables — changes together.
 */
function applyBrandAttribute(brand: BrandKey): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.brand = brand;
  }
}

export const useUiStore = create<UiStore>((set) => ({
  brand: "jsmb",
  phoneFrame: false,
  presenterMode: false,
  railOpen: true,
  inspectedAgentId: null,
  inspectedTraceId: null,
  adminPeriod: "monthly",

  setBrand: (brand) => {
    applyBrandAttribute(brand);
    set({ brand });
  },
  togglePhoneFrame: () => set((s) => ({ phoneFrame: !s.phoneFrame })),
  togglePresenterMode: () => set((s) => ({ presenterMode: !s.presenterMode })),
  setRailOpen: (open) => set({ railOpen: open }),
  inspectAgent: (id) => set({ inspectedAgentId: id }),
  inspectTrace: (id) => set({ inspectedTraceId: id }),
  setAdminPeriod: (period) => set({ adminPeriod: period }),
}));

// jsmb.html ships with data-brand="jsmb"; this keeps the DOM honest if the
// store's initial brand ever changes.
applyBrandAttribute(useUiStore.getState().brand);
