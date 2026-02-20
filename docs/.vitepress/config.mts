import { defineConfig } from "vitepress";

// Responsibility: VitePress site configuration for Gradiverse.
const catalogCategoryNavigationItems = [
  { text: "Optimization", link: "/catalog/optimization/" },
  { text: "Geometry", link: "/catalog/geometry/" },
  { text: "Probability", link: "/catalog/probability/" },
  { text: "Matrix", link: "/catalog/matrix/" },
  { text: "FEM", link: "/catalog/fem/" },
];

const guideSidebarItems = [
  { text: "Derivative Card Standard", link: "/guide/derivative-card-standard" },
  { text: "Testing Standard", link: "/guide/testing-standard" },
  { text: "FEM Minimum Standard", link: "/guide/fem-minimum-standard" },
];

const optimizationSidebarItems = [
  { text: "Squared L2 Norm Energy", link: "/catalog/optimization/squared-l2/spec" },
];

const geometrySidebarItems = [
  { text: "Two-Point Distance in 2D", link: "/catalog/geometry/two-point-distance-2d/spec" },
  {
    text: "Two-Point Squared Distance in 2D",
    link: "/catalog/geometry/two-point-squared-distance-2d/spec",
  },
  {
    text: "Point-Line Distance in 2D",
    link: "/catalog/geometry/point-line-distance-2d/spec",
  },
  {
    text: "Spring Energy in 2D",
    link: "/catalog/geometry/spring-energy-2d/spec",
  },
  {
    text: "Point-Segment Distance in 2D",
    link: "/catalog/geometry/point-segment-distance-2d/spec",
  },
  {
    text: "Repulsive Distance Potentials in 2D",
    link: "/catalog/geometry/repulsive-distance-potential-2d/spec",
  },
  {
    text: "Rigid-Body Local-Point Distance in 2D",
    link: "/catalog/geometry/rigid-body-point-distance-2d/spec",
  },
  { text: "Tangent-Point Pair Energy in 2D", link: "/catalog/geometry/tangent-point-pair-energy-2d/spec" },
  {
    text: "Tangent-Point Total Energy in 2D",
    link: "/catalog/geometry/tangent-point-total-energy-2d/spec",
  },
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
