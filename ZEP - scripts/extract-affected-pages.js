#!/usr/bin/env node
/**
 * Extract affected pages from FP audit chunks
 *
 * Usage:
 *   node scripts/extract-affected-pages.js <audit-file> [chunk-numbers]
 *
 * Examples:
 *   node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md
 *   node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 1
 *   node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 1-5
 *   node scripts/extract-affected-pages.js .claude/plans/New/20260111132021_fp_refactor_plan.md 1,3,5
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node extract-affected-pages.js <audit-file> [chunk-numbers]');
  console.error('Examples:');
  console.error('  node extract-affected-pages.js audit.md');
  console.error('  node extract-affected-pages.js audit.md 1');
  console.error('  node extract-affected-pages.js audit.md 1-5');
  console.error('  node extract-affected-pages.js audit.md 1,3,5,8-10');
  process.exit(1);
}

const auditFile = args[0];
const chunkFilter = args[1];

// Read audit file
if (!fs.existsSync(auditFile)) {
  console.error(`Error: File not found: ${auditFile}`);
  process.exit(1);
}

const content = fs.readFileSync(auditFile, 'utf-8');

// Parse chunk numbers from filter (e.g., "1,3,5" or "1-5" or "1-5,8-10")
function parseChunkFilter(filter) {
  if (!filter) return null; // Return null if no filter (all chunks)

  const chunks = new Set();
  const parts = filter.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      // Range: "1-5"
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        chunks.add(i);
      }
    } else {
      // Single chunk: "3"
      chunks.add(Number(part));
    }
  }

  return Array.from(chunks).sort((a, b) => a - b);
}

// Extract chunks from markdown
function extractChunks(content) {
  const chunks = [];
  const chunkRegex = /## CHUNK (\d+):([^\n]+)\n[\s\S]*?\*\*Expected Affected Pages:\*\* ([^\n]+)/g;

  let match;
  while ((match = chunkRegex.exec(content)) !== null) {
    const chunkNumber = parseInt(match[1]);
    const description = match[2].trim();
    const affectedPages = match[3].trim();

    chunks.push({
      number: chunkNumber,
      description,
      affectedPages
    });
  }

  return chunks;
}

// Normalize page paths
function normalizePages(pagesStr) {
  // Handle special cases
  if (pagesStr.includes('AUTO')) return ['AUTO'];
  if (pagesStr.includes('all authenticated pages')) return ['ALL_AUTHENTICATED'];
  if (pagesStr.includes('All pages')) return ['ALL_PAGES'];

  // Extract individual pages
  const pages = pagesStr
    .split(',')
    .map(p => p.trim())
    .filter(p => p.startsWith('/'))
    .map(p => p.replace(/\s+\(.*?\)$/, '')) // Remove parenthetical notes like "(global header)"
    .map(p => p.split(' ')[0]); // Take first path if multiple mentioned

  return [...new Set(pages)]; // Deduplicate
}

// Main execution
const allChunks = extractChunks(content);
const requestedChunks = parseChunkFilter(chunkFilter);

console.log(`📄 Audit file: ${path.basename(auditFile)}`);
console.log(`📊 Total chunks in audit: ${allChunks.length}`);
console.log('');

// Filter chunks if requested
const chunksToProcess = requestedChunks
  ? allChunks.filter(c => requestedChunks.includes(c.number))
  : allChunks;

if (requestedChunks) {
  console.log(`🔍 Processing chunks: ${requestedChunks.join(', ')}`);
} else {
  console.log(`🔍 Processing all chunks`);
}
console.log('');

// Collect all affected pages
const pageMap = new Map();

for (const chunk of chunksToProcess) {
  const pages = normalizePages(chunk.affectedPages);

  for (const page of pages) {
    if (!pageMap.has(page)) {
      pageMap.set(page, []);
    }
    pageMap.get(page).push(chunk.number);
  }
}

// Display results
console.log('📍 AFFECTED PAGES:');
console.log('='.repeat(60));

const sortedPages = Array.from(pageMap.entries())
  .sort((a, b) => {
    // Sort special pages first (AUTO, ALL_*)
    if (a[0].startsWith('AUTO') || a[0].startsWith('ALL')) return -1;
    if (b[0].startsWith('AUTO') || b[0].startsWith('ALL')) return 1;
    return a[0].localeCompare(b[0]);
  });

for (const [page, chunkNumbers] of sortedPages) {
  console.log(`\n${page}`);
  console.log(`  Chunks: ${chunkNumbers.join(', ')}`);
}

// Count regular pages (exclude AUTO/ALL_*)
const regularPages = sortedPages.filter(([page]) =>
  !page.startsWith('AUTO') && !page.startsWith('ALL')
);

console.log('');
console.log('='.repeat(60));
console.log(`\n✅ Pages to test: ${regularPages.length}`);
console.log(`⚙️  Build/config changes: ${pageMap.has('AUTO') ? 'YES' : 'NO'}`);
console.log(`🔐 Affects all authenticated pages: ${pageMap.has('ALL_AUTHENTICATED') ? 'YES' : 'NO'}`);

// Output JSON for programmatic use
if (process.env.JSON_OUTPUT) {
  const jsonOutput = {
    totalChunks: allChunks.length,
    processedChunks: chunksToProcess.length,
    pages: Object.fromEntries(pageMap),
    regularPages: regularPages.map(([page]) => page),
    hasAutoChanges: pageMap.has('AUTO'),
    hasGlobalAuthChanges: pageMap.has('ALL_AUTHENTICATED')
  };

  console.log('\n📦 JSON OUTPUT:');
  console.log(JSON.stringify(jsonOutput, null, 2));
}

// Generate test URLs (live + local dev)
console.log('\n🌐 TEST URLS:');
console.log('='.repeat(60));

const liveBase = 'https://split.lease';
const localBase = 'http://localhost:8000';

for (const [page] of regularPages) {
  if (page !== 'AUTO' && !page.startsWith('ALL_')) {
    console.log(`\nPage: ${page}`);
    console.log(`  Live:  ${liveBase}${page}`);
    console.log(`  Local: ${localBase}${page}`);
  }
}
