import { useEffect, useRef, useState } from 'react';
import { FrontlabEngine, type EngineEvent, type EngineState, type FrontlabFiles, type Diagnostic } from '@pfxamd/frontlab-engine';
import { AlertTriangle, CirclePlay, Monitor, RotateCw, Smartphone, Tablet, Terminal, X } from 'lucide-react';

export type PreviewDevice = 'fluid' | 'tablet' | 'mobile' | 'custom';
const RUNNER_URL = import.meta.env.VITE_FRONTLAB_RUNNER_URL?.trim() || '';
const widths: Record<Exclude<PreviewDevice, 'custom'>, string> = { fluid: '100%', tablet: '768px', mobile: '390px' };

export function Preview({ files, autoRun, runSignal, resetSignal, consoleOpen, setConsoleOpen }: {
  files: FrontlabFiles;
  autoRun: boolean;
  runSignal: number;
  resetSignal: number;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<FrontlabEngine | null>(null);
  const applied = useRef<FrontlabFiles>(files);
  const [state, setState] = useState<EngineState>('idle');
  const [events, setEvents] = useState<Diagnostic[]>([]);
  const [device, setDevice] = useState<PreviewDevice>('fluid');
  const [customWidth, setCustomWidth] = useState(1120);
  const [runtimeWarning, setRuntimeWarning] = useState('');

  useEffect(() => {
    if (!host.current) return;
    const listener = (event: EngineEvent) => {
      if (event.type === 'state') setState(event.state);
      if (event.type === 'diagnostic') setEvents(items => [...items.slice(-199), event.diagnostic]);
      if (event.type === 'timeout') setRuntimeWarning('Preview timed out. Run again to retry.');
    };
    const instance = new FrontlabEngine(host.current, {
      debounceMs: 180,
      startupTimeoutMs: 12000,
      onEvent: listener,
      ...(RUNNER_URL ? { runnerUrl: RUNNER_URL } : {})
    });
    engine.current = instance;
    instance.update(files, true);
    applied.current = files;
    return () => { instance.dispose(); engine.current = null; };
    // Own one engine per preview mount; file changes handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = engine.current;
    if (!current || !autoRun || files === applied.current) return;
    const previous = applied.current;
    applied.current = files;
    setRuntimeWarning('');
    try {
      if (previous.html === files.html && previous.javascript === files.javascript && previous.css !== files.css) {
        current.updateCSS(files.css);
      } else {
        setEvents([]);
        current.update(files);
      }
    } catch (error) { setRuntimeWarning(error instanceof Error ? error.message : 'Unable to update preview'); }
  }, [files, autoRun]);

  useEffect(() => {
    if (runSignal === 0) return;
    applied.current = files;
    setEvents([]); setRuntimeWarning('');
    try { engine.current?.update(files, true); }
    catch (error) { setRuntimeWarning(error instanceof Error ? error.message : 'Unable to run code'); }
    // runSignal represents an explicit user action, and reads current files.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  useEffect(() => {
    if (resetSignal === 0) return;
    setEvents([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const viewportWidth = device === 'custom' ? `${Math.min(1600, Math.max(240, customWidth))}px` : widths[device];
  const errors = events.filter(item => item.level === 'error').length;
  return <section className="preview-pane" aria-label="Live preview">
    <div className="pane-toolbar preview-toolbar">
      <div className="pane-heading"><Monitor size={15}/><span>Preview</span><span className={`state-indicator ${state}`}/><span className="state-label">{state === 'running' ? 'Live' : state === 'starting' ? 'Loading' : state}</span></div>
      <div className="preview-controls">
        <div className="device-switch" aria-label="Viewport sizes">
          <button type="button" aria-label="Fluid desktop width" title="Fluid desktop" className={device === 'fluid' ? 'selected' : ''} onClick={() => setDevice('fluid')}><Monitor size={15}/></button>
          <button type="button" aria-label="Tablet width" title="Tablet (768px)" className={device === 'tablet' ? 'selected' : ''} onClick={() => setDevice('tablet')}><Tablet size={15}/></button>
          <button type="button" aria-label="Phone width" title="Phone (390px)" className={device === 'mobile' ? 'selected' : ''} onClick={() => setDevice('mobile')}><Smartphone size={15}/></button>
        </div>
        <div className="viewport-custom"><input aria-label="Custom viewport width in pixels" type="number" min="240" max="1600" value={device === 'fluid' ? '' : device === 'tablet' ? 768 : device === 'mobile' ? 390 : customWidth} placeholder="Fluid" onChange={event => { setCustomWidth(Number(event.target.value) || 390); setDevice('custom'); }}/><span>px</span></div>
        <span className="toolbar-separator"/>
        <button className="icon-button" type="button" aria-label="Restart preview" title="Restart preview" onClick={() => { setEvents([]); setRuntimeWarning(''); applied.current = files; try { engine.current?.update(files, true); } catch (error) { setRuntimeWarning(String(error)); } }}><RotateCw size={15}/></button>
      </div>
    </div>
    {!RUNNER_URL && <div className="runner-note" role="note"><AlertTriangle size={13}/><span>Local sandbox mode · use code you trust. A dedicated preview origin is required for shared snippets.</span></div>}
    {runtimeWarning && <div role="alert" className="runtime-warning"><AlertTriangle size={14}/>{runtimeWarning}</div>}
    <div className="preview-stage">
      <div className={`preview-device ${device !== 'fluid' ? 'fixed-width' : ''}`} style={{ width: viewportWidth }}>
        <div className="frame-host" ref={host} />
      </div>
    </div>
    <div className={`console-panel ${consoleOpen ? 'open' : ''}`}>
      <div className="console-toolbar">
        <button type="button" className="console-heading" onClick={() => setConsoleOpen(!consoleOpen)} aria-expanded={consoleOpen}><Terminal size={14}/><span>Console</span>{errors > 0 && <span className="error-count">{errors} errors</span>}<span className="console-total">{events.length}</span></button>
        <div className="console-actions"><button className="text-button small" type="button" onClick={() => setEvents([])}>Clear</button><button className="icon-button tiny" type="button" aria-label={consoleOpen ? 'Collapse console' : 'Open console'} onClick={() => setConsoleOpen(!consoleOpen)}>{consoleOpen ? <X size={14}/> : <CirclePlay size={14}/>}</button></div>
      </div>
      {consoleOpen && <div className="console-output" role="log" aria-live="off">
        {events.length === 0 ? <div className="console-empty">No output yet. Console messages and runtime errors appear here.</div> : events.map((item,index) => <div key={`${item.runId}-${index}`} className={`console-line level-${item.level}`}><span className="console-level">{item.level.toUpperCase()}</span><code>{item.message}</code></div>)}
      </div>}
    </div>
  </section>;
}