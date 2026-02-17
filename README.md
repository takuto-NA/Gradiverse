# Gradiverse

Gradiverse is a derivative catalog that unifies:

- Math definitions and derivations in LaTeX
- Implementations for `value`, `grad`/`jac`, and optionally `hess`/`hvp`
- Numerical verification tests against finite-difference references

The site is built with VitePress and published via GitHub Actions to GitHub Pages.

## Quick start

```bash
npm install
npm run docs:dev
```

## Build docs

```bash
npm run docs:build
npm run docs:preview
```

## Repository layout

- `docs/`: documentation source for VitePress
- `.github/workflows/deploy-docs.yml`: GitHub Pages deployment workflow
