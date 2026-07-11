"use client";

import { useEffect, useState, useTransition } from "react";
import { uploadAvatarAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SKIP_KEY = "workpilot-avatar-skip-until";

export function AvatarSetupModal({
  userName,
  needsAvatar,
}: {
  userName: string;
  needsAvatar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!needsAvatar) return;
    try {
      const until = Number(localStorage.getItem(SKIP_KEY) || 0);
      if (until && until > Date.now()) return;
    } catch {
      // ignore
    }
    setOpen(true);
  }, [needsAvatar]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border-2 border-[var(--border)] bg-white p-6 shadow-[8px_8px_0_0_var(--border)]"
        style={{ backgroundImage: "var(--card-shine)" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          Welcome
        </p>
        <h2 className="mt-1 text-2xl font-black">Add your photo, {userName.split(" ")[0]}</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Set a profile avatar so your team can recognize you in attendance and notifications.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await uploadAvatarAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                return;
              }
              setOpen(false);
              window.location.reload();
            });
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--secondary)] text-2xl font-black shadow-[3px_3px_0_0_var(--border)]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="avatar">Photo</Label>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setPreview(null);
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setError("Avatar must be under 5MB");
                    e.target.value = "";
                    setPreview(null);
                    return;
                  }
                  setError(null);
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save avatar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                try {
                  localStorage.setItem(
                    SKIP_KEY,
                    String(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  );
                } catch {
                  // ignore
                }
                setOpen(false);
              }}
            >
              Later
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AvatarUploadCard({
  currentImage,
  userName,
}: {
  currentImage?: string | null;
  userName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await uploadAvatarAction(fd);
          if (res && "error" in res) setError(res.error);
          else {
            setOk(true);
            if (res && "image" in res && res.image) setPreview(res.image);
          }
        });
      }}
    >
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--secondary)] text-xl font-black shadow-[3px_3px_0_0_var(--border)]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          userName.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor="profile-avatar">Profile photo</Label>
        <Input
          id="profile-avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update"}
      </Button>
      {error ? (
        <p className="w-full text-sm font-semibold text-[var(--destructive)]">{error}</p>
      ) : null}
      {ok ? (
        <p className="w-full text-sm font-semibold text-[var(--success)]">Avatar saved</p>
      ) : null}
    </form>
  );
}
