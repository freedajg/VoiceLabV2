import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MessageSquarePlus, Send, Truck } from "lucide-react";
import {
  AgentChip,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  SegmentedControl,
  Section,
  Select,
  TextArea,
  TextInput,
} from "../../ui";
import { useBrand } from "../../app/brand";
import { useAgentStore } from "../../store/agentStore";
import { useCartStore, isValidPhone, normalizePhone } from "../../store/cartStore";
import { useDataStore } from "../../store/dataStore";
import type { Enquiry as EnquiryRecord, EnquiryKind, Region } from "../../domain";
import { DEMO_TODAY, REGION_LABELS, dateLong, tons } from "../../domain";
import { ShopFrame } from "./ShopFrame";
import { CAP_IN_UNITS, useSessionCustomer } from "./lib";

const KIND_OPTIONS: { value: EnquiryKind; label: string; srLabel: string }[] = [
  { value: "large-order", label: "Large order (20 t+)", srLabel: "Large order enquiry" },
  { value: "contact", label: "General / deal", srLabel: "General contact or deal enquiry" },
];

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "telangana", label: "Telangana" },
  { value: "andhra-pradesh", label: "Andhra Pradesh" },
  { value: "karnataka", label: "Karnataka" },
];

/** Continues the seeded `enq-0NN` sequence — deterministic, never random. */
function enquiryRef(existingCount: number): string {
  return `enq-${String(existingCount + 1).padStart(3, "0")}`;
}

/**
 * FR-W-17 and FR-W-18 — one form serving both the large-order route and
 * general contact. Both land in the same admin funnel, which is exactly what
 * the two requirements ask for.
 */
