import React from 'react';

type Cartilla = { plantillaId: number; versionId: number; nombre: string; registroId: number | null; estado: string; actualizadoEn: string | null };
type Datos = { mantenimiento: { id: number; descripcion: string | null; tren_codigo: string | null }; cartillas: Cartilla[] };
const etiqueta: Record<string, string> = { pendiente: 'Pendiente', en_proceso: 'En proceso', revision: 'En revisión', aprobado: 'Aprobado' };

export function MantenimientoCartillasPage({ mantenimientoId }: { mantenimientoId: number }) {
  const [datos, setDatos] = React.useState<Datos | null>(null); const [error, setError] = React.useState('');
  React.useEffect(() => { fetch(`/api/mantenimientos/${mantenimientoId}/cartillas`).then(async (r) => { if (r.status === 401) { window.location.href = '/login'; return; } r.ok ? setDatos(await r.json() as Datos) : setError(r.status === 404 ? 'Mantenimiento no encontrado.' : 'No fue posible cargar las cartillas.'); }).catch(() => setError('No fue posible cargar las cartillas.')); }, [mantenimientoId]);
  if (error) return <main className="content"><p className="state error">{error}</p></main>;
  if (!datos) return <main className="content"><p className="state">Cargando cartillas…</p></main>;
  return <main className="content"><a className="back" href="/cartillas">← Catálogo</a><p className="eyebrow">Mantenimiento #{datos.mantenimiento.id}{datos.mantenimiento.tren_codigo ? ` · Tren ${datos.mantenimiento.tren_codigo}` : ''}</p><h1>Cartillas del mantenimiento</h1><p className="subtitle">{datos.mantenimiento.descripcion || 'Sin descripción'}</p><div className="cards">{datos.cartillas.map((c) => <article className="card" key={c.versionId}><div><h3>{c.nombre}</h3><p className="version">{c.actualizadoEn ? `Actualizada ${new Date(c.actualizadoEn).toLocaleDateString()}` : 'Sin registro iniciado'}</p></div><div className="card-actions"><span className={`status ${c.estado}`}>{etiqueta[c.estado] || c.estado}</span><a className="open-button" href={`/cartillas/${c.plantillaId}/versiones/${c.versionId}?mantenimiento=${mantenimientoId}${c.registroId ? `&registro=${c.registroId}` : ''}`}>{c.registroId ? 'Continuar' : 'Abrir'}</a></div></article>)}</div></main>;
}
