import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export const CONTENT_SETUP_HINT =
  "Content tables are missing. Run `npm run db:content-tables`, or paste `scripts/apply-content-tables.sql` into the Supabase SQL Editor.";

export const STALE_LOCK_MS = 5 * 60 * 1000;

export function isMissingTableError(
  error: PostgrestError | null | undefined,
): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message) ||
    /relation .* does not exist/i.test(error.message)
  );
}

export type ContentLockResult<T> =
  | { mode: "ephemeral" }
  | { mode: "generating" }
  | { mode: "ready"; row: T }
  | { mode: "blocked" }
  | { mode: "failed"; error: string; status: number };

export async function acquireContentLock<T>(args: {
  table: "podcast_scripts" | "infographics";
  subtopicId: string;
  insertPayload: Record<string, unknown>;
  force?: boolean;
  rowToClient: (row: Record<string, unknown>) => T;
}): Promise<ContentLockResult<T>> {
  const { table, subtopicId, insertPayload, force = false, rowToClient } = args;

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert({ subtopic_id: subtopicId, ...insertPayload })
    .select("id")
    .maybeSingle();

  if (insertError && isMissingTableError(insertError)) {
    return { mode: "ephemeral" };
  }

  if (inserted) {
    return { mode: "generating" };
  }

  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("*")
    .eq("subtopic_id", subtopicId)
    .limit(1)
    .maybeSingle();

  if (selectError && isMissingTableError(selectError)) {
    return { mode: "ephemeral" };
  }

  if (!existing) {
    console.error(`[content-lock] ${table} insert failed:`, insertError);
    return {
      mode: "failed",
      error: insertError?.message ?? "Insert failed and no existing row",
      status: 500,
    };
  }

  if (!force && existing.status === "ready") {
    return { mode: "ready", row: rowToClient(existing) };
  }

  if (existing.status === "generating") {
    const updatedAt = new Date(existing.updated_at as string).getTime();
    if (Date.now() - updatedAt < STALE_LOCK_MS) {
      return { mode: "blocked" };
    }
  }

  await supabase
    .from(table)
    .update({
      status: "generating",
      updated_at: new Date().toISOString(),
    })
    .eq("subtopic_id", subtopicId);

  return { mode: "generating" };
}

export async function markContentFailed(
  table: "podcast_scripts" | "infographics",
  subtopicId: string,
  ephemeral: boolean,
) {
  if (ephemeral) return;
  await supabase
    .from(table)
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("subtopic_id", subtopicId);
}
