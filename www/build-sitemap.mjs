import { readFileSync, writeFileSync } from 'node:fs';
import { collectEntries, renderSitemaps } from './lib/sitemap.mjs';

const PAGE_SIZE = 1000;

function publicSupabase() {
  const src = readFileSync(new URL('./supabase-public.js', import.meta.url), 'utf8');
  const url = src.match(/url:\s*"([^"]+)"/)?.[1];
  const anonKey = src.match(/anonKey:\s*"([^"]+)"/)?.[1];
  if (!url || !anonKey) throw new Error('supabase-public.js is missing url/anonKey');
  return { url: url.replace(/\/$/, ''), anonKey };
}

async function fetchThemes() {
  const { url, anonKey } = publicSupabase();
  const rows = [];
  for (let from = 0; from < 100_000; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const res = await fetch(
      `${url}/rest/v1/themes?select=slug,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Range: `${from}-${to}`,
        },
      },
    );
    if (!res.ok) {
      throw new Error(`themes ${res.status}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  let themes = [];
  try {
    themes = await fetchThemes();
  } catch (err) {
    console.warn('build-sitemap: theme fetch failed, writing static URLs only:', err.message);
  }

  const entries = collectEntries(themes);
  const files = renderSitemaps(entries);
  const dir = new URL('./', import.meta.url);
  for (const [name, xml] of Object.entries(files)) {
    writeFileSync(new URL(name, dir), xml);
  }
  console.log(`build-sitemap: wrote ${Object.keys(files).length} files (${entries.length} URLs)`);
}

await main();
