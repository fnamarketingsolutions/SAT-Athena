import { getAuthIdentity } from "@/lib/auth/current-user";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { buildRequestMetadata } from "@/lib/agent/request-metadata";
import {
  acquireContentLock,
  isMissingTableError,
  markContentFailed,
  STALE_LOCK_MS,
} from "@/lib/db/content-lock";

const AGENT_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8765";
const STORAGE_BUCKET = "infographics";

// Mirrors InfographicBrief in agents/app/run_time/sat/infographic_agent.py.
// We validate as a safety net; the Pydantic validation upstream is the
// primary guard.
const InfographicFormulaSchema = z.object({
  label: z.string(),
  formula: z.string(),
});

const InfographicGotchaSchema = z.object({
  title: z.string(),
  explanation: z.string(),
});

const InfographicBriefSchema = z.object({
  title: z.string(),
  hook: z.string(),
  formulas: z.array(InfographicFormulaSchema).min(1),
  gotchas: z.array(InfographicGotchaSchema).min(1),
  mnemonic: z.string().nullable().optional(),
  fun_fact: z.string(),
  color_scheme: z.string(),
});

const AgentResponseSchema = z.object({
  brief: InfographicBriefSchema,
  image_base64: z.string().min(1),
  image_mime: z.string().optional(),
});

type InfographicBrief = z.infer<typeof InfographicBriefSchema>;

type InfographicRow = {
  id: string;
  subtopicId: string;
  status: "generating" | "ready" | "failed";
  brief: InfographicBrief | null;
  imageUrl: string | null;
};

// gpt-image-2 high-quality renders run long (observed >2 min for a
// 1024x1536 poster — notably slower than gpt-image-1). Give generous
// headroom so the web route doesn't abort and discard a render that
// actually succeeded upstream.
const AGENT_FETCH_TIMEOUT_MS = 240_000;

type SubtopicRow = {
  id: string;
  name: string;
  description: string | null;
  learning_objectives: string[] | null;
  key_formulas: { latex: string; description: string }[] | null;
  common_mistakes: { mistake: string; correction: string; why: string }[] | null;
  tips_and_tricks: string[] | null;
  conceptual_overview: {
    definition?: string;
    real_world_example?: string;
    sat_context?: string;
  } | null;
  topic_id: string;
};

async function loadSubtopicContext(subtopicId: string) {
  const { data: subtopic } = await supabase
    .from("subtopics")
    .select(
      "id, name, description, learning_objectives, key_formulas, common_mistakes, tips_and_tricks, conceptual_overview, topic_id",
    )
    .eq("id", subtopicId)
    .limit(1)
    .maybeSingle<SubtopicRow>();

  if (!subtopic) return null;

  const { data: topic } = await supabase
    .from("topics")
    .select("id, slug, name")
    .eq("id", subtopic.topic_id)
    .limit(1)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (!topic) return null;

  return { subtopic, topic };
}

