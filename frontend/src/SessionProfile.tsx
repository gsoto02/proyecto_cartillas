import React from 'react';
import { LogoutButton } from './LogoutButton';

type Sesion = { id: number; nombreUsuario: string; roles: string[] };

export function SessionProfile() {
  const [sesion, setSesion] = React.useState<Sesion | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((respuesta) => respuesta.ok ? respuesta.json() as Promise<Sesion> : Promise.reject())
      .then(setSesion)
      .catch(() => window.location.assign('/login'));
  }, []);

  const nombre = sesion?.nombreUsuario || 'Sesión activa';
  const rol = sesion?.roles[0] || 'Usuario';
  return <div className="sidebar-footer"><span className="avatar">{nombre.slice(0, 2).toUpperCase()}</span><span><b>{nombre}</b><small>{rol}</small></span><LogoutButton /></div>;
}
