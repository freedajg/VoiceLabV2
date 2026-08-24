# JSMB Agent Mesh — Presenter Runbook

Everything you need to run this in front of a prospect. Read once before the
first pitch; after that the four scenario cards below are enough.

---

## Before you walk in

| | |
|---|---|
| **URL** | `/jsmb` on the deployed site — or `npm run build && npx vite preview` and open `http://localhost:4173/jsmb.html` |
| **Network needed?** | **No.** No API calls, no keys, no database. It runs on a plane. |
| **Reset** | Presenter bar → **Reset** → confirm. Restores identical numbers every time. |
| **Screen** | 1440×900 or larger. It works on a phone, but present on a laptop. |
| **Browser** | Chrome or Edge. Zoom at 100%; the layout is built for it. |

**Two switches worth knowing before you start:**

- **JS / NB** (top right) — white-label toggle. `JS` is Jaggula Samson Mill
  Boards. `NB` re-skins the whole app as a neutral industrial company, for
  prospects who are not JSMB. Flip it before they walk in, not during.
- **Phone icon** (top right) — wraps the storefront in a phone bezel. Turn it on
  when you want to make the mobile-first point; turn it off for the admin
  portal.

Turn **Presenter mode** on (the podium icon). You get a bottom bar with the four
scenarios as one-click buttons, transport controls, speed, and the script.

---

## The one-sentence framing

> "This is not a website with some AI bolted on. It's twelve named agents
> running a mill — and every number you're about to see is calculated live from
> the same data, so you can push on any of it."

---

## The four scenarios

Run them in order. Each one raises the stakes on the last. Total ≈ 6 minutes
of runtime, 15–20 minutes with discussion.

### S1 · A small order, hands off — *19 s*

**Point:** the whole loop works, and nobody at JSMB touches it.

Browse → weigh → OTP → pay → GST invoice → SMS. Seven agents, zero humans.

**Say:** *"Ordinary case. Eight bundles, two hundred kilos. Watch who does what
— and notice Mulya tells you the margin at the moment of sale, ₹1,480, which is
something Ajay has never had before."*

**Land it:** the ₹1,500 delivery charge appears because 200 kg is under the
2-tonne free-delivery line — and that threshold is a setting you can change on
screen.

---

### S2 · Web order, end to end — *22 s* ⭐ the flagship

**Point:** the system knows what it isn't allowed to decide.

A ₹1.44 lakh credit request against a ₹1.5 lakh limit. Lenden stops and asks Ajay.

**Say:** *"Here's the part that matters. She's asking for a hundred and
forty-four thousand on credit. The system will not make that call on its own."*

**Then — always do this:** run it a second time and press **Deny**. No invoice,
no dispatch, order stays at Placed, money stays outstanding, and Ajay's dues
figure moves. Same run, genuinely different books.

> If you only have time for one scenario, this is the one.

---

### S3 · The order the site must refuse — *26 s*

**Point:** a hard rule that captures the lead instead of losing it — and an
uncomfortable truth about the price list.

35 tonnes hits the 20-tonne ceiling. Tolak blocks it. Sampark turns it into a
lead on Ajay's board. Ajay converts an 18-tonne first tranche.

**Say, slowly:** *"Eighteen tonnes of plain thick earns ten thousand eight
hundred rupees. Sixty paise a kilo. The same eighteen tonnes in patterned thin
would earn one lakh thirty-three thousand — twelve times the money, same
machine, same shift."*

**Land it:** the invoice comes out as **IGST**, not CGST+SGST, because Vijayawada
is across a state line. Nobody has to remember that.

---

### S4 · Month end, and a sixty-paise problem — *28 s*

**Point:** the P&L tells the owner something he cannot currently see.

Attendance closes → ₹1,29,000 payroll → period P&L → break-even → a cost change
that re-flows the entire book.

**Two findings to state plainly:**

1. **Break-even.** The model carries labour at ₹4.00/kg. Real payroll is
   ₹1,29,000. So the labour line only breaks even at **32.25 tonnes a month**.
   Below that, the standard model is flattering him.
