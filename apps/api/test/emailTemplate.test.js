import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderInvitationEmail } from '../src/services/emailTemplate.service.js';

// El HTML de la plantilla viene de un diseño de Mailchimp. Estas pruebas cubren
// lo que se rompe al portarlo: merge tags sin sustituir o el QR de ejemplo colado.
const render = (context = { firstName: 'Ana', qrCid: 'qr-invitacion' }) => renderInvitationEmail(context);

test('el QR apunta al adjunto inline, no a una URL externa', () => {
  const html = render();

  assert.match(html, /src="cid:qr-invitacion"/);
  assert.doesNotMatch(html, /quickchart\.io/);
});

test('el nombre se interpola en el saludo y en el preheader', () => {
  const html = render({ firstName: 'Ana', qrCid: 'qr-invitacion' });

  assert.match(html, /Hola, Ana/);
  assert.match(html, /Ana, tu acceso a Ciudad Maderas Bootcamp 2026/);
});

test('no queda ningún merge tag de Mailchimp sin sustituir', () => {
  const html = render();

  assert.doesNotMatch(html, /\*\|[^|]*\|\*/);
});

test('no queda rastro del bloque de wallet ni de enlaces al frontend', () => {
  const html = render();

  assert.doesNotMatch(html, /wallet/i);
  assert.doesNotMatch(html, /Abrir invitación/);
});

// Las imágenes llegaban rotas a Gmail: su proxy no sirve respuestas con
// `cache-control: private`, que es justo lo que devuelve Google Drive. Los assets
// ya están en S3, así que ninguna URL remota debe salir de ahí.
test('todas las imágenes remotas se sirven desde S3, nunca desde Google Drive', () => {
  const html = render();

  assert.doesNotMatch(html, /drive\.usercontent\.google\.com/);
  assert.doesNotMatch(html, /drive\.google\.com/);

  const remotas = [...html.matchAll(/(?:src|background)="(https?:[^"]+)"/g)].map((m) => m[1]);
  assert.ok(remotas.length > 0, 'la plantilla debe tener imágenes remotas');
  for (const url of remotas) {
    assert.match(url, /^https:\/\/s3lata\.maderasstudio\.com\//, `URL fuera de S3: ${url}`);
  }
});

// Un `-->` dentro de un bloque `<!--[if mso]>` lo cierra antes de tiempo y el VML
// del fondo se filtra como texto al resto de clientes.
test('los condicionales MSO están bien balanceados y sin comentarios anidados', () => {
  const html = render();

  assert.equal(
    (html.match(/<!--\[if [^\]]*\]>/g) ?? []).length,
    (html.match(/<!\[endif\]-->/g) ?? []).length,
    'cada <!--[if ...]> necesita su <![endif]-->',
  );

  // Solo los bloques ocultos (`<!--[if mso]>`) son comentarios de verdad; el
  // `<!--[if !mso]><!-->` es la forma revelada y su `<!--` interno es legítimo.
  for (let i = html.indexOf('<!--[if mso]>'); i !== -1; i = html.indexOf('<!--[if mso]>', i + 1)) {
    const fin = html.indexOf('<![endif]-->', i);
    assert.notEqual(fin, -1, 'condicional MSO sin cerrar');
    const cuerpo = html.slice(i + '<!--[if mso]>'.length, fin);
    assert.doesNotMatch(cuerpo, /-->/, `un "-->" cierra el condicional MSO antes de tiempo: ${cuerpo.slice(0, 90)}`);
  }
});

// La pasarela de logos se recortaba con `display:flex`. Gmail y Outlook descartan
// flexbox, así que ahí la franja llegaba vacía: sin el centrado vertical la ventana
// de 90px caía sobre la zona transparente del PNG.
test('no se usa flexbox ni grid: los clientes de correo los descartan', () => {
  const html = render();

  for (const prop of ['display:flex', 'display:grid', 'flex-shrink', 'justify-content', 'align-items']) {
    assert.doesNotMatch(html, new RegExp(prop.replace('-', '\\-')), `propiedad no soportada en correo: ${prop}`);
  }
});

