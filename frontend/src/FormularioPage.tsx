import React from 'react';

type FirmaCanvasProps = { value?: string; onChange: (firma: string) => void };
function FirmaCanvas({ onChange }: FirmaCanvasProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const dibujando = React.useRef(false);
  const punto = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current!; const area = canvas.getBoundingClientRect(); return { x: (event.clientX - area.left) * canvas.width / area.width, y: (event.clientY - area.top) * canvas.height / area.height };
  };
  const iniciar = (event: React.PointerEvent<HTMLCanvasElement>) => { dibujando.current = true; const p = punto(event); const ctx = ref.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(p.x, p.y); event.currentTarget.setPointerCapture(event.pointerId); };
  const mover = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!dibujando.current) return; const p = punto(event); const ctx = ref.current!.getContext('2d')!; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const terminar = () => { if (!dibujando.current) return; dibujando.current = false; onChange(ref.current!.toDataURL('image/png')); };
  return <div className="signature"><canvas ref={ref} width="500" height="140" onPointerDown={iniciar} onPointerMove={mover} onPointerUp={terminar} onPointerLeave={terminar} /><button type="button" onClick={() => { const canvas = ref.current!; canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height); onChange(''); }}>Limpiar</button></div>;
}
type Campo = { id: number; etiqueta: string; tipo: string; obligatorio: boolean; configuracion: { unidad?: string; multilinea?: boolean; columnas?: Array<{ codigo: string; etiqueta: string; tipo?: string; opciones?: Array<{ valor: string; etiqueta: string }> }>; filasIniciales?: Array<Record<string, string>> }; opciones: Array<{ valor: string; etiqueta: string }> };
type Seccion = { id: number; titulo: string; descripcion: string | null; campos: Campo[] };
type Definicion = { nombre: string; codigo: string; numero: number; secciones: Seccion[] };

