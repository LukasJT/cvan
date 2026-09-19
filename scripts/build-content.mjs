import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articles, existingGuides, topics } from "../content/guides/articles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const origin = "https://celestialvisibility.com";
const allGuides = [...existingGuides, ...articles];
const bySlug = new Map(allGuides.map((guide) => [guide.slug, guide]));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function documentShell({ title, description, canonical, body, structuredData, pageClass = "" }) {
  const fullTitle = `${title} | CVAN`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CVAN — Celestial Visibility Analysis Network" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${origin}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${origin}/og-image.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/content.css" />
  ${structuredData.map((data) => `<script type="application/ld+json">${jsonLd(data)}</script>`).join("\n  ")}
</head>
<body class="${escapeHtml(pageClass)}">
${body}
</body>
</html>`;
}

function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map((item, index) =>
    item.href ? `<a href="${item.href}">${escapeHtml(item.label)}</a>` : `<span aria-current="page">${escapeHtml(item.label)}</span>`
  ).join(" <span aria-hidden=\"true\">/</span> ")}</nav>`;
}

function crest(kicker) {
  return `<div class="crest"><img src="/icon-192.png" width="56" height="56" alt="CVAN insignia" /><div><a class="brand" href="/">CVAN</a><div class="tag">${escapeHtml(kicker)}</div></div></div>`;
}

function footer() {
  return `<footer><div class="footer-links"><a href="/">App</a><a href="/guides/">Science guides</a><a href="/about/">About</a><a href="/faq/">FAQ</a></div><div>© Celestial Visibility Analysis Network · Open source astronomy planning</div></footer>`;
}

function card(guide) {
  return `<a class="tile" href="/guides/${guide.slug}/"><div class="tile-eyebrow">${escapeHtml(topics[guide.topic]?.title ?? "Guide")}</div><div class="tile-title">${escapeHtml(guide.title)}</div><div class="tile-body">${escapeHtml(guide.description)}</div></a>`;
}

function renderArticle(article) {
  const canonical = `${origin}/guides/${article.slug}/`;
  const topic = topics[article.topic];
  const toc = article.sections.map((section) => `<li><a href="#${section.id}">${escapeHtml(section.title)}</a></li>`).join("");
  const sections = article.sections.map((section) => `<section aria-labelledby="${section.id}"><h2 id="${section.id}">${escapeHtml(section.title)}</h2>${(section.paragraphs ?? []).map((p) => `<p>${p}</p>`).join("")}${section.html ?? ""}</section>`).join("\n");
  const sourceList = article.sources.map(([label, href], index) => `<li id="source-${index + 1}"><a href="${href}" rel="noopener noreferrer">${escapeHtml(label)}</a></li>`).join("");
  const related = article.related.map((slug) => bySlug.get(slug)).filter(Boolean).map(card).join("");
  const toolUrl = `/?tab=${encodeURIComponent(article.toolTab)}&ref=guide-${encodeURIComponent(article.slug)}`;
  const body = `${breadcrumbs([{ label: "CVAN", href: "/" }, { label: "Guides", href: "/guides/" }, { label: topic.title, href: `/guides/topics/${article.topic}/` }, { label: article.title }])}
<header>${crest(topic.title)}<p class="eyebrow">Science guide</p><h1>${escapeHtml(article.title)}</h1><p class="dek">${escapeHtml(article.summary)}</p><a class="cta" href="${toolUrl}">${escapeHtml(article.toolLabel)} →</a><p class="article-meta">Published <time datetime="${article.published}">${article.published}</time> · Updated <time datetime="${article.modified}">${article.modified}</time> · By LukasJT</p></header>
<main>
  <nav class="toc" aria-label="On this page"><strong>On this page</strong><ol>${toc}</ol></nav>
  ${sections}
  <aside class="method-note"><strong>Use the calculation.</strong><p>Open the relevant CVAN view, set your location, and compare the explanation above with the current geometry and forecast. Model output is planning guidance, not a guarantee.</p><a class="cta" href="${toolUrl}">${escapeHtml(article.toolLabel)} →</a></aside>
  <section aria-labelledby="sources-title"><h2 id="sources-title">Sources and limits</h2><p>Sources support the scientific definitions and model descriptions used here. CVAN's thresholds remain documented planning heuristics unless a source states otherwise.</p><ol class="sources">${sourceList}</ol></section>
  <section aria-labelledby="related-title"><h2 id="related-title">Continue learning</h2><div class="tile-grid">${related}</div></section>
</main>${footer()}`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      image: `${origin}/og-image.png`,
      datePublished: article.published,
      dateModified: article.modified,
      mainEntityOfPage: canonical,
      author: { "@type": "Person", name: "LukasJT", url: "https://github.com/LukasJT" },
      publisher: { "@type": "Organization", name: "Celestial Visibility Analysis Network", logo: { "@type": "ImageObject", url: `${origin}/icon-512.png` } },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        ["CVAN", `${origin}/`],
        ["Guides", `${origin}/guides/`],
        [topic.title, `${origin}/guides/topics/${article.topic}/`],
        [article.title, canonical],
      ].map(([name, item], index) => ({ "@type": "ListItem", position: index + 1, name, item })),
    },
  ];
  return documentShell({ title: article.title, description: article.description, canonical, body, structuredData, pageClass: "article-page" });
}

