"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { isSupabaseAuth } from "@/lib/auth/provider";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";
import { checkoutPath } from "@/lib/stripe/checkout-paths";

function ClerkSignUp() {
  const params = useSearchParams();
  const redirectUrl =
    params.get("redirect_url") ?? checkoutPath("monthly");
  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;

  return (
    <SignUp
      forceRedirectUrl={redirectUrl}
      signInUrl={signInUrl}
    />
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      {isSupabaseAuth() ? (
        <Suspense fallback={null}>
          <SupabaseAuthForm mode="sign-up" />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <ClerkSignUp />
        </Suspense>
      )}
    </div>
  );
}
