#!/usr/bin/env node
/**
 * Script to extract placeholders from email templates and update the Placeholders field
 *
 * Usage: node scripts/extract-email-placeholders.mjs
 *
 * Requirements:
 * - VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env (same directory as app)
config({ path: resolve(__dirname, '../.env') });

// Also load from parent root .env for service role key if available
config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Try service role key first, fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('- SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
  process.exit(1);
}

console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'zat_email_html_template_eg_sendbasicemailwf_';
// Single $ delimiters, allows spaces and underscores: $to$, $from email$, $body text$
const PLACEHOLDER_REGEX = /\$[a-zA-Z][a-zA-Z0-9_ ]*\$/g;

/**
 * Extract unique placeholders from template content
 * @param {string} content - Email template JSON content
 * @returns {string[]} - Array of unique placeholders (e.g., ['$to$', '$from email$'])
 */
function extractPlaceholders(content) {
  if (!content) return [];

  const matches = content.match(PLACEHOLDER_REGEX);
  if (!matches) return [];

  // Deduplicate by converting to Set and back to array
  return [...new Set(matches)];
}

async function main() {
  console.log('='.repeat(60));
  console.log('Email Template Placeholder Extractor');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Query all email templates
  console.log('Step 1: Fetching email templates...');
  // First, get all columns by selecting *
  const { data: templates, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('*');

  if (fetchError) {
    console.error('Error fetching templates:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${templates.length} templates\n`);

  // Debug: show column names from first template
  if (templates.length > 0) {
    console.log('Column names in table:', Object.keys(templates[0]).join(', '));
    console.log('');
  }

  // Step 2 & 3: Extract placeholders and update each row
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const template of templates) {
    // Use flexible column name access - try both patterns
    const templateName = template['Template Name'] || template['template_name'] || template['template name'] || 'Unknown';
    // Use Email Template JSON field (contains the full template with placeholders)
    const jsonContent = template['Email Template JSON'] || template['email_template_json'] || '';
    const templateId = template['_id'] || template['id'];

    console.log(`Processing: ${templateName} (${templateId})`);

    // Extract placeholders from JSON content
    const placeholders = extractPlaceholders(jsonContent);
    console.log(`  Found ${placeholders.length} placeholders: ${placeholders.join(', ') || '(none)'}`);

    results.push({
      id: templateId,
      name: templateName,
      placeholders: placeholders
    });

    // Update the row with the placeholders
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ Placeholders: placeholders })
      .eq('_id', templateId);

    if (updateError) {
      console.error(`  ERROR updating: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`  Updated successfully`);
      successCount++;
    }
    console.log('');
  }

  // Step 4: Report summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total templates processed: ${templates.length}`);
  console.log(`Successful updates: ${successCount}`);
  console.log(`Failed updates: ${errorCount}`);
  console.log('');

  console.log('Placeholder Summary by Template:');
  console.log('-'.repeat(60));
  for (const result of results) {
    console.log(`${result.name}:`);
    if (result.placeholders.length === 0) {
      console.log('  (no placeholders found)');
    } else {
      result.placeholders.forEach(p => console.log(`  - ${p}`));
    }
    console.log('');
  }
}

main().catch(console.error);
