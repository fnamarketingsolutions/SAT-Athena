"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReverification,
  useUser,
} from "@clerk/nextjs";
import {
  isClerkAPIResponseError,
  isReverificationCancelledError,
} from "@clerk/nextjs/errors";
import type { EmailAddressResource } from "@clerk/shared/types";
import {
  Loader2,
  CheckCircle2,
  KeyRound,
  Mail,
  ArrowLeft,
  Camera,
  Trash2,
} from "lucide-react";
import { isSupabaseAuth } from "@/lib/auth/provider";
import { ProfileAvatarEditor } from "@/components/profile/profile-avatar-editor";

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

const inputClass =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const btnClass =
  "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

function PasswordSection() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const hasPassword = Boolean(user?.passwordEnabled);

  const updatePassword = useReverification(
    (params: {
      currentPassword?: string;
      newPassword: string;
    }) =>
      user!.updatePassword({
        ...params,
        signOutOfOtherSessions: true,
      })
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (hasPassword && !currentPassword) {
      setError("Enter your current password.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await updatePassword({
        newPassword: password,
        ...(hasPassword ? { currentPassword } : {}),
      });
      setDone(true);
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-5 text-center">
        <CheckCircle2 size={22} className="mx-auto text-emerald-500" />
        <p className="mt-2 text-sm font-medium text-foreground">
          Password updated
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
        >
          Change again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {hasPassword && (
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className={inputClass}
        />
      )}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={hasPassword ? "New password" : "Create a password"}
        autoComplete="new-password"
        className={inputClass}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm password"
        autoComplete="new-password"
        className={inputClass}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className={btnClass}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        {hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}

function EmailSection() {
  const { user } = useUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [emailObj, setEmailObj] = useState<EmailAddressResource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const createEmailAddress = useReverification((nextEmail: string) =>
    user!.createEmailAddress({ email: nextEmail })
  );

  const currentEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const syncAppEmail = async () => {
    try {
      await fetch("/api/account/sync-profile", { method: "POST" });
    } catch {
      // Clerk is source of truth; app sync is best-effort.
    }
  };

  const startChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!next || !next.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (next === currentEmail.toLowerCase()) {
      setError("That’s already your current email.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const created = await createEmailAddress(next);
      if (!created) throw new Error("Could not add email. Try again.");
      await created.prepareVerification({ strategy: "email_code" });
      await user!.reload();
      setEmailObj(created);
      setVerifying(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailObj || !code.trim()) {
      setError("Enter the verification code.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const attempt = await emailObj.attemptVerification({ code: code.trim() });
      if (attempt?.verification.status !== "verified") {
        throw new Error("Verification incomplete. Check the code and try again.");
      }
      await user!.update({ primaryEmailAddressId: emailObj.id });
      await user!.reload();
      await syncAppEmail();
      setDone(true);
      setVerifying(false);
      setEmail("");
      setCode("");
      setEmailObj(null);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-5 text-center">
        <CheckCircle2 size={22} className="mx-auto text-emerald-500" />
        <p className="mt-2 text-sm font-medium text-foreground">
          Email updated
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
        >
          Change again
        </button>
      </div>
    );
  }

  if (verifying) {
    return (
      <form onSubmit={verifyCode} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          We sent a code to <span className="text-foreground">{email}</span>.
          Enter it below to confirm.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Verification code"
          className={inputClass}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={busy} className={btnClass}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Verify and update email
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setVerifying(false);
            setCode("");
            setEmailObj(null);
            setError(null);
          }}
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={startChange} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Current:{" "}
        <span className="text-foreground">{currentEmail || "—"}</span>
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="New email address"
        autoComplete="email"
        className={inputClass}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className={btnClass}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        Send verification code
      </button>
    </form>
  );
}

function DeleteAccountSection() {
  const { user } = useUser();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const deleteAccount = useReverification(async () => {
    const res = await fetch("/api/account", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : "Failed to delete account"
      );
    }
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== "DELETE") {
      setError('Type DELETE to confirm.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await deleteAccount();
      window.location.assign("/sign-in");
    } catch (err) {
      setError(clerkErrorMessage(err));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-destructive/40 text-sm font-medium text-destructive transition hover:bg-destructive/10"
      >
        <Trash2 size={16} />
        Delete account
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This permanently deletes your Athena account
        {user?.primaryEmailAddress?.emailAddress
          ? ` (${user.primaryEmailAddress.emailAddress})`
          : ""}{" "}
        and learning data. This cannot be undone.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder='Type DELETE to confirm'
        autoComplete="off"
        className={inputClass}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={busy || confirmText !== "DELETE"}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-destructive text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        Permanently delete account
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setOpen(false);
          setConfirmText("");
          setError(null);
        }}
        className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isSupabaseAuth()) {
      router.replace("/account/password");
    }
  }, [router]);

  if (isSupabaseAuth()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <KeyRound size={26} className="mx-auto text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Account security
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your account.
          </p>
          <Link
            href="/sign-in?redirect_url=%2Faccount"
            className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Account security
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your photo, sign-in details, and account.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Camera size={16} className="text-muted-foreground" />
            Profile picture
          </div>
          <ProfileAvatarEditor size={80} />
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <KeyRound size={16} className="text-muted-foreground" />
            Password
          </div>
          <p className="text-xs text-muted-foreground">
            Forgot your password while signed out? On the{" "}
            <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
              sign-in page
            </Link>
            , enter your email, then use <span className="text-foreground">Forgot password</span>.
          </p>
          <PasswordSection />
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Mail size={16} className="text-muted-foreground" />
            Email
          </div>
          <EmailSection />
        </section>

        <div className="border-t border-border" />

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <Trash2 size={16} />
            Danger zone
          </div>
          <DeleteAccountSection />
        </section>
      </div>
    </div>
  );
}
