"use client";

import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  isClerkAPIResponseError,
  isReverificationCancelledError,
} from "@clerk/nextjs/errors";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function clerkErrorMessage(err: unknown): string {
  if (isReverificationCancelledError(err)) {
    return "Verification cancelled. Try again when ready.";
  }
  if (isClerkAPIResponseError(err)) {
    return (
      err.errors[0]?.longMessage ||
      err.errors[0]?.message ||
      "Something went wrong."
    );
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

async function syncAppProfile() {
  try {
    await fetch("/api/account/sync-profile", { method: "POST" });
  } catch {
    // Clerk is source of truth; DB sync is best-effort.
  }
}

type ProfileAvatarEditorProps = {
  className?: string;
  size?: number;
};

export function ProfileAvatarEditor({
  className,
  size = 72,
}: ProfileAvatarEditorProps) {
  const { user, isLoaded } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!isLoaded || !user) {
    return (
      <div
        className={cn("animate-pulse rounded-full bg-muted", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = (user.fullName || user.primaryEmailAddress?.emailAddress || "?")
    .charAt(0)
    .toUpperCase();

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setBusy(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      await syncAppProfile();
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(clerkErrorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      await syncAppProfile();
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className="relative overflow-hidden rounded-full border border-border bg-accent"
        style={{ width: size, height: size }}
      >
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-semibold text-foreground"
            style={{ fontSize: size * 0.36 }}
          >
            {initial}
          </span>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="animate-spin text-foreground" size={18} />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          <Camera size={12} />
          Change
        </button>
        {user.hasImage && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            <Trash2 size={12} />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
