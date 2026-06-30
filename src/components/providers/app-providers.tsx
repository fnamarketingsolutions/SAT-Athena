"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TutorCharacterProvider } from "@/components/providers/tutor-character-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryProvider>
          <TutorCharacterProvider>{children}</TutorCharacterProvider>
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