export function FormularioPage({ plantillaId, versionId }: { plantillaId: number; versionId: number }) {
  const [definicion, setDefinicion] = React.useState<Definicion | null>(null);
  const [registroId, setRegistroId] = React.useState<number | null>(null);
  const [valores, setValores] = React.useState<Record<number, unknown>>({});
  const [mensaje, setMensaje] = React.useState('');
  const registroExistente = Number(new URLSearchParams(window.location.search).get('registro'));
  const mantenimientoId = Number(new URLSearchParams(window.location.search).get('mantenimiento'));
  React.useEffect(() => {
    const exigirSesion = <T,>(r: Response) => { if (r.status === 401) { window.location.href = '/login'; return Promise.reject(); } return r.ok ? r.json() as Promise<T> : Promise.reject(); };
    const plantilla = fetch(`/api/cartillas/plantillas/${plantillaId}/versiones/${versionId}`).then(exigirSesion<Definicion>);
    const registro = Number.isSafeInteger(registroExistente) && registroExistente > 0
      ? fetch(`/api/cartillas/registros/${registroExistente}`).then(exigirSesion<{ id: number; respuestas: Record<string, unknown> }>)
      : fetch('/api/cartillas/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plantillaId, versionId, mantenimientoId: Number.isSafeInteger(mantenimientoId) && mantenimientoId > 0 ? mantenimientoId : undefined }) }).then(exigirSesion<{ id: number; respuestas?: Record<string, unknown> }>);
    Promise.all([plantilla, registro]).then(([definicionCargada, registroCargado]) => { setDefinicion(definicionCargada); setRegistroId(registroCargado.id); setValores(Object.fromEntries(Object.entries(registroCargado.respuestas ?? {}).map(([id, valor]) => [Number(id), valor]))); }).catch(() => setMensaje('No fue posible abrir la cartilla.'));
  }, [plantillaId, versionId, registroExistente, mantenimientoId]);
  const guardar = async () => {
    if (!registroId) return;
    const respuestas = Object.entries(valores).map(([campoId, valor]) => ({ campoId: Number(campoId), valor }));
    const resultado = await fetch(`/api/cartillas/registros/${registroId}/respuestas`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ respuestas }) });
    setMensaje(resultado.ok ? 'Borrador guardado.' : 'No se pudo guardar el borrador.');
  };
  const enviarRevision = async () => {
    if (!registroId) return;
    await guardar();
    const resultado = await fetch(`/api/cartillas/registros/${registroId}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'revision' }) });
    setMensaje(resultado.ok ? 'Cartilla enviada a revisión.' : 'No se pudo enviar a revisión.');
  };
  const control = (campo: Campo) => {
    const cambiar = (valor: unknown) => setValores((actual) => ({ ...actual, [campo.id]: valor }));
    if (campo.tipo === 'seleccion') return <select value={String(valores[campo.id] ?? '')} onChange={(e) => cambiar(e.target.value)}><option value="">Seleccione</option>{campo.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}</select>;
    if (campo.tipo === 'medicion') return <div className="measurement"><input type="number" onChange={(e) => cambiar({ valor: Number(e.target.value), unidad: campo.configuracion?.unidad ?? '' })} /><span>{campo.configuracion?.unidad ?? 'unidad'}</span></div>;
    if (campo.tipo === 'firma') return <FirmaCanvas onChange={cambiar} />;
    if (campo.tipo === 'tabla') {
      const columnas = campo.configuracion?.columnas ?? [];
      const filas = Array.isArray(valores[campo.id]) ? valores[campo.id] as Array<Record<string, string>> : campo.configuracion?.filasIniciales ?? [];
      const actualizar = (indice: number, codigo: string, valor: string) => cambiar(filas.map((actual, i) => i === indice ? { ...actual, [codigo]: valor } : actual));
      return <div className="repeat-table"><table><thead><tr>{columnas.map((columna) => <th key={columna.codigo}>{columna.etiqueta}</th>)}</tr></thead><tbody>{filas.map((fila, indice) => <tr key={indice}>{columnas.map((columna) => <td key={columna.codigo}>{columna.tipo === 'firma' ? <FirmaCanvas onChange={(firma) => actualizar(indice, columna.codigo, firma)} /> : columna.tipo === 'seleccion' ? <select value={fila[columna.codigo] ?? ''} onChange={(e) => actualizar(indice, columna.codigo, e.target.value)}><option value="" />{columna.opciones?.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}</select> : <input value={fila[columna.codigo] ?? ''} readOnly={columna.codigo === 'responsable' || columna.codigo === 'taller'} onChange={(e) => actualizar(indice, columna.codigo, e.target.value)} />}</td>)}</tr>)}</tbody></table><button type="button" onClick={() => cambiar([...filas, {}])}>Agregar fila</button></div>;
    }
    if (campo.tipo === 'texto' && campo.configuracion?.multilinea) return <textarea value={String(valores[campo.id] ?? '')} onChange={(e) => cambiar(e.target.value)} />;
    return <input type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'} onChange={(e) => cambiar(campo.tipo === 'numero' ? Number(e.target.value) : e.target.value)} />;
  };
  if (!definicion) return <main className="content"><p className="state">{mensaje || 'Abriendo cartilla…'}</p></main>;
  return <main className="content form-page"><a className="back" href="/cartillas">← Catálogo</a><p className="eyebrow">{definicion.codigo} · Versión {definicion.numero}</p><h1>{definicion.nombre}</h1>{mensaje && <p className="notice">{mensaje}</p>}{definicion.secciones.length === 0 && <p className="state">Esta versión aún no tiene campos configurados.</p>}{definicion.secciones.map((seccion) => <section className="form-section" key={seccion.id}><h2>{seccion.titulo}</h2>{seccion.descripcion && <p>{seccion.descripcion}</p>}{seccion.campos.map((campo) => <label className="field" key={campo.id}><span>{campo.etiqueta}{campo.obligatorio && <b> *</b>}</span>{control(campo)}</label>)}</section>)}<div className="form-actions"><button type="button" onClick={guardar} disabled={!registroId}>Guardar borrador</button><button type="button" className="secondary" onClick={enviarRevision} disabled={!registroId}>Enviar a revisión</button></div></main>;
}
