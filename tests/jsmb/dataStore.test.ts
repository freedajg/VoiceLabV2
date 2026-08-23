import { beforeEach, describe, expect, it } from "vitest";
import { selectAnalyticsInput, useDataStore } from "../../src/jsmb/store/dataStore";
import { buildSeed } from "../../src/jsmb/domain/seed/dataset";
import { dailyWage } from "../../src/jsmb/domain/payroll";
import { eachDay, isWorkingDay } from "../../src/jsmb/domain/periods";
import { round2 } from "../../src/jsmb/domain/format";

beforeEach(() => useDataStore.getState().resetDemo());

describe("dataStore", () => {
  it("starts from the pristine seed", () => {
    const s = useDataStore.getState();
    const fresh = buildSeed();
    expect(s.orders).toEqual(fresh.orders);
    expect(s.customers).toEqual(fresh.customers);
    expect(s.revision).toBe(0);
  });

  it("bumps revision on every mutation", () => {
    const before = useDataStore.getState().revision;
    useDataStore.getState().updateCostConfig({ labour: 4.5 });
    expect(useDataStore.getState().revision).toBe(before + 1);
    useDataStore.getState().addBonus({ id: "b-x", employeeId: "emp-01", year: 2026, festival: "Dussehra", amount: 1000 });
    expect(useDataStore.getState().revision).toBe(before + 2);
  });

  it("restores the seed on resetDemo", () => {
    useDataStore.getState().updateCostConfig({ rawMaterial: 99 });
    useDataStore.getState().resetDemo();
    expect(useDataStore.getState().costConfig).toEqual(buildSeed().costConfig);
    expect(useDataStore.getState().revision).toBe(0);
  });

  it("moves an order's dues when a payment lands", () => {
    const outstanding = useDataStore.getState().orders.find((o) => o.dueAmount > 0)!;
    useDataStore.getState().recordPayment({
      id: "pay-test",
      orderId: outstanding.id,
      amount: outstanding.dueAmount,
      mode: "credit",
      status: "success",
      txnRef: "rcpt_test",
      paidAt: "2026-07-03",
    });
    const after = useDataStore.getState().orders.find((o) => o.id === outstanding.id)!;
    expect(after.dueAmount).toBe(0);
    expect(after.paidAmount).toBe(outstanding.total);
    expect(after.paymentState).toBe("paid");
  });

  it("leaves dues alone for a pending payment", () => {
    const outstanding = useDataStore.getState().orders.find((o) => o.dueAmount > 0)!;
    useDataStore.getState().recordPayment({
      id: "pay-pending",
      orderId: outstanding.id,
      amount: outstanding.dueAmount,
      mode: "razorpay",
      status: "pending",
      txnRef: "pay_test",
      paidAt: "2026-07-03",
    });
    const after = useDataStore.getState().orders.find((o) => o.id === outstanding.id)!;
    expect(after.dueAmount).toBe(outstanding.dueAmount);
  });

  it("records a part payment as partial", () => {
    const outstanding = useDataStore.getState().orders.find((o) => o.paymentState === "due")!;
    useDataStore.getState().recordPayment({
      id: "pay-part",
      orderId: outstanding.id,
      amount: round2(outstanding.dueAmount / 2),
      mode: "credit",
      status: "success",
      txnRef: "rcpt_part",
      paidAt: "2026-07-03",
    });
    const after = useDataStore.getState().orders.find((o) => o.id === outstanding.id)!;
    expect(after.paymentState).toBe("partial");
    expect(after.dueAmount).toBeGreaterThan(0);
  });

  it("toggles credit approval and clears the limit when revoked", () => {
    const customer = useDataStore.getState().customers.find((c) => !c.creditApproved)!;
    useDataStore.getState().setCreditApproval(customer.id, true, 2_00_000);
    expect(useDataStore.getState().customers.find((c) => c.id === customer.id)!.creditLimit).toBe(2_00_000);
    useDataStore.getState().setCreditApproval(customer.id, false);
    const after = useDataStore.getState().customers.find((c) => c.id === customer.id)!;
    expect(after.creditApproved).toBe(false);
    expect(after.creditLimit).toBe(0);
  });

  it("upserts attendance rather than duplicating a day", () => {
    const { setAttendance } = useDataStore.getState();
    setAttendance("emp-01", "2026-06-02", false);
    setAttendance("emp-01", "2026-06-02", true);
    const rows = useDataStore.getState().attendance.filter((a) => a.employeeId === "emp-01" && a.date === "2026-06-02");
    expect(rows).toHaveLength(1);
    expect(rows[0].present).toBe(true);
  });

  it("closes a month by marking every active employee present on working days", () => {
    useDataStore.getState().closeAttendanceMonth("2026-06");
    const s = useDataStore.getState();
    const workingDays = eachDay("2026-06-01", "2026-06-30").filter(isWorkingDay);
    for (const employee of s.employees.filter((e) => e.status === "active")) {
      const marked = s.attendance.filter(
        (a) => a.employeeId === employee.id && a.date >= "2026-06-01" && a.date <= "2026-06-30",
      );
      expect(marked).toHaveLength(workingDays.length);
      expect(marked.every((a) => a.present)).toBe(true);
    }
    // Sundays stay out of the register entirely.
    expect(s.attendance.every((a) => isWorkingDay(a.date))).toBe(true);
  });

  it("re-flows stored daily wages when the D5 divisor changes", () => {
    useDataStore.getState().updateSettings({ workingDaysDivisor: 30 });
    for (const e of useDataStore.getState().employees) {
      expect(e.dailyWage).toBe(dailyWage(e.monthlySalary, 30));
    }
  });

  it("terminates an employee without deleting the record", () => {
    const target = useDataStore.getState().employees.find((e) => e.status === "active")!;
    const before = useDataStore.getState().employees.length;
    useDataStore.getState().terminateEmployee(target.id, "2026-07-01");
    const after = useDataStore.getState().employees.find((e) => e.id === target.id)!;
    expect(useDataStore.getState().employees).toHaveLength(before);
    expect(after.status).toBe("terminated");
    expect(after.dot).toBe("2026-07-01");
  });

  it("links a new invoice back onto its order", () => {
    const order = useDataStore.getState().orders.find((o) => !o.invoiceId)!;
    useDataStore.getState().addInvoice({
      id: "inv-new",
      invoiceNo: "JSMB/26-27/9999",
      orderId: order.id,
      issuedAt: "2026-07-03",
      sellerGstin: "36AABCJ1234M1Z5",
      buyerName: "Test",
      buyerAddress: "Hyderabad",
      hsn: "48239019",
      gstRate: 0.12,
      taxableValue: order.subtotal,
      cgst: 0,
      sgst: 0,
      igst: order.gstAmount,
      total: order.total,
    });
    expect(useDataStore.getState().orders.find((o) => o.id === order.id)!.invoiceId).toBe("inv-new");
  });

  it("converts an enquiry onto an order", () => {
    const enquiry = useDataStore.getState().enquiries.find((e) => e.status === "new")!;
    const order = useDataStore.getState().orders[0];
    useDataStore.getState().convertEnquiry(enquiry.id, order.id);
    const after = useDataStore.getState().enquiries.find((e) => e.id === enquiry.id)!;
    expect(after.status).toBe("converted");
    expect(after.convertedOrderId).toBe(order.id);
  });
});

describe("selectAnalyticsInput", () => {
  it("projects exactly the slice the engines need", () => {
    const s = useDataStore.getState();
    const input = selectAnalyticsInput(s);
    expect(Object.keys(input).sort()).toEqual(
      ["actualCosts", "attendance", "bonuses", "costConfig", "customers", "employees", "orders", "settings"].sort(),
    );
    expect(input.orders).toBe(s.orders); // by reference — cheap for memoisation
  });
});
