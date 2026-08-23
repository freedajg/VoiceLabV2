# Business Requirements Document (BRD)
## Jaggula Samson Mill Boards Pvt. Ltd. — E‑Commerce Website & Admin Portal

| | |
|---|---|
| **Client** | Jaggula Samson Mill Boards Private Limited (JSMB) |
| **Proprietor / Admin** | J. S. Ajay Kumar |
| **Prepared by** | Freeda (Consultant) |
| **Location (current)** | Hyderabad, Telangana, India |
| **Markets served** | Telangana & Andhra Pradesh (current); Bengaluru/Karnataka (future) |
| **Document version** | 1.0 — Draft for approval |
| **Date** | 3 July 2026 |
| **Status** | Awaiting client sign‑off |

---

## 1. Executive Summary

JSMB manufactures and sells cardboard / mill‑board sheets (plain and patterned, thin and thick) in bundles and lots. Today the company sells offline and through an IndiaMART seller profile, with no dedicated website.

This project delivers **two connected products**:

1. **A customer‑facing e‑commerce website** — a vibrant, mobile‑first storefront where buyers browse products, add bundles/lots to a cart, log in with phone + OTP, place orders (up to 20 tons), pay online or on credit, and receive confirmations and GST bills.
2. **An admin portal for Ajay** — a private dashboard covering four modules: **Customers**, **Sales**, **Employees**, and **Profit/Loss**, giving the owner a single place to run and measure the business.

The build is **phased** (V1 → V2 → V3) so the core selling engine ships first and higher‑complexity items (biometric attendance, Bengaluru partner/logistics network) are added later without rework.

---

## 2. Business Objectives

| # | Objective | Success measure |
|---|---|---|
| O1 | Sell online directly to customers in Telangana & AP | Customers can place & pay for orders end‑to‑end without phone calls |
| O2 | Capture large‑order leads the site can't process directly | Enquiry forms reach Ajay for every 20‑ton+ request |
| O3 | Give Ajay real‑time visibility of customers, sales, staff & profit | One admin login shows all four modules with live data |
| O4 | Make profit/loss transparent (per order and per period) | Daily/weekly/monthly/yearly profit is calculated automatically |
| O5 | Build a foundation that can extend to Bengaluru later | Data model is region‑ and source‑aware from day one |

---

## 3. Scope

### 3.1 In scope — Version 1 (this build)
- Customer website: catalogue, cart (bundles **and** lots), phone+OTP login, customer account with order history, checkout, order‑confirmation SMS, GST invoice on payment.
- Payments: Razorpay (UPI / cards / net‑banking) **and** pay‑on‑delivery / credit for admin‑approved trade buyers.
- 20‑ton order cap with automatic redirect to a large‑order enquiry form.
- General "Contact / Deal Enquiry" form (Name, Address, Phone, Issue, Additional info).
- Admin portal (single login — Ajay): **Customers DB**, **Sales**, **Employees**, **Profit/Loss**.

### 3.2 In scope — Version 2 (next phase)
- Biometric attendance device integration for the Employees module.
- Deeper analytics (trend charts, product‑mix, customer segmentation).
- Optional staff sub‑logins with role‑based access.

### 3.3 In scope — Version 3 (future, on demand)
- Bengaluru **Business‑Partner** portal (partner manufacturers).
- **Transportation / Logistics** partner portal.
- Trading/drop‑ship order flow (source from partner → deliver via logistics).

### 3.4 Out of scope (for now)
- Physical biometric hardware procurement.
- Accounting‑software (Tally/Zoho Books) integration — can be a later add‑on.
- Multi‑language storefront (English first; regional language later if needed).
- Automated logistics/route optimisation.

---

## 4. Stakeholders & User Roles

| Role | Who | Access |
|---|---|---|
| **Admin** | J. S. Ajay Kumar (only) | Full admin portal — all four modules, incl. salaries & profit |
| **Customer** | Trade & retail buyers | Storefront, own account & order history only |
| **Lead** (not registered) | Large‑order / enquiry visitors | Enquiry & contact forms only |
| **Consultant / Project owner** | Freeda | Requirements, approvals, setup coordination |

> Note: V1 has a **single admin login (Ajay)**. Staff sub‑roles are deferred to V2.

---

## 5. Product Catalogue & Units

### 5.1 Unit definitions
- **1 Bundle = 25 kg**
- **1 Lot = 20 Bundles = 500 kg (0.5 ton)**
- **5 Lots = 100 Bundles = 2,500 kg (2.5 tons)**
- **Maximum order (V1) = 20 tons = 20,000 kg = 800 bundles = 40 lots.** Above this → large‑order enquiry form.

