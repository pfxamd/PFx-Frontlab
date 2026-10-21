declare const __PFX_APP_RELEASE__: { version: string; channel: string; label: string; commit: string };

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, Check, ChevronDown, CircleHelp, Code2, Download, FileCode2,
  FolderOpen, Keyboard, LayoutGrid, Moon, MoreHorizontal, PanelBottom, Play,
  Plus, Sun, Trash2, Upload, X
} from 'lucide-react';
import { CodeEditor } from './editor/CodeEditor';
import { Preview } from './features/Preview';
import { downloadFile, exportHTML, isFiles, makeProject, readActiveId, readProjects, starterFiles, upsertProject, writeActiveId, writeProjects } from './lib/projects';
import type { FileTab, Project } from './lib/projects';

type Theme = 'dark' | 'light';
const tabs: {key: FileTab; label:string; className:string}[] = [
  { key:'html', label:'HTML', className:'html' },
  { key:'css', label:'CSS', className:'css' },
  { key:'javascript', label:'JavaScript', className:'javascript' }
];
const safeName = (title: string) => title.trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').toLowerCase() || 'frontlab-experiment';

export function FrontlabApp() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = readProjects();
    return saved.length ? saved : [makeProject('Orb / motion study', starterFiles)];
  });
  const [activeId, setActiveId] = useState<string>(() => readActiveId() ?? '');
  const active = projects.find(p => p.id === activeId) ?? projects[0];
  const files = active.files;
  const [tab, setTab] = useState<FileTab>('html');
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('pfx-frontlab:theme') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  const [autoRun, setAutoRun] = useState(true);
  const [runSignal, setRunSignal] = useState(0);
  const [clearSignal] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [notification, setNotification] = useState('');
  const [editorWidth, setEditorWidth] = useState<number>(() => {
    try { return Number(localStorage.getItem('pfx-frontlab:split')) || 47; }
    catch { return 47; }
  });
  const workspace = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('pfx-frontlab:theme', theme); } catch { /* storage disabled */ }
  }, [theme]);
  useEffect(() => {
    const id = active.id;
    if (id !== activeId) setActiveId(id);
  }, [active.id, activeId]);
  useEffect(() => {
    setSaved(false);
    const handle = window.setTimeout(() => {
      const ok = writeProjects(projects);
      writeActiveId(active.id);
      setSaved(ok);
    }, 480);
    return () => window.clearTimeout(handle);
  }, [projects, active.id]);
  useEffect(() => {
    try { localStorage.setItem('pfx-frontlab:split', String(editorWidth)); } catch { /* storage disabled */ }
  }, [editorWidth]);

  const notify = useCallback((message: string) => {
    setNotification(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotification(''), 3800);
  }, []);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const updateProject = useCallback((update: Partial<Project>) => {
    setProjects(current => current.map(p => p.id === active.id ? { ...p, ...update, updatedAt: Date.now() } : p));
  }, [active.id]);
  const updateFile = useCallback((key: FileTab, text: string) => {
    setProjects(current => current.map(p => p.id === active.id ? {
      ...p, files: { ...p.files, [key]: text }, updatedAt: Date.now()
    } : p));
  }, [active.id]);

  const newProject = useCallback(() => {
    const created = makeProject('Untitled experiment', { html:'<main>\n  <h1>Untitled experiment</h1>\n</main>', css:'body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}\n', javascript:'console.log("Ready");\n' });
    setProjects(all => upsertProject(all, created));
    setActiveId(created.id); setTab('html'); setProjectsOpen(false);
    notify('New experiment created');
  }, [notify]);
  const duplicateProject = () => {
    const copy = makeProject(`${active.title} copy`, files);
    setProjects(all => upsertProject(all, copy)); setActiveId(copy.id); setMoreOpen(false);
    notify('Experiment duplicated');
  };
  const removeProject = (project: Project) => {
    if (!window.confirm(`Delete “${project.title}” from this browser?`)) return;
    const remaining = projects.filter(p => p.id !== project.id);
    if (remaining.length === 0) {
      const next = makeProject('Untitled experiment');
      setProjects([next]); setActiveId(next.id);
    } else {
      setProjects(remaining);
      if (project.id === active.id) setActiveId(remaining[0].id);
    }
    notify('Experiment deleted');
  };
  const exportJson = () => {
    downloadFile(`${safeName(active.title)}.frontlab.json`, JSON.stringify({ format:'frontlab', version:1, title: active.title, files }, null, 2), 'application/json');
    setMoreOpen(false); notify('Project exported');
  };
  const exportStandaloneHTML = () => {
    downloadFile(`${safeName(active.title)}.html`, exportHTML(files), 'text/html');
    setMoreOpen(false); notify('HTML exported');
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('The selected file is larger than 1 MB');
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file');
      const imported = parsed as { format?: unknown; files?: unknown; title?: unknown };
      if (imported.format !== 'frontlab' || !isFiles(imported.files)) throw new Error('Not a valid Frontlab project');
      const project = makeProject(typeof imported.title === 'string' ? imported.title.slice(0, 64) : 'Imported experiment', imported.files);
      setProjects(all => upsertProject(all, project));
      setActiveId(project.id); setTab('html'); setMoreOpen(false);
      notify('Project imported · review code before running');
    } catch (error) { notify(error instanceof Error ? error.message : 'Import failed'); }
    if (upload.current) upload.current.value = '';
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key === 'Enter') { event.preventDefault(); setRunSignal(x => x + 1); }
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        const ok = writeProjects(projects);
        writeActiveId(active.id);
        setSaved(ok);
        notify(ok ? 'Saved to this browser' : 'Storage is unavailable');
      }
      if (event.key === 'Escape') { setMoreOpen(false); setProjectsOpen(false); setHelpOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [projects, active.id, notify]);

  const onDividerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(max-width: 900px)').matches || !workspace.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = workspace.current;
    const onMove = (move: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      setEditorWidth(Math.max(32, Math.min(67, Math.round(((move.clientX - bounds.left) / bounds.width) * 1000) / 10)));
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, {once:true});
  };

  return <div className="frontlab-shell">
    <header className="topbar">
      <div className="brand-zone"><a href="https://pfxamd.com" target="_blank" rel="noreferrer" className="brand-icon" title="PFxamd"><img src={`${import.meta.env.BASE_URL}brand/logo.svg`} alt="PFxamd logo" /></a><span className="brand-divider"/><span className="wordmark">PFx <strong>Frontlab</strong></span><span className="alpha-badge">{__PFX_APP_RELEASE__.label}</span></div>
      <div className="topbar-center"><span className="app-section-name">WORKSPACE</span><span className="breadcrumb-slash">/</span><input className="project-title-input" maxLength={64} aria-label="Experiment name" value={active.title} onChange={event => updateProject({title: event.target.value})} /></div>
      <div className="topbar-right"><span className="save-indicator"><span className={`save-dot ${saved ? 'saved' : ''}`}/>{saved ? 'Saved locally' : 'Saving…'}</span><span className="topbar-separator"/><button className="header-tool theme-tool" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-label="Toggle color theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="header-tool" title="Keyboard shortcuts" aria-label="Keyboard shortcuts" onClick={() => setHelpOpen(true)}><CircleHelp size={17}/></button><span className="topbar-separator"/><button className="run-primary" onClick={() => setRunSignal(s => s + 1)}><Play size={14} fill="currentColor"/><span>Run</span><kbd>⌘ ↵</kbd></button></div>
    </header>

    <div className="body-layout">
      <aside className="side-rail" aria-label="Workspace navigation">
        <div className="rail-top"><button className="rail-button active" aria-label="Code workspace" title="Code workspace"><Code2 size={20}/></button><button className={`rail-button ${projectsOpen ? 'active' : ''}`} aria-label="Experiments" title="Experiments" onClick={() => setProjectsOpen(true)}><LayoutGrid size={19}/></button></div>
        <div className="rail-bottom"><span className="rail-line"/><button className="rail-button" aria-label="Open shortcuts" title="Shortcuts" onClick={() => setHelpOpen(true)}><Keyboard size={18}/></button><a className="rail-button" href="https://github.com/pfxamd/PFx-Frontlab" title="GitHub repository" target="_blank" rel="noreferrer" aria-label="View source on GitHub"><ArrowUpRight size={19}/></a></div>
      </aside>

      <main className="workspace-main">
        <div className="workspace-subbar"><div className="path-info"><FolderOpen size={14}/><span>Workspace</span><span className="slash">/</span><span className="path-strong">{active.title || 'Untitled'}</span></div><div className="subbar-end"><span className="mono-tag">FRONTEND ENVIRONMENT</span><span className="subbar-separator"/><button className="subbar-button" onClick={() => setConsoleOpen(!consoleOpen)}><PanelBottom size={15}/><span>Console</span></button><div className="dropdown-wrapper"><button className={`subbar-button ${moreOpen ? 'pressed' : ''}`} onClick={() => setMoreOpen(v => !v)} aria-label="More project actions" aria-expanded={moreOpen}><MoreHorizontal size={18}/></button>{moreOpen && <div className="action-menu"><button onClick={() => { setMoreOpen(false); newProject(); }}><Plus size={15}/>New experiment</button><button onClick={duplicateProject}><FileCode2 size={15}/>Duplicate experiment</button><button onClick={exportJson}><Download size={15}/>Export project</button><button onClick={exportStandaloneHTML}><Download size={15}/>Export HTML</button><button onClick={() => { setMoreOpen(false); upload.current?.click(); }}><Upload size={15}/>Import project</button></div>}</div></div></div>
        <div className="workspace-panels" ref={workspace} style={{ ['--editor-width' as string]: `${editorWidth}%` }}>
          <section className="source-pane" aria-label="Source editor"><div className="pane-toolbar source-toolbar"><div className="file-tabs" role="tablist" aria-label="Source files">{tabs.map(item => <button type="button" role="tab" key={item.key} aria-selected={tab === item.key} className={`file-tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}><span className={`file-language-icon ${item.className}`}>{item.key === 'javascript' ? 'JS' : item.label.slice(0, 2)}</span><span>{item.label}</span></button>)}</div><div className="source-toolbar-end"><span className="source-file-name">{tab === 'javascript' ? 'script.js' : tab === 'html' ? 'index.html' : 'style.css'}</span><ChevronDown size={14}/></div></div>
            <CodeEditor key={active.id} files={files} activeTab={tab} onChange={updateFile}/>
            <div className="editor-foot"><span><span className="footer-tick"/>UTF-8</span><span>{files[tab].split('\n').length} lines</span><span className="footer-grow"/><label className="autorun-control"><input type="checkbox" checked={autoRun} onChange={event => setAutoRun(event.target.checked)}/><span className="mini-switch"/><span>Auto run</span></label></div>
          </section>
          <div className="panel-divider" role="separator" aria-label="Resize code and preview panels" aria-orientation="vertical" onPointerDown={onDividerDown}><span className="divider-grip"/></div>
          <Preview key={active.id} files={files} autoRun={autoRun} runSignal={runSignal} resetSignal={clearSignal} consoleOpen={consoleOpen} setConsoleOpen={setConsoleOpen}/>
        </div>
        <footer className="workspace-footer"><span className="footer-label"><span className="footer-dot"/>PFx Frontlab Engine <span className="footer-version">0.3.0-alpha.0</span></span><span className="footer-right">HTML <span>·</span> CSS <span>·</span> JavaScript <span className="footer-rule">|</span> <a href="https://github.com/pfxamd/PFx-Frontlab-Engine" target="_blank" rel="noreferrer">Engine source <ArrowUpRight size={12}/></a></span></footer>
      </main>
    </div>

    <input type="file" accept=".json,.frontlab.json,application/json" hidden ref={upload} onChange={event => void importJson(event.target.files?.[0])}/>
    {projectsOpen && <div className="overlay" onMouseDown={event => { if(event.target===event.currentTarget) setProjectsOpen(false); }}><section className="project-drawer" role="dialog" aria-modal="true" aria-label="Your experiments"><div className="drawer-top"><div><div className="eyebrow">YOUR WORKSPACE</div><h2>Experiments<span className="drawer-count">{projects.length}</span></h2></div><button className="icon-button" onClick={() => setProjectsOpen(false)} aria-label="Close experiments"><X size={18}/></button></div><p className="drawer-description">Saved in this browser. No account or server required.</p><button className="new-project-button" onClick={newProject}><Plus size={16}/>New experiment</button><div className="project-list">{projects.map(project => <div className={`project-list-item ${project.id === active.id ? 'selected' : ''}`} key={project.id}><button className="project-open-button" onClick={() => { setActiveId(project.id); setTab('html'); setProjectsOpen(false); }}><span className="project-code-mark"><Code2 size={18}/></span><span><strong>{project.title || 'Untitled'}</strong><small>{new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(new Date(project.updatedAt))} · HTML / CSS / JS</small></span>{project.id === active.id && <Check size={16} className="selected-check"/>}</button><button className="project-delete-button" aria-label={`Delete ${project.title}`} onClick={() => removeProject(project)}><Trash2 size={15}/></button></div>)}</div><div className="drawer-bottom"><span>LOCAL STORAGE</span><span>{projects.length} / 24</span></div></section></div>}
    {helpOpen && <div className="overlay centered" onMouseDown={event => { if(event.target===event.currentTarget) setHelpOpen(false); }}><section role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="help-dialog"><div className="help-title"><Keyboard size={19}/><h2>Keyboard shortcuts</h2><button className="icon-button" aria-label="Close" onClick={() => setHelpOpen(false)}><X size={18}/></button></div><div className="shortcut-row"><span>Run code</span><span><kbd>Ctrl / ⌘</kbd><kbd>Enter</kbd></span></div><div className="shortcut-row"><span>Save locally</span><span><kbd>Ctrl / ⌘</kbd><kbd>S</kbd></span></div><div className="shortcut-row"><span>Editor search</span><span><kbd>Ctrl / ⌘</kbd><kbd>F</kbd></span></div><div className="shortcut-row"><span>Undo</span><span><kbd>Ctrl / ⌘</kbd><kbd>Z</kbd></span></div><div className="shortcut-row"><span>Close dialog</span><span><kbd>Esc</kbd></span></div><p>Source files are saved automatically. All code runs in a sandboxed browser preview.</p></section></div>}
    {notification && <div className="toast-message" role="status"><Check size={16}/>{notification}</div>}
  </div>;
}