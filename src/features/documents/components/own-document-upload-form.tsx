"use client";

import { useTransition } from "react";
import { uploadOwnDocumentAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

export function OwnDocumentUploadForm() {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload your document</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await uploadOwnDocumentAction(fd);
              if (res && "error" in res) toastError("Upload failed", res.error);
              else {
                toastSuccess("Uploaded", "Document saved to your file list.");
                e.currentTarget.reset();
              }
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>File (KYC, certificates — max 10MB)</Label>
            <Input name="file" type="file" required />
          </div>
          <div className="space-y-1">
            <Label>Expiry (optional)</Label>
            <Input name="expiresAt" type="date" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
