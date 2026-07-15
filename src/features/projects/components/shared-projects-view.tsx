"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

type SharedProject = {
  id: string;
  name: string;
  description: string | null;
  credentials: { id: string; key: string; value: string }[];
};

function copyJson(payload: unknown, label: string) {
  return navigator.clipboard
    .writeText(JSON.stringify(payload, null, 2))
    .then(() => toastSuccess("Copied", label))
    .catch(() => toastError("Copy failed", "Clipboard blocked"));
}

export function SharedProjectsView({ projects }: { projects: SharedProject[] }) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  if (!projects.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-[var(--muted-foreground)]">
          No projects shared with you yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const obj: Record<string, string> = {};
        for (const c of p.credentials) obj[c.key] = c.value;
        const shown = reveal[p.id];
        return (
          <Card key={p.id}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>{p.name}</CardTitle>
                {p.description ? (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {p.description}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyJson(obj, `${p.name} (JSON)`)}
                  disabled={!p.credentials.length}
                >
                  Copy all JSON
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setReveal((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                  }
                >
                  {shown ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.credentials.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No credentials yet.
                </p>
              ) : (
                p.credentials.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[var(--border)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
                        {c.key}
                      </p>
                      <p className="font-mono text-sm">
                        {shown ? c.value : "••••••••"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        copyJson({ [c.key]: c.value }, `${c.key} (JSON)`)
                      }
                    >
                      Copy
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
