import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestResultSummary {
  title: string;
  fullTitle: string;
  status: string;
  duration: number;
  retry: number;
  errors: string[];
}

interface SpecFileReport {
  specFile: string;
  timestamp: string;
  duration: number;
  tests: TestResultSummary[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
}

interface PerFileReporterOptions {
  outputDir?: string;
}

class PerFileReporter implements Reporter {
  private outputDir: string;
  private resultsByFile: Map<string, TestResultSummary[]> = new Map();
  private startTime: number = 0;

  constructor(options: PerFileReporterOptions = {}) {
    this.outputDir = options.outputDir || 'playwright-report/per-file';
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    // Ensure output directory exists
    fs.mkdirSync(this.outputDir, { recursive: true });
    // Clear previous results
    this.resultsByFile.clear();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const specFile = path.basename(test.location.file, '.spec.ts');

    if (!this.resultsByFile.has(specFile)) {
      this.resultsByFile.set(specFile, []);
    }

    this.resultsByFile.get(specFile)!.push({
      title: test.title,
      fullTitle: test.titlePath().join(' > '),
      status: result.status,
      duration: result.duration,
      retry: result.retry,
      errors: result.errors.map((e) => e.message || String(e)),
    });
  }

  onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime;

    // Write individual spec file reports
    const fileEntries = Array.from(this.resultsByFile.entries());
    for (const [specFile, tests] of fileEntries) {
      const report: SpecFileReport = {
        specFile,
        timestamp: new Date().toISOString(),
        duration: tests.reduce((sum, t) => sum + t.duration, 0),
        tests,
        summary: {
          total: tests.length,
          passed: tests.filter((t) => t.status === 'passed').length,
          failed: tests.filter((t) => t.status === 'failed').length,
          skipped: tests.filter((t) => t.status === 'skipped').length,
          flaky: tests.filter((t) => t.status === 'passed' && t.retry > 0).length,
        },
      };

      const outputPath = path.join(this.outputDir, `${specFile}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    }

    // Write a summary index file
    const entries = Array.from(this.resultsByFile.entries());
    const allTests = Array.from(this.resultsByFile.values());

    const summaryReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      status: result.status,
      files: entries.map(([specFile, tests]) => ({
        specFile,
        total: tests.length,
        passed: tests.filter((t) => t.status === 'passed').length,
        failed: tests.filter((t) => t.status === 'failed').length,
        skipped: tests.filter((t) => t.status === 'skipped').length,
      })),
      totals: {
        files: this.resultsByFile.size,
        tests: allTests.reduce((sum, tests) => sum + tests.length, 0),
        passed: allTests.reduce(
          (sum, tests) => sum + tests.filter((t) => t.status === 'passed').length,
          0
        ),
        failed: allTests.reduce(
          (sum, tests) => sum + tests.filter((t) => t.status === 'failed').length,
          0
        ),
        skipped: allTests.reduce(
          (sum, tests) => sum + tests.filter((t) => t.status === 'skipped').length,
          0
        ),
      },
    };

    fs.writeFileSync(
      path.join(this.outputDir, '_summary.json'),
      JSON.stringify(summaryReport, null, 2)
    );
  }
}

export default PerFileReporter;
