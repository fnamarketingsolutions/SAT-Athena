import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const subject = process.argv[2] || "math";
const agentsDir = join(process.cwd(), "agents");
const winPy = join(agentsDir, ".venv", "Scripts", "python.exe");
const unixPy = join(agentsDir, ".venv", "bin", "python");
const python = existsSync(winPy)
  ? winPy
  : existsSync(unixPy)
    ? unixPy
    : "python";

console.log(`Generating SAT content (${subject}) — this can take 30–90+ minutes...\n`);

const child = spawn(
  python,
  ["app/pre_generation/generate_content.py", subject],
  {
    cwd: agentsDir,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      MAJORDOMO_ENABLED: "0",
      PYTHONIOENCODING: "utf-8",
    },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