export function Enquiry() {
  const [params] = useSearchParams();
  const brand = useBrand();
  const customer = useSessionCustomer();
  const enquiries = useDataStore((s) => s.enquiries);
  const addEnquiry = useDataStore((s) => s.addEnquiry);
  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);

  const presetKind: EnquiryKind = params.get("kind") === "contact" ? "contact" : "large-order";
  const presetTonnage = params.get("t") ?? "";

  const [kind, setKind] = useState<EnquiryKind>(presetKind);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState<Region>("telangana");
  const [issue, setIssue] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [tonnage, setTonnage] = useState(presetTonnage);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState<EnquiryRecord | null>(null);

  // A signed-in buyer should never retype what we already hold.
  useEffect(() => {
    if (!customer) return;
    setName(customer.company ?? customer.name);
    setPhone(customer.phone);
    setAddress(`${customer.address}${customer.address ? ", " : ""}${customer.city}`);
    setRegion(customer.region);
  }, [customer]);

  const nameOk = name.trim().length > 1;
  const phoneOk = isValidPhone(phone);
  const addressOk = address.trim().length > 3;
  const issueOk = issue.trim().length > 4;
  const complete = nameOk && phoneOk && addressOk && issueOk;

  function handleSubmit() {
    setTouched(true);
    if (!complete) return;

    const estTonnage = tonnage.trim() ? Number(tonnage) : undefined;
    const record: EnquiryRecord = {
      id: enquiryRef(enquiries.length),
      kind,
      name: name.trim(),
      phone: normalizePhone(phone),
      address: address.trim(),
      issue: issue.trim(),
      extraInfo: extraInfo.trim() ? extraInfo.trim() : undefined,
      estTonnage:
        estTonnage !== undefined && Number.isFinite(estTonnage) && estTonnage > 0
          ? estTonnage
          : undefined,
      status: "new",
      createdAt: DEMO_TODAY,
      region,
    };
    addEnquiry(record);
    setSubmitted(record);

    const size = record.estTonnage ? `${record.estTonnage} t` : "size not stated";
    pulse(
      "LED",
      "tool",
      `enquiry.capture → ${record.name}, ${REGION_LABELS[record.region]} · ${size} · marked New`,
    );
    emit({
      agentId: "LED",
      kind: "tool-result",
      level: "success",
      message: `${record.id} in the funnel — ${
        record.kind === "large-order" ? "large order" : "general deal"
      } from ${record.name}`,
      toolName: "enquiry.capture",
      durationMs: 220,
      payload: {
        enquiryId: record.id,
        kind: record.kind,
        name: record.name,
        phone: `+91 ••••${record.phone.slice(-4)}`,
        region: REGION_LABELS[record.region],
        estTonnage: record.estTonnage ?? null,
        status: record.status,
        receivedAt: record.createdAt,
      },
    });
  }

  if (submitted) {
    return (
      <ShopFrame>
        <Section eyebrow="Enquiry received" title="It is with Ajay's desk" agentId="LED">
          <Card pad="lg" kraft>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-j-success" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold leading-tight text-j-ink">
                  Thanks {submitted.name.split(" ")[0]} — Sampark has logged it.
                </p>
                <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-j-ink-2">
                  Your enquiry sits at the top of the admin funnel marked{" "}
                  <strong className="font-semibold text-j-ink">New</strong>, timestamped{" "}
                  {dateLong(submitted.createdAt)}. {brand.ownerName} works these by tonnage and
                  region; you will get a call on +91 {submitted.phone}.
                </p>
                <dl className="num mt-4 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                  <Fact label="Reference" value={submitted.id} mono />
                  <Fact
                    label="Type"
                    value={submitted.kind === "large-order" ? "Large order" : "General deal"}
                  />
                  <Fact
                    label="Estimated"
                    value={submitted.estTonnage ? `${submitted.estTonnage} t` : "Not stated"}
                  />
                  <Fact label="Region" value={REGION_LABELS[submitted.region]} />
                </dl>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link
                    to="/shop/catalogue"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-j-primary px-4 text-sm font-semibold text-white"
                  >
                    Back to the catalogue
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSubmitted(null);
                      setIssue("");
                      setExtraInfo("");
                      setTouched(false);
                    }}
                  >
                    Send another
                  </Button>
                  <AgentChip id="LED" size="sm" />
                </div>
              </div>
            </div>
          </Card>
        </Section>
      </ShopFrame>
    );
  }

  return (
    <ShopFrame>
      <Section
        eyebrow={kind === "large-order" ? "Large-order enquiry" : "Contact us"}
        title={
          kind === "large-order"
            ? "Ordering more than 20 tonnes?"
            : "Tell us what you need"
        }
        subtitle={
          kind === "large-order"
            ? `The website takes orders up to ${CAP_IN_UNITS}. Anything larger is priced by hand — give us the tonnage and we will come back with a quote.`
            : "Deals, repeat supply, a problem with a delivery — the same desk handles all of it."
        }
        agentId="LED"
        spacing="loose"
      >
        <Card pad="md">
          <CardHeader
            title="Your enquiry"
            subtitle="Everything here lands in Ajay's enquiry funnel with a timestamp."
            agentId="LED"
            divided
          />

          <div className="mt-4 space-y-3">
            <Field label="What is this about?">
              <SegmentedControl
                label="Enquiry type"
                options={KIND_OPTIONS}
                value={kind}
                onChange={setKind}
                fullWidth
              />
            </Field>

            <Field
              label="Name or firm"
              required
              error={touched && !nameOk ? "Tell us who you are." : undefined}
            >
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field
              label="Phone"
              required
              hint="We call rather than email — this is how Ajay works."
              error={touched && !phoneOk ? "Enter a 10-digit mobile number." : undefined}
            >
              <TextInput
                prefix="+91"
                mono
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>

            <Field
              label="Address"
              required
              error={touched && !addressOk ? "Where should we deliver?" : undefined}
            >
              <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="State">
                <Select
                  options={REGION_OPTIONS}
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                />
              </Field>
              <Field
                label="Estimated quantity"
                hint={
                  tonnage.trim() && Number(tonnage) > 0
                    ? `${tons(Number(tonnage) * 1000)} · about ${Math.round(
                        (Number(tonnage) * 1000) / 25,
                      )} bundles`
                    : "Tonnes, roughly. Leave blank if you are not sure."
                }
              >
                <TextInput
                  suffix="tonnes"
                  mono
                  inputMode="decimal"
                  value={tonnage}
                  onChange={(e) => setTonnage(e.target.value.replace(/[^\d.]/g, ""))}
                />
              </Field>
            </div>

            <Field
              label="Issue / requirement"
              required
              error={touched && !issueOk ? "A line or two about what you need." : undefined}
            >
              <TextArea
                rows={3}
                placeholder="e.g. 30 t of patterned thin sweet-box board, 12 oz, monthly."
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </Field>

            <Field label="Additional info (optional)">
              <TextArea
                rows={2}
                placeholder="Delivery window, site access, existing supplier, anything else."
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
              />
            </Field>
          </div>

          <Button
            tone="accent"
            size="lg"
            block
            className="mt-4"
            iconLeft={kind === "large-order" ? <Truck /> : <Send />}
            onClick={handleSubmit}
          >
            Send to {brand.ownerName.split(" ").slice(-2).join(" ")}
          </Button>
          {touched && !complete ? (
            <p className="mt-2 text-center text-[13px] font-semibold text-j-danger">
              A few fields still need filling in.
            </p>
          ) : null}
        </Card>

        <Card pad="md" flat>
          <div className="flex flex-wrap items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 shrink-0 text-j-ink-3" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-j-ink-2">
              Sampark never loses an enquiry — every submission lands in the funnel, duplicates
              included, and it never quotes a price itself. Pricing always goes through Mulya.
            </p>
            <Badge tone="neutral" size="xs" outline>
              FR-W-17 / FR-W-18
            </Badge>
          </div>
        </Card>
      </Section>
    </ShopFrame>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
        {label}
      </dt>
      <dd className={mono ? "j-mono mt-0.5 font-semibold text-j-ink" : "mt-0.5 font-semibold text-j-ink"}>
        {value}
      </dd>
    </div>
  );
}
