import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { FormularioPage } from './FormularioPage';
import { MantenimientoCartillasPage } from './MantenimientoCartillasPage';
import { LoginPage } from './LoginPage';
import linea1Logo from '../../linea1logo.png';

type Plantilla = {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  categoria: string;
  version_id: number;
  version: number;
  estado: string;
};

const estadoEtiqueta: Record<string, string> = {
  borrador: 'Borrador',
  vigente: 'Vigente',
  archivada: 'Archivada'
};

function CartillasPage() {
  const [plantillas, setPlantillas] = React.useState<Plantilla[]>([]);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const [categoria, setCategoria] = React.useState('todas');
  const aviso = '';

  React.useEffect(() => {
    fetch('/api/cartillas/plantillas')
      .then((respuesta) => {
        if (respuesta.status === 401) {
          window.location.href = '/login';
          return new Promise<never>(() => undefined);
        }
        if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo');
        return respuesta.json() as Promise<Plantilla[]>;
      })
      .then(setPlantillas)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  const categorias = [...new Set(plantillas.map((plantilla) => plantilla.categoria))];
  const texto = busqueda.trim().toLocaleLowerCase();
  const visibles = plantillas.filter((plantilla) =>
    (categoria === 'todas' || plantilla.categoria === categoria) &&
    (!texto || plantilla.nombre.toLocaleLowerCase().includes(texto) || plantilla.codigo.toLocaleLowerCase().includes(texto))
  );
  const porCategoria = categorias
    .map((nombre) => ({ nombre, plantillas: visibles.filter((plantilla) => plantilla.categoria === nombre) }))
    .filter((grupo) => grupo.plantillas.length > 0);
  const plantillasDisponibles = new Set(plantillas.map((plantilla) => plantilla.id)).size;
  const versionesActivas = plantillas.length;
  const categoriasDisponibles = categorias.length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="linea1-logo" src={linea1Logo} alt="Línea 1" /><span><b>Metro Lima</b><small>Gestión de cartillas</small></span></div>
        <nav aria-label="Navegación principal">
          <p className="nav-label">Mantenimiento</p>
          <a href="/cartillas" className="nav-link active"><span>▣</span> Cartillas</a>
        </nav>
        <div className="sidebar-footer"><span className="avatar">AD</span><span><b>Administrador</b><small>Sesión activa</small></span></div>
      </aside>
      <main className="content">
        <div className="breadcrumbs">UNNA <span>›</span> Mantenimiento <span>›</span> <b>Catálogo de cartillas</b></div>
        <header className="page-header">
          <div className="title-group"><span className="title-icon">▤</span><div><p className="eyebrow">Mantenimiento</p><h1>Catálogo de cartillas</h1><p className="subtitle">Gestiona y selecciona las plantillas de cartillas de mantenimiento.</p></div></div>
          <a className="new-button" href="#catalogo">Explorar cartillas <span>↓</span></a>
        </header>
        <section className="operation-overview" aria-label="Resumen operativo">
          <div className="operation-copy"><span className="live-dot" aria-hidden="true" /> <b>Centro de control operativo</b><p>Consulta formatos técnicos vigentes y registra cada intervención con trazabilidad.</p></div>
          <div className="operation-stats"><div><strong>{plantillasDisponibles}</strong><span>cartillas disponibles</span></div><div><strong>{versionesActivas}</strong><span>versiones activas</span></div><div><strong>{categoriasDisponibles}</strong><span>especialidades técnicas</span></div></div>
        </section>
        <section className="filters" id="catalogo" aria-label="Filtros de cartillas">
          <label className="search"><span className="search-icon">⌕</span><span className="sr-only">Buscar cartilla</span><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre, código o palabra clave…" /></label>
          <label className="category-filter"><span className="sr-only">Categoría</span><select value={categoria} onChange={(event) => setCategoria(event.target.value)}><option value="todas">Todas las categorías</option>{categorias.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}</select></label>
        </section>
        {categorias.length > 1 && <div className="category-tabs"><button className={categoria === 'todas' ? 'active' : ''} onClick={() => setCategoria('todas')}>▱ Todas <span>{plantillas.length}</span></button>{categorias.map((nombre) => <button key={nombre} className={categoria === nombre ? 'active' : ''} onClick={() => setCategoria(nombre)}>◇ {nombre} <span>{plantillas.filter((plantilla) => plantilla.categoria === nombre).length}</span></button>)}</div>}
        {aviso && <p className="notice" role="status">{aviso}</p>}
        {cargando && <p className="state">Cargando catálogo…</p>}
        {error && <p className="state error">No fue posible cargar el catálogo. Verifique que la API esté disponible.</p>}
        {!cargando && !error && porCategoria.length === 0 && <p className="state">No se encontraron cartillas.</p>}
        {!cargando && !error && porCategoria.map((grupo) => (
          <section className="category" key={grupo.nombre} aria-labelledby={`categoria-${grupo.nombre}`}>
            <h2 id={`categoria-${grupo.nombre}`}>{grupo.nombre}<span>{grupo.plantillas.length}</span></h2>
            <div className="cards">
              {grupo.plantillas.map((plantilla) => <article className="card" key={plantilla.version_id}>
                <div><div className="card-code"><span>▣</span><p className="code">{plantilla.codigo}</p></div><h3>{plantilla.nombre}</h3><p className="version">Versión {plantilla.version}</p></div>
                <div className="card-actions"><span className={`status ${plantilla.estado}`}>{estadoEtiqueta[plantilla.estado] ?? plantilla.estado}</span><a className="open-button" href={`/cartillas/${plantilla.id}/versiones/${plantilla.version_id}`}>Abrir <span>→</span></a></div>
              </article>)}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

const rutaFormulario = window.location.pathname.match(/^\/cartillas\/(\d+)\/versiones\/(\d+)$/);
const rutaMantenimiento = window.location.pathname.match(/^\/mantenimientos\/(\d+)\/cartillas$/);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{window.location.pathname === '/login' ? <LoginPage /> : rutaFormulario ? <FormularioPage plantillaId={Number(rutaFormulario[1])} versionId={Number(rutaFormulario[2])} /> : rutaMantenimiento ? <MantenimientoCartillasPage mantenimientoId={Number(rutaMantenimiento[1])} /> : <CartillasPage />}</React.StrictMode>);
