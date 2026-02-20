/**
 * Responsibility:
 * Validate derivative card meta.yaml presence and required API fields.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const CATALOG_DIRECTORY = path.join("docs", "catalog");
const EXCLUDED_CATEGORY_NAMES = new Set(["templates", "_shared", "_templates"]);
const REQUIRED_CARD_FILES = ["spec.md", "impl.ts", "test.ts", "meta.yaml"];
const REQUIRED_META_TOP_LEVEL_KEYS = ["name", "category", "input_shape", "api"];
const REQUIRED_API_KEYS = ["domain_sample", "check"];
const ALLOWED_API_STATUS_VALUES = new Set([
  "implemented",
  "not_implemented",
  "not implemented",
]);

type ValidationError = {
  cardPath: string;
  message: string;
};

async function pathExistsAsFile(absolutePath: string): Promise<boolean> {
  try {
    const fileStatus = await stat(absolutePath);
    return fileStatus.isFile();
  } catch {
    return false;
  }
}

function toPosixPath(inputPath: string): string {
  return inputPath.replaceAll(path.sep, "/");
}

function extractApiStatus(metaContent: string, apiKey: string): string | null {
  const apiEntryPattern = new RegExp(`^\\s{2}${apiKey}:\\s*([^\\n\\r]+)`, "m");
  const matchResult = metaContent.match(apiEntryPattern);
  if (matchResult === null) {
    return null;
  }
  return matchResult[1].trim();
}

function hasTopLevelKey(metaContent: string, keyName: string): boolean {
  const keyPattern = new RegExp(`^${keyName}:`, "m");
  return keyPattern.test(metaContent);
}

function hasApiEntry(metaContent: string): boolean {
  const apiEntryPattern = /^\s{2}[a-zA-Z0-9_]+:\s*([^\n\r]+)/m;
  return apiEntryPattern.test(metaContent);
}

async function validateCardDirectory(cardDirectoryPath: string): Promise<ValidationError[]> {
  const validationErrors: ValidationError[] = [];
  for (const requiredFileName of REQUIRED_CARD_FILES) {
    const filePath = path.join(cardDirectoryPath, requiredFileName);
    const fileExists = await pathExistsAsFile(filePath);
    if (!fileExists) {
      validationErrors.push({
        cardPath: toPosixPath(path.relative(process.cwd(), cardDirectoryPath)),
        message: `missing required file: ${requiredFileName}`,
      });
    }
  }

  const metaFilePath = path.join(cardDirectoryPath, "meta.yaml");
  if (!(await pathExistsAsFile(metaFilePath))) {
    return validationErrors;
  }

  const metaContent = await readFile(metaFilePath, "utf8");
  for (const topLevelKey of REQUIRED_META_TOP_LEVEL_KEYS) {
    if (!hasTopLevelKey(metaContent, topLevelKey)) {
      validationErrors.push({
        cardPath: toPosixPath(path.relative(process.cwd(), cardDirectoryPath)),
        message: `missing top-level meta key: ${topLevelKey}`,
      });
    }
  }

  for (const requiredApiKey of REQUIRED_API_KEYS) {
    const apiStatusValue = extractApiStatus(metaContent, requiredApiKey);
    if (apiStatusValue === null) {
      validationErrors.push({
        cardPath: toPosixPath(path.relative(process.cwd(), cardDirectoryPath)),
        message: `missing api field: ${requiredApiKey}`,
      });
      continue;
    }
    if (!ALLOWED_API_STATUS_VALUES.has(apiStatusValue)) {
      validationErrors.push({
        cardPath: toPosixPath(path.relative(process.cwd(), cardDirectoryPath)),
        message: `invalid api status for ${requiredApiKey}: ${apiStatusValue}`,
      });
    }
  }

  if (!hasApiEntry(metaContent)) {
    validationErrors.push({
      cardPath: toPosixPath(path.relative(process.cwd(), cardDirectoryPath)),
      message: "api section does not contain any fields.",
    });
  }

  return validationErrors;
}

async function runMetaConsistencyCheck(): Promise<void> {
  const catalogDirectoryPath = path.join(process.cwd(), CATALOG_DIRECTORY);
  const categoryEntries = await readdir(catalogDirectoryPath, { withFileTypes: true });
  const categoryDirectoryNames = categoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (categoryName) =>
        !EXCLUDED_CATEGORY_NAMES.has(categoryName) && !categoryName.startsWith("_"),
    );

  const allValidationErrors: ValidationError[] = [];
  for (const categoryDirectoryName of categoryDirectoryNames) {
    const categoryDirectoryPath = path.join(catalogDirectoryPath, categoryDirectoryName);
    const cardEntries = await readdir(categoryDirectoryPath, { withFileTypes: true });
    const cardDirectoryNames = cardEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    for (const cardDirectoryName of cardDirectoryNames) {
      const cardDirectoryPath = path.join(categoryDirectoryPath, cardDirectoryName);
      const cardValidationErrors = await validateCardDirectory(cardDirectoryPath);
      allValidationErrors.push(...cardValidationErrors);
    }
  }

  if (allValidationErrors.length > 0) {
    for (const validationError of allValidationErrors) {
      console.error(`FAIL ${validationError.cardPath}: ${validationError.message}`);
    }
    throw new Error(`meta consistency check failed (${allValidationErrors.length} issue(s)).`);
  }

  console.log("PASS meta consistency check.");
}

void runMetaConsistencyCheck();
