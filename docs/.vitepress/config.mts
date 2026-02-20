import { defineConfig } from "vitepress";

// Responsibility: VitePress site configuration for Gradiverse.
export default defineConfig({
  title: "Gradiverse",
  description:
    "Catalog of analytically derived gradients, Jacobians, Hessians, and HVPs.",
  base: "/Gradiverse/",
  lang: "ja-JP",
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
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/derivative-card-standard" },
      { text: "Catalog", link: "/catalog/optimization/" },
      { text: "Verification", link: "/verification/" },
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
          { text: "Optimization (Category)", link: "/catalog/optimization/" },
          {
            text: "Optimization / Squared L2 Norm Energy",
            link: "/catalog/optimization/squared-l2/spec",
          },
          { text: "Geometry (Category)", link: "/catalog/geometry/" },
          {
            text: "Geometry / Two-Point Distance in 2D",
            link: "/catalog/geometry/two-point-distance-2d/spec",
          },
          {
            text: "Geometry / Two-Point Squared Distance in 2D",
            link: "/catalog/geometry/two-point-squared-distance-2d/spec",
          },
          {
            text: "Geometry / Repulsive Distance Potentials in 2D",
            link: "/catalog/geometry/repulsive-distance-potential-2d/spec",
          },
          {
            text: "Geometry / Rigid-Body Local-Point Distance in 2D",
            link: "/catalog/geometry/rigid-body-point-distance-2d/spec",
          },
          {
            text: "Geometry / Tangent-Point Pair Energy in 2D",
            link: "/catalog/geometry/tangent-point-pair-energy-2d/spec",
          },
          {
            text: "Geometry / Tangent-Point Total Energy in 2D",
            link: "/catalog/geometry/tangent-point-total-energy-2d/spec",
          },
          { text: "Probability (Category)", link: "/catalog/probability/" },
          { text: "Matrix (Category)", link: "/catalog/matrix/" },
          { text: "FEM (Category)", link: "/catalog/fem/" },
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
      {
        text: "Verification",
        items: [
          { text: "Latest Report", link: "/verification/catalog-check-report" },
          { text: "Overview", link: "/verification/" },
        ],
      },
    ],
  },
});
