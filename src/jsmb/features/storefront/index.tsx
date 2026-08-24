/**
 * Storefront barrel — the eight routed pages of CONTRACT.md §6.
 *
 * The router imports only from here, so the internal layout of this slice is
 * free to change without touching `app/router.tsx`.
 */
export { ShopHome } from "./ShopHome";
export { Catalogue } from "./Catalogue";
export { ProductDetail } from "./ProductDetail";
export { Cart } from "./Cart";
export { Checkout } from "./Checkout";
export { Confirmation } from "./Confirmation";
export { Account } from "./Account";
export { Enquiry } from "./Enquiry";
