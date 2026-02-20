/**
 * Responsibility:
 * Discover and execute `check()` in all concrete derivative-card test files,
 * then emit an auditable verification report for strict reviewers.
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const EXCLUDED_DIRECTORY_NAMES = new Set(["templates"]);
const TEST_FILE_NAME = "test.ts";
const PROJECT_RELATIVE_CATALOG_DIRECTORY = path.join("docs", "catalog");
const REPORT_DIRECTORY_PATH = path.join("docs", "verification");
const JSON_REPORT_FILE_PATH = path.join(REPORT_DIRECTORY_PATH, "catalog-check-report.json");
const MARKDOWN_REPORT_FILE_PATH = path.join(REPORT_DIRECTORY_PATH, "catalog-check-report.md");
const TEST_COMMAND_NAME = "npm test";
const TEST_SCRIPT_PATH = "scripts/run-catalog-checks.ts";

type CheckStatus = "PASS" | "FAIL";
type CheckEntry = {
  cardIdentifier: string;
  testFilePath: string;
  specFilePath: string;
  status: CheckStatus;
  elapsedMilliseconds: number;
  errorMessage: string | null;
};

type VerificationReport = {
  generatedAtIso: string;
  nodeVersion: string;
  command: string;
  runnerScript: string;
  gitCommitShortHash: string;
  totalCheckCount: number;
  passedCheckCount: number;
  failedCheckCount: number;
  entries: CheckEntry[];
};

async function collectTestFiles(currentDirectoryPath: string): Promise<string[]> {
  const directoryEntries = await readdir(currentDirectoryPath, { withFileTypes: true });
  const discoveredTestFiles: string[] = [];

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(currentDirectoryPath, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      if (EXCLUDED_DIRECTORY_NAMES.has(directoryEntry.name)) {
        continue;
      }
      discoveredTestFiles.push(...(await collectTestFiles(entryPath)));
      continue;
    }

    if (directoryEntry.isFile() && directoryEntry.name === TEST_FILE_NAME) {
      discoveredTestFiles.push(entryPath);
    }
  }

  return discoveredTestFiles;
}

function formatRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replaceAll(path.sep, "/");
}

function extractCardIdentifier(testFileRelativePath: string): string {
  const pathParts = testFileRelativePath.split("/");
  const testFileIndex = pathParts.indexOf(TEST_FILE_NAME);
  if (testFileIndex < 2) {
    return testFileRelativePath;
  }
  return `${pathParts[testFileIndex - 2]}/${pathParts[testFileIndex - 1]}`;
}

function getSpecFilePathFromTestFilePath(testFilePath: string): string {
  return formatRelativePath(path.join(path.dirname(testFilePath), "spec.md"));
}

async function existsAsFile(relativePath: string): Promise<boolean> {
  const absolutePath = path.join(process.cwd(), relativePath);
  try {
    const fileStatus = await stat(absolutePath);
    return fileStatus.isFile();
  } catch {
    return false;
  }
}

function getGitCommitShortHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function buildMarkdownReport(report: VerificationReport): string {
  const tableHeader = [
    "| Card | Test File | Spec | Result | Elapsed (ms) | Error |",
    "| --- | --- | --- | --- | ---: | --- |",
  ];
  const tableRows = report.entries.map((entry) => {
    const safeErrorMessage = entry.errorMessage ?? "-";
    const specLink =
      entry.specFilePath === "(missing spec.md)"
        ? "(missing spec.md)"
        : `[${entry.specFilePath}](/${entry.specFilePath.replace("docs/", "")})`;
    return `| ${entry.cardIdentifier} | \`${entry.testFilePath}\` | ${specLink} | ${entry.status} | ${entry.elapsedMilliseconds} | ${safeErrorMessage} |`;
  });

  return [
    "# Catalog Check Report",
    "",
    "このレポートは `npm test` 実行時に自動生成されます。",
    "",
    "## Execution Context",
    "",
    `- Generated at (ISO): \`${report.generatedAtIso}\``,
    `- Command: \`${report.command}\``,
    `- Runner script: \`${report.runnerScript}\``,
    `- Node.js: \`${report.nodeVersion}\``,
    `- Git commit: \`${report.gitCommitShortHash}\``,
    "",
    "## Summary",
    "",
    `- Total checks: **${report.totalCheckCount}**`,
    `- Passed: **${report.passedCheckCount}**`,
    `- Failed: **${report.failedCheckCount}**`,
    "",
    "## Per-card Results",
    "",
    ...tableHeader,
    ...tableRows,
    "",
  ].join("\n");
}

async function writeVerificationReport(report: VerificationReport): Promise<void> {
  await mkdir(path.join(process.cwd(), REPORT_DIRECTORY_PATH), { recursive: true });
  await writeFile(
    path.join(process.cwd(), JSON_REPORT_FILE_PATH),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(process.cwd(), MARKDOWN_REPORT_FILE_PATH),
    buildMarkdownReport(report),
    "utf8",
  );
}

async function runCatalogChecks(): Promise<void> {
  const catalogDirectoryPath = path.join(process.cwd(), PROJECT_RELATIVE_CATALOG_DIRECTORY);
  const discoveredTestFiles = await collectTestFiles(catalogDirectoryPath);
  const sortedTestFiles = discoveredTestFiles.sort((leftPath, rightPath) =>
    formatRelativePath(leftPath).localeCompare(formatRelativePath(rightPath)),
  );

  if (sortedTestFiles.length === 0) {
    throw new Error(
      `No ${TEST_FILE_NAME} files found under ${PROJECT_RELATIVE_CATALOG_DIRECTORY}.`,
    );
  }

  const checkEntries: CheckEntry[] = [];
  let failedTestCount = 0;
  for (const testFilePath of sortedTestFiles) {
    const testFileRelativePath = formatRelativePath(testFilePath);
    const cardIdentifier = extractCardIdentifier(testFileRelativePath);
    const specFilePathCandidate = getSpecFilePathFromTestFilePath(testFilePath);
    const specFilePath = (await existsAsFile(specFilePathCandidate))
      ? specFilePathCandidate
      : "(missing spec.md)";
    const importedModule = await import(pathToFileURL(testFilePath).href);
    const checkFunction = importedModule.check as undefined | (() => void | Promise<void>);

    // Guard: each test module must explicitly export `check`.
    if (typeof checkFunction !== "function") {
      failedTestCount += 1;
      console.error(`FAIL ${testFileRelativePath} (missing export: check)`);
      checkEntries.push({
        cardIdentifier,
        testFilePath: testFileRelativePath,
        specFilePath,
        status: "FAIL",
        elapsedMilliseconds: 0,
        errorMessage: "missing export: check",
      });
      continue;
    }

    const checkStartTime = Date.now();
    try {
      await checkFunction();
      const elapsedMilliseconds = Date.now() - checkStartTime;
      console.log(`PASS ${testFileRelativePath}`);
      checkEntries.push({
        cardIdentifier,
        testFilePath: testFileRelativePath,
        specFilePath,
        status: "PASS",
        elapsedMilliseconds,
        errorMessage: null,
      });
    } catch (error) {
      failedTestCount += 1;
      const elapsedMilliseconds = Date.now() - checkStartTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error thrown by check().";
      console.error(`FAIL ${testFileRelativePath}`);
      console.error(error);
      checkEntries.push({
        cardIdentifier,
        testFilePath: testFileRelativePath,
        specFilePath,
        status: "FAIL",
        elapsedMilliseconds,
        errorMessage,
      });
    }
  }

  const report: VerificationReport = {
    generatedAtIso: new Date().toISOString(),
    nodeVersion: process.version,
    command: TEST_COMMAND_NAME,
    runnerScript: TEST_SCRIPT_PATH,
    gitCommitShortHash: getGitCommitShortHash(),
    totalCheckCount: sortedTestFiles.length,
    passedCheckCount: sortedTestFiles.length - failedTestCount,
    failedCheckCount: failedTestCount,
    entries: checkEntries,
  };
  await writeVerificationReport(report);

  if (failedTestCount > 0) {
    throw new Error(`${failedTestCount} catalog check file(s) failed.`);
  }

  console.log(`PASS all catalog checks (${sortedTestFiles.length} files).`);
  console.log(`REPORT ${formatRelativePath(path.join(process.cwd(), MARKDOWN_REPORT_FILE_PATH))}`);
  console.log(`REPORT ${formatRelativePath(path.join(process.cwd(), JSON_REPORT_FILE_PATH))}`);
}

void runCatalogChecks();
