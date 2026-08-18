import puppeteer from 'puppeteer-core';
import AppError from '../utils/ApiError.js';
import env from '../config/env.js';
import { browserLaunchOptions, defaultPdfOptions, defaultViewport } from '../config/pdf.js';

// ---------------------------------------------------------------------------
// Instancia única del browser (lazy). Cada request usa su propia `Page` y la
// cierra en `finally`; el browser se reutiliza entre requests y solo se cierra
// en `closeBrowser()` (llamado durante el shutdown de la app) → sin procesos
// Chromium huérfanos ni fugas de páginas.
// ---------------------------------------------------------------------------
let browserPromise = null;

export async function getBrowser() {
  if (browserPromise && (await browserPromise).connected) return browserPromise;
  browserPromise = puppeteer
    .launch(browserLaunchOptions)
    .catch((err) => {
      browserPromise = null;
      throw new AppError({
        code: 'BROWSER_UNAVAILABLE',
        message: `No se pudo lanzar Chromium: ${err?.message ?? err}`,
        httpStatus: 503,
      });
    });
  return browserPromise;
}

// Cierra el browser si está abierto. Pensado para el shutdown de la aplicación.
export async function closeBrowser() {
  const browser = await browserPromise?.catch(() => null);
  browserPromise = null;
  if (!browser) return;
  try {
    await browser.close();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pdf] error al cerrar Chromium:', err?.message ?? err);
  }
}

// --- Restricción de subrecursos (anti-SSRF) + rastreo de imágenes -------------
// Bloquea todo subrecurso que no sea https o cuyo host no esté en la allowlist
// (evita SSRF a URLs internas) y, a nivel de red, registra las imágenes que
// realmente fallaron al cargar. `networkidle0` de `setContent` ya espera a que
// se asienten todas las peticiones (imágenes incluidas), así que no hace falta
// evaluar `naturalWidth` en la página — algo que además no funcionaría con el
// JavaScript deshabilitado.
//
// Se devuelve `getFailedImageUrls()`: URLs de imágenes que no cargaron (HTTP no
// 2xx o error de red). Las bloqueadas por nuestra propia política anti-SSRF NO
// cuentan como "fallidas": son intencionales y ya se loguean por separado.
async function hardenPageForPdf(page) {
  const blockedByPolicy = new Set();
  const failedImages = new Set();

  if (env.pdfAllowedResourceHosts.length > 0) {
    // Con intercepción activa hay que continuar/abortar cada request: solo se
    // activa cuando hay una allowlist que aplicar.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      const type = req.resourceType();
      // Sin navegación principal (usamos setContent): todo lo que llegue es un
      // subrecurso (img, css, font, xhr...). document/other se continúa igual.
      if (type === 'document' || type === 'other') return req.continue();
      // Un `data:` URI no hace ninguna petición de red (Chromium lo decodifica
      // inline), así que no es un vector SSRF: se deja pasar sin evaluarlo contra
      // la allowlist de hosts. Lo usa el QR embebido en el PDF de la invitación.
      if (url.startsWith('data:')) return req.continue();
      try {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const hostAllowed = env.pdfAllowedResourceHosts.includes(parsed.hostname.toLowerCase());
        // Permitido: continúa explícitamente (con intercepción activa, un request
        // sin continue()/abort() quedaría colgado).
        if (isHttps && hostAllowed) return req.continue();
        blockedByPolicy.add(url);
        // eslint-disable-next-line no-console
        console.warn(`[pdf] recurso bloqueado por política: ${url}`);
        return req.abort();
      } catch {
        blockedByPolicy.add(url);
        return req.abort();
      }
    });
  }

  const isImage = (req) => req?.resourceType?.() === 'image';
  page.on('requestfailed', (req) => {
    if (!isImage(req) || blockedByPolicy.has(req.url())) return;
    failedImages.add(req.url());
  });
  page.on('response', (res) => {
    const req = res.request?.();
    if (!isImage(req) || blockedByPolicy.has(req.url())) return;
    if (res.status() >= 400) failedImages.add(req.url());
  });

  return () => [...failedImages].sort();
}

// --- Generación del PDF -------------------------------------------------------
/**
 * Renderiza un HTML y devuelve el PDF como Buffer.
 * @param {string} html  Documento HTML completo a renderizar.
 * @param {object} [options]
 *  - pdf:   opciones de `page.pdf` (mezcladas sobre `defaultPdfOptions`).
 *  - viewport: opciones de `page.setViewport` (mezcladas sobre `defaultViewport`).
 * @returns {Promise<Buffer>}
 */
export async function generatePdfFromHtml(html, { pdf = {}, viewport = {} } = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(env.pdfGenerationTimeoutMs);
    page.setDefaultNavigationTimeout(env.pdfGenerationTimeoutMs);

    // JS deshabilitado por defecto: reduce el riesgo de código no confiable.
    await page.setJavaScriptEnabled(false);
    const getFailedImageUrls = await hardenPageForPdf(page);
    await page.setViewport({ ...defaultViewport, ...viewport });

    let htmlError = null;

    try {
      // networkidle0 espera a que se asienten todas las peticiones (imágenes
      // incluidas); el timeout evita un bloqueo indefinido.
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: env.pdfGenerationTimeoutMs });
    } catch (err) {
      htmlError = err;
    }

    // Las peticiones de imagen pueden resolver microsegundos después de que
    // `networkidle0` se anuncie; una pequeña pausa deja capturar las que fallan.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const missingImages = htmlError ? [] : getFailedImageUrls();

    if (missingImages.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[pdf] imágenes que no cargaron (${missingImages.length}):`, missingImages);
      if (env.pdfFailOnMissingImage) {
        throw new AppError({
          code: 'PDF_IMAGE_LOAD_FAILED',
          message: `No se pudieron cargar ${missingImages.length} imagen(es)`,
          httpStatus: 422,
        });
      }
    }

    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({ ...defaultPdfOptions, ...pdf });
    } catch (err) {
      throw new AppError({
        code: 'PDF_GENERATION_FAILED',
        message: `Error generando el PDF: ${err?.message ?? err}`,
        httpStatus: 500,
      });
    }

    if (!(pdfBuffer instanceof Buffer)) pdfBuffer = Buffer.from(pdfBuffer);
    return pdfBuffer;
  } finally {
    // La página se cierra SIEMPRE; el browser queda para reuse.
    if (page) {
      try {
        await page.close();
      } catch {
        // ya cerrada
      }
    }
  }
}

export default { getBrowser, closeBrowser, generatePdfFromHtml };