import { describe, it, expect } from 'vitest';
import { starterFiles, isFiles, upsertProject, makeProject, exportHTML } from './projects';

describe('project data', () => {
  it('validates the three language sources', () => {
    expect(isFiles(starterFiles)).toBe(true);
    expect(isFiles({html:'', css:'', javascript:12})).toBe(false);
    expect(isFiles(null)).toBe(false);
  });
  it('replaces an existing project without duplicates', () => {
    const item = makeProject();
    expect(upsertProject([item], { ...item, title:'new' })).toHaveLength(1);
    expect(upsertProject([item], { ...item, title:'new' })[0].title).toBe('new');
  });
  it('exports a standalone document with the experiment', () => {
    expect(exportHTML(starterFiles)).toContain('<script>');
    expect(exportHTML(starterFiles)).toContain('INTERACTIVE STUDY');
  });
});