// Sin el atributo `width` Outlook ignora `max-width` y pinta la imagen a su tamaño
// natural: el logo del pie mide 5981px de ancho y desbordaría el correo entero.
test('cada imagen declara ancho, tanto en atributo como en estilo', () => {
  const html = render();

  // Sin los comentarios: la plantilla los usa para explicar el marcado y ahí aparecen
  // etiquetas de ejemplo que no son imágenes reales.
  const marcado = html.replace(/<!--[\s\S]*?-->/g, '');
  const imgs = [...marcado.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(imgs.length > 0, 'la plantilla debe tener imágenes');
  for (const img of imgs) {
    assert.match(img, /\swidth="\d+"/, `<img> sin atributo width: ${img.slice(0, 80)}`);
    assert.match(img, /max-width:/, `<img> sin max-width: no escala en teléfono: ${img.slice(0, 80)}`);
  }
});

// Devuelve `{ condicion, cuerpo }` de cada @media. Hace falta contar llaves porque el
// archivo escribe los bloques de las dos formas: los escalones del titular caben en una
// línea y una expresión regular sola se saltaba justo esos.
function bloquesMedia(css) {
  const bloques = [];
  const apertura = /@media([^{]*)\{/g;
  let m;
  while ((m = apertura.exec(css)) !== null) {
    let profundidad = 1;
    let i = apertura.lastIndex;
    while (i < css.length && profundidad > 0) {
      if (css[i] === '{') profundidad += 1;
      else if (css[i] === '}') profundidad -= 1;
      i += 1;
    }
    bloques.push({ condicion: m[1].trim(), cuerpo: css.slice(apertura.lastIndex, i - 1) });
    apertura.lastIndex = i;
  }
  return bloques;
}

// Una regla huérfana no rompe nada, pero delata un bloque a medio quitar (fue el caso
// de `.btn-wrap`, que sobrevivió al bloque de wallet). Una clase sin regla es peor:
// significa que el ajuste responsivo que se pretendía nunca se aplica.
test('las clases de los media queries y las del marcado coinciden', () => {
  const html = render();

  const estilos = html.slice(html.indexOf('<style'), html.indexOf('</style>'));
  const bloques = bloquesMedia(estilos);

  // No se fija el número de bloques: los escalones del titular se retocan seguido
  // y contarlos solo produce un test que hay que actualizar sin aprender nada.
  // Lo que sí tiene que existir siempre es la banda de teléfono y la de modo oscuro.
  assert.ok(
    bloques.some((b) => b.condicion.includes('max-width')),
    'no hay ningún media query de ancho: el correo no se adapta al teléfono',
  );
  assert.ok(
    bloques.some((b) => b.condicion.includes('prefers-color-scheme')),
    'falta el bloque de modo oscuro que reafirma los colores del bloque claro',
  );

  const enMedia = new Set(
    bloques.flatMap((b) => [...b.cuerpo.matchAll(/\.([a-z0-9-]+)[\s,{]/g)].map((m) => m[1])),
  );
  const enMarcado = new Set(
    [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean),
  );

  for (const clase of enMedia) {
    assert.ok(enMarcado.has(clase), `regla .${clase} sin usar en el marcado`);
  }
  for (const clase of enMarcado) {
    if (clase === 'mont') continue; // la tipografía es global, no responsiva
    assert.ok(enMedia.has(clase), `la clase ${clase} no tiene regla responsiva`);
  }
});

// Sin `color-scheme` declarado, el modo oscuro de Outlook.com invierte por su cuenta
// el bloque claro y deja texto oscuro sobre fondo oscuro.
test('se declaran los dos esquemas de color para el modo oscuro', () => {
  const html = render();

  assert.match(html, /<meta name="color-scheme" content="light dark"/);
  assert.match(html, /<meta name="supported-color-schemes" content="light dark"/);
  assert.match(html, /color-scheme:light dark/);
});

test('el nombre se escapa: viene de un Excel y puede traer caracteres HTML', () => {
  const html = render({ firstName: 'Ana & <b>Luis</b>', qrCid: 'qr-invitacion' });

  assert.match(html, /Hola, Ana &amp; &lt;b&gt;Luis&lt;\/b&gt;/);
});
