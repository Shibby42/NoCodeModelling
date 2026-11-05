import { useEffect, useRef } from 'react';
import { Activity, Database, LoaderCircle, PlugZap, Unplug, X } from 'lucide-react';
import type { ConnectionConfig, LiveState } from '../adapters/live';

interface Props {
  open: boolean;
  config: ConnectionConfig;
  session: LiveState;
  busy: boolean;
  locked: boolean;
  onClose: () => void;
  onConfig: (config: ConnectionConfig) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRelease: () => void;
}

export default function ConnectionDialog(props: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (props.open && !ref.current?.open) ref.current?.showModal();
    else if (!props.open && ref.current?.open) ref.current.close();
  }, [props.open]);
  const disabled = props.busy || props.locked;
  const field = (key: keyof ConnectionConfig, value: string | number) => props.onConfig({ ...props.config, [key]: value });
  return <dialog ref={ref} className="connection-dialog" onClose={props.onClose}>
    <div className="dialog-heading"><span className="kind-icon"><PlugZap size={23} /></span><button className="icon-button" onClick={props.onClose} aria-label="Dialog schließen"><X size={19} /></button></div>
    <span className="eyebrow">ISG-VIRTUOS · LIVE-VERBINDUNG</span><h2>Mit deinem Modell verbinden.</h2>
    <div className={`connection-state ${props.session.connected ? 'connected' : ''}`}><span className="demo-dot" /><span>{props.session.message}</span></div>
    <label className="field-label">virtuos bin_x64-Verzeichnis<input value={props.config.binDirectory} disabled={disabled} onChange={e => field('binDirectory', e.target.value)} /></label>
    <div className="connection-fields"><label className="field-label">CORBA-Host<input value={props.config.host} disabled={disabled} onChange={e => field('host', e.target.value)} /></label><label className="field-label">CORBA-Port<input value={props.config.port} disabled={disabled} onChange={e => field('port', e.target.value)} /></label></div>
    <label className="field-label">CORBA-Objektname<input value={props.config.objectName} disabled={disabled} onChange={e => field('objectName', e.target.value)} /></label>
    <label className="field-label">virtuos-Prozess-ID für OVA (0 = automatisch)<input type="number" min="0" step="1" value={props.config.processId} disabled={disabled} onChange={e => field('processId', Number(e.target.value))} /></label>
    <div className="dialog-hint"><Database size={17} /><p>„Get Model Structure“ liest über die TerminalBridge die vorhandene OVA-Sitzung. Das Python-Terminal muss sichtbar an einem leeren <code>&gt;&gt;&gt;</code>-Prompt stehen.</p></div>
    <div className="dialog-hint"><Activity size={17} /><p>Live-Werte kommen über die RemoteAPI. Der CORBA-Server und die Simulation müssen in virtuos bereit sein. Die App lädt oder startet kein virtuos-Modell.</p></div>
    {props.session.forcedIds.length > 0 && <button className="button full-width release-forces" disabled={disabled} onClick={props.onRelease}>{props.session.forcedIds.length} eigene Schreibzugriffe / Forces freigeben</button>}
    <div className="dialog-buttons"><button className="button" disabled={disabled || !props.session.connected} onClick={props.onDisconnect}><Unplug size={14} />Trennen</button><button className="button primary" disabled={disabled} onClick={props.onConnect}>{props.busy ? <LoaderCircle size={14} className="spin" /> : <PlugZap size={14} />}Verbinden</button></div>
  </dialog>;
}