### 5.2 Products & selling prices

| Code | Category | Type | Sizes (ounce) | Pattern | Price / bundle (25 kg) | Price / kg |
|---|---|---|---|---|---|---|
| P‑PT | Plain Thin | Thin | 8, 10, 12, 14, 16, 20 | — | ₹570 | ₹22.80 |
| P‑PK | Plain Thick | Thick | 24, 28, 32, 34, 36, 48 | — | ₹520 | ₹20.80 |
| PT‑SB | Patterned Thin | Thin | 8–20 | Sweet Boxes | ₹570 + ₹120 = **₹690** | ₹27.60 |
| PT‑CP | Patterned Thin | Thin | 8–20 | Caps | ₹570 + ₹120 = **₹690** | ₹27.60 |
| PK‑FL | Patterned Thick | Thick | 24–48 | File Size | ₹520 + ₹40 = **₹560** | ₹22.40 |
| PK‑PF | Patterned Thick | Thick | 24–48 | Portfolio Size | ₹520 + ₹90 = **₹610** | ₹24.40 |
| PK‑CT | Patterned Thick | Thick | 24–48 | Cutting Size | ₹520 + ₹40 = **₹560** | ₹22.40 |

> **Note:** Thick sells below thin **by design** — a 25 kg thick bundle contains fewer, heavier sheets than a 25 kg thin bundle. Cost per kg is the same; only selling price per kg differs. Pattern charge is added on top of the base bundle price.

---

## 6. Cost & Pricing Model (for the Profit/Loss module)

### 6.1 Standard cost build‑up (per kg)

| Component | ₹ / kg | Notes |
|---|---|---|
| Raw material | 13.20 | **Fixed at ₹13.2/kg — wastage already included** |
| Labour | 4.00 | |
| Electricity (current bill) | 1.00 | |
| Maintenance | 1.00 | **Includes the machine‑oiling cost (~₹1,000/month)** |
| Transport | 1.00 | |
| **Standard cost (ex‑margin)** | **20.20** | Basis for margin calculation |
| Margin (target) | 2.00 | |
| **Reference price** | **22.20** | Model figure |

### 6.2 Raw‑material blend (reference for procurement / actuals)

| Material | Share | Rate |
|---|---|---|
| Paper‑plate waste | 70% | ₹11,000 / ton |
| Board‑cutting waste | 10% | ₹14,000 / ton |
| Pulp | 10% | ₹6,000 / ton |
| Road / tissue waste (lower grade) | 10% | ₹8,000 / ton |

> The blended purchase rate is ~₹10,500/ton, but after production wastage the **effective raw‑material cost is fixed at ₹13.2/kg** — this is the figure the system uses.

### 6.3 Actual per‑product margin (standard cost ₹20.20/kg)

| Product | Sell ₹/kg | Standard cost ₹/kg | Margin ₹/kg | Margin ₹/bundle (25 kg) |
|---|---|---|---|---|
| Plain Thin | 22.80 | 20.20 | **+2.60** | +₹65.00 |
| Plain Thick | 20.80 | 20.20 | **+0.60** | +₹15.00 |
| Patterned Thin (Sweet Box/Caps) | 27.60 | 20.20 | **+7.40*** | +₹185.00* |
| Patterned Thick (File/Cutting) | 22.40 | 20.20 | **+2.20*** | +₹55.00* |
| Patterned Thick (Portfolio) | 24.40 | 20.20 | **+4.20*** | +₹105.00* |

> \* **Assumption:** the pattern charge is treated as additional revenue with no extra production cost. If a pattern adds labour/material, tell us and we'll add a per‑pattern cost line.

### 6.4 Two profit views the module will show
1. **Per‑order margin** — instant margin on any order using standard cost (₹20.20/kg). Good for pricing decisions.
2. **Period P&L (daily/weekly/monthly/yearly)** — reconciles **actual revenue** against **actual costs**: real payroll (from the Employees module), actual raw‑material purchases, electricity & maintenance bills, transport. This gives the true profit, not just the modelled one.

---

## 7. Functional Requirements — Customer Website

Format: **FR‑W‑xx** | requirement | acceptance criteria.

