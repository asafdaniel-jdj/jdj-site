import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function requireText(rel, text, message) {
  const source = read(rel);
  if (!source.includes(text)) failures.push(`${message} (${rel})`);
}

function pass(message) {
  notes.push(`PASS ${message}`);
}

const htmlPages = [
  'index.html', 'category.html', 'item.html', 'point.html', 'khan.html',
  'article.html', 'stories.html', 'khan-catalog.html', 'floods.html',
  'floods_region_judean_desert.html', 'floods_region_negev_arava.html',
  'flood-river.html', 'about.html', 'disclaimer.html', 'accessibility.html'
];

const bootstrap = read('netlify/edge-functions/aae-data-cache-bootstrap.js');
const disclaimerRuntimeProxy = bootstrap.includes("path === '/disclaimer'") && bootstrap.includes('/seo-db.js');

for (const rel of htmlPages) {
  const source = read(rel);
  if (!source) continue;
  if (!source.includes('supabase.createClient')) continue;

  const hasProxy = /src=["']\/?seo-db\.js["']/.test(source);
  if (!hasProxy && !(rel === 'disclaimer.html' && disclaimerRuntimeProxy)) {
    failures.push(`${rel} creates a Supabase client without the Data Cache Proxy`);
  }
}

requireText(
  'netlify/functions/recommended-routes.mjs',
  "const CACHE_SECONDS = 3_600;",
  'Recommended routes cache must remain one hour'
);
requireText(
  'netlify/functions/recommended-routes.mjs',
  "'Netlify-Cache-Tag': 'recommended,table:routes,routes-products'",
  'Recommended endpoint must expose the recommended cache tag'
);
requireText(
  'netlify/functions/purge-recommended-scheduled.mjs',
  "schedule: '1 0 * * *'",
  'Scheduled recommended purge must run after the 00:00 UTC DB rotation'
);
requireText(
  'netlify/functions/purge-recommended-scheduled.mjs',
  "const RECOMMENDED_TAGS = ['recommended'];",
  'Scheduled purge must invalidate the shared recommended tag'
);
requireText(
  'category-recommended-sync.js',
  '/.netlify/functions/recommended-routes',
  'Category must use the shared recommended endpoint'
);
requireText(
  'home-recommended-sync.js',
  '/.netlify/functions/recommended-routes',
  'Home must use the shared recommended endpoint'
);
requireText(
  'netlify/edge-functions/aae-data-cache-bootstrap.js',
  'cache-observability.js',
  'Public pages must receive cache fallback observability'
);
requireText(
  'netlify/edge-functions/aae-data-cache-bootstrap.js',
  "description: '',",
  'Flood outlet automatic description must be suppressed'
);

if (disclaimerRuntimeProxy) pass('Disclaimer Data Cache Proxy is injected at runtime');
pass('Recommended cache contract files inspected');
pass('Public Supabase client pages inspected for Data Cache Proxy coverage');

if (failures.length) {
  console.error('\nJDJ cache contract QA FAILED\n');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('\nJDJ cache contract QA PASSED\n');
notes.forEach(item => console.log(`- ${item}`));
console.log('- Manual Deploy Preview QA is still required for browser Network/HIT/MISS behavior.');
