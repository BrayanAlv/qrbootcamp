// Assets e identidad visual del evento (mismos del correo de invitación).
export const BRAND_ASSETS = {
  background: 'https://s3lata.maderasstudio.com/email/fondo-correo.png',
  // URL del logo BOOTCAMP 2026 en PNG con transparencia. Mientras esté vacío,
  // la pantalla de escaneo deja el espacio reservado sin renderizar la imagen.
  // (logo-bootcamp-2026.png del correo no sirve: es RGB sin canal alfa y su
  // wordmark es blanco sobre blanco, así que se ve como un rectángulo blanco.)
  bootcampLogo: 'https://s3lata.maderasstudio.com/email/logobootcampfinal.png',
  maderasStudioLogo: 'https://s3lata.maderasstudio.com/email/maderas-studio-logo-blanco.png',
  // Icono del botón "Clic para Escanear QR" de la pantalla móvil.
  qrIcon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Codigo_QR.svg/500px-Codigo_QR.svg.png',
};

export const BRAND_COLORS = {
  bg: '#0b0620',
  bgFallback: '#1b0859',
  textSoft: '#e7e4f5',
  textDark: '#1b1430',
  statusOk: '#00c221', // sello verde de "usuario identificado"
  statusError: '#f20000', // sello rojo de "usuario duplicado"
  logoNavy: '#2a3d76', // wordmark de Maderas Studio en las referencias
  paper: '#fdfcfa', // blanco cálido del popout: papel, no hoja de impresora
  hairline: 'rgba(27, 20, 48, 0.12)', // filetes finos sobre el papel
};

// Serif de alto contraste para los titulares del popout; Montserrat se queda
// para nombres y microetiquetas. Ambas cargan en index.html.
export const DISPLAY_FONT = '"Cormorant Garamond", Georgia, serif';

// El PNG del logo es blanco; sobre la tarjeta blanca del popout hay que teñirlo
// a azul marino (aprox. BRAND_COLORS.logoNavy).
export const MADERAS_LOGO_DARK_FILTER =
  'brightness(0) saturate(100%) invert(18%) sepia(38%) saturate(1800%) hue-rotate(207deg)';
