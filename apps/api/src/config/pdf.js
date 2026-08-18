import env from './env.js';

// Configuración centralizada de generación de PDFs. Separada del servicio para
// que cada tipo de documento pueda pasarla, pero con estos valores por defecto
// pensados para A4 en retrato con fondo e imágenes a color.
export const defaultPdfOptions = Object.freeze({
  format: 'A4',
  printBackground: true,
  landscape: false,
  margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
  // Genera el PDF en memoria (sin `path`): devuelve un Buffer.
});

// Configuración del browser (Chromium del sistema). El sandbox de Chromium
// necesita la capability SYS_ADMIN en el contenedor; `--no-sandbox` es solo un
// último recurso para entornos que no la tienen y sí toleran el riesgo.
export const browserLaunchOptions = Object.freeze({
  executablePath: env.puppeteerExecutablePath,
  headless: true,
  args: [
    '--no-zygote',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--force-color-profile=srgb',
    ...(env.pdfChromiumNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  ],
});

const VIEWPORT_HEIGHT = 297; // mm de A4; se ignora: la altura real la define el contenido al hacer print.

// Viewport razonable para renderizar el HTML antes de volcarlo a PDF. Ancho en
// CSS px y deviceScaleFactor alto para que las imágenes no salgan pixeladas.
export const defaultViewport = Object.freeze({
  width: env.pdfViewportWidth,
  height: Math.round((env.pdfViewportWidth / 210) * VIEWPORT_HEIGHT), // proporción A4
  deviceScaleFactor: env.pdfViewportDeviceScaleFactor,
  isMobile: false,
});

export default { defaultPdfOptions, browserLaunchOptions, defaultViewport };