function rowToClient(row: Record<string, unknown>): InfographicRow {
  return {
    id: row.id as string,
    subtopicId: row.subtopic_id as string,
    status: row.status as InfographicRow["status"],
    brief: (row.brief as InfographicBrief | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
  };
}

// ── Storage admin (mirrors text-to-speech route) ─────────────────────────
let _admin: SupabaseClient | null = null;
function getStorageAdmin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

async function uploadImage(
  subtopicId: string,
  imageBytes: Uint8Array,
  mime: string,
): Promise<string | null> {
  const admin = getStorageAdmin();
  if (!admin) {
    console.error("[api/infographic] No storage admin client; SUPABASE_SERVICE_ROLE_KEY missing");
    return null;
  }
  const ext = mime.includes("svg") ? "svg" : "png";
  const path = `${subtopicId}/${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(path, imageBytes, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000, public, immutable",
    });
  if (error) {
    console.error("[api/infographic] Storage upload failed:", error.message);
    return null;
  }
  const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function agentErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    const detail = parsed.detail ?? "";
    if (/OPENAI_API_KEY/i.test(detail)) {
      return "Poster image needs OPENAI_API_KEY in agents/.env. Restart npm run agents:dev after adding it.";
    }
    if (detail) return detail;
  } catch {
    // not JSON
  }
  if (status === 500) {
    return "Infographic generator failed. Check the agents terminal for details.";
  }
  return "Infographic generator is currently unavailable. Please try again.";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subtopicId: string }> },
) {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtopicId } = await params;

  const { data: row, error } = await supabase
    .from("infographics")
    .select("*")
    .eq("subtopic_id", subtopicId)
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error)) {
    return NextResponse.json(null);
  }

  if (!row) {
    return NextResponse.json(null);
  }

  if (row.status === "generating") {
    const updatedAt = new Date(row.updated_at as string).getTime();
    if (Date.now() - updatedAt > STALE_LOCK_MS) {
      return NextResponse.json({ status: "stale" });
    }
  }

  return NextResponse.json(rowToClient(row));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ subtopicId: string }> },
) {
  const { userId } = await getAuthIdentity();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtopicId } = await params;

  // The Regenerate button forces a fresh render even when a ready poster
  // already exists. The initial-load POST sends no body (force = false),
  // which dedupes against the existing row.
  let force = false;
  try {
    const body: unknown = await req.json();
    force =
      typeof body === "object" &&
      body !== null &&
      (body as { force?: unknown }).force === true;
  } catch {
    // No body / not JSON — treat as a non-forced generate.
  }

  const lock = await acquireContentLock({
    table: "infographics",
    subtopicId,
    insertPayload: { status: "generating", brief: {} },
    force,
    rowToClient: rowToClient,
  });

  if (lock.mode === "ready") {
    return NextResponse.json(lock.row);
  }
  if (lock.mode === "blocked") {
    return NextResponse.json(
      { error: "Generation in progress", status: "generating" },
      { status: 409 },
    );
  }
  if (lock.mode === "failed") {
    return NextResponse.json({ error: lock.error }, { status: lock.status });
  }

  const ephemeral = lock.mode === "ephemeral";

  // ── Load subtopic context ────────────────────────────────────────────
  const ctx = await loadSubtopicContext(subtopicId);
  if (!ctx) {
    await markContentFailed("infographics", subtopicId, ephemeral);
    return NextResponse.json({ error: "Subtopic not found" }, { status: 404 });
  }

  // ── Call agents service ──────────────────────────────────────────────
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), AGENT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_URL}/infographic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abort.signal,
      body: JSON.stringify({
        topic: ctx.topic.slug,
        subtopic: ctx.subtopic.name,
        description: ctx.subtopic.description ?? "",
        learning_objectives: ctx.subtopic.learning_objectives ?? [],
        key_formulas: ctx.subtopic.key_formulas ?? [],
        common_mistakes: ctx.subtopic.common_mistakes ?? [],
        tips_and_tricks: ctx.subtopic.tips_and_tricks ?? [],
        conceptual_overview: ctx.subtopic.conceptual_overview ?? null,
        request_metadata: buildRequestMetadata({
          userId,
          topic: ctx.topic.slug,
          subtopic: ctx.subtopic.name,
        }),
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "no body");
      console.error(
        `[api/infographic] Agent returned ${res.status}:`,
        errorBody,
      );
      await markContentFailed("infographics", subtopicId, ephemeral);
      return NextResponse.json(
        { error: agentErrorMessage(res.status, errorBody) },
        { status: 503 },
      );
    }

    const rawJson = await res.json();
    const parsed = AgentResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      console.error(
        "[api/infographic] Agent returned invalid shape:",
        parsed.error.issues,
      );
      await markContentFailed("infographics", subtopicId, ephemeral);
      return NextResponse.json(
        { error: "Generator returned invalid response" },
        { status: 502 },
      );
    }

    const mime = parsed.data.image_mime ?? "image/png";
    const imageBytes = Uint8Array.from(Buffer.from(parsed.data.image_base64, "base64"));

    let imageUrl: string | null = null;
    if (!ephemeral) {
      imageUrl = await uploadImage(subtopicId, imageBytes, mime);
    }
    if (!imageUrl) {
      imageUrl = `data:${mime};base64,${parsed.data.image_base64}`;
    }

    if (ephemeral) {
      return NextResponse.json({
        id: "ephemeral",
        subtopicId,
        status: "ready" as const,
        brief: parsed.data.brief,
        imageUrl,
      });
    }

    // ── Save ──────────────────────────────────────────────────────────
    const { data: saved } = await supabase
      .from("infographics")
      .update({
        status: "ready",
        brief: parsed.data.brief,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("subtopic_id", subtopicId)
      .select("*")
      .maybeSingle();

    if (!saved) {
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    return NextResponse.json(rowToClient(saved));
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error("[api/infographic] Error:", err);
    await markContentFailed("infographics", subtopicId, ephemeral);
    return NextResponse.json(
      {
        error: isAbort
          ? "Generation timed out. Please try again."
          : "Failed to generate infographic",
      },
      { status: isAbort ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
