import { useEffect, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import type { FrontlabFiles } from '@pfxamd/frontlab-engine';
import type { FileTab } from '../lib/projects';

const modes: Record<FileTab, Extension> = { html: html(), css: css(), javascript: javascript() };

export function CodeEditor({ files, activeTab, onChange }: {
  files: FrontlabFiles;
  activeTab: FileTab;
  onChange: (tab: FileTab, text: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const initial = useRef(files);
  const cached = useRef<Partial<Record<FileTab, EditorState>>>({});
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const createState = (tab: FileTab) => EditorState.create({
      doc: initial.current[tab],
      extensions: [
        modes[tab], lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(),
        drawSelection(), EditorState.allowMultipleSelections.of(true),
        history(), foldGutter(), indentOnInput(), bracketMatching(), closeBrackets(),
        autocompletion({ activateOnTyping: true }), highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (!update.docChanged) return;
          const id = (update.state.facet(tabIdFacet)) as FileTab;
          cached.current[id] = update.state;
          callback.current(id, update.state.doc.toString());
        }),
        tabIdFacet.of(tab),
        placeholder('Start writing your ' + tab.toUpperCase() + ' here…')
      ]
    });
    // Create independent editor state for each language. Histories survive tab switching.
    for (const tab of ['html', 'css', 'javascript'] as FileTab[]) cached.current[tab] = createState(tab);
    view.current = new EditorView({ state: cached.current.html, parent: host.current });
    return () => { view.current?.destroy(); view.current = null; cached.current = {}; };
  }, []);

  useEffect(() => {
    const current = view.current;
    const next = cached.current[activeTab];
    if (current && next && current.state !== next) {
      current.setState(next);
      current.focus();
    }
  }, [activeTab]);

  return <div className="editor-mount" ref={host} aria-label={`${activeTab} source editor`} />;
}

// The facet is stored in the state so callbacks always know the tab being edited.
import { Facet } from '@codemirror/state';
const tabIdFacet = Facet.define<FileTab, FileTab>({ combine: values => values[0] ?? 'html' });