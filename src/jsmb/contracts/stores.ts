/**
 * Store contracts — four disjoint Zustand stores, one owner each.
 *
 * OWNED BY THE ARCHITECT. Each implementing agent must satisfy its interface
 * exactly; consumers may rely on nothing beyond what is declared here.
 *
 *   dataStore   → src/jsmb/store/dataStore.ts    (domain agent)
 *   cartStore   → src/jsmb/store/cartStore.ts    (storefront agent)
 *   agentStore  → src/jsmb/store/agentStore.ts   (runtime agent)
 *   uiStore     → src/jsmb/store/uiStore.ts      (design-system agent)
 */
import type {
  ActualCostEntry,
  AttendanceRecord,
  Bonus,
  BusinessSettings,
  CostConfig,
  Customer,
  Employee,
  Enquiry,
  EnquiryStatus,
  Invoice,
  Order,
  OrderStatus,
  Payment,
  PeriodKey,
  ProductCode,
  Unit,
} from "../domain/types";
import type {
  AgentDef,
  AgentId,
  AgentState,
  ApprovalRequest,
  PlaybackSpeed,
  RunStatus,
  Scenario,
  TraceEvent,
} from "./agents";

/* ── 1. dataStore — the business record ────────────────────────────────── */

export interface DataState {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
  enquiries: Enquiry[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  bonuses: Bonus[];
  actualCosts: ActualCostEntry[];
  costConfig: CostConfig;
  settings: BusinessSettings;
  /** Bumped on every mutation so memoised selectors can invalidate cheaply. */
  revision: number;
}

export interface DataActions {
  /** Restores the pristine deterministic seed. Used by Reset Demo. */
  resetDemo: () => void;
  addOrder: (order: Order) => void;
  advanceOrder: (orderId: string, status: OrderStatus) => void;
  recordPayment: (payment: Payment) => void;
  addInvoice: (invoice: Invoice) => void;
  addEnquiry: (enquiry: Enquiry) => void;
  updateEnquiry: (id: string, patch: Partial<Enquiry>) => void;
  convertEnquiry: (enquiryId: string, orderId: string) => void;
  upsertCustomer: (customer: Customer) => void;
  setCreditApproval: (customerId: string, approved: boolean, limit?: number) => void;
  setAttendance: (employeeId: string, date: string, present: boolean) => void;
  /** Marks every active employee present for each working day of the month. */
  closeAttendanceMonth: (monthISO: string) => void;
  addEmployee: (employee: Employee) => void;
  terminateEmployee: (employeeId: string, dot: string) => void;
  addBonus: (bonus: Bonus) => void;
  addActualCost: (entry: ActualCostEntry) => void;
  updateCostConfig: (patch: Partial<CostConfig>) => void;
  updateSettings: (patch: Partial<BusinessSettings>) => void;
}

export type DataStore = DataState & DataActions;

/* ── 2. cartStore — storefront session ─────────────────────────────────── */

export interface CartLine {
  id: string;
  productCode: ProductCode;
  size: number;
  unit: Unit;
  qty: number;
}

export interface StorefrontSession {
  phone: string;
  customerId: string;
  name: string;
  verified: boolean;
}

export interface CartState {
  lines: CartLine[];
  session: StorefrontSession | null;
  /** Phone awaiting OTP entry; null when no OTP challenge is open. */
  otpPhone: string | null;
  /** The code the demo will accept — displayed on screen, never secret. */
  otpCode: string | null;
  /** Order just completed, so the confirmation screen can render it. */
  lastOrderId: string | null;
}

export interface CartActions {
  addLine: (line: Omit<CartLine, "id">) => void;
  updateLine: (id: string, patch: Partial<Omit<CartLine, "id">>) => void;
  removeLine: (id: string) => void;
  clearCart: () => void;
  requestOtp: (phone: string) => void;
  verifyOtp: (code: string) => boolean;
  signOut: () => void;
  setLastOrder: (orderId: string | null) => void;
}

export type CartStore = CartState & CartActions;

/* ── 3. agentStore — the visible agent layer ───────────────────────────── */

export interface AgentRuntimeState {
  /** Static definitions, keyed for O(1) lookup by the mesh and side-rail. */
  defs: AgentDef[];
  states: Record<AgentId, AgentState>;
  /** Last message each agent emitted — shown under its node. */
  lastMessage: Partial<Record<AgentId, string>>;
  /** Full trace for the session, oldest first. */
  trace: TraceEvent[];
  /** Handoff edges that should be pulsing right now, as "FROM>TO" keys. */
  activeEdges: string[];
  approvals: ApprovalRequest[];
  scenarios: Scenario[];
  activeScenarioId: string | null;
  status: RunStatus;
  speed: PlaybackSpeed;
  /** Index of the next step to play in the active scenario. */
  stepIndex: number;
  /** Simulated elapsed time for the current run, in ms. */
  clockMs: number;
  runId: string | null;
  /** Route the current beat wants on screen; the shell may follow it. */
  focusRoute: string | null;
  invocations: Record<AgentId, number>;
}

export interface AgentRuntimeActions {
  start: (scenarioId: string) => void;
  pause: () => void;
  resume: () => void;
  /** Advances exactly one step, regardless of play state. */
  step: () => void;
  abort: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  resolveApproval: (approvalId: string, optionId: string) => void;
  /** Clears trace, approvals and agent states without touching business data. */
  clearTrace: () => void;
  /** Emits a one-off trace entry — used by live UI actions outside a scenario. */
  emit: (
    event: Omit<TraceEvent, "id" | "seq" | "atMs" | "runId"> & { atMs?: number },
  ) => void;
  /** Drives a short ad-hoc agent animation for a real user interaction. */
  pulse: (agentId: AgentId, state: AgentState, message: string, holdMs?: number) => void;
}

export type AgentStore = AgentRuntimeState & AgentRuntimeActions;

/* ── 4. uiStore — chrome, brand and presenter controls ─────────────────── */

/** White-label switch: JSMB for the real pitch, Northwind for generic demos. */
export type BrandKey = "jsmb" | "demo";

export interface UiState {
  brand: BrandKey;
  /** Wraps the storefront in a phone bezel for presenting. */
  phoneFrame: boolean;
  /** Shows the coach-mark overlay and the scenario rail. */
  presenterMode: boolean;
  /** Agent side-rail open state; collapses on small screens. */
  railOpen: boolean;
  /** Agent whose detail drawer is open, or null. */
  inspectedAgentId: AgentId | null;
  /** Trace entry expanded in the console inspector. */
  inspectedTraceId: string | null;
  /** Default period used by admin modules. */
  adminPeriod: PeriodKey;
}

export interface UiActions {
  setBrand: (brand: BrandKey) => void;
  togglePhoneFrame: () => void;
  togglePresenterMode: () => void;
  setRailOpen: (open: boolean) => void;
  inspectAgent: (id: AgentId | null) => void;
  inspectTrace: (id: string | null) => void;
  setAdminPeriod: (period: PeriodKey) => void;
}

export type UiStore = UiState & UiActions;

/* ── Brand tokens (white-label) ────────────────────────────────────────── */

export interface BrandProfile {
  key: BrandKey;
  company: string;
  legalName: string;
  tagline: string;
  ownerName: string;
  ownerTitle: string;
  city: string;
  /** Two-letter mark used in the header badge. */
  initials: string;
  /** Storefront hero line. */
  hero: string;
  heroSub: string;
}
