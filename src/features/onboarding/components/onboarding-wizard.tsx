"use client";

import { useMemo, useState, useTransition } from "react";
import {
  completeOnboardingAction,
  createEmployeeAction,
  updateBrandingAction,
  updateWorkPolicyAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/store/toast";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

type CompanySeed = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  workStartHour: number;
  workStartMinute: number;
  graceMinutes: number;
  standardHours: number;
  weeklyOffs: number[];
};

const STEPS = [
  { id: 1, title: "Brand", blurb: "Logo & colors so the portal looks like your company." },
  { id: 2, title: "Timing", blurb: "Office start time, grace, and weekly offs." },
  { id: 3, title: "Team", blurb: "Invite your first employee (optional but recommended)." },
] as const;

export function OnboardingWizard({ company }: { company: CompanySeed }) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const offs = useMemo(() => new Set(company.weeklyOffs.map(Number)), [company.weeklyOffs]);

  function finish(skip = false) {
    startTransition(async () => {
      const res = await completeOnboardingAction();
      if (res && "error" in res) {
        setError(res.error);
        toastError("Could not finish setup", res.error);
        return;
      }
      toastSuccess(
        skip ? "Setup skipped" : "You're ready",
        "Opening your admin dashboard…"
      );
      window.location.assign("/admin/dashboard");
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header
        className="overflow-hidden rounded-3xl border-2 border-[var(--border)] p-6 shadow-[8px_8px_0_0_var(--border)]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, white) 0%, white 45%, color-mix(in srgb, var(--secondary) 65%, white) 100%)",
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          {company.name} · Setup
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Welcome to WorkPilot</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Three quick steps — brand, work timing, then invite someone.
        </p>
        <ol className="mt-5 flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <li
              key={s.id}
              className={`rounded-full border-2 border-[var(--border)] px-3 py-1 text-xs font-black shadow-[2px_2px_0_0_var(--border)] ${
                step === s.id
                  ? "bg-[var(--primary)] text-white"
                  : step > s.id
                    ? "bg-white text-[var(--success)]"
                    : "bg-white/80 text-[var(--muted-foreground)]"
              }`}
            >
              {s.id}. {s.title}
            </li>
          ))}
        </ol>
      </header>

      <div
        className="rounded-2xl border-2 border-[var(--border)] bg-white p-5 shadow-[6px_6px_0_0_var(--border)] sm:p-6"
        style={{ backgroundImage: "var(--card-shine)" }}
      >
        <h2 className="text-xl font-black">{STEPS[step - 1].title}</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{STEPS[step - 1].blurb}</p>

        {step === 1 ? (
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await updateBrandingAction(fd);
                if (res && "error" in res) {
                  setError(res.error);
                  toastError("Brand not saved", res.error);
                  return;
                }
                toastSuccess("Brand saved");
                setStep(2);
              });
            }}
          >
            <div className="space-y-1 sm:col-span-2">
              <Label>Company display name</Label>
              <Input name="name" required defaultValue={company.name} placeholder="Acme Pvt Ltd" />
            </div>
            <div className="space-y-1">
              <Label>Primary color</Label>
              <Input name="primaryColor" type="color" defaultValue={company.primaryColor} />
            </div>
            <div className="space-y-1">
              <Label>Secondary color</Label>
              <Input name="secondaryColor" type="color" defaultValue={company.secondaryColor} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Logo (optional)</Label>
              <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Favicon (optional)</Label>
              <Input name="favicon" type="file" accept="image/png,image/x-icon,image/svg+xml,image/webp" />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save & continue"}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await updateWorkPolicyAction(fd);
                if (res && "error" in res) {
                  setError(res.error);
                  toastError("Timing not saved", res.error);
                  return;
                }
                toastSuccess("Work timing saved");
                setStep(3);
              });
            }}
          >
            <div className="space-y-1">
              <Label>Start hour (0–23)</Label>
              <Input
                name="workStartHour"
                type="number"
                min={0}
                max={23}
                required
                defaultValue={company.workStartHour}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-1">
              <Label>Start minute</Label>
              <Input
                name="workStartMinute"
                type="number"
                min={0}
                max={59}
                required
                defaultValue={company.workStartMinute}
                placeholder="e.g. 0"
              />
            </div>
            <div className="space-y-1">
              <Label>Grace minutes</Label>
              <Input
                name="graceMinutes"
                type="number"
                min={0}
                required
                defaultValue={company.graceMinutes}
                placeholder="e.g. 15"
              />
            </div>
            <div className="space-y-1">
              <Label>Standard hours / day</Label>
              <Input
                name="standardHours"
                type="number"
                min={1}
                max={24}
                step="0.5"
                required
                defaultValue={company.standardHours}
                placeholder="e.g. 8"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Weekly offs</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.map((d) => (
                  <label key={d.value} className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      name="weeklyOff"
                      value={d.value}
                      defaultChecked={offs.has(d.value)}
                      className="h-4 w-4"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save & continue"}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setStep(3)}>
                Skip for now
              </Button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await createEmployeeAction(fd);
                if (res && "error" in res) {
                  setError(res.error);
                  toastError("Invite failed", res.error);
                  return;
                }
                toastSuccess("Employee invited", "They’ll get an email to set password.");
                finish(false);
              });
            }}
          >
            <div className="space-y-1">
              <Label>First name</Label>
              <Input name="firstName" required placeholder="Neel" />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input name="lastName" required placeholder="Patel" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Work email</Label>
              <Input name="email" type="email" required placeholder="neel@company.com" />
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Input name="designation" placeholder="e.g. Engineer" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="phone" type="tel" placeholder="+91 98765 43210" />
            </div>
            <input type="hidden" name="role" value="EMPLOYEE" />
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Inviting…" : "Invite & finish"}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => finish(true)}>
                Skip & go to dashboard
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm font-semibold text-[var(--destructive)]">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
