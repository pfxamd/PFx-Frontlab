# PFx Frontlab

A lightweight browser-based HTML, CSS and JavaScript workspace, powered by [PFx Frontlab Engine](https://github.com/pfxamd/PFx-Frontlab-Engine).

## Alpha 0.1

- Three syntax-aware CodeMirror 6 editors with independent undo history, search and autocomplete.
- Live, responsive preview with CSS-only hot updates, manual run mode and runtime console.
- Resizable desktop panels, mobile workspace, dark and light themes.
- Browser-local experiments with autosave, import/export, and standalone HTML export.
- Keyboard shortcuts: Ctrl/Cmd+Enter to run, Ctrl/Cmd+S to save.
- No remote account, user-code evaluation in the app, or backend required.

## Local development

Requires Node.js 22+, Git and npm (Git is used to install the [engine package](https://github.com/pfxamd/PFx-Frontlab-Engine) pinned to a verified commit).

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

## Preview isolation

Set `VITE_FRONTLAB_RUNNER_URL` to the **HTTPS address of the separately hosted** trusted preview runner, e.g. `https://your-preview-domain.example/runner.html`. Do not point it at this application's origin. The engine uses a remote origin-bound bridge and an inner opaque sandbox.

If no runner is configured, the app uses the engine's legacy sandboxed `srcdoc` mode. This permits experimenting with your own snippets before deploying the separate preview origin, but **must not be advertised as safe for hostile or shared content**. The on-screen warning remains visible.

A dedicated preview hosting project and its security response headers must be configured and tested separately; see [engine deployment instructions](https://github.com/pfxamd/PFx-Frontlab-Engine/tree/main/preview-host).

## Deployment

The included GitHub Actions workflow builds the app using a base path of `/PFx-Frontlab/` for GitHub Pages and checks the build and tests. GitHub Pages must be enabled in the repository's **Settings → Pages → Build and deployment → GitHub Actions** before it can publish.

The repository ships the exact local copy of the official PFxamd logo; the deployed app does not fetch this asset from another repository.