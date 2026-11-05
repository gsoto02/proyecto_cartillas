import React from 'react';

export function LogoutButton() {
  const [cerrando, setCerrando] = React.useState(false);

  const cerrarSesion = async () => {
    if (cerrando) return;
    setCerrando(true);
    try {
      const respuesta = await fetch('/api/auth/logout', { method: 'POST' });
      if (!respuesta.ok) throw new Error('No se pudo cerrar la sesión.');
      window.location.assign('/login');
    } catch {
      setCerrando(false);
      window.alert('No se pudo cerrar la sesión. Inténtalo nuevamente.');
    }
  };

  return <button type="button" className="logout-button" onClick={cerrarSesion} disabled={cerrando}>{cerrando ? 'Cerrando…' : 'Cerrar sesión'}</button>;
}
