import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const host = process.env.CVAN_PREVIEW_HOST || "127.0.0.1";
const port = Number(process.env.CVAN_PREVIEW_PORT || 4173);
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"], [".png", "image/png"], [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const decoded = decodeURIComponent(url.pathname);
  const relative = decoded.endsWith("/") ? `${decoded}index.html` : decoded;
  const candidate = path.resolve(root, `.${relative}`);
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(candidate);
    const file = info.isDirectory() ? path.join(candidate, "index.html") : candidate;
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": types.get(path.extname(file)) || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => console.log(`CVAN preview: http://${host}:${port}`));
