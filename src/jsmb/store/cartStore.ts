/**
 * cartStore — the storefront session.
 *
 * Everything a buyer is holding but has not yet committed to: the basket, the
 * phone-plus-OTP session, and the id of the order they just placed so the
 * confirmation screen has something to render. Nothing here is business
 * record — the moment an order is placed it leaves this store and lands in
 * `dataStore`, which is why a checkout moves the admin P&L.
 *
 * Determinism: no `Math.random()`, no `Date.now()`. Cart line ids come from a
 * monotonic counter; the OTP is a pure function of the phone number and the
 * demo seed, so the same number always yields the same code on every run.
 */
import { create } from "zustand";
import type { CartLine, CartStore, StorefrontSession } from "../contracts/stores";
import type { Customer } from "../domain/types";
import { DEMO_TODAY, SEED, SELLER_REGION } from "../domain/constants";
import { useDataStore } from "./dataStore";

/* ── Helpers ───────────────────────────────────────────────────────────── */

let lineSeq = 0;

function nextLineId(): string {
  lineSeq += 1;
  return `cl-${lineSeq}`;
}

/**
 * Reduces anything a buyer might type — "+91 98765 43210", "098765 43210" —
 * to the ten digits the seeded customer records are stored as.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidPhone(input: string): boolean {
  const digits = normalizePhone(input);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * The code the demo will accept (FR-W-08). There is no SMS gateway in the
 * prototype, so the code is derived from the phone number and the demo seed
 * and shown on screen — deterministic, never secret, never random.
 */
export function demoOtpFor(phone: string): string {
  let hash = SEED % 1_000_000;
  const digits = normalizePhone(phone);
  for (let i = 0; i < digits.length; i += 1) {
    hash = (hash * 31 + digits.charCodeAt(i)) % 1_000_000;
  }
  return String(hash).padStart(6, "0");
}

/** Two lines are the same shelf item when product, size and unit all match. */
function sameItem(line: CartLine, other: Omit<CartLine, "id">): boolean {
  return (
    line.productCode === other.productCode &&
    line.size === other.size &&
    line.unit === other.unit
  );
}

/**
 * Resolves a verified phone number to a customer record, creating a retail
 * account for a number the mill has never sold to before. Ids continue the
 * seeded `cus-0NN` sequence so they stay deterministic and sortable.
 */
function resolveCustomer(phone: string): { customerId: string; name: string } {
  const data = useDataStore.getState();
  const existing = data.customers.find((c) => normalizePhone(c.phone) === phone);
  if (existing) return { customerId: existing.id, name: existing.name };

  const customerId = `cus-${String(data.customers.length + 1).padStart(3, "0")}`;
  const customer: Customer = {
    id: customerId,
    name: `New buyer ${phone.slice(-4)}`,
    phone,
    address: "",
    city: "Hyderabad",
    region: SELLER_REGION,
    segment: "retail",
    creditApproved: false,
    creditLimit: 0,
    createdAt: DEMO_TODAY,
    notes: "Self-registered on the website with phone + OTP.",
  };
  data.upsertCustomer(customer);
  return { customerId, name: customer.name };
}

/* ── The store ─────────────────────────────────────────────────────────── */

export const useCartStore = create<CartStore>()((set, get) => ({
  lines: [],
  session: null,
  otpPhone: null,
  otpCode: null,
  lastOrderId: null,

  /** Adding the same product, size and unit twice tops up the existing line. */
  addLine: (line) =>
    set((s) => {
      const existing = s.lines.find((l) => sameItem(l, line));
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.id === existing.id ? { ...l, qty: l.qty + line.qty } : l,
          ),
        };
      }
      return { lines: [...s.lines, { ...line, id: nextLineId() }] };
    }),

  updateLine: (id, patch) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  removeLine: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),

  clearCart: () => set({ lines: [] }),

  /** Opens an OTP challenge. The code is shown on screen — see `demoOtpFor`. */
  requestOtp: (phone) => {
    const normalized = normalizePhone(phone);
    set({ otpPhone: normalized, otpCode: demoOtpFor(normalized) });
  },

  /**
   * Verifies the challenge and opens the session. A number already in the
   * customer book signs in as that buyer — with their real order history —
   * and an unknown number becomes a new retail customer (FR-W-08, FR-W-09).
   */
  verifyOtp: (code) => {
    const { otpPhone, otpCode } = get();
    if (!otpPhone || !otpCode) return false;
    if (code.replace(/\D/g, "") !== otpCode) return false;

    const { customerId, name } = resolveCustomer(otpPhone);
    const session: StorefrontSession = { phone: otpPhone, customerId, name, verified: true };
    set({ session, otpPhone: null, otpCode: null });
    return true;
  },

  /** Signs out but keeps the basket — a guest can still check out later. */
  signOut: () => set({ session: null, otpPhone: null, otpCode: null }),

  setLastOrder: (orderId) => set({ lastOrderId: orderId }),
}));
