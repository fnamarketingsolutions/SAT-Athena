/**
 * Creates podcast_scripts + infographics tables and the infographics storage bucket.
 * Run: npm run db:content-tables
 *
 * Requires DATABASE_URL in .env (Supabase Postgres connection string).
 */
import pg from "pg";
import { readFileSync } from "fs";
import { execSync } from "child_process";
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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const sqlPath = join(root, "scripts", "apply-content-tables.sql");

function resolveSupabaseDbIpv6(hostname) {
  try {
    const out = execSync(`nslookup -type=AAAA ${hostname} 8.8.8.8`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const lines = out.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/^\s*Address:\s*([0-9a-f:]+)\s*$/i);
      if (m && m[1].includes(":")) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

const password = decodeURIComponent(url.match(/:\/\/[^:]+:([^@]+)@/)?.[1] ?? "");
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([^.]+)\.supabase\.co/,
)?.[1];

const POOLER_PREFIXES = ["aws-1", "aws-0"];
const POOLER_PORTS = [6543, 5432];
const POOLER_REGIONS = [
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "sa-east-1",
];

async function connectClient() {
  const poolerUrl = process.env.DATABASE_POOLER_URL;
  if (poolerUrl) {
    const candidate = new pg.Client({
      connectionString: poolerUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    await candidate.connect();
    console.log("Connected via DATABASE_POOLER_URL");
    return candidate;
  }

  if (projectRef && password) {
    for (const prefix of POOLER_PREFIXES) {
      for (const region of POOLER_REGIONS) {
        for (const port of POOLER_PORTS) {
          const host = `${prefix}-${region}.pooler.supabase.com`;
          const poolerConn = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
          const candidate = new pg.Client({
            connectionString: poolerConn,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 8000,
          });
          try {
            await candidate.connect();
            console.log(`Connected via pooler (${host}:${port})`);
            return candidate;
          } catch {
            await candidate.end().catch(() => {});
          }
        }
      }
    }
  }

  // Fall back to direct connection (IPv6 on hosts that support it).
  let connectionString = url;
  const hostMatch = url.match(/@([^:/]+)/);
  if (hostMatch?.[1]?.includes("db.") && hostMatch[1].includes(".supabase.co")) {
    const ipv6 = resolveSupabaseDbIpv6(hostMatch[1]);
    if (ipv6) {
      connectionString = url.replace(hostMatch[1], `[${ipv6}]`);
      console.log(`Resolved ${hostMatch[1]} → ${ipv6}`);
    }
  }
  const direct = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await direct.connect();
  console.log("Connected via direct Postgres");
  return direct;
}

let client;
try {
  client = await connectClient();
} catch (err) {
  console.error(
    "Could not connect to Postgres:",
    err instanceof Error ? err.message : err,
  );
  console.error(
    "\nOpen Supabase Dashboard → SQL Editor and paste/run:\n  scripts/apply-content-tables.sql",
  );
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
console.log("Applying scripts/apply-content-tables.sql…");
try {
  await client.query(sql);
  console.log("  ✓ applied");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("  ✗ failed:", msg);
  await client.end();
  process.exit(1);
}

const check = await client.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('podcast_scripts', 'infographics')
   ORDER BY 1`
);
console.log("Tables now present:", check.rows.map((r) => r.table_name).join(", "));

// Tell PostgREST to pick up new tables immediately.
await client.query("NOTIFY pgrst, 'reload schema'");

await client.end();
console.log("Done.");