### 7.1 Catalogue & browsing
- **FR‑W‑01 — Product catalogue.** Show all 7 product variants (Section 5.2) with category, sizes, pattern, price/bundle and price/kg, and an image. *AC: every product renders with correct price and is filterable by Plain/Patterned and Thin/Thick.*
- **FR‑W‑02 — Vibrant, friendly UI.** Bright, trustworthy design with clear hooks (e.g. "Factory‑direct prices", "Order by the bundle or the lot", "Free/priced delivery across Telangana & AP"). *AC: passes a mobile‑first design review; primary actions reachable in ≤2 taps.*
- **FR‑W‑03 — Mobile‑first.** Fully responsive; optimised for phone buyers. *AC: usable on a 360 px‑wide screen with no horizontal scroll.*

### 7.2 Cart & ordering
- **FR‑W‑04 — Order in bundles or lots.** Customer chooses **bundle** or **lot** as the buying unit per product; system converts to kg/tons automatically (1 lot = 20 bundles = 500 kg). *AC: switching unit updates quantity, weight and price live.*
- **FR‑W‑05 — Live tonnage & 20‑ton cap.** Cart shows running total weight; hard cap at 20 tons (800 bundles / 40 lots). *AC: attempting to exceed 20 t blocks checkout and shows the large‑order CTA.*
- **FR‑W‑06 — Large‑order redirect.** On hitting the cap (or a "Bulk / >20 t" button), route the customer to the **Large‑Order Enquiry form** (Section 7.6). *AC: submitted enquiry appears in admin.*
- **FR‑W‑07 — Pattern selection.** For patterned products, customer selects the pattern (Sweet Boxes / Caps / File / Portfolio / Cutting); price updates with the pattern charge. *AC: correct add‑on applied.*

### 7.3 Authentication & customer account
- **FR‑W‑08 — Phone + OTP login/registration.** Customer signs in with mobile number + OTP (no password). *AC: valid OTP grants access; OTP expires and is rate‑limited.*
- **FR‑W‑09 — Customer account.** Logged‑in customer sees profile, **current order(s)** and **past order history** with status and amounts (paid/due). *AC: a customer sees only their own orders.*
- **FR‑W‑10 — Capture GST/company details.** Optional GSTIN, company name, delivery address stored on the profile for invoicing. *AC: GSTIN validated for format when entered.*

### 7.4 Checkout, payment & billing
- **FR‑W‑11 — Checkout.** Review cart, delivery address, unit summary, taxes and total before confirming. *AC: total = Σ(line prices) + GST + any delivery charge.*
- **FR‑W‑12 — Online payment (Razorpay).** Support UPI, cards, net‑banking. *AC: successful payment marks order Paid; failed payment leaves order Pending.*
- **FR‑W‑13 — Pay‑on‑delivery / credit.** For **admin‑approved trade buyers only**, allow COD/credit; order records outstanding **due** amount. *AC: COD/credit option appears only for flagged customers.*
- **FR‑W‑14 — Order‑confirmation SMS.** On order placement, send confirmation (order no., items, amount, status) to the customer's phone. *AC: SMS delivered via DLT‑registered provider.*
- **FR‑W‑15 — GST‑compliant invoice.** On full payment, generate a downloadable GST invoice (seller GSTIN, buyer GSTIN if any, HSN, GST rate, taxable value, tax, total). *AC: invoice fields match GST norms; PDF downloadable & re‑sendable.*

### 7.5 Order lifecycle
- **FR‑W‑16 — Order states.** Placed → Confirmed → (Paid / Due) → Dispatched → Delivered. *AC: state visible to customer and editable by admin.*

### 7.6 Forms
- **FR‑W‑17 — Large‑Order Enquiry form.** Fields: Name, Address, Phone, Issue/Requirement, Additional info (+ estimated quantity/tonnage). *AC: stored and shown to admin with timestamp.*
- **FR‑W‑18 — Contact / Deal Enquiry form.** Same fields for general deals; feeds the same admin enquiry list. *AC: admin can mark an enquiry Contacted / Converted / Closed.*

---

## 8. Functional Requirements — Admin Portal (Ajay only)

Format: **FR‑A‑xx**.

### 8.1 Access
- **FR‑A‑01 — Single admin login.** Only Ajay can access the admin portal (secure login). *AC: no customer can reach admin routes; sessions expire.*
- **FR‑A‑02 — Dashboard home.** At‑a‑glance tiles: today's orders, revenue, dues outstanding, new enquiries, low‑margin alerts. *AC: figures match module data.*

### 8.2 Module 1 — Customers Database
- **FR‑A‑03 —** Store & search customers: name, phone, address, **company GSTIN**, order list, order status (placed/delivered), total order amount, **paid / due** amounts.
- **FR‑A‑04 —** Flag a customer as **trade / credit‑approved** (enables COD/credit at checkout) with an optional credit limit.
- **FR‑A‑05 —** View a single customer's full order & payment ledger. *AC: dues roll up correctly across orders.*

