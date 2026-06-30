import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const agentsDir = join(process.cwd(), "agents");
const winPy = join(agentsDir, ".venv", "Scripts", "python.exe");
const unixPy = join(agentsDir, ".venv", "bin", "python");
const python = existsSync(winPy)
  ? winPy
  : existsSync(unixPy)
    ? unixPy
    : "python";

// Port 8080 is often taken on Windows (Apache/XAMPP). Override with AGENTS_PORT.
const port = process.env.AGENTS_PORT || "8765";

console.log(`Starting agents on http://localhost:${port} with: ${python}`);

const child = spawn(
  python,
  ["-m", "uvicorn", "main:app", "--reload", "--port", port],
  { cwd: agentsDir, stdio: "inherit", shell: false }
);

child.on("exit", (code) => process.exit(code ?? 0));
