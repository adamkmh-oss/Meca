// Serveur SMTP minimal pour les tests : accepte tout, n'envoie rien.
// API : GET /messages (JSON), DELETE /messages. Ports : SMTP 2500, HTTP 8025.
import net from "node:net";
import http from "node:http";

const messages = [];

function decodeQP(s) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function decodeBody(raw) {
  const [head, ...rest] = raw.split(/\r?\n\r?\n/);
  let body = rest.join("\n\n");
  if (/content-transfer-encoding:\s*quoted-printable/i.test(head)) body = decodeQP(body);
  if (/content-transfer-encoding:\s*base64/i.test(head)) body = Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  // parties multiples : décoder chacune
  body = body.replace(/content-transfer-encoding:\s*quoted-printable\r?\n([\s\S]*?)(?=\r?\n--)/gi, (_, part) => decodeQP(part));
  return { head, body: Buffer.from(body, "latin1").toString("utf8") };
}
function header(head, name) {
  const m = new RegExp(`^${name}:\\s*(.*(?:\\r?\\n[ \\t].*)*)`, "im").exec(head);
  if (!m) return "";
  return m[1].replace(/\r?\n[ \t]/g, " ").replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_, enc, txt) =>
    enc.toLowerCase() === "b" ? Buffer.from(txt, "base64").toString("utf8") : Buffer.from(decodeQP(txt.replace(/_/g, " ")), "latin1").toString("utf8"),
  );
}

net
  .createServer((sock) => {
    let data = null;
    let rcpt = [];
    let buf = "";
    sock.write("220 structura-mail ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString("latin1");
      for (;;) {
        if (data !== null) {
          const end = buf.indexOf("\r\n.\r\n");
          if (end < 0) return;
          const raw = data + buf.slice(0, end);
          buf = buf.slice(end + 5);
          data = null;
          const { head, body } = decodeBody(raw.replace(/^\.\./gm, "."));
          const links = [...new Set(body.match(/https?:\/\/[^\s"'<>]+/g) ?? [])].map((l) => l.replace(/&amp;/g, "&"));
          messages.push({ to: rcpt, subject: header(head, "Subject"), date: new Date().toISOString(), body, links });
          if (messages.length > 500) messages.shift();
          rcpt = [];
          sock.write("250 OK\r\n");
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") sock.write("250-structura-mail\r\n250 8BITMIME\r\n");
        else if (cmd === "MAIL") sock.write("250 OK\r\n");
        else if (cmd === "RCPT") {
          rcpt.push(line.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, "").trim());
          sock.write("250 OK\r\n");
        } else if (cmd === "DATA") {
          data = "";
          sock.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (cmd === "QUIT") {
          sock.end("221 Bye\r\n");
          return;
        } else sock.write("250 OK\r\n");
      }
    });
    sock.on("error", () => {});
  })
  .listen(2500);

http
  .createServer((req, res) => {
    if (req.url?.startsWith("/messages") && req.method === "DELETE") {
      messages.length = 0;
      res.writeHead(204).end();
    } else if (req.url?.startsWith("/messages")) {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(messages));
    } else res.writeHead(404).end();
  })
  .listen(8025);
console.log("smtp-sink: SMTP 2500, HTTP 8025");
