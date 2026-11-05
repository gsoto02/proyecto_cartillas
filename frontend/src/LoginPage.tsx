import React from 'react';

const cuentaDemo = import.meta.env.DEV ? { usuario: 'admin.pruebas', contrasena: 'CartillasPrueba2026' } : null;

export function LoginPage() {
  const [usuario, setUsuario] = React.useState('');
  const [contrasena, setContrasena] = React.useState('');
  const [error, setError] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const completarPrueba = () => { if (cuentaDemo) { setUsuario(cuentaDemo.usuario); setContrasena(cuentaDemo.contrasena); setError(''); } };
  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault(); setError(''); setEnviando(true);
    try {
      const respuesta = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: usuario.trim(), contrasena }) });
      if (!respuesta.ok) { setError(respuesta.status === 401 ? 'Usuario o contraseña incorrectos.' : 'No se pudo conectar con el servidor.'); return; }
      window.location.href = '/cartillas';
    } catch { setError('No se pudo conectar con el servidor.'); } finally { setEnviando(false); }
  };
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title"><div className="login-brand"><span className="login-mark">U</span><span>UNNA</span></div><div className="login-heading"><p className="eyebrow">Plataforma de mantenimiento</p><h1 id="login-title">Bienvenido</h1><p>Ingresa para consultar y completar las cartillas de mantenimiento.</p></div><form onSubmit={enviar} className="login-form"><label className="field"><span>Usuario o correo</span><input autoComplete="username" value={usuario} onChange={e => setUsuario(e.target.value)} required autoFocus /></label><label className="field"><span>Contraseña</span><input type="password" autoComplete="current-password" value={contrasena} onChange={e => setContrasena(e.target.value)} required /></label>{error && <p className="state error" role="alert">{error}</p>}<button className="login-submit" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar a Cartillas'}</button></form>{cuentaDemo && <div className="demo-access"><div><strong>Acceso de prueba</strong><span>Completa las credenciales de administrador para desarrollo local.</span></div><button type="button" className="demo-button" onClick={completarPrueba}>Autocompletar</button></div>}</section></main>;
}
