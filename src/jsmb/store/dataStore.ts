/**
 * The business record. One in-memory Zustand store, seeded deterministically,
 * read by every surface in the app — which is why a checkout on the storefront
 * moves the admin P&L without any wiring between them.
 *
 * Every mutation is immutable and bumps `revision` so memoised selectors can
 * invalidate on a single number rather than deep-comparing arrays.
 */
import { create } from "zustand";
import type { AnalyticsInput } from "../contracts/engines";
import type { DataState, DataStore } from "../contracts/stores";
import type { AttendanceRecord, Employee, Order } from "../domain/types";
import { buildSeed } from "../domain/seed/dataset";
import { round2 } from "../domain/format";
import { dailyWage } from "../domain/payroll";
import { eachDay, endOfMonth, isWorkingDay, startOfMonth } from "../domain/periods";

/** Re-derives an order's payment state from what has actually been collected. */
function applyPayment(order: Order, amount: number): Order {
  const paidAmount = round2(Math.min(order.total, order.paidAmount + amount));
  const dueAmount = round2(order.total - paidAmount);
  return {
    ...order,
    paidAmount,
    dueAmount,
    paymentState: dueAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : order.paymentState,
  };
}

/** Accepts "2026-06" or any date inside the month. */
function monthBounds(monthISO: string): { from: string; to: string } {
  const anchor = monthISO.length === 7 ? `${monthISO}-01` : monthISO.slice(0, 10);
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export const useDataStore = create<DataStore>()((set) => ({
  ...buildSeed(),

  resetDemo: () => set(() => ({ ...buildSeed() })),

  addOrder: (order) =>
    set((s) => ({ orders: [...s.orders, order], revision: s.revision + 1 })),

  advanceOrder: (orderId, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      revision: s.revision + 1,
    })),

  recordPayment: (payment) =>
    set((s) => ({
      payments: [...s.payments, payment],
      // A successful payment must move the order's dues, or the ledger and the
      // dashboard would disagree with the payments list.
      orders:
        payment.status === "success"
          ? s.orders.map((o) => (o.id === payment.orderId ? applyPayment(o, payment.amount) : o))
          : s.orders,
      revision: s.revision + 1,
    })),

  addInvoice: (invoice) =>
    set((s) => ({
      invoices: [...s.invoices, invoice],
      orders: s.orders.map((o) => (o.id === invoice.orderId ? { ...o, invoiceId: invoice.id } : o)),
      revision: s.revision + 1,
    })),

  addEnquiry: (enquiry) =>
    set((s) => ({ enquiries: [enquiry, ...s.enquiries], revision: s.revision + 1 })),

  updateEnquiry: (id, patch) =>
    set((s) => ({
      enquiries: s.enquiries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      revision: s.revision + 1,
    })),

  convertEnquiry: (enquiryId, orderId) =>
    set((s) => ({
      enquiries: s.enquiries.map((e) =>
        e.id === enquiryId ? { ...e, status: "converted", convertedOrderId: orderId } : e,
      ),
      revision: s.revision + 1,
    })),

  upsertCustomer: (customer) =>
    set((s) => ({
      customers: s.customers.some((c) => c.id === customer.id)
        ? s.customers.map((c) => (c.id === customer.id ? { ...c, ...customer } : c))
        : [...s.customers, customer],
      revision: s.revision + 1,
    })),

  setCreditApproval: (customerId, approved, limit) =>
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              creditApproved: approved,
              creditLimit: approved ? (limit ?? c.creditLimit) : 0,
            }
          : c,
      ),
      revision: s.revision + 1,
    })),

  setAttendance: (employeeId, date, present) =>
    set((s) => {
      const day = date.slice(0, 10);
      const exists = s.attendance.some((a) => a.employeeId === employeeId && a.date === day);
      const record: AttendanceRecord = { employeeId, date: day, present, source: "manual" };
      return {
        attendance: exists
          ? s.attendance.map((a) => (a.employeeId === employeeId && a.date === day ? record : a))
          : [...s.attendance, record],
        revision: s.revision + 1,
      };
    }),

  closeAttendanceMonth: (monthISO) =>
    set((s) => {
      const { from, to } = monthBounds(monthISO);
      // Sunday is the mill's weekly off, so it is never a working day.
      const workingDays = eachDay(from, to).filter(isWorkingDay);
      const active = s.employees.filter((e) => e.status === "active");

      const byKey = new Map<string, AttendanceRecord>(
        s.attendance.map((a) => [`${a.employeeId}|${a.date}`, a]),
      );
      for (const employee of active) {
        for (const date of workingDays) {
          if (date < employee.doj.slice(0, 10)) continue;
          byKey.set(`${employee.id}|${date}`, {
            employeeId: employee.id,
            date,
            present: true,
            source: "manual",
          });
        }
      }
      return { attendance: [...byKey.values()], revision: s.revision + 1 };
    }),

  addEmployee: (employee) =>
    set((s) => ({ employees: [...s.employees, employee], revision: s.revision + 1 })),

  terminateEmployee: (employeeId, dot) =>
    set((s) => ({
      employees: s.employees.map((e) =>
        e.id === employeeId ? { ...e, status: "terminated", dot } : e,
      ),
      revision: s.revision + 1,
    })),

  addBonus: (bonus) => set((s) => ({ bonuses: [...s.bonuses, bonus], revision: s.revision + 1 })),

  addActualCost: (entry) =>
    set((s) => ({ actualCosts: [...s.actualCosts, entry], revision: s.revision + 1 })),

  updateCostConfig: (patch) =>
    set((s) => ({ costConfig: { ...s.costConfig, ...patch }, revision: s.revision + 1 })),

  updateSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch };
      // BRD D5 — the wage divisor is an open assumption. Changing it must
      // re-flow every stored daily wage, not just the payroll calculation.
      const employees: Employee[] =
        patch.workingDaysDivisor !== undefined
          ? s.employees.map((e) => ({
              ...e,
              dailyWage: dailyWage(e.monthlySalary, settings.workingDaysDivisor),
            }))
          : s.employees;
      return { settings, employees, revision: s.revision + 1 };
    }),
}));

/** The read-only slice every analytics engine takes. */
export function selectAnalyticsInput(s: DataState): AnalyticsInput {
  return {
    orders: s.orders,
    customers: s.customers,
    employees: s.employees,
    attendance: s.attendance,
    bonuses: s.bonuses,
    actualCosts: s.actualCosts,
    costConfig: s.costConfig,
    settings: s.settings,
  };
}
