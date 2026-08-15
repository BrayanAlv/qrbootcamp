// Las PEM vienen de .env. Soporta dos formatos:
//  1) base64 (recomendado: no hay caracteres problemáticos)
//  2) PEM en una línea con secuencias literales "\n"
function loadKey(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalize = (s) => s.replace(/\\n/g, '\n');

  if (!raw.includes('-----BEGIN')) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN')) return normalize(decoded);
    } catch {
      /* no es base64: se usa el valor como está */
    }
  }
  return normalize(raw);
}

export const jwtPrivateKey = loadKey(process.env.JWT_PRIVATE_KEY);
export const jwtPublicKey = loadKey(process.env.JWT_PUBLIC_KEY);

export function assertKeysDefined() {
  if (!jwtPrivateKey || !jwtPublicKey) {
    throw new Error('[security] JWT_PRIVATE_KEY / JWT_PUBLIC_KEY no configuradas');
  }
}

export default { jwtPrivateKey, jwtPublicKey, assertKeysDefined };