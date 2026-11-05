import React from 'react';
import linea1Logo from '../../linea1logo.png';

type FirmaCanvasProps = { value?: string; onChange: (firma: string) => void };
function FirmaCanvas({ value, onChange }: FirmaCanvasProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const dibujando = React.useRef(false);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const imagen = new Image();
    imagen.onload = () => {
      const escala = Math.min(canvas.width / imagen.width, canvas.height / imagen.height);
      const ancho = imagen.width * escala;
      const alto = imagen.height * escala;
      ctx.drawImage(imagen, (canvas.width - ancho) / 2, (canvas.height - alto) / 2, ancho, alto);
    };
    imagen.src = value;
  }, [value]);
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
type DocumentoConfiguracion = { cabecera?: { formato?: string; codigo?: string; revision?: string; fecha_vigencia?: string; area?: string; pagina?: string; clasificacion?: string }; titulo_oficial?: string; actividad?: string };
type Definicion = { nombre: string; codigo: string; numero: number; secciones: Seccion[]; documento_configuracion?: DocumentoConfiguracion };

export function FormularioPage({ plantillaId, versionId }: { plantillaId: number; versionId: number }) {
  const [definicion, setDefinicion] = React.useState<Definicion | null>(null);
  const [registroId, setRegistroId] = React.useState<number | null>(null);
  const [valores, setValores] = React.useState<Record<number, unknown>>({});
  const [mensaje, setMensaje] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);
  const [cambiosSinGuardar, setCambiosSinGuardar] = React.useState(false);
  const [recuperado, setRecuperado] = React.useState(false);
  const registroExistente = Number(new URLSearchParams(window.location.search).get('registro'));
  const mantenimientoId = Number(new URLSearchParams(window.location.search).get('mantenimiento'));
  React.useEffect(() => {
    const exigirSesion = <T,>(r: Response) => { if (r.status === 401) { window.location.href = '/login'; return Promise.reject(); } return r.ok ? r.json() as Promise<T> : Promise.reject(); };
    const plantilla = fetch(`/api/cartillas/plantillas/${plantillaId}/versiones/${versionId}`).then(exigirSesion<Definicion>);
    const registro = Number.isSafeInteger(registroExistente) && registroExistente > 0
      ? fetch(`/api/cartillas/registros/${registroExistente}`).then(exigirSesion<{ id: number; respuestas: Record<string, unknown> }>)
      : fetch('/api/cartillas/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plantillaId, versionId, mantenimientoId: Number.isSafeInteger(mantenimientoId) && mantenimientoId > 0 ? mantenimientoId : undefined }) }).then(exigirSesion<{ id: number; respuestas?: Record<string, unknown> }>);
    Promise.all([plantilla, registro]).then(([definicionCargada, registroCargado]) => { const respuestas = registroCargado.respuestas ?? {}; setDefinicion(definicionCargada); setRegistroId(registroCargado.id); setValores(Object.fromEntries(Object.entries(respuestas).map(([id, valor]) => [Number(id), valor]))); setRecuperado(Object.keys(respuestas).length > 0); }).catch(() => setMensaje('No fue posible abrir la cartilla.'));
  }, [plantillaId, versionId, registroExistente, mantenimientoId]);
  const guardar = async () => {
    if (!registroId) return false;
    setGuardando(true);
    const respuestas = Object.entries(valores).map(([campoId, valor]) => ({ campoId: Number(campoId), valor }));
    const resultado = await fetch(`/api/cartillas/registros/${registroId}/respuestas`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ respuestas }) });
    setMensaje(resultado.ok ? 'Borrador guardado correctamente.' : 'No se pudo guardar el borrador.');
    setCambiosSinGuardar(!resultado.ok);
    if (resultado.ok) setRecuperado(false);
    setGuardando(false);
    return resultado.ok;
  };
  const enviarRevision = async () => {
    if (!registroId) return;
    if (!await guardar()) return;
    const resultado = await fetch(`/api/cartillas/registros/${registroId}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'revision' }) });
    setMensaje(resultado.ok ? 'Cartilla enviada a revisión.' : 'No se pudo enviar a revisión.');
  };
  const control = (campo: Campo) => {
    const cambiar = (valor: unknown) => { setValores((actual) => ({ ...actual, [campo.id]: valor })); setCambiosSinGuardar(true); };
    if (campo.tipo === 'seleccion') return <select value={String(valores[campo.id] ?? '')} onChange={(e) => cambiar(e.target.value)}><option value="">Seleccione</option>{campo.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}</select>;
    if (campo.tipo === 'medicion') return <div className="measurement"><input type="number" onChange={(e) => cambiar({ valor: Number(e.target.value), unidad: campo.configuracion?.unidad ?? '' })} /><span>{campo.configuracion?.unidad ?? 'unidad'}</span></div>;
    if (campo.tipo === 'firma') { const firma = valores[campo.id]; return <FirmaCanvas value={typeof firma === 'string' ? firma : ''} onChange={cambiar} />; }
    if (campo.tipo === 'tabla') {
      const columnas = campo.configuracion?.columnas ?? [];
      const filas = Array.isArray(valores[campo.id]) ? valores[campo.id] as Array<Record<string, string>> : campo.configuracion?.filasIniciales ?? [];
      const tieneReferencia = filas.some((fila) => Boolean(fila.referencia || fila.criterio || fila.condicion));
      const columnasVisibles = tieneReferencia && !columnas.some((columna) => columna.codigo === 'referencia') ? [...columnas, { codigo: 'referencia', etiqueta: 'CRITERIO / REFERENCIA' }] : columnas;
      const actualizar = (indice: number, codigo: string, valor: string) => cambiar(filas.map((actual, i) => i === indice ? { ...actual, [codigo]: valor } : actual));
      const permiteAgregar = definicion?.codigo !== 'PRUEBAS_DINAMICAS';
      return <div className="repeat-table"><table><thead><tr>{columnasVisibles.map((columna) => <th key={columna.codigo}>{columna.etiqueta}</th>)}</tr></thead><tbody>{filas.map((fila, indice) => <tr key={indice}>{columnasVisibles.map((columna) => <td key={columna.codigo}>{columna.codigo === 'referencia' ? <span className="technical-reference">{fila.referencia ?? fila.criterio ?? fila.condicion ?? '—'}</span> : columna.tipo === 'firma' ? <FirmaCanvas value={typeof fila[columna.codigo] === 'string' ? fila[columna.codigo] : ''} onChange={(firma) => actualizar(indice, columna.codigo, firma)} /> : columna.tipo === 'seleccion' ? <select value={fila[columna.codigo] ?? ''} onChange={(e) => actualizar(indice, columna.codigo, e.target.value)}><option value="" />{columna.opciones?.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}</select> : <input type={columna.tipo === 'numero' ? 'number' : 'text'} step={columna.tipo === 'numero' ? 'any' : undefined} value={fila[columna.codigo] ?? ''} readOnly={columna.codigo === 'responsable' || columna.codigo === 'taller'} onChange={(e) => actualizar(indice, columna.codigo, e.target.value)} />}</td>)}</tr>)}</tbody></table>{permiteAgregar && <button type="button" onClick={() => cambiar([...filas, {}])}>Agregar fila</button>}</div>;
    }
    if (campo.tipo === 'texto' && campo.configuracion?.multilinea) return <textarea value={String(valores[campo.id] ?? '')} onChange={(e) => cambiar(e.target.value)} />;
    return <input type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'} onChange={(e) => cambiar(campo.tipo === 'numero' ? Number(e.target.value) : e.target.value)} />;
  };
  const datosCampo = (campo: Campo) => valores[campo.id] ?? '';
  if (!definicion) return <main className="content"><p className="state">{mensaje || 'Abriendo cartilla…'}</p></main>;
  const completados = Object.values(valores).filter((valor) => Array.isArray(valor) ? valor.some((fila) => Object.values(fila).some(Boolean)) : Boolean(valor)).length;
  const avance = Math.min(100, Math.round((completados / Math.max(1, definicion.secciones.flatMap((seccion) => seccion.campos).length)) * 100));
  const cabecera = definicion.documento_configuracion?.cabecera;
  return <div className="app-shell dynamic-shell"><aside className="sidebar"><div className="brand"><img className="linea1-logo" src={linea1Logo} alt="Línea 1" /><span><b>Metro Lima</b><small>Gestión de cartillas</small></span></div><nav><p className="nav-label">Mantenimiento</p><a href="/cartillas" className="nav-link active"><span>▣</span> Cartillas</a></nav><div className="sidebar-footer"><span className="avatar">AD</span><span><b>Administrador</b><small>Sesión activa</small></span></div></aside><main className="dynamic-page"><header className="dynamic-header"><div><a className="back" href="/cartillas">← Catálogo</a><p className="eyebrow">{definicion.codigo} · Versión {definicion.numero}</p><h1>{definicion.nombre.toUpperCase()}</h1><p className="subtitle">Formulario técnico para registrar, revisar y conservar los resultados de mantenimiento.</p></div><p className="official-format-status">Formato oficial en validación</p></header>{cabecera && <section className="document-header"><b>{cabecera.formato}</b><span>{definicion.documento_configuracion?.titulo_oficial}</span><small>Código: {cabecera.codigo} · {cabecera.revision} · Vigencia: {cabecera.fecha_vigencia} · Área: {cabecera.area} · Página: {cabecera.pagina} · {cabecera.clasificacion}</small></section>}<div className="stepper">{['Datos de la cartilla', 'Registro técnico', 'Observaciones', 'Revisión y firma'].map((paso, indice) => <div className={avance >= indice * 25 ? 'step active' : 'step'} key={paso}><span>{indice + 1}</span>{paso}</div>)}</div>{mensaje && <p className="notice" role="status">{mensaje}</p>}<div className="dynamic-layout"><div>{definicion.secciones.map((seccion) => <section className="form-section dynamic-section" key={seccion.id}><h2>{seccion.titulo}</h2>{seccion.descripcion && <p>{seccion.descripcion}</p>}{seccion.campos.map((campo) => <label className="field" key={campo.id}><span>{campo.etiqueta}{campo.obligatorio && <b> *</b>}</span>{control(campo)}</label>)}</section>)}</div><aside className="cartilla-info"><section><h3>Información de la cartilla</h3><dl><dt>Código</dt><dd>{cabecera?.codigo ?? definicion.codigo}</dd><dt>Versión</dt><dd>{cabecera?.revision ?? `V${definicion.numero}`}</dd><dt>Estado</dt><dd><span className="status borrador">Borrador</span></dd></dl></section><section><h3>Avance de la cartilla</h3><div className="progress"><i style={{ width: `${avance}%` }} /></div><b>{avance}% completado</b><ol>{['Datos de la cartilla', 'Registro técnico', 'Observaciones', 'Revisión y firma'].map((paso, indice) => <li className={avance > indice * 25 ? 'done' : ''} key={paso}>{paso}</li>)}</ol></section></aside></div><footer className="sticky-actions"><span className={guardando || cambiosSinGuardar ? 'save-state pending' : 'save-state'}>{guardando ? 'Guardando borrador…' : cambiosSinGuardar ? 'Cambios sin guardar' : recuperado ? 'Borrador recuperado' : 'Borrador guardado'}</span><button type="button" className="secondary" onClick={guardar} disabled={guardando || !cambiosSinGuardar}>Guardar borrador</button><button type="button" onClick={enviarRevision} disabled={guardando}>Guardar y continuar →</button></footer></main></div>;
}
