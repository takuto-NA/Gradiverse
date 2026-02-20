/**
 * Responsibility:
 * Discover and execute `check()` in all concrete derivative-card test files.
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const EXCLUDED_DIRECTORY_NAMES = new Set(["templates"]);
const TEST_FILE_NAME = "test.ts";
const PROJECT_RELATIVE_CATALOG_DIRECTORY = path.join("docs", "catalog");

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

  let failedTestCount = 0;
  for (const testFilePath of sortedTestFiles) {
    const testFileRelativePath = formatRelativePath(testFilePath);
    const importedModule = await import(pathToFileURL(testFilePath).href);
    const checkFunction = importedModule.check as undefined | (() => void | Promise<void>);

    // Guard: each test module must explicitly export `check`.
    if (typeof checkFunction !== "function") {
      failedTestCount += 1;
      console.error(`FAIL ${testFileRelativePath} (missing export: check)`);
      continue;
    }

    try {
      await checkFunction();
      console.log(`PASS ${testFileRelativePath}`);
    } catch (error) {
      failedTestCount += 1;
      console.error(`FAIL ${testFileRelativePath}`);
      console.error(error);
    }
  }

  if (failedTestCount > 0) {
    throw new Error(`${failedTestCount} catalog check file(s) failed.`);
  }

  console.log(`PASS all catalog checks (${sortedTestFiles.length} files).`);
}

void runCatalogChecks();
