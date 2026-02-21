"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReplayMode = "STEP_ONLY" | "FROM_STEP";

interface ReplayPayload {
  mode: ReplayMode;
  fromStepIndex?: number;
  overrideRetryPolicy?: {
    maxRetries?: number;
    baseDelayMs?: number;
    factor?: number;
    maxDelayMs?: number;
    jitterRatio?: number;
  };
}

interface DlqReplayModalProps {
  open: boolean;
  defaultStepIndex: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: ReplayPayload) => Promise<void>;
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function DlqReplayModal({
  open,
  defaultStepIndex,
  loading,
  onClose,
  onSubmit,
}: DlqReplayModalProps) {
  const [mode, setMode] = useState<ReplayMode>("STEP_ONLY");
  const [fromStepIndex, setFromStepIndex] = useState(String(defaultStepIndex));
  const [maxRetries, setMaxRetries] = useState("");
  const [baseDelayMs, setBaseDelayMs] = useState("");
  const [factor, setFactor] = useState("");
  const [maxDelayMs, setMaxDelayMs] = useState("");
  const [jitterRatio, setJitterRatio] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("STEP_ONLY");
    setFromStepIndex(String(defaultStepIndex));
    setMaxRetries("");
    setBaseDelayMs("");
    setFactor("");
    setMaxDelayMs("");
    setJitterRatio("");
  }, [open, defaultStepIndex]);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    const overrideRetryPolicy = {
      maxRetries: parseOptionalNumber(maxRetries),
      baseDelayMs: parseOptionalNumber(baseDelayMs),
      factor: parseOptionalNumber(factor),
      maxDelayMs: parseOptionalNumber(maxDelayMs),
      jitterRatio: parseOptionalNumber(jitterRatio),
    };

    const cleanedOverride = Object.fromEntries(
      Object.entries(overrideRetryPolicy).filter(([, value]) => value !== undefined),
    );

    await onSubmit({
      mode,
      fromStepIndex: mode === "FROM_STEP" ? parseOptionalNumber(fromStepIndex) ?? defaultStepIndex : undefined,
      overrideRetryPolicy: Object.keys(cleanedOverride).length > 0 ? cleanedOverride : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Replay DLQ Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Replay Mode</Label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <button
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  mode === "STEP_ONLY" ? "border-primary bg-primary/10" : "border-border"
                }`}
                onClick={() => setMode("STEP_ONLY")}
                type="button"
              >
                Same Step Only
              </button>
              <button
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  mode === "FROM_STEP" ? "border-primary bg-primary/10" : "border-border"
                }`}
                onClick={() => setMode("FROM_STEP")}
                type="button"
              >
                From Step N Onward
              </button>
            </div>
          </div>

          {mode === "FROM_STEP" && (
            <div className="space-y-2">
              <Label htmlFor="fromStepIndex">From Step Index</Label>
              <Input
                id="fromStepIndex"
                value={fromStepIndex}
                onChange={(event) => setFromStepIndex(event.target.value)}
                type="number"
                min={0}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxRetries">Override Max Retries</Label>
              <Input id="maxRetries" value={maxRetries} onChange={(event) => setMaxRetries(event.target.value)} type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseDelayMs">Override Base Delay (ms)</Label>
              <Input id="baseDelayMs" value={baseDelayMs} onChange={(event) => setBaseDelayMs(event.target.value)} type="number" min={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factor">Override Factor</Label>
              <Input id="factor" value={factor} onChange={(event) => setFactor(event.target.value)} type="number" min={1} step="0.1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDelayMs">Override Max Delay (ms)</Label>
              <Input id="maxDelayMs" value={maxDelayMs} onChange={(event) => setMaxDelayMs(event.target.value)} type="number" min={1} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="jitterRatio">Override Jitter Ratio (0-1)</Label>
              <Input id="jitterRatio" value={jitterRatio} onChange={(event) => setJitterRatio(event.target.value)} type="number" min={0} max={1} step="0.01" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Replaying..." : "Replay"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
