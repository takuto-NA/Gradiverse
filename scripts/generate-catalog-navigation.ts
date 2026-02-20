/**
 * Responsibility:
 * Generate VitePress catalog navigation arrays from card spec headings.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_CATALOG_DIRECTORY = path.join("docs", "catalog");
const GENERATED_FILE_PATH = path.join(
  "docs",
  ".vitepress",
  "catalog-navigation.generated.ts",
);
const EXCLUDED_DIRECTORY_NAMES = new Set(["templates", "_shared"]);
const CATEGORY_LABELS: Record<string, string> = {
  optimization: "Optimization",
  geometry: "Geometry",
  probability: "Probability",
  matrix: "Matrix",
  fem: "FEM",
};
const CATEGORY_ORDER = ["optimization", "geometry", "probability", "matrix", "fem"];

type NavItem = {
  text: string;
  link: string;
};

async function listDirectoryNames(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((leftName, rightName) => leftName.localeCompare(rightName));
}

async function extractTitleFromSpec(specFilePath: string): Promise<string> {
  const specContent = await readFile(specFilePath, "utf8");
  const firstHeadingLine = specContent
    .split(/\r?\n/)
    .find((lineContent) => lineContent.startsWith("# "));
  if (firstHeadingLine === undefined) {
    throw new Error(`spec heading missing in ${specFilePath}`);
  }
  return firstHeadingLine.slice(2).trim();
}

async function collectCategoryItems(categoryName: string): Promise<NavItem[]> {
  const categoryDirectoryPath = path.join(process.cwd(), PROJECT_CATALOG_DIRECTORY, categoryName);
  const cardDirectoryNames = await listDirectoryNames(categoryDirectoryPath);
  const navItems: NavItem[] = [];

  for (const cardDirectoryName of cardDirectoryNames) {
    const specFilePath = path.join(categoryDirectoryPath, cardDirectoryName, "spec.md");
    try {
      const titleText = await extractTitleFromSpec(specFilePath);
      navItems.push({
        text: titleText,
        link: `/catalog/${categoryName}/${cardDirectoryName}/spec`,
      });
    } catch {
      continue;
    }
  }
  return navItems;
}

function renderNavItem(item: NavItem): string {
  return `  { text: ${JSON.stringify(item.text)}, link: ${JSON.stringify(item.link)} },`;
}

function renderArrayExport(exportName: string, items: NavItem[]): string {
  return [
    `export const ${exportName} = [`,
    ...items.map(renderNavItem),
    "];",
    "",
  ].join("\n");
}

async function run(): Promise<void> {
  const catalogDirectoryPath = path.join(process.cwd(), PROJECT_CATALOG_DIRECTORY);
  const discoveredCategories = await listDirectoryNames(catalogDirectoryPath);
  const categoryNames = CATEGORY_ORDER.filter((categoryName) =>
    discoveredCategories.includes(categoryName),
  );

  const categoryNavItems: NavItem[] = categoryNames
    .filter((categoryName) => !EXCLUDED_DIRECTORY_NAMES.has(categoryName))
    .map((categoryName) => ({
      text: CATEGORY_LABELS[categoryName] ?? categoryName,
      link: `/catalog/${categoryName}/`,
    }));

  const categoryItemsMap: Record<string, NavItem[]> = {};
  for (const categoryName of categoryNames) {
    if (EXCLUDED_DIRECTORY_NAMES.has(categoryName)) {
      continue;
    }
    categoryItemsMap[categoryName] = await collectCategoryItems(categoryName);
  }

  const fileContent = [
    "/**",
    " * Responsibility:",
    " * Auto-generated catalog navigation for VitePress config.",
    " * Run `npm run docs:sync-nav` after card additions.",
    " */",
    "",
    "export const catalogCategoryNavigationItems = [",
    ...categoryNavItems.map(renderNavItem),
    "];",
    "",
    renderArrayExport(
      "optimizationSidebarItems",
      categoryItemsMap.optimization ?? [],
    ),
    renderArrayExport("geometrySidebarItems", categoryItemsMap.geometry ?? []),
    renderArrayExport(
      "probabilitySidebarItems",
      categoryItemsMap.probability ?? [],
    ),
    renderArrayExport("matrixSidebarItems", categoryItemsMap.matrix ?? []),
    renderArrayExport("femSidebarItems", categoryItemsMap.fem ?? []),
  ].join("\n");

  await mkdir(path.dirname(path.join(process.cwd(), GENERATED_FILE_PATH)), {
    recursive: true,
  });
  await writeFile(path.join(process.cwd(), GENERATED_FILE_PATH), fileContent, "utf8");
  console.log(`GENERATED ${GENERATED_FILE_PATH.replaceAll(path.sep, "/")}`);
}

void run();
