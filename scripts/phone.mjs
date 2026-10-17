// Runs ExitCheck so your phone can open it. Usage: npm run phone
import { spawn, spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import qrcode from "qrcode-terminal";

const PORT = process.env.PORT || 3000;

function lanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) if (i.family === "IPv4" && !i.internal) return i.address;
  }
  return null;
}

console.log("Building ExitCheck (first run takes a minute)...");
const build = spawnSync("npx", ["next", "build"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const ip = lanIp();
const lanUrl = ip ? `http://${ip}:${PORT}/exit` : null;

const server = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", String(PORT)], { stdio: "inherit" });

setTimeout(() => {
  console.log("\n  ExitCheck is running.\n");
  if (lanUrl) {
    console.log(`  Same Wi-Fi as your phone:  ${lanUrl}\n`);
    qrcode.generate(lanUrl, { small: true });
    console.log("\n  Scan with your iPhone camera, then Share > Add to Home Screen.");
  }
  const hasTunnel = spawnSync("which", ["cloudflared"]).status === 0;
  if (hasTunnel) {
    console.log("\n  Starting a secure public link (needed for location, alerts and NFC writing)...");
    const t = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${PORT}`], { stdio: ["ignore", "pipe", "pipe"] });
    const scan = (buf) => {
      const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) {
        console.log(`\n  Secure link:  ${m[0]}/exit\n`);
        qrcode.generate(`${m[0]}/exit`, { small: true });
      }
    };
    t.stdout.on("data", scan);
    t.stderr.on("data", scan);
    process.on("exit", () => t.kill());
  } else {
    console.log("\n  Tip: location, alerts and NFC writing need HTTPS. Install cloudflared (brew install cloudflared) and rerun for a secure link.");
  }
}, 4000);

process.on("SIGINT", () => {
  server.kill();
  process.exit(0);
});
