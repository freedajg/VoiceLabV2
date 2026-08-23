# JSMB Prototype — Build Contract

Read this in full before writing a line. It exists so that several agents can
build this app in parallel without colliding.

## 1. What we are building

A **front-end-only, fully deterministic prototype** of the system described in
the Jaggula Samson Mill Boards BRD v1.0 — presented as a **live multi-agent
operation**. It is shown to prospects on a laptop, often without network.

Three things must be simultaneously true:

1. **It behaves like software, not a mockup.** Actions really propagate: a
   checkout on the storefront moves the numbers in the admin P&L, because every
   surface reads one in-memory store.
2. **The agents are visible.** Twelve named agents with states, tool calls,
   handoffs and a streaming trace. A viewer should be able to point at any
   number on screen and see which agent produced it.
3. **The numbers are right.** A prospect will spot-check. Sales totals must
   reconcile to orders; P&L must reconcile to revenue minus actual costs.

There is **no backend, no network, no API key, no persistence**. Anything that
would be a server call is a simulated, seeded, timed function.

## 2. Non-negotiable rules

- **Never edit a file you do not own.** See the ownership map in §4. If you need
  a change in someone else's file, note it in your final report instead.
- **Never edit** `src/jsmb/domain/types.ts`, `src/jsmb/domain/constants.ts`,
  `src/jsmb/contracts/*`, `src/jsmb/jsmb.css`, `tailwind.config.ts`,
  `vite.config.ts`, `netlify.toml`, `jsmb.html`, `src/jsmb/main.tsx`. These are
  architect-owned. Report needed changes; do not make them.
- **Never touch anything outside `src/jsmb/`, `tests/jsmb/`** (VoiceLab shares
  this repo and must keep working).
- **No new dependencies.** Available: react 18, react-dom, react-router-dom 7,
  zustand 5, framer-motion 11, recharts 3, lucide-react, sonner, clsx,
  tailwind-merge, tailwindcss 3.
- **No network calls, no `fetch`, no timers that outlive a component**, no
  `localStorage` for business data (the demo must reset cleanly).
- **Determinism.** Never call `Math.random()` or `new Date()` for business data.
  Use the seeded RNG and `DEMO_TODAY` from `domain/constants.ts`. Two runs must
  produce byte-identical numbers.
- **TypeScript strict.** `npx tsc --noEmit` must pass. No `any`, no
  `@ts-ignore`. Prefer `unknown` + a narrow.
- **Hash routing only** (`createHashRouter` / `HashRouter`). Deep links must
  work when the file is opened directly.

## 3. Source of truth for every business rule

All of it is already encoded in `domain/constants.ts` — import, never retype:

| Rule | Where |
|---|---|
| 1 bundle = 25 kg, 1 lot = 20 bundles = 500 kg | `KG_PER_BUNDLE`, `KG_PER_LOT` |
| 20 t cap = 800 bundles = 40 lots | `MAX_ORDER_KG/_BUNDLES/_LOTS` |
| 7 SKUs and their prices | `PRODUCTS`, `PRODUCT_BY_CODE` |
| ₹20.20/kg standard cost | `STANDARD_COST_PER_KG`, `DEFAULT_COST_CONFIG` |
| 7 staff, ₹1,29,000/month | `ROSTER_TEMPLATE`, `EXPECTED_MONTHLY_PAYROLL` |
| GST rate, HSN, wage divisor, delivery policy | `DEFAULT_BUSINESS_SETTINGS` |
| Pinned "today" and RNG seed | `DEMO_TODAY`, `SEED` |

Three BRD items are **deliberately unresolved** (D1 GST rate/HSN, D5 wage
divisor, D6 delivery policy). They are editable settings, never hardcoded —
changing one must re-flow every downstream number on screen. This is a
demo feature, not an oversight.

## 4. File ownership map

| Owner | Owns exclusively |
|---|---|
| **architect** | `domain/types.ts`, `domain/constants.ts`, `contracts/**`, `jsmb.css`, `main.tsx`, `CONTRACT.md`, root configs |
| **domain agent** | `domain/*.ts` (except the two above), `domain/seed/**`, `store/dataStore.ts`, `tests/jsmb/**` |
| **runtime agent** | `agents/**`, `store/agentStore.ts` |
| **design agent** | `ui/**`, `app/**`, `store/uiStore.ts` |
| **storefront agent** | `features/storefront/**`, `store/cartStore.ts` |
| **admin agent** | `features/admin/**` |
| **command agent** | `features/command/**`, `features/agentops/**` |
| **architect (wave 3)** | `features/presenter/**`, `agents/scenarios/**` |

## 5. Required exports (the interfaces you must satisfy)

Implementations must be declared with the contract types so the compiler
enforces them, e.g.:

```ts
import type { QuoteOrderFn } from "../contracts/engines";
export const quoteOrder: QuoteOrderFn = (inputs, ctx) => { /* … */ };
```

### `domain/` — domain agent

