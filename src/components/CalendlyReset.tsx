"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StepLog = {
  step: "list" | "delete" | "create";
  ok: boolean;
  status: number;
  detail: unknown;
};

type ResetResponse = {
  ok?: boolean;
  error?: string;
  steps?: StepLog[];
};

export default function CalendlyReset() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ResetResponse | null>(null);

  async function runReset() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/calendly/reset-webhook", { method: "POST" });
      const body = (await response.json()) as ResetResponse;
      setResult(body);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setRunning(false);
      setOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Why this is needed</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Calendly drops organization webhook subscriptions when the endpoint goes quiet.
          The Supabase <code className="text-xs">calendly_webhook</code> function then stops
          receiving invitee events until the subscription is registered again. This button
          lists the organization subscriptions, deletes the single one whose callback URL
          is the webhook function, and creates a new subscription for invitee created,
          canceled, and no-show events.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {running ? "Resetting…" : "Reset Calendly webhook"}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            {result.ok ? "Webhook registered" : "Reset did not finish"}
          </h3>
          {result.error && <p className="text-sm text-red-700">{result.error}</p>}
          <div className="space-y-4">
            {(result.steps ?? []).map((step) => (
              <section key={step.step}>
                <h4 className="text-sm font-medium text-gray-800 mb-1">
                  {step.step} · {step.status} · {step.ok ? "ok" : "failed"}
                </h4>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto max-h-80">
                  {JSON.stringify(step.detail, null, 2)}
                </pre>
              </section>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the Calendly webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the current organization subscription for the Supabase
              webhook URL and registers a new one. Invitee events can be missed
              between those two calls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runReset()} disabled={running}>
              Reset webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
