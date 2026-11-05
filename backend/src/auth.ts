import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';

export type UsuarioAutenticado = { id: number; nombreUsuario: string; roles: string[] };
declare global { namespace Express { interface Request { usuario?: UsuarioAutenticado } } }

const cookie = (request: Request, name: string) => request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
export const tokenSesion = (request: Request) => cookie(request, 'unna_session');
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function autenticar(request: Request, response: Response, next: NextFunction) {
  const token = cookie(request, 'unna_session');
  if (!token) return response.status(401).json({ error: 'Autenticación requerida' });
  try {
    const { rows } = await pool.query(`SELECT u.id, u.nombre_usuario, array_agg(r.nombre) FILTER (WHERE r.nombre IS NOT NULL) AS roles
      FROM auth.sesiones s JOIN auth.usuarios u ON u.id=s.usuario_id LEFT JOIN auth.usuario_roles ur ON ur.usuario_id=u.id LEFT JOIN auth.roles r ON r.id=ur.rol_id
      WHERE s.token_hash=$1 AND s.revocada_en IS NULL AND s.expira_en>CURRENT_TIMESTAMP AND u.activo GROUP BY u.id`, [hash(token)]);
    if (!rows[0]) return response.status(401).json({ error: 'Sesión inválida o expirada' });
    request.usuario = { id: Number(rows[0].id), nombreUsuario: rows[0].nombre_usuario, roles: rows[0].roles ?? [] }; next();
  } catch { response.status(503).json({ error: 'database unavailable' }); }
}

export const permitir = (...roles: string[]) => (request: Request, response: Response, next: NextFunction) =>
  request.usuario?.roles.some((rol) => roles.includes(rol)) ? next() : response.status(403).json({ error: 'Permiso insuficiente' });

export const esSolicitudSegura = (request: Request, response: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin && host) {
    const origen = new URL(origin);
    const esMismoOrigen = origen.host === host;
    const esOrigenLocalDeDesarrollo = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(origen.hostname);
    if (!esMismoOrigen && !esOrigenLocalDeDesarrollo) return response.status(403).json({ error: 'Origen no permitido' });
  }
  next();
};

export const crearToken = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = hash;
export const hashContrasena = (contrasena: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(contrasena, salt, 64).toString('hex')}`;
};
export const verificarContrasena = (contrasena: string, guardada: string) => {
  const [salt, clave] = guardada.split(':');
  if (!salt || !clave) return false;
  const derivada = crypto.scryptSync(contrasena, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derivada, 'hex'), Buffer.from(clave, 'hex'));
};
