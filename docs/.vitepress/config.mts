import { defineConfig } from "vitepress";
import {
  catalogCategoryNavigationItems,
  femSidebarItems,
  geometrySidebarItems,
  matrixSidebarItems,
  optimizationSidebarItems,
  probabilitySidebarItems,
} from "./catalog-navigation.generated";

// Responsibility: VitePress site configuration for Gradiverse.
const guideSidebarItems = [
  { text: "Derivative Card Standard", link: "/guide/derivative-card-standard" },
  { text: "Testing Standard", link: "/guide/testing-standard" },
  { text: "FEM Minimum Standard", link: "/guide/fem-minimum-standard" },
];

const templateSidebarItems = [
  { text: "Derivative Card Template", link: "/catalog/templates/derivative-card/spec" },
];

const verificationSidebarItems = [
  { text: "Latest Report", link: "/verification/catalog-check-report" },
  { text: "Overview", link: "/verification/" },
];

export default defineConfig({
  title: "Gradiverse",
  description:
    "Catalog of analytically derived gradients, Jacobians, Hessians, and HVPs.",
  base: "/Gradiverse/",
  lang: "ja-JP",
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    math: true,
  },
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
  srcExclude: [
    "**/impl.ts",
    "**/test.ts",
    "**/meta.yaml",
  ],
  themeConfig: {
    search: {
      provider: "local",
    },
    outline: {
      level: [2, 3],
      label: "このページの目次",
    },
    logo: "/favicon.ico",
    siteTitle: "Gradiverse",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/derivative-card-standard" },
      {
        text: "Catalog",
        items: catalogCategoryNavigationItems,
      },
      { text: "Verification", link: "/verification/" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/takuto-NA/Gradiverse" },
    ],
    editLink: {
      pattern: "https://github.com/takuto-NA/Gradiverse/edit/main/docs/:path",
      text: "このページを編集する",
    },
    lastUpdatedText: "最終更新",
    docFooter: {
      prev: "前のページ",
      next: "次のページ",
    },
    returnToTopLabel: "トップへ戻る",
    darkModeSwitchLabel: "ダークモード切替",
    lightModeSwitchTitle: "ライトモードへ切替",
    darkModeSwitchTitle: "ダークモードへ切替",
    sidebarMenuLabel: "メニュー",
    footer: {
      message: "Built with VitePress for derivative engineering knowledge.",
      copyright: "Copyright © 2026 Gradiverse Contributors",
    },
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: guideSidebarItems,
        },
      ],
      "/catalog/": [
        {
          text: "Categories",
          items: catalogCategoryNavigationItems,
        },
        {
          text: "Optimization",
          collapsed: false,
          items: optimizationSidebarItems,
        },
        {
          text: "Geometry",
          collapsed: false,
          items: geometrySidebarItems,
        },
        {
          text: "Probability",
          collapsed: false,
          items: probabilitySidebarItems,
        },
        {
          text: "Matrix",
          collapsed: false,
          items: matrixSidebarItems,
        },
        {
          text: "FEM",
          collapsed: false,
          items: femSidebarItems,
        },
        {
          text: "Templates",
          collapsed: true,
          items: templateSidebarItems,
        },
      ],
      "/verification/": [
        {
          text: "Verification",
          items: verificationSidebarItems,
        },
      ],
    },
  },
});
