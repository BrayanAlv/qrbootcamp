// Identidad visual "Real Estate Luxury" — Ciudad Maderas Bootcamp 2026.
//
// Regla de composición del brief: una sección es OSCURA (hero con gradiente),
// NEUTRA (contenido, formularios, tablas) o SATURADA (franja de cierre).
// Nunca las tres a la vez. Estos tokens son la única fuente de esos tres modos.
//
// La pantalla de escaneo (ScanQR) no usa este archivo: conserva su propia
// paleta en `brand.js`, heredada del correo de invitación.

export const COLORS = {
  // Oscuros del hero: recorrido verde azulado → azul → violeta → púrpura.
  inkTeal: '#0B3B3C',
  inkNavy: '#1A1F4D',
  inkViolet: '#2B1E5C',
  inkPurple: '#3A1A66',

  // Franja saturada de cierre.
  saturated: '#5B21B6',
  saturatedHi: '#7C3AED',

  // Duotono de campaña. Solo en cifras clave y detalles de marca.
  duoRed: '#E63946',
  duoBlue: '#3A86FF',

  // Neutro del bloque funcional (accesos, formularios, datos).
  neutral: '#8C8C96',
  surface: '#F1F1F4',
  paper: '#FFFFFF',
  white: '#FFFFFF',

  // Texto sobre neutro: el azul profundo del hero, no un gris genérico.
  text: '#191C33',
  textSoft: '#61616E',

  // Texto sobre oscuro.
  onDark: '#FFFFFF',
  onDarkSoft: 'rgba(255,255,255,0.66)',
  onDarkFaint: 'rgba(255,255,255,0.38)',
};

export const GRADIENTS = {
  // Diagonal del hero. El ángulo se mantiene igual en todas las pantallas para
  // que el degradado se lea como una sola pieza de marca.
  hero: `linear-gradient(118deg, ${COLORS.inkTeal} 0%, ${COLORS.inkNavy} 40%, ${COLORS.inkViolet} 74%, ${COLORS.inkPurple} 100%)`,
  // Franja de cierre con partners.
  strip: `linear-gradient(90deg, ${COLORS.saturated} 0%, ${COLORS.saturatedHi} 100%)`,
  // Filete duotono que marca el borde entre bloques. Hay dos versiones porque
  // el degradado tiene que recorrer el lado largo: en un filete de 2px el eje
  // corto solo muestra el primer color.
  duotone: `linear-gradient(90deg, ${COLORS.duoRed} 0%, ${COLORS.duoBlue} 100%)`,
  duotoneVertical: `linear-gradient(180deg, ${COLORS.duoRed} 0%, ${COLORS.duoBlue} 100%)`,
};

export const FONTS = {
  // Marca y herencia.
  serif: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  // Claim de campaña: condensada, ultra bold, siempre en mayúsculas.
  condensed: '"Big Shoulders Display", "Oswald", "Archivo Narrow", "Arial Narrow", sans-serif',
  // Cuerpo e interfaz.
  body: '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
};

export const LINES = {
  hairline: 'rgba(140, 140, 150, 0.28)',
  hairlineStrong: 'rgba(140, 140, 150, 0.45)',
  onDark: 'rgba(255, 255, 255, 0.16)',
};

// Microetiqueta en versalitas: el recurso estructural que ordena la interfaz.
// Marca de qué trata un bloque sin recurrir a numeración decorativa.
export const eyebrow = (color = COLORS.neutral) => ({
  fontFamily: FONTS.body,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  lineHeight: 1.4,
  color,
});

// Titular condensado. `size` acepta cualquier valor CSS (usar clamp()).
export const claim = (size) => ({
  fontFamily: FONTS.condensed,
  fontWeight: 800,
  fontSize: size,
  lineHeight: 0.86,
  letterSpacing: '0.005em',
  textTransform: 'uppercase',
});

// Nombre propio: mayúsculas espaciadas, igual que en el sello de la pantalla
// de escaneo. Mantiene una sola forma de escribir a las personas en el sistema.
export const properName = {
  fontFamily: FONTS.body,
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  lineHeight: 1.5,
};

// Cifras: serie tabular para que las columnas de datos no bailen.
export const figure = {
  fontFamily: FONTS.condensed,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
};

// El asset de S3 hoy es 3072x481 y ya viene recortado a la pasarela: dos filas
// de logos en blanco sobre transparente. (El correo lo encuadra con
// background-size/position porque en su momento servía el artboard completo de
// 3840x2160; esa aritmética ya no aplica y aquí se usa la imagen tal cual.)
export const PARTNER_STRIP = {
  src: 'https://s3lata.maderasstudio.com/email/pasarela-de-logos-1.png',
  maxWidth: 560,
};
