import { defineConfig } from "vitepress";

// Responsibility: VitePress site configuration for Gradiverse.
export default defineConfig({
  title: "Gradiverse",
  description:
    "Catalog of analytically derived gradients, Jacobians, Hessians, and HVPs.",
  base: "/Gradiverse/",
  lang: "ja-JP",
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
  srcExclude: [
    "**/_templates/**",
    "**/impl.ts",
    "**/test.ts",
    "**/meta.yaml",
  ],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/derivative-card-standard" },
      { text: "Catalog", link: "/catalog/optimization/" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          {
            text: "Derivative Card Standard",
            link: "/guide/derivative-card-standard",
          },
          { text: "Testing Standard", link: "/guide/testing-standard" },
          { text: "FEM Minimum Standard", link: "/guide/fem-minimum-standard" },
        ],
      },
      {
        text: "Catalog",
        items: [
          { text: "Optimization", link: "/catalog/optimization/" },
          { text: "Probability", link: "/catalog/probability/" },
          { text: "Geometry", link: "/catalog/geometry/" },
          { text: "Matrix", link: "/catalog/matrix/" },
          { text: "FEM", link: "/catalog/fem/" },
        ],
      },
      {
        text: "Templates",
        items: [
          {
            text: "Derivative Card Template",
            link: "/catalog/templates/derivative-card/spec",
          },
        ],
      },
    ],
  },
});
