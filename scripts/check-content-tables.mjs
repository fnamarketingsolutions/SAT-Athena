import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim();
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

for (const table of ["podcast_scripts", "infographics", "subtopics"]) {
  const { data, error } = await sb.from(table).select("id").limit(1);
  console.log(
    table,
    error ? `ERROR: ${error.message} (${error.code})` : `OK rows=${data?.length ?? 0}`
  );
}

const { data: subs, error: subErr } = await sb.from("subtopics").select("id,name").limit(2);
console.log("sample subtopics:", subErr?.message ?? subs);

if (subs?.[0]) {
  const ins = await sb
    .from("podcast_scripts")
    .insert({
      subtopic_id: subs[0].id,
      status: "generating",
      title: "",
      summary: "",
      speakers: [],
      lines: [],
      has_guest: false,
    })
    .select("id")
    .maybeSingle();
  console.log(
    "podcast insert test:",
    ins.error ? `FAIL ${ins.error.message} (${ins.error.code})` : `ok id=${ins.data?.id}`
  );
  if (ins.data?.id) await sb.from("podcast_scripts").delete().eq("id", ins.data.id);
}
