const fs = require('fs');
const path = require('path');

/**
 * Generic UMD bundle validator
 * @param {string} bundlePath - Path to UMD bundle
 * @param {string} globalName - Expected global variable name
 * @param {string[]} expectedExports - Component names to validate
 * @returns {boolean}
 */
function validateUmdBundle(bundlePath, globalName, expectedExports) {
  console.log(`\n🔍 Validating UMD bundle: ${path.basename(bundlePath)}`);

  // Check bundle exists
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`❌ Bundle not found: ${bundlePath}`);
  }
  console.log('  ✓ Bundle file exists');

  // Check file size (warn if too large)
  const stats = fs.statSync(bundlePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`  ✓ Bundle size: ${sizeKB} KB`);
  if (stats.size > 5 * 1024 * 1024) {
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.warn(`  ⚠️  Bundle is large (${sizeMB}MB). Consider code splitting.`);
  }

  // Read bundle content
  const content = fs.readFileSync(bundlePath, 'utf8');

  // Check for global variable
  const globalPattern = new RegExp(`${globalName}`, 'g');
  if (!globalPattern.test(content)) {
    throw new Error(`❌ Global variable "${globalName}" not found in bundle`);
  }
  console.log(`  ✓ Global "${globalName}" present`);

  // Check for expected exports
  let foundExports = 0;
  expectedExports.forEach(exportName => {
    // Look for the export name in various patterns
    const patterns = [
      new RegExp(`["']${exportName}["']\\s*:`, 'g'),
      new RegExp(`${exportName}\\s*:`, 'g'),
      new RegExp(`exports\\.${exportName}`, 'g'),
      new RegExp(`${exportName}\\s*=`, 'g')
    ];

    const found = patterns.some(pattern => pattern.test(content));

    if (found) {
      console.log(`  ✓ Export "${exportName}" found`);
      foundExports++;
    } else {
      console.warn(`  ⚠️  Export "${exportName}" not clearly visible (may be minified)`);
    }
  });

  if (foundExports === 0 && expectedExports.length > 0) {
    console.warn(`  ⚠️  No exports clearly visible. Bundle may be heavily minified. Will test at runtime.`);
  }

  // Check for React references
  if (!content.includes('React') && !content.includes('react')) {
    throw new Error('❌ Bundle missing React references - may not be configured correctly');
  }
  console.log('  ✓ React references present');

  console.log('✅ Build validation passed\n');
  return true;
}

// CLI usage
if (require.main === module) {
  const configPath = path.join(__dirname, '../config.json');

  if (!fs.existsSync(configPath)) {
    console.error('❌ config.json not found at:', configPath);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  let allPassed = true;

  config.projects.forEach(project => {
    console.log(`\n📦 Validating project: ${project.name}`);
    console.log('='.repeat(60));

    const bundlePath = path.resolve(__dirname, '..', project.distPath, project.bundleName);
    const expectedExports = project.components.map(c => c.exportName);

    try {
      validateUmdBundle(bundlePath, project.globalName, expectedExports);

      // Print component details
      console.log('\n📊 Component Details:');
      project.components.forEach(comp => {
        console.log(`\n  Component: ${comp.name}`);
        console.log(`    Export: ${comp.exportName}`);
        console.log(`    Description: ${comp.description || 'N/A'}`);
        console.log(`    Required Props: ${comp.requiredProps.length ? comp.requiredProps.join(', ') : 'None'}`);
        console.log(`    Optional Props: ${comp.optionalProps.length ? comp.optionalProps.join(', ') : 'None'}`);

        if (comp.testCases && comp.testCases.length > 0) {
          console.log(`    Test Cases (${comp.testCases.length}):`);
          comp.testCases.forEach((tc, i) => {
            console.log(`      ${i + 1}. ${tc.name}`);
            console.log(`         ${tc.description}`);
          });
        }
      });

    } catch (error) {
      console.error(`\n${error.message}\n`);
      allPassed = false;
    }
  });

  if (allPassed) {
    console.log('\n✅ All validations passed!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some validations failed\n');
    process.exit(1);
  }
}

module.exports = { validateUmdBundle };
