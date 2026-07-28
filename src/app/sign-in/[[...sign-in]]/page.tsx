"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { isSupabaseAuth } from "@/lib/auth/provider";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";
import { checkoutPath } from "@/lib/stripe/checkout-paths";

function ClerkSignIn() {
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") ?? "/dashboard";
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(
    params.get("redirect_url") ?? checkoutPath("monthly")
  )}`;

  return (
    <div className="w-full max-w-md space-y-4">
      <SignIn forceRedirectUrl={redirectUrl} signUpUrl={signUpUrl} />
      <p className="text-center text-xs text-muted-foreground">
        Forgot your password? Enter your email on the form above, then click{" "}
        <span className="font-medium text-foreground">Forgot password</span>.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {isSupabaseAuth() ? (
        <Suspense fallback={null}>
          <SupabaseAuthForm mode="sign-in" />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <ClerkSignIn />
        </Suspense>
      )}
    </div>
  );
}
