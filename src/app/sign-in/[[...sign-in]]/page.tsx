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
    <SignIn
      forceRedirectUrl={redirectUrl}
      signUpUrl={signUpUrl}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
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