function renderIndex() {
  const canonical = `${origin}/guides/`;
  const topicCards = Object.entries(topics).map(([slug, topic]) => `<a class="tile topic-tile" href="/guides/topics/${slug}/"><div class="tile-eyebrow">Topic</div><div class="tile-title">${escapeHtml(topic.title)}</div><div class="tile-body">${escapeHtml(topic.description)}</div></a>`).join("");
  const body = `${breadcrumbs([{ label: "CVAN", href: "/" }, { label: "Guides" }])}<header>${crest("Field guide library")}<p class="eyebrow">Understand the forecast</p><h1>Science behind the night sky</h1><p class="dek">Plain-language explanations of the geometry, atmosphere, and space weather behind CVAN's observing tools. Start with a question, understand the limits, then calculate it for your location.</p><a class="cta" href="/?tab=overview&ref=guide-library">Check tonight's sky →</a></header><main><section><h2>Explore by topic</h2><div class="tile-grid">${topicCards}</div></section><section><h2>All guides</h2><div class="tile-grid">${allGuides.map(card).join("")}</div></section></main>${footer()}`;
  return documentShell({ title: "Astronomy science guides", description: "Understand Milky Way visibility, aurora forecasts, twilight, moonlight, and stargazing conditions with CVAN's science guide library.", canonical, body, structuredData: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "CVAN astronomy science guides", url: canonical, description: "Science explanations connected to CVAN's astronomy planning tools." }] });
}

function renderTopic(slug, topic) {
  const canonical = `${origin}/guides/topics/${slug}/`;
  const guides = allGuides.filter((guide) => guide.topic === slug);
  const body = `${breadcrumbs([{ label: "CVAN", href: "/" }, { label: "Guides", href: "/guides/" }, { label: topic.title }])}<header>${crest("Topic collection")}<p class="eyebrow">Science guides</p><h1>${escapeHtml(topic.title)}</h1><p class="dek">${escapeHtml(topic.description)}</p></header><main><div class="tile-grid">${guides.map(card).join("")}</div><p><a class="cta secondary" href="/guides/">Browse every guide →</a></p></main>${footer()}`;
  return documentShell({ title: topic.title, description: topic.description, canonical, body, structuredData: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: topic.title, url: canonical, description: topic.description }] });
}

async function writePage(relativePath, html) {
  const directory = path.join(dist, relativePath);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html, "utf8");
}

await mkdir(dist, { recursive: true });
await writePage("guides", renderIndex());
for (const [slug, topic] of Object.entries(topics)) await writePage(path.join("guides", "topics", slug), renderTopic(slug, topic));
for (const article of articles) await writePage(path.join("guides", article.slug), renderArticle(article));

const urls = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/about/", changefreq: "monthly", priority: "0.7" },
  { loc: "/faq/", changefreq: "monthly", priority: "0.7" },
  { loc: "/guides/", changefreq: "weekly", priority: "0.9" },
  ...Object.keys(topics).map((slug) => ({ loc: `/guides/topics/${slug}/`, changefreq: "weekly", priority: "0.8" })),
  ...allGuides.map((guide) => ({ loc: `/guides/${guide.slug}/`, changefreq: "monthly", priority: "0.8", lastmod: articles.find((a) => a.slug === guide.slug)?.modified })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((entry) => `  <url>\n    <loc>${origin}${entry.loc}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ""}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(dist, "sitemap.xml"), sitemap, "utf8");

console.log(`Generated ${articles.length} articles, ${Object.keys(topics).length} topic hubs, guide index, and ${urls.length}-URL sitemap.`);
