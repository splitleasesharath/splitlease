const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n🚀 React Island + UMD Test Harness');
console.log('='.repeat(60));

const config = require('../config.json');

let allPassed = true;

config.projects.forEach(project => {
  console.log(`\n📦 Testing project: ${project.name}`);
  console.log('='.repeat(60));

  // 1. Build validation
  if (config.testOptions.runBuildValidation) {
    console.log('\n[1/2] Running build validation...\n');
    try {
      execSync('node scripts/validate-build.js', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('\n❌ Build validation failed\n');
      allPassed = false;
      process.exit(1);
    }
  }

  // 2. UMD contract tests
  if (config.testOptions.runUmdContract) {
    console.log('\n[2/2] Running UMD contract tests (Playwright)...\n');
    try {
      execSync('npx playwright test', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('\n❌ UMD contract tests failed\n');
      allPassed = false;
      process.exit(1);
    }
  }
});

if (allPassed) {
  console.log('\n✅ All tests passed!\n');
  console.log('📋 Next steps:');
  console.log('  • Open previews/footer-preview.html in a browser for manual testing');
  console.log('  • Preview path: ' + path.join(__dirname, '../previews/footer-preview.html'));
  console.log('');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed\n');
  process.exit(1);
}
