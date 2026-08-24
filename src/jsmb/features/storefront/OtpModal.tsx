import { useEffect, useRef, useState } from "react";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { AgentChip, Badge, Button, Field, Modal, TextInput, cn } from "../../ui";
import { useCartStore, isValidPhone, normalizePhone } from "../../store/cartStore";
import { useAgentStore } from "../../store/agentStore";
import { selectAnalyticsInput, useDataStore } from "../../store/dataStore";
import { computeLedger } from "../../domain";

/**
 * Phone + OTP sign-in (FR-W-08).
 *
 * The prototype has no SMS gateway, so the code Pehchan issues is printed on
 * screen and clearly marked as a demo affordance. Everything else behaves the
 * way the real thing will: a known number signs in as that buyer with their
 * own order history, an unknown number becomes a new retail customer, and the
 * attempt counter locks the number after three wrong codes.
 */

const MAX_ATTEMPTS = 3;

export interface OtpModalProps {
  open: boolean;
  onClose: () => void;
  /** Why the buyer is being asked — shown above the phone field. */
  reason?: string;
  onSignedIn?: () => void;
}

export function OtpModal({ open, onClose, reason, onSignedIn }: OtpModalProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const otpPhone = useCartStore((s) => s.otpPhone);
  const otpCode = useCartStore((s) => s.otpCode);
  const requestOtp = useCartStore((s) => s.requestOtp);
  const verifyOtp = useCartStore((s) => s.verifyOtp);
  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);
  const customers = useDataStore((s) => s.customers);

  const codeRef = useRef<HTMLInputElement>(null);

  // A fresh challenge every time the sheet opens — no stale code left behind.
  useEffect(() => {
    if (!open) {
      setCode("");
      setAttempts(0);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (otpPhone && codeRef.current) codeRef.current.focus();
  }, [otpPhone]);

  const locked = attempts >= MAX_ATTEMPTS;

  function handleSend() {
    if (!isValidPhone(phone)) {
      setError("Enter a 10-digit Indian mobile number starting 6, 7, 8 or 9.");
      return;
    }
    const normalized = normalizePhone(phone);
    const known = customers.find((c) => normalizePhone(c.phone) === normalized);
    setError(null);
    setAttempts(0);
    setCode("");
    requestOtp(normalized);
    pulse(
      "IDN",
      "tool",
      known
        ? `One-time code sent to ••••${normalized.slice(-4)} — known buyer, ${known.company ?? known.name}`
        : `One-time code sent to ••••${normalized.slice(-4)} — new number, no account yet`,
    );
    emit({
      agentId: "IDN",
      kind: "tool-call",
      level: "info",
      message: `otp.issue → +91 ••••${normalized.slice(-4)}`,
      toolName: "otp.issue",
      durationMs: 320,
      payload: {
        phone: `+91 ••••${normalized.slice(-4)}`,
        channel: "DLT transactional",
        header: "JSMBLD",
        template: "JSMB_OTP_V1",
        ttlSeconds: 360,
        attemptsAllowed: MAX_ATTEMPTS,
        knownCustomer: known ? known.id : null,
      },
    });
  }

  function handleVerify() {
    if (locked) return;
    const ok = verifyOtp(code);
    if (!ok) {
      const next = attempts + 1;
      setAttempts(next);
      setError(
        next >= MAX_ATTEMPTS
          ? "Three wrong codes — this number is locked for the rest of the session."
          : `That code is wrong. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? "" : "s"} left.`,
      );
      pulse("IDN", "error", `Code rejected for ••••${(otpPhone ?? "").slice(-4)} — attempt ${next} of ${MAX_ATTEMPTS}`);
      return;
    }

    const session = useCartStore.getState().session;
    if (!session) return;
    // Read the store fresh: verifyOtp may have just created this customer.
    const ledger = computeLedger(selectAnalyticsInput(useDataStore.getState()), session.customerId);
    const orderCount = ledger.entries.length;
    pulse(
      "IDN",
      "done",
      orderCount > 0
        ? `${session.name} signed in — ${orderCount} past order${orderCount === 1 ? "" : "s"} on file`
        : `${session.name} signed in — new account created`,
    );
    emit({
      agentId: "IDN",
      kind: "tool-result",
      level: "success",
      message: `otp.verify → session opened for ${session.name}`,
      toolName: "otp.verify",
      durationMs: 180,
      payload: {
        customerId: session.customerId,
        phone: `+91 ••••${session.phone.slice(-4)}`,
        pastOrders: orderCount,
        creditApproved: ledger.customer.creditApproved,
        creditLimit: ledger.customer.creditLimit,
        outstandingDue: ledger.totalDue,
      },
    });
    setCode("");
    onClose();
    onSignedIn?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={otpPhone ? "Enter your code" : "Sign in with your mobile"}
      description={
        otpPhone
          ? `We sent a 6-digit code to +91 ${otpPhone.slice(0, 5)} ${otpPhone.slice(5)}.`
          : (reason ?? "No password — just your phone number and a one-time code.")
      }
      footer={
        otpPhone ? (
          <>
            <Button variant="ghost" onClick={() => requestOtp(otpPhone)}>
              Resend
            </Button>
            <Button tone="primary" onClick={handleVerify} disabled={code.length < 6 || locked}>
              Verify &amp; continue
            </Button>
          </>
        ) : (
          <Button tone="primary" onClick={handleSend} iconLeft={<Smartphone />}>
            Send code
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="accent" icon={<ShieldCheck />}>
            Phone + OTP · no password stored
          </Badge>
          <AgentChip id="IDN" size="xs" />
        </div>

        {!otpPhone ? (
          <Field
            label="Mobile number"
            hint="Returning buyers sign in to their own order history. A new number opens a retail account."
            error={error ?? undefined}
          >
            <TextInput
              prefix="+91"
              mono
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
          </Field>
        ) : (
          <>
            {/* The demo affordance, labelled as one so nobody mistakes it for
                production behaviour in a pitch. */}
            <div className="rounded-[calc(var(--j-radius)-2px)] border border-dashed border-j-primary/40 bg-j-primary-soft p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-primary">
                Demo build — no SMS gateway
              </p>
              <p className="mt-1 text-[13px] leading-snug text-j-ink-2">
                In production Sandesh sends this on the DLT header{" "}
                <span className="j-mono">JSMBLD</span>. Here it is printed for you:
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="j-mono num text-[26px] font-bold tracking-[0.3em] text-j-ink">
                  {otpCode}
                </span>
                <Button size="sm" variant="soft" tone="primary" onClick={() => setCode(otpCode ?? "")}>
                  Use it
                </Button>
              </div>
            </div>

            <Field
              label="6-digit code"
              hint="Valid for 6 minutes · 3 attempts · one resend a minute."
              error={error ?? undefined}
            >
              <TextInput
                ref={codeRef}
                mono
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={code}
                disabled={locked}
                className={cn("text-center text-lg tracking-[0.4em]")}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerify();
                }}
              />
            </Field>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-j-ink-2 underline-offset-2 hover:underline"
              onClick={() => {
                useCartStore.setState({ otpPhone: null, otpCode: null });
                setError(null);
                setAttempts(0);
              }}
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              Use a different number
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
