import type { FrontlabFiles } from '@pfxamd/frontlab-engine';

export type FileTab = keyof FrontlabFiles;
export type Project = {
  id: string;
  title: string;
  files: FrontlabFiles;
  updatedAt: number;
};

const KEY = 'pfx-frontlab:projects:v1';
const ACTIVE = 'pfx-frontlab:active:v1';
const MAX_PROJECTS = 24;
const MAX_FILE_SIZE = 1024 * 1024;

export const starterFiles: FrontlabFiles = {
  html: `<div class="studio">
  <div class="topline">
    <span class="signal"></span>
    <span>INTERACTIVE STUDY / 001</span>
  </div>

  <div class="composition">
    <div class="halo"></div>
    <button class="orb" id="orb" aria-label="Interact with the orb">
      <span class="orb-center"></span>
    </button>
    <span class="coordinate top">X 024</span>
    <span class="coordinate bottom">Y 068</span>
  </div>

  <div class="details">
    <div>
      <span class="eyebrow">EXPERIMENT 01</span>
      <h1>Move things<br><em>into motion.</em></h1>
    </div>
    <span class="detail-aside">PRESS & HOLD ↗</span>
  </div>
</div>`,
  css: `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; background: #e8e7e2; font-family: 'DM Sans', sans-serif; }
.studio { min-height: 100vh; padding: clamp(20px, 5vw, 48px); color: #151719; display: flex; flex-direction: column; gap: 28px; }
.topline { display: flex; align-items: center; gap: 11px; font: 600 10px/1 monospace; letter-spacing: .16em; }
.signal { width: 8px; height: 8px; background: #fc593e; border-radius: 50%; }
.composition { position: relative; flex: 1; min-height: 240px; background: #d9d8d2; overflow: hidden; display: grid; place-items: center; }
.halo { position: absolute; width: 270px; height: 270px; border: 1px solid #b7b8b3; border-radius: 50%; box-shadow: 0 0 0 65px #d9d8d2, 0 0 0 66px #b7b8b3; }
.orb { position: relative; width: 178px; height: 178px; border: 0; border-radius: 50%; cursor: pointer; background: radial-gradient(circle at 28% 23%, #ffe6da, #ff694d 46%, #ae220e 90%); box-shadow: 18px 24px 40px #9d6b5f72, inset -9px -14px 20px #7d190955; transition: transform .45s cubic-bezier(.2,1.4,.4,1), filter .4s; }
.orb:hover { filter: saturate(1.2); transform: scale(1.06) rotate(-7deg); }
.orb:active, .orb.pressed { transform: scale(.88); }
.orb-center { position: absolute; inset: 49%; background: white; border-radius: 50%; }
.coordinate { position: absolute; color: #777975; font: 10px monospace; letter-spacing: .14em; }
.coordinate.top { top: 22px; right: 22px; }
.coordinate.bottom { bottom: 22px; left: 22px; }
.details { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.eyebrow, .detail-aside { color: #74766f; font: 11px monospace; letter-spacing: .1em; }
h1 { margin: 9px 0 0; font-size: clamp(29px, 5vw, 60px); line-height: 1.01; letter-spacing: -.065em; }
h1 em { font-style: normal; color: #fc593e; }
@media (max-width: 500px) { .detail-aside { display: none; } .orb { width: 130px; height: 130px; } .halo { width: 200px; height: 200px; } }`,
  javascript: `const orb = document.querySelector('#orb');

orb.addEventListener('pointerdown', () => {
  orb.classList.add('pressed');
  console.info('Interaction started');
});

window.addEventListener('pointerup', () => {
  orb.classList.remove('pressed');
});

console.log('Frontlab experiment ready');`
};

export const makeProject = (title = 'Untitled experiment', files = starterFiles): Project => ({
  id: crypto.randomUUID(), title, files: { ...files }, updatedAt: Date.now()
});

export function isFiles(value: unknown): value is FrontlabFiles {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  return ['html', 'css', 'javascript'].every(k => typeof f[k] === 'string') &&
    (f.html as string).length + (f.css as string).length + (f.javascript as string).length < MAX_FILE_SIZE;
}

export function readProjects(): Project[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is Project => !!item && typeof item === 'object' &&
      typeof item.id === 'string' && typeof item.title === 'string' &&
      Number.isFinite(item.updatedAt) && isFiles(item.files)).slice(0, MAX_PROJECTS);
  } catch { return []; }
}

export function writeProjects(projects: Project[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS))); return true; }
  catch { return false; }
}
export function readActiveId(): string | null { try { return localStorage.getItem(ACTIVE); } catch { return null; } }
export function writeActiveId(id: string): void { try { localStorage.setItem(ACTIVE, id); } catch { /* No storage quota */ } }

export function upsertProject(projects: Project[], project: Project): Project[] {
  return [project, ...projects.filter(p => p.id !== project.id)].slice(0, MAX_PROJECTS);
}

export function downloadFile(name: string, contents: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportHTML(files: FrontlabFiles): string {
  const escapedCss = files.css.replace(/<\/style/gi, '<\\/style');
  const escapedJs = files.javascript.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${escapedCss}</style></head><body>${files.html}<script>${escapedJs}</script></body></html>`;
}