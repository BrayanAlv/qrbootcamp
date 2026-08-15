/**
 * Previsualización del correo de invitación sin gastar envíos.
 *
 *   npm run preview:email            -> escribe el HTML y lo indica por consola
 *   npm run preview:email -- Ana     -> con otro nombre de invitado
 *
 * El QR no se verá: en el correo viaja como adjunto inline (`cid:`) y el navegador
 * no puede resolver ese esquema. El resto del diseño sí se revisa tal cual.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderInvitationEmail } from '../services/emailTemplate.service.js';
import { buildText } from '../services/email.service.js';

const firstName = process.argv[2] || 'Ana';
const context = { firstName, qrCid: 'qr-invitacion' };

const dir = await mkdtemp(path.join(tmpdir(), 'preview-email-'));
const file = path.join(dir, 'invitacion.html');
await writeFile(file, renderInvitationEmail(context), 'utf8');

// eslint-disable-next-line no-console
console.log([`HTML: ${file}`, '', '--- versión en texto plano ---', buildText(context)].join('\n'));