### 8.3 Module 2 — Sales Portal
- **FR‑A‑06 —** Bundles/lots sold per **product category**, filterable **daily / weekly / monthly / yearly**.
- **FR‑A‑07 —** Revenue by product, period and (future) region. *AC: totals reconcile with orders.*
- **FR‑A‑08 —** Export sales report (CSV/PDF).

### 8.4 Module 3 — Employees Portal
- **FR‑A‑09 —** Employee master: name, role, **date of joining**, **date of termination**, daily wage, monthly‑equivalent salary, status.
- **FR‑A‑10 —** **Daily attendance** entry (manual in V1; biometric in V2) → auto‑counts **working days**.
- **FR‑A‑11 —** Salary computation: pay = daily wage × days worked (daily‑wage basis).
- **FR‑A‑12 —** **Dussehra (Dasara) bonus** entry per employee (variable amount) and annual bonus record.
- Current roster seeded: 1 Operator ₹23,000; 2 Machine Specialists ₹18,000 each; 5 Helpers ₹14,000 each — **total ₹1,29,000/month across 7 staff.** *AC: adding/removing staff updates payroll totals used by the P&L module.*

### 8.5 Module 4 — Profit / Loss Portal
- **FR‑A‑13 —** Show **cost price**, **selling price** and **profit** per product and per order (standard cost ₹20.20/kg).
- **FR‑A‑14 —** **Period P&L** (daily/weekly/monthly/yearly): actual revenue − actual costs (payroll from Module 3 + raw material + electricity + maintenance + transport). *AC: monthly profit = revenue − all actual costs for the month.*
- **FR‑A‑15 —** Editable cost assumptions (raw ₹13.2/kg, labour ₹4, etc.) so future price changes flow through. *AC: changing an input recalculates margins.*

---

## 9. Data Model — Key Entities (high level)

- **Customer** (id, name, phone, address, GSTIN, credit_approved, credit_limit, **region**)
- **Product** (code, category, type[thin/thick], sizes, base_price, pattern, pattern_charge, price_per_kg)
- **Order** (id, customer_id, status, subtotal, gst, total, paid, due, payment_mode, **region**, **fulfillment_source**)
- **OrderLine** (order_id, product_code, unit[bundle/lot], qty, weight_kg, line_price)
- **Payment** (order_id, amount, mode[razorpay/cod/credit], status, txn_ref)
- **Invoice** (order_id, gstin_buyer, hsn, gst_rate, taxable_value, tax, total, pdf)
- **Enquiry** (id, name, phone, address, issue, extra_info, est_tonnage, status)
- **Employee** (id, name, role, doj, dot, daily_wage, status)
- **Attendance** (employee_id, date, present)
- **Bonus** (employee_id, year, festival, amount)
- **CostConfig** (raw, labour, electricity, maintenance, transport, margin)

> **`region`** and **`fulfillment_source`** on Order are included **now** so the Bengaluru trading model (V3) can be added without re‑architecting.

---

## 10. Integrations & Non‑Functional Requirements

