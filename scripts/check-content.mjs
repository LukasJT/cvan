import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articles, existingGuides, topics } from "../content/guides/articles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const errors = [];
const slugs = new Set();

async function walkHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkHtml(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

function outputPathFor(url) {
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) return path.join(dist, pathname, "index.html");
  return path.join(dist, pathname);
}

for (const article of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) errors.push(`Invalid slug: ${article.slug}`);
  if (slugs.has(article.slug)) errors.push(`Duplicate slug: ${article.slug}`);
  slugs.add(article.slug);
  if (!topics[article.topic]) errors.push(`${article.slug}: unknown topic ${article.topic}`);
  if (!article.title || !article.description || !article.summary) errors.push(`${article.slug}: incomplete metadata`);
  if (article.description.length > 170) errors.push(`${article.slug}: description exceeds 170 characters`);
  if (!article.sections?.length) errors.push(`${article.slug}: no sections`);
  const ids = new Set();
  for (const section of article.sections ?? []) {
    if (ids.has(section.id)) errors.push(`${article.slug}: duplicate section id ${section.id}`);
    ids.add(section.id);
  }
  for (const related of article.related ?? []) {
    if (![...articles, ...existingGuides].some((guide) => guide.slug === related)) errors.push(`${article.slug}: unknown related guide ${related}`);
  }
  const htmlPath = path.join(dist, "guides", article.slug, "index.html");
  try {
    const html = await readFile(htmlPath, "utf8");
    for (const required of ["<h1>", "rel=\"canonical\"", "application/ld+json", "class=\"toc\""]) {
      if (!html.includes(required)) errors.push(`${article.slug}: generated HTML missing ${required}`);
    }
    for (const section of article.sections ?? []) if (!html.includes(`id=\"${section.id}\"`)) errors.push(`${article.slug}: missing fragment ${section.id}`);
  } catch {
    errors.push(`${article.slug}: generated HTML missing`);
  }
}

for (const slug of Object.keys(topics)) {
  try { await readdir(path.join(dist, "guides", "topics", slug)); }
  catch { errors.push(`Missing topic hub: ${slug}`); }
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8").catch(() => "");
for (const article of articles) if (!sitemap.includes(`/guides/${article.slug}/`)) errors.push(`${article.slug}: absent from sitemap`);

// Crawl every generated and hand-written static page. This catches broken
// navigation between legacy guides, generated articles, topic hubs, and app
// deep links without depending on a running preview server.
for (const htmlPath of await walkHtml(dist)) {
  const html = await readFile(htmlPath, "utf8");
  const relative = path.relative(dist, htmlPath).split(path.sep).join("/");
  const pagePath = relative === "index.html" ? "/" : `/${relative.replace(/index\.html$/, "")}`;
  const hrefs = [...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    const targetUrl = new URL(href, `https://celestialvisibility.com${pagePath}`);
    const targetPath = outputPathFor(targetUrl);
    let targetExists = false;
    try { targetExists = (await stat(targetPath)).isFile(); } catch { /* reported below */ }
    if (!targetExists) {
      errors.push(`${relative}: broken internal link ${href}`);
      continue;
    }
    if (targetUrl.hash && targetPath.endsWith(".html")) {
      const fragment = decodeURIComponent(targetUrl.hash.slice(1));
      const targetHtml = targetPath === htmlPath ? html : await readFile(targetPath, "utf8");
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\bid=["']${escaped}["']`).test(targetHtml)) {
        errors.push(`${relative}: missing fragment ${targetUrl.hash} in ${href}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Content checks passed for ${articles.length} generated articles and ${Object.keys(topics).length} topic hubs.`);
}
