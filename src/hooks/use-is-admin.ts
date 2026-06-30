"use client";

import { useCurrentUser } from "@/hooks/use-current-user";

export function useIsAthenaAdmin() {
  const { isAdmin, loading } = useCurrentUser();
  return { isAdmin, loading };
}
