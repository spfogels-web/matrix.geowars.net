/**
 * fetch-leaders.mjs
 * Downloads official Wikipedia portraits for every world leader in the simulation.
 * Run once: node scripts/fetch-leaders.mjs
 * Images land in: public/leaders/{id}.jpg
 */

import https from 'https';
import http  from 'http';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, '..', 'public', 'leaders');
fs.mkdirSync(OUT_DIR, { recursive: true });

// leader id → Wikipedia article title
const LEADERS = {
  usa:         'Donald_Trump',
  china:       'Xi_Jinping',
  russia:      'Vladimir_Putin',
  iran:        'Ali_Khamenei',
  israel:      'Benjamin_Netanyahu',
  uk:          'Keir_Starmer',
  france:      'Emmanuel_Macron',
  germany:     'Friedrich_Merz',
  eu:          'Ursula_von_der_Leyen',
  turkey:      'Recep_Tayyip_Erdo%C4%9Fan',
  saudiarabia: 'Mohammed_bin_Salman',
  india:       'Narendra_Modi',
  pakistan:    'Shehbaz_Sharif',
  japan:       'Shigeru_Ishiba',
  southkorea:  'Han_Duck-soo',
  northkorea:  'Kim_Jong-un',
  ukraine:     'Volodymyr_Zelenskyy',
  taiwan:      'Lai_Ching-te',
  nato:        'Mark_Rutte',
  un:          'Ant%C3%B3nio_Guterres',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'GeoWarsMatrix/1.0 (educational simulation)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchThumb(wikiTitle) {
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`;
  const res = await get(apiUrl);
  if (res.status !== 200) throw new Error(`Wikipedia API ${res.status} for ${wikiTitle}`);
  const data = JSON.parse(res.body.toString());
  // Use thumbnail (served via /thumb/ CDN path, avoids full-res rate limits)
  // Bump width to 480px for good portrait quality
  let src = data.thumbnail?.source;
  if (src) src = src.replace(/\/\d+px-/, '/480px-');
  if (!src) src = data.originalimage?.source;
  if (!src) throw new Error(`No image found for ${wikiTitle}`);
  return src;
}

async function download(url, dest) {
  const res = await get(url);
  if (res.status !== 200) throw new Error(`Image download failed (${res.status}): ${url}`);
  fs.writeFileSync(dest, res.body);
}

async function run() {
  const entries = Object.entries(LEADERS);
  console.log(`\n📸  Fetching ${entries.length} leader portraits from Wikipedia...\n`);

  for (const [id, title] of entries) {
    const dest = path.join(OUT_DIR, `${id}.jpg`);
    if (fs.existsSync(dest)) {
      console.log(`  ✓  ${id.padEnd(14)} (already downloaded)`);
      continue;
    }
    try {
      process.stdout.write(`  ⟳  ${id.padEnd(14)} fetching...`);
      const imgUrl = await fetchThumb(title);
      await download(imgUrl, dest);
      const kb = Math.round(fs.statSync(dest).size / 1024);
      process.stdout.write(`\r  ✓  ${id.padEnd(14)} saved  (${kb} KB)\n`);
    } catch (err) {
      process.stdout.write(`\r  ✗  ${id.padEnd(14)} FAILED — ${err.message}\n`);
    }
    // Polite delay between requests (Wikimedia rate-limit buffer)
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log('\n✅  Done. Images are in public/leaders/\n');
  console.log('   Restart your dev server for changes to take effect.\n');
}

run().catch(err => { console.error(err); process.exit(1); });