### 10.1 Integrations
| Integration | Purpose | Owner action needed |
|---|---|---|
| **Razorpay** | UPI/card/net‑banking payments | Razorpay account + KYC (Ajay's business) |
| **SMS via DLT‑registered provider** (MSG91 / Fast2SMS) | OTP + order‑confirmation SMS | DLT registration + template approval (guided setup, **after BRD**) |
| **GST invoicing** | Compliant invoices | GSTIN, HSN code(s), GST rate, firm billing details (**after BRD**) |

### 10.2 Non‑functional requirements
- **NFR‑01 Mobile‑first & responsive** across phones/tablets/desktop.
- **NFR‑02 Security:** OTP rate‑limiting, encrypted data at rest/in transit, admin route protection, PCI handled by Razorpay (no card data stored).
- **NFR‑03 Performance:** storefront pages load in ≤3 s on 4G.
- **NFR‑04 Reliability:** target ≥99% uptime; daily database backups.
- **NFR‑05 Scalability:** architecture ready for added regions & partner network (V3).
- **NFR‑06 Usability:** clear, vibrant, minimal‑friction checkout.
- **NFR‑07 Compliance:** GST invoicing + DLT‑compliant transactional SMS.

---

## 11. Reports & Analytics (V1)
- Daily/weekly/monthly/yearly **sales** (bundles/lots & revenue) by product category.
- **Dues** outstanding by customer.
- **Profit/Loss** by period (standard + actual).
- **Enquiries** funnel (new → contacted → converted).
- Exports: CSV / PDF.

---

## 12. Assumptions
1. Raw‑material cost is fixed at **₹13.2/kg** (wastage included); other cost lines per Section 6.1.
2. **Machine oiling is inside** the ₹1/kg maintenance line (no separate fixed cost).
3. **Pattern charge = pure additional revenue** (no extra production cost) unless corrected.
4. **English‑only** storefront in V1.
5. Delivery/transport for local orders is covered by the ₹1/kg transport cost; any customer‑facing delivery charge policy to be confirmed.
6. Admin is **Ajay only** in V1; staff roles deferred to V2.
7. Attendance is **manual** in V1; biometric integration in V2.

---

## 13. Open Items / Dependencies (to close before or during build)
| # | Item | Needed from | When |
|---|---|---|---|
| D1 | Seller **GSTIN**, **HSN code(s)** (e.g. 68129290) & applicable **GST rate** for these boards | Ajay | After BRD approval |
| D2 | Firm billing details for invoices (legal name, address, bank) | Ajay | After BRD approval |
| D3 | DLT registration + SMS template approval | Freeda (guided) | After BRD approval |
| D4 | Razorpay account + KYC | Ajay | Before payment testing |
| D5 | **Daily‑wage derivation** — confirm the daily rate per employee, or the working‑days divisor to convert monthly figures (e.g. ₹23,000 ÷ 26 days) | Ajay | Before Employees module build |
| D6 | Delivery‑charge policy for customers (free / flat / by distance) | Ajay | Before checkout build |
| D7 | Hosting & domain decision (recommendation in Appendix A) | Freeda/Ajay | Before deployment |
| D8 | Product **images** (from IndiaMART or direct) | Freeda/Ajay | Before catalogue build |

---

## 14. Phased Roadmap

| Phase | Contents | Notes |
|---|---|---|
| **V1** | Storefront (catalogue, cart in bundles/lots, OTP login, account, checkout, Razorpay + COD/credit, SMS confirmation, GST invoice, 20‑ton cap, enquiry forms) + Admin portal (Customers, Sales, Employees[manual], Profit/Loss) | Core selling engine |
| **V2** | Biometric attendance, deeper analytics, optional staff roles | Operational depth |
| **V3** | Bengaluru **Business‑Partner** portal + **Logistics/Transport** portal, trading/drop‑ship flow | Region‑expansion (asset‑light) |

### 14.1 Note on the Bengaluru expansion (V3)
The plan — source from an existing Bengaluru manufacturer and deliver via a logistics partner rather than building a plant — is a sound, **asset‑light** trading model. Caution: it inserts a middleman layer (partner margin + transport) while competing against locally‑based Bengaluru sellers, so margins are thinner and the edge must come from relationships, reliability and existing customers expanding into Bengaluru. **Recommendation:** don't build partner/logistics portals until there's a signed partner and real order flow; V1's data model is already region‑ and source‑aware so V3 bolts on cleanly.

---

## Appendix A — Proposed Solution Approach (for reference; not binding)
- **Frontend:** responsive web app (React‑based), mobile‑first.
- **Backend + Database:** secure API with a relational database (customers, orders, payments, employees).
- **Auth:** phone‑OTP via the SMS provider.
- **Payments:** Razorpay Checkout.
- **Hosting:** a managed cloud host + custom domain (options to be recommended in D7).
- This is a **full‑stack application** (storefront + backend + DB + auth + payments), not a single static page — deployment involves real‑world setup on Ajay's side (domain, hosting, gateway KYC, SMS DLT), which we'll action from the checklist above.

---

## Appendix B — Setup Checklist (post‑approval)
1. ☐ Collect GSTIN, HSN, GST rate, billing details (D1, D2)
2. ☐ Create Razorpay account & complete KYC (D4)
3. ☐ Choose SMS provider, complete DLT registration, get templates approved (D3)
4. ☐ Decide hosting + register domain (D7)
5. ☐ Gather product images (D8)
6. ☐ Confirm daily‑wage basis & delivery policy (D5, D6)
7. ☐ Seed employee roster & cost config

---

## Sign‑off

| Name | Role | Approval | Date |
|---|---|---|---|
| J. S. Ajay Kumar | Client / Admin | ☐ Approved  ☐ Changes requested | |
| Freeda | Consultant | | |

*On approval, we proceed to wireframes → clickable prototype → build, per the phased roadmap.*