2. **Fragility.** Approve the cost change and standard cost goes ₹20.20 →
   ₹20.80/kg. Plain Thick *sells* at ₹20.80/kg. Its margin becomes **exactly
   zero**. Not thin — zero. Sixty paise of waste paper erased a whole product line.

**Say:** *"That's one editable assumption, honestly modelled, showing the owner
something about his own business he couldn't see before."*

**Bonus, if they're engaged:** step the P&L back through the months with the
‹ › arrows. June shipped 63.4 t, May 49.1 t, **April 32.6 t** — which is within
a few hundred kilos of the 32.25 t break-even you just derived. So April was
the month the mill barely covered its own wage bill, and nobody knew. That is
the argument for the whole module in one sentence.

> The P&L opens on **June**, not July. Demo "today" is 3 July, and a P&L opened
> in the first days of a month is being opened to read the month that just
> closed. Use the arrows to move; the period buttons switch daily/weekly/
> monthly/yearly.

---

## Going off-script

The prospect will ask you to try something. Let them — the agent layer stays
alive during free-form clicking, and the numbers stay consistent because
everything reads one store.

Safe things to do live:

- **Add anything to the cart.** Tolak recomputes tonnage on every change. Push
  past 20 t and watch it refuse and route to the enquiry form.
- **Flip a customer's credit flag** in Admin → Customers, then go to checkout as
  that buyer. Pay-on-delivery appears or disappears. That's FR-A-04 → FR-W-13
  working end to end.
- **Edit any cost line** in Admin → Cost assumptions. Every margin, invoice and
  P&L figure re-flows on the keystroke.
- **Click any agent chip** next to any number to see which agent produced it,
  what tools it can call, and which BRD requirement it satisfies.
- **Change the GST rate.** It's unresolved in the BRD (D1) — show that it's a
  setting, not a hardcoded assumption.

---

## Questions you will get

**"Is this real or a mockup?"**
> Front end is real and fully interactive — every calculation, every rollup, every
> invoice is computed live. What's simulated is the *backend*: no database,
> no payment gateway, no SMS. Place an order in the storefront and go look at
> the admin P&L; it moved.

**"Are the agents actually AI?"**
> Not in this prototype — they're deterministic, on purpose, so the demo shows
> identical numbers every time and can't hallucinate in front of you. The
> architecture is the real deliverable: twelve bounded roles, explicit tools,
> explicit guardrails, and a human approval gate where money is at risk. Swapping
> a scripted agent for a model-backed one is a contained change.

**"Where do the numbers come from?"**
> Your BRD. Every price, cost line, unit conversion and the payroll roster are
> straight out of the document — and there are 152 automated tests pinning them,
> including the §5.2 price table and the §6.3 margin table.

**"What about the three open items?"**
> GST rate and HSN, the daily-wage divisor, and the delivery policy are still
> open with Ajay — D1, D5 and D6. We deliberately did **not** hardcode them.
> They're editable settings, and changing one re-flows everything downstream.
> That's exactly how they'll behave once he confirms them.

**"Can this handle Bengaluru later?"**
> Every order already carries `region` and `fulfillment_source`. Vahan books
> against them today. The V3 partner and logistics model plugs in without
> re-architecting — which is what §14.1 of the BRD asked for.

---

## If something goes wrong

| Symptom | Fix |
|---|---|
| A run is stuck | The rail says `waiting-human` — there's a decision card docked at the bottom of the screen. Answer it. |
| Numbers look wrong after fiddling | Presenter bar → **Reset**. Two seconds, back to identical figures. |
| You lost your place | Everything is a hash URL. `#/` is the command centre. |
| A scenario is too slow | Speed control: 2× or 4×. The trace timeline stays identical — only wall-clock changes. |
| Screen too busy | Collapse the agent rail with the panel icon, top right. |

---

## What to leave them with

Three things, in this order:

1. **The 20-tonne rule turned a blocked basket into a captured lead.** Rules
   that route beat rules that reject.
2. **Sixty paise of waste paper takes plain thick to zero margin.** The P&L
   module isn't a report, it's an early-warning system.
3. **The system stopped and asked before committing money.** That's the design
   principle — agents act inside their limits, and the owner decides at the edge.
