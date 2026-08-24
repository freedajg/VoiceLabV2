import type { BrandKey, BrandProfile } from "../contracts/stores";
import { useUiStore } from "../store/uiStore";

/**
 * White-label profiles.
 *
 * `jsmb` is the pitch brand — the client's own words, from BRD v1.0. `demo` is
 * a neutral industrial stand-in used when the same system is shown to another
 * prospect; it carries no JSMB references.
 *
 * Colour lives in `jsmb.css` under `[data-brand="…"]`, not here. This file is
 * copy and identity only, so a new prospect is one entry plus one token block.
 */
export const BRANDS: Record<BrandKey, BrandProfile> = {
  jsmb: {
    key: "jsmb",
    company: "Jaggula Samson Mill Boards",
    legalName: "Jaggula Samson Mill Boards Pvt. Ltd.",
    tagline: "Factory-direct mill boards",
    ownerName: "J. S. Ajay Kumar",
    ownerTitle: "Proprietor",
    city: "Hyderabad",
    initials: "JS",
    // FR-W-02 asks for a vibrant, trustworthy storefront with clear hooks:
    // factory-direct prices, bundle-or-lot buying, delivery across TG & AP.
    hero: "Mill boards straight from our floor in Hyderabad.",
    heroSub:
      "Order by the bundle or the lot — 25 kg a bundle, 500 kg a lot, up to 20 tonnes online. Factory-direct prices, GST invoice with every order, delivery across Telangana & Andhra Pradesh.",
  },
  demo: {
    key: "demo",
    company: "Northwind Board & Packaging",
    legalName: "Northwind Board & Packaging Pvt. Ltd.",
    tagline: "Board and packaging, direct from the mill",
    ownerName: "R. Menon",
    ownerTitle: "Managing Partner",
    city: "Pune",
    initials: "NB",
    hero: "Industrial board, priced at the mill gate.",
    heroSub:
      "Buy by the bundle or the lot with live tonnage on every cart, tax-compliant invoicing, and scheduled delivery across the western corridor.",
  },
};

/** The active brand profile. Re-renders when the white-label toggle flips. */
export function useBrand(): BrandProfile {
  return BRANDS[useUiStore((s) => s.brand)];
}

/** Non-reactive read, for anything outside a component. */
export function currentBrand(): BrandProfile {
  return BRANDS[useUiStore.getState().brand];
}
