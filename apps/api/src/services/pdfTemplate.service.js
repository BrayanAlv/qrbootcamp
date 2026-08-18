import Handlebars from 'handlebars';

// Plantilla de ejemplo para demostrar el flujo documento HTML → PDF → email.
// Contiene título, texto, logo remoto (debe estar en la allowlist de hosts del
// .env: PDF_ALLOWED_RESOURCE_HOSTS), tabla, estilos CSS y fecha. Mostrando el
// contrato `generateDocumentHtml(data)` que permite crear más documentos sin
// duplicar la lógica de PDFs.
const SAMPLE_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2933; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .header { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; border-bottom: 4px solid #0b0620; padding-bottom: 16px; }
    .header img { height: 56px; margin: 0 auto; }
    h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; color: #0b0620; }
    h2 { font-size: 16px; margin: 24px 0 8px; color: #5334cc; }
    .lead { font-size: 14px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e4e7eb; }
    th { background-color: #f4f1ff; color: #0b0620; }
    .total { font-weight: 700; }
    .date { margin-top: 24px; font-size: 12px; color: #7b8794; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <img src="{{logo}}" alt="Logo" />
      <div>
        <h1>{{title}}</h1>
        <div class="lead">{{subtitle}}</div>
      </div>
    </div>

    <p class="lead">{{intro}}</p>

    <h2>{{tableTitle}}</h2>
    <table>
      <thead>
        <tr><th>Concepto</th><th>Detalle</th><th>Importe</th></tr>
      </thead>
      <tbody>
        {{#each rows}}
          <tr><td>{{this.concept}}</td><td>{{this.detail}}</td><td class="total">{{this.amount}}</td></tr>
        {{/each}}
      </tbody>
    </table>

    <div class="date">Emitido el {{date}} · QR Bootcamp</div>
  </div>
</body>
</html>`;

const compiled = Handlebars.compile(SAMPLE_TEMPLATE);

/**
 * Ejemplo de `generateDocumentHtml(data)`: producción de HTML para un
 * documento. Puede ampliarse con otros templates sin tocar la lógica de PDFs.
 */
export function generateSampleDocumentHtml(data) {
  return compiled({
    logo: 'https://s3lata.maderasstudio.com/email/logobootcampfinal.png',
    title: data?.title ?? 'Documento de ejemplo',
    subtitle: data?.subtitle ?? 'Generado automáticamente desde el servidor',
    intro: data?.intro ?? 'Este documento se generó a partir de una plantilla HTML y se envió adjunto en PDF.',
    tableTitle: data?.tableTitle ?? 'Detalle',
    rows:
      data?.rows ??
      [
        { concept: 'Registro', detail: 'Inscripción al evento', amount: '$100' },
        { concept: 'Servicios', detail: 'Acceso a las instalaciones', amount: '$250' },
        { concept: 'Total', detail: '—', amount: '$350' },
      ],
    date: data?.date ?? new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
  });
}

export default { generateSampleDocumentHtml };