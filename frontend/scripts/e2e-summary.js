#!/usr/bin/env node
/**
 * E2E Test Summary Report Generator
 *
 * Parses Playwright JSON results and generates a clean, readable summary
 * organized by test file with pass/fail counts and error details.
 *
 * Usage: node scripts/e2e-summary.js [results.json path]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

const RESULTS_PATH = process.argv[2] || './playwright-report/results.json';

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function getStatusIcon(status) {
  switch (status) {
    case 'passed': return '\x1b[32m✓\x1b[0m';
    case 'failed': return '\x1b[31m✗\x1b[0m';
    case 'skipped': return '\x1b[33m○\x1b[0m';
    case 'timedOut': return '\x1b[31m⏱\x1b[0m';
    default: return '?';
  }
}

function parseResults(resultsPath) {
  const fullPath = resolve(process.cwd(), resultsPath);

  if (!existsSync(fullPath)) {
    console.error(`\x1b[31mError: Results file not found at ${fullPath}\x1b[0m`);
    console.error('Run "npm run test:e2e" first to generate results.');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(fullPath, 'utf-8'));
  return data;
}

function organizeByFile(results) {
  const byFile = new Map();

  for (const suite of results.suites || []) {
    processTestSuite(suite, byFile);
  }

  return byFile;
}

function processTestSuite(suite, byFile, parentTitle = '') {
  const fileName = suite.file ? basename(suite.file) : null;

  for (const spec of suite.specs || []) {
    const testTitle = parentTitle ? `${parentTitle} > ${spec.title}` : spec.title;

    for (const test of spec.tests || []) {
      const file = fileName || 'unknown';
      if (!byFile.has(file)) {
        byFile.set(file, { passed: 0, failed: 0, skipped: 0, tests: [] });
      }

      const fileData = byFile.get(file);
      const result = test.results?.[0] || {};
      const status = result.status || test.status || 'unknown';

      if (status === 'passed') fileData.passed++;
      else if (status === 'failed' || status === 'timedOut') fileData.failed++;
      else if (status === 'skipped') fileData.skipped++;

      fileData.tests.push({
        title: testTitle,
        status,
        duration: result.duration || 0,
        error: result.error?.message || null,
        errorSnippet: result.error?.snippet || null,
      });
    }
  }

  for (const childSuite of suite.suites || []) {
    const newParent = suite.title ? (parentTitle ? `${parentTitle} > ${suite.title}` : suite.title) : parentTitle;
    processTestSuite(childSuite, byFile, newParent);
  }
}

function printSummary(results, byFile) {
  console.log('\n' + '='.repeat(80));
  console.log('\x1b[1m📊 E2E TEST SUMMARY REPORT\x1b[0m');
  console.log('='.repeat(80) + '\n');

  // Overall stats
  const stats = results.stats || {};
  const totalPassed = stats.expected || 0;
  const totalFailed = stats.unexpected || 0;
  const totalSkipped = stats.skipped || 0;
  const totalDuration = stats.duration || 0;

  const statusColor = totalFailed > 0 ? '\x1b[31m' : '\x1b[32m';
  console.log(`${statusColor}Overall: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped\x1b[0m`);
  console.log(`Duration: ${formatDuration(totalDuration)}\n`);

  // Per-file breakdown
  console.log('-'.repeat(80));
  console.log('\x1b[1mRESULTS BY TEST FILE:\x1b[0m');
  console.log('-'.repeat(80) + '\n');

  const sortedFiles = [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [fileName, fileData] of sortedFiles) {
    const fileStatus = fileData.failed > 0 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${fileStatus}📁 ${fileName}\x1b[0m`);
    console.log(`   ${fileData.passed} passed, ${fileData.failed} failed, ${fileData.skipped} skipped\n`);

    // Show failed tests with errors
    const failedTests = fileData.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
    if (failedTests.length > 0) {
      console.log('   \x1b[31mFailed Tests:\x1b[0m');
      for (const test of failedTests) {
        console.log(`   ${getStatusIcon(test.status)} ${test.title}`);
        if (test.error) {
          // Truncate long error messages
          const errorMsg = test.error.length > 200
            ? test.error.substring(0, 200) + '...'
            : test.error;
          console.log(`      \x1b[90m${errorMsg.replace(/\n/g, '\n      ')}\x1b[0m`);
        }
      }
      console.log('');
    }

    // Show passed tests (collapsed)
    const passedTests = fileData.tests.filter(t => t.status === 'passed');
    if (passedTests.length > 0 && passedTests.length <= 5) {
      for (const test of passedTests) {
        console.log(`   ${getStatusIcon(test.status)} ${test.title} \x1b[90m(${formatDuration(test.duration)})\x1b[0m`);
      }
    } else if (passedTests.length > 5) {
      console.log(`   \x1b[32m✓ ${passedTests.length} tests passed\x1b[0m`);
    }

    console.log('');
  }

  // Failed test summary at the end
  const allFailedTests = [];
  for (const [fileName, fileData] of sortedFiles) {
    for (const test of fileData.tests) {
      if (test.status === 'failed' || test.status === 'timedOut') {
        allFailedTests.push({ fileName, ...test });
      }
    }
  }

  if (allFailedTests.length > 0) {
    console.log('='.repeat(80));
    console.log('\x1b[31m\x1b[1m❌ FAILED TESTS SUMMARY (' + allFailedTests.length + ' failures)\x1b[0m');
    console.log('='.repeat(80) + '\n');

    for (let i = 0; i < allFailedTests.length; i++) {
      const test = allFailedTests[i];
      console.log(`${i + 1}. \x1b[31m${test.fileName}\x1b[0m`);
      console.log(`   Test: ${test.title}`);
      if (test.error) {
        console.log(`   Error: \x1b[90m${test.error.split('\n')[0]}\x1b[0m`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log(`Report generated from: ${RESULTS_PATH}`);
  console.log('='.repeat(80) + '\n');

  return totalFailed > 0 ? 1 : 0;
}

// Main execution
try {
  const results = parseResults(RESULTS_PATH);
  const byFile = organizeByFile(results);
  const exitCode = printSummary(results, byFile);
  process.exit(exitCode);
} catch (error) {
  console.error('\x1b[31mError parsing results:\x1b[0m', error.message);
  process.exit(1);
}
