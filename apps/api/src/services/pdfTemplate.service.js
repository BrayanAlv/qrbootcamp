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

// Plantilla PDF de la invitación — propia, independiente de `emailTemplate.service.js`.
// Mismo copy/logo/colores/QR que el correo, pero reflowed a todo el ancho de la
// página en vez de la tarjeta fija de 600px del correo: esa tarjeta angosta, al
// imprimirse en una hoja más ancha, dejaba franjas del fondo casi negro del <body>
// a los lados. Aquí cada sección es una franja de color a `width:100%`, así que no
// sobra espacio que se vea "vacío". Sin tablas ni condicionales MSO/VML (eso es
// solo para clientes de correo).
//
// Sí lleva `fondo-correo.png` como fondo de las franjas oscuras — se probó a
// propósito: el correo original colgaba `page.pdf({ printBackground: true })`
// con esa imagen (`background-size:cover`) porque la aplicaba sobre UNA tabla
// continua de miles de px de alto (todo el correo). Aquí cada franja mide como
// mucho una página, y con eso `printToPDF` la resuelve en milisegundos — se
// verificó con Chromium real antes de dejarla. Si en el futuro alguna franja
// creciera mucho más alta que una página, retomar el hallazgo original.
// El llamador (`email.service.js`) debe pasar `pdf: { margin: { top:0, right:0,
// bottom:0, left:0 } }` a `generatePdfFromHtml` para que estas franjas lleguen de
// verdad al borde de la hoja — el padding de lectura vive en el propio CSS.
const INVITATION_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" type="text/css" />
  <style>
    @page { margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Montserrat', Helvetica, Arial, sans-serif; background-color: #1b0859; }
    .band { width: 100%; padding: 40px 56px; }
    .dark {
      background-color: #1b0859;
      background-image: url('https://s3lata.maderasstudio.com/email/fondo-correo.png');
      background-repeat: no-repeat;
      background-position: top center;
      background-size: cover;
      color: #e7e4f5;
    }
    .light { background-color: #c6c3d2; color: #000000; text-align: center; }
    .purple { background-color: #8b1ff0; color: #ffffff; text-align: center; padding: 26px 56px; }
    .logo { display: block; margin: 0 auto 32px; height: 320px; }
    .greeting { margin: 0; font-size: 18px; font-weight: 600; color: #ffffff; }
    .lead { margin: 14px 0 0; font-size: 15px; line-height: 22px; }
    h1 { margin: 4px 0; font-size: 32px; line-height: 38px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: -0.5px; }
    .ver-el-mundo { margin: 0 0 20px; font-size: 21px; font-weight: 400; }
    .ver-el-mundo b { font-weight: 800; color: #ffffff; }
    p.body-text { margin: 0 0 12px; font-size: 14px; line-height: 22px; text-align: justify; }
    .ponentes-title { margin: 0 0 14px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.1px; color: #ffffff; }
    /* Salto de página: la página 1 termina en "Y esta vez, tú estarás ahí." y la
       página 2 arranca con el encabezado de ponentes ("Cinco historias..."). */
    .page-break { page-break-before: always; }
    /* La franja del QR + el footer miden ~904px juntas; forzarlas a su propia
       hoja (en vez de dejarlas caer donde termine el texto) evita que la
       tarjeta del QR se corte a la mitad entre hoja 1 y hoja 2. min-height:
       100vh + flex las empuja al borde inferior de esa hoja, como un footer
       real, en vez de quedar varadas cerca del borde superior de una hoja
       casi en blanco. 100vh aquí sí equivale a una hoja: el viewport de
       Puppeteer se dimensiona a la proporción de A4 (ver defaultViewport en
       config/pdf.js) y el llamador pasa pdf: { margin: 0 }. */
    .access-page {
      page-break-before: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .qr-card {
      display: inline-block;
      background-color: #ffffff;
      padding: 22px;
      border-radius: 22px;
      box-shadow: 0 8px 24px rgba(27, 8, 89, 0.18);
      margin: 4px 0 24px;
    }
    .qr { display: block; width: 320px; height: 320px; margin: 0; }
    .access-title { margin: 0 0 20px; padding-top: 24px; font-size: 22px; font-weight: 700; }
    .access-text { margin: 0 0 10px; font-size: 13px; line-height: 20px; }
    .divider { width: 64px; height: 3px; background-color: #8b1ff0; margin: 24px auto; border-radius: 2px; }
    .logos { display: block; margin: 0 auto; max-width: 560px; width: 100%; height: auto; }
    .footer-text {
      margin: 0;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .footer-text img { display: block; width: 72px; height: auto; }
  </style>
</head>
<body>

  <div class="band dark">
    <img class="logo" src="https://s3lata.maderasstudio.com/email/logobootcampfinal.png" alt="Ciudad Maderas Bootcamp 2026" />
    <p class="greeting">Hola, {{fullName}}</p>
    <p class="lead">Hay eventos a los que asistes, y hay eventos que</p>
    <h1>Te cambian la forma de</h1>
    <p class="ver-el-mundo">ver <b>el mundo.</b></p>
    <p class="body-text">
      Hoy queremos agradecerte por ser parte de Ciudad Maderas Bootcamp 2026, una edición que hemos diseñado
      con especial atención a cada detalle para reunir en un mismo lugar a personas que comparten algo esencial:
      la intención de ir más allá.
    </p>
    <p class="body-text">
      Serás parte de una experiencia donde han pasado grandes líderes, referentes y personas que han demostrado
      que los límites muchas veces existen solamente hasta que alguien decide romperlos.
    </p>
    <p class="body-text">Y esta vez, tú estarás ahí.</p>
    <p class="ponentes-title">Cinco historias. Cinco formas de ver el mundo.</p>
    <p class="body-text">
      Durante esta experiencia tendrás la oportunidad de aprender de grandes referentes que han llevado sus
      límites mucho más allá: de Julio César Chávez, la disciplina y mentalidad de un campeón; de Nick Vujicic,
      la capacidad de transformar la adversidad en propósito; de Rosario Marín, el liderazgo y la determinación
      para abrirse camino; de Karla Wheelock, la valentía para conquistar incluso las cumbres más difíciles;
      y de Carlos Morett, la visión para desafiar lo establecido y convertir los retos en oportunidades.
    </p>
    <p class="body-text">
      Cinco historias distintas. Cinco perspectivas que pueden cambiar la manera en que ves tus propios límites.
    </p>
    <p class="body-text">Y todas estarán reunidas en un mismo lugar.</p>
    <p class="body-text">Contigo.</p>
  </div>

  <div class="access-page">
    <div class="band light">
      <p class="access-title">Tu acceso es personal</p>
      <div class="qr-card">
        <img class="qr" src="{{qrSrc}}" alt="Tu código QR de acceso" />
      </div>
      <p class="access-text">
        Antes de tu llegada, asegúrate de tener este código QR a la mano. Es personal, de un solo uso y no debe
        ser compartido con nadie más.
      </p>
      <p class="access-text">Guárdalo bien. Lo necesitarás para acceder al evento.</p>
      <div class="divider"></div>
      <img class="logos" src="https://s3lata.maderasstudio.com/email/pasarela-de-logos-1.png" alt="Grupo Ciudad Maderas" />
    </div>

    <div class="purple">
      <p class="footer-text">
        Mailing and ticketing service provided by:
        <img src="https://s3lata.maderasstudio.com/email/maderas-studio-logo-blanco.png" alt="Maderas Studio" />
      </p>
    </div>
  </div>

</body>
</html>`;

const compiledInvitation = Handlebars.compile(INVITATION_TEMPLATE);

/**
 * HTML del PDF de la invitación — independiente de `renderInvitationEmail`
 * (`emailTemplate.service.js`). `qrSrc` debe ser un data URI (Puppeteer no
 * resuelve `cid:`, eso es solo para adjuntos de correo).
 * @param {{ fullName: string, qrSrc: string }} context
 */
export function generateInvitationPdfHtml(context) {
  return compiledInvitation(context);
}

export default { generateSampleDocumentHtml, generateInvitationPdfHtml };