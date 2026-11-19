// scripts/dev.js — запускає сервер (порт 3000) і клієнт (порт 5173) в одному терміналі
import { spawn } from "node:child_process";

const run = (name, dir, script) => {
  const p = spawn("npm", ["run", script, "--prefix", dir], { stdio: "pipe", shell: true });
  const out = d => String(d).split("\n").filter(Boolean).forEach(l => console.log(`[${name}] ${l}`));
  p.stdout.on("data", out); p.stderr.on("data", out);
  p.on("exit", code => { console.log(`[${name}] завершився з кодом ${code}`); process.exit(code ?? 0); });
  return p;
};
const procs = [run("server", "server", "start"), run("client", "client", "dev")];
process.on("SIGINT", () => { procs.forEach(p => p.kill()); process.exit(0); });
