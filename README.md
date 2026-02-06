# JSON Playground (JsonExplorer)

Explore and edit JSON in the browser, then run JavaScript snippets against your data with instant output. No sign-up, client-side only.

- **Repository:** [github.com/codefrydev/JsonPlayground](https://github.com/codefrydev/JsonPlayground)
- **Live demo:** [codefrydev.in/JsonPlayground](https://codefrydev.in/JsonPlayground/)

## Features

- **JSON panel** — Edit JSON in a syntax-highlighted editor (CodeMirror) or switch to a **tree view** to browse keys, copy paths, and insert paths into the code panel.
- **Code panel** — Write JavaScript that receives your JSON as `data`; use `Dump(value)` to show results (or `console.log` / return). Auto-run on change (toggle) or run with Ctrl/Cmd+Enter.
- **Output panel** — See results, logs, errors, execution time, and data shape; copy output.
- **JSON actions** — Format, minify, load from file, load from URL (CORS may apply).
- **Sharing** — Generate a shareable URL that encodes JSON + code; restore from URL or from previous session (localStorage).
- **Code assistance** — Snippets and path autocomplete based on your JSON structure.

## Getting started

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/codefrydev/JsonPlayground.git
cd JsonPlayground
npm i
npm run dev
```

The app runs at `http://localhost:8080`.

**Other ways to edit**

- **GitHub:** Open a file, click the pencil icon, edit and commit.
- **GitHub Codespaces:** Open the repo → Code → Codespaces → New codespace; edit and commit from the Codespace.

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- CodeMirror (@uiw/react-codemirror, @codemirror/lang-json)
- react-resizable-panels

## Deploy

Build with `npm run build` and deploy the `dist` output to any static host (e.g. Vercel, Netlify). This repo also uses GitHub Actions to deploy to GitHub Pages on push to `main` (see [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)).

## About

Live site: [codefrydev.in/JsonPlayground](https://codefrydev.in/JsonPlayground/) · Repo: [github.com/codefrydev/JsonPlayground](https://github.com/codefrydev/JsonPlayground)