| Module | Exports |
|---|---|
| `tonnage.ts` | `toKg: ToKgFn`, `fromKg: FromKgFn`, `capStatus: CapStatusFn` |
| `pricing.ts` | `standardCostPerKg: StandardCostFn`, `quoteLine: QuoteLineFn`, `quoteOrder: QuoteOrderFn` |
| `gst.ts` | `splitGst: SplitGstFn`, `buildInvoice: BuildInvoiceFn` |
| `periods.ts` | `rangeFor: RangeForFn`, plus `eachDay(from, to): string[]` |
| `payroll.ts` | `dailyWage: DailyWageFn`, `computePayroll: ComputePayrollFn` |
| `analytics.ts` | `computeSales: ComputeSalesFn`, `computePnl: ComputePnlFn`, `computeLedger: ComputeLedgerFn`, `computeDashboard(input: AnalyticsInput, todayISO: string): DashboardSnapshot` |
| `format.ts` | `inr(n)`, `inrCompact(n)`, `kg(n)`, `tons(n)`, `pct(n)`, `dateShort(iso)`, `dateLong(iso)` — all `(n: number) => string` / `(iso: string) => string` |
| `seed/rng.ts` | `makeRng(seed: number): () => number` (mulberry32), `pick`, `intBetween` |
| `seed/dataset.ts` | `buildSeed(): DataState` — the pristine dataset |
| `store/dataStore.ts` | `useDataStore` (zustand) satisfying `DataStore`; also export `selectAnalyticsInput(s: DataState): AnalyticsInput` |

### `agents/` — runtime agent

| Module | Exports |
|---|---|
| `registry.ts` | `AGENTS: AgentDef[]`, `AGENT_BY_ID: Record<AgentId, AgentDef>`, `LANES: {key, label, blurb}[]` |
| `runtime.ts` | the scheduler used by the store (internal shape is yours) |
| `scenarios/index.ts` | `SCENARIOS: Scenario[]` |
| `store/agentStore.ts` | `useAgentStore` (zustand) satisfying `AgentStore` |

### `app/` + `ui/` — design agent

| Module | Exports |
|---|---|
| `app/App.tsx` | `default` — router + shell, mounts every route in §6 |
| `app/Shell.tsx` | `default` — chrome: top bar, nav, agent side-rail, presenter bar |
| `app/brand.ts` | `BRANDS: Record<BrandKey, BrandProfile>`, `useBrand(): BrandProfile` |
| `ui/index.ts` | barrel re-exporting every primitive in §7 |
| `store/uiStore.ts` | `useUiStore` (zustand) satisfying `UiStore` |

## 6. Route map (fixed — features mount into these)

```
#/                     Command Centre      (command agent)
#/agents               Agent Ops / mesh    (command agent)
#/agents/:agentId      Agent detail        (command agent)
#/shop                 Storefront home     (storefront agent)
#/shop/catalogue       Catalogue           (storefront agent)
#/shop/product/:code   Product detail      (storefront agent)
#/shop/cart            Cart + tonnage      (storefront agent)
#/shop/checkout        Checkout            (storefront agent)
#/shop/confirmation    Order confirmed     (storefront agent)
#/shop/account         My orders           (storefront agent)
#/shop/enquiry         Large-order enquiry (storefront agent)
#/admin                Dashboard           (admin agent)
#/admin/customers      Customers DB        (admin agent)
#/admin/sales          Sales               (admin agent)
#/admin/employees      Employees           (admin agent)
#/admin/pnl            Profit / Loss       (admin agent)
#/admin/enquiries      Enquiries funnel    (admin agent)
#/admin/settings       Cost & assumptions  (admin agent)
```

Every feature folder exports its pages from an `index.ts` barrel, e.g.
`features/admin/index.ts` exports `AdminDashboard`, `AdminCustomers`, … The
design agent's router imports **only** from those barrels, and each barrel must
exist even if the pages are placeholders at first.

## 7. Shared UI primitives (design agent provides, everyone uses)

`Button`, `IconButton`, `Card`, `CardHeader`, `Stat`, `Badge`, `Pill`,
`Table` (+`Th`,`Td`), `Tabs`, `Modal`, `Drawer`, `Field`, `TextInput`,
`NumberStepper`, `Select`, `Toggle`, `SegmentedControl`, `EmptyState`,
`ProgressMeter`, `Sparkline`, `AgentChip`, `Section`, `PageHeader`,
`DataGridToolbar`.

Every primitive: forwards `className`, uses the `j-*` Tailwind tokens only
(never raw hex), and has a `tone` prop where a status colour applies.

**`AgentChip`** is the glue that makes provenance visible: `<AgentChip id="PRC" />`
renders the agent's accent dot, codename, and opens its detail drawer on click.
Admin and storefront surfaces put one on every panel that an agent produced.

## 8. Design direction

- **Product surfaces (storefront, admin): light, warm, confident.** Kraft-paper
  canvas, fired-clay primary, generous spacing, big honest numbers. This is a
  factory selling boards — it should feel sturdy and plain-spoken, not startup-y.
- **Agent surfaces (command centre, mesh, trace): dark console.** The contrast
  is the point: the agent layer reads as a system running alongside the product.
- Mobile-first is a hard requirement for the storefront (FR-W-03): usable at
  360 px with no horizontal scroll. Admin may assume ≥1024 px but must not break.
- Motion is meaningful, never decorative: pulses show work happening, packets
  show handoffs, meters show tonnage filling. Respect
  `prefers-reduced-motion` (the CSS already does — do not re-add animation
  inline).
- Indian number formatting throughout: ₹1,29,000 not ₹129,000. `format.ts`
  handles it; always use it.
- Use `.num` on any element containing figures so columns align.

## 9. Definition of done for your slice

- `npx tsc --noEmit` passes.
- `npm test` passes (domain agent: add tests; others: don't break them).
- No file outside your ownership row is modified.
- Every screen you own renders with the seeded data and no console errors.
- Your final report lists: files created, exports provided, anything you needed
  from another slice, and anything you deliberately left as a stub.
