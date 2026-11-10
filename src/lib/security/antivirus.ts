import "server-only";
/**
 * Analyse antivirus optionnelle via un démon ClamAV (protocole INSTREAM).
 * Activée si CLAMAV_HOST est défini ; sinon le dépôt repose sur les
 * contrôles de format (types limités, signature binaire, PDF sans code actif).
 */
import net from "node:net";
import { serverEnv } from "@/lib/env.server";

export async function scanBuffer(bytes: Uint8Array): Promise<{ scanned: boolean; clean: boolean; detail?: string }> {
  if (!serverEnv.clamavHost) return { scanned: false, clean: true };
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: serverEnv.clamavHost, port: serverEnv.clamavPort });
    let reply = "";
    const done = (r: { scanned: boolean; clean: boolean; detail?: string }) => {
      sock.destroy();
      resolve(r);
    };
    sock.setTimeout(30_000, () => done({ scanned: false, clean: false, detail: "délai dépassé" }));
    sock.on("error", () => done({ scanned: false, clean: false, detail: "antivirus injoignable" }));
    sock.on("data", (d) => (reply += d.toString()));
    sock.on("end", () => done({ scanned: true, clean: /: OK\0?$/.test(reply.trim()), detail: reply.trim() }));
    sock.on("connect", () => {
      sock.write("zINSTREAM\0");
      for (let i = 0; i < bytes.length; i += 64 * 1024) {
        const chunk = bytes.subarray(i, i + 64 * 1024);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        sock.write(size);
        sock.write(chunk);
      }
      sock.write(Buffer.alloc(4));
    });
  });
}
