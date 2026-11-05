import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEmptyProject, disconnectedState, emptyCatalog, LiveRemoteAdapter } from './live';
import { parseProject } from '../core/project';
import App from '../App';

afterEach(() => vi.unstubAllGlobals());

describe('Live-Verbindung und leerer Startzustand', () => {
  it('zeigt beim Öffnen keinen vorbereiteten Modellbaum', () => {
    const markup = renderToStaticMarkup(<App />);
    expect(markup).toContain('Get Model Structure');
    expect(markup).toContain('Modellstruktur laden');
    expect(markup).not.toContain('Materialtransfer');
    expect(markup).not.toContain('Transferstation');
    expect(emptyCatalog.signals).toEqual([]);
  });
  it('speichert Modellreferenzen mit Positionen im Projekt', () => {
    const project = { ...createEmptyProject('model'), blocks: [{ id: 'placement', blockId: 'block', position: { x: 100, y: 200 } }] };
    expect(parseProject(JSON.stringify(project))).toEqual(project);
    expect(() => parseProject(JSON.stringify({ ...project, blocks: [{ ...project.blocks[0], id: 'start' }] }))).toThrow('Modellreferenz');
  });
  it('wertet Fehler fremder Ports nicht als Fehler des ausgewählten Signals', async () => {
    const adapter = new LiveRemoteAdapter();
    const state = { ...disconnectedState(), connected: true, ready: true, stale: false, values: { valid: 42 }, errors: { reference: 'Nicht skalar' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => state }));
    await adapter.refresh();
    expect(await adapter.readSignals(['valid'])).toEqual({ valid: 42 });
    await expect(adapter.readSignals(['reference'])).rejects.toThrow('Nicht skalar');
  });
  it('verwendet bei Verbindungsverlust und veralteten Daten keine Live-Werte', async () => {
    const adapter = new LiveRemoteAdapter();
    const state = { ...disconnectedState(), connected: true, ready: true, stale: true, values: { value: 42 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => state }));
    await adapter.refresh();
    await expect(adapter.readSignals(['value'])).rejects.toThrow('aktueller Remote-Datensatz');
    adapter.state.connected = false;
    adapter.state.message = 'Verbindung verloren';
    await expect(adapter.readSignals(['value'])).rejects.toThrow('Verbindung verloren');
  });
});
