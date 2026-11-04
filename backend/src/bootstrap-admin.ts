import dotenv from 'dotenv';
import path from 'node:path';
import { pool } from './db.js';
import { hashContrasena } from './auth.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
const usuario = process.env.BOOTSTRAP_ADMIN_USUARIO;
const correo = process.env.BOOTSTRAP_ADMIN_CORREO;
const contrasena = process.env.BOOTSTRAP_ADMIN_CONTRASENA;
if (!usuario || !correo || !contrasena) throw new Error('Faltan variables BOOTSTRAP_ADMIN_USUARIO, BOOTSTRAP_ADMIN_CORREO o BOOTSTRAP_ADMIN_CONTRASENA');
if (contrasena.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres');
const usuarioSeguro = usuario;
const correoSeguro = correo;
const contrasenaSegura = contrasena;
async function bootstrap() {
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const existe = await client.query(`SELECT 1 FROM auth.usuarios u JOIN auth.usuario_roles ur ON ur.usuario_id=u.id JOIN auth.roles r ON r.id=ur.rol_id WHERE r.nombre='administrador' AND u.activo LIMIT 1`);
  if (existe.rows[0]) throw new Error('Ya existe un administrador activo');
  const rol = await client.query(`SELECT id FROM auth.roles WHERE nombre='administrador' AND activo`);
  if (!rol.rows[0]) throw new Error('Rol administrador no disponible');
  const creado = await client.query('INSERT INTO auth.usuarios(nombre_usuario,correo,contrasena_hash) VALUES($1,$2,$3) RETURNING id', [usuarioSeguro, correoSeguro, hashContrasena(contrasenaSegura)]);
  await client.query('INSERT INTO auth.usuario_roles(usuario_id,rol_id) VALUES($1,$2)', [creado.rows[0].id, rol.rows[0].id]);
  await client.query('COMMIT');
  console.log('Administrador inicial creado.');
} catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); await pool.end(); }
}
bootstrap().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
