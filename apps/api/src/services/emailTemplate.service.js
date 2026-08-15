import Handlebars from 'handlebars';

// Plantilla HTML del correo de Ciudad Maderas Bootcamp 2026.
// El diseño es fijo (copy, imágenes y colores del evento); lo único variable es
// `firstName` y `qrCid`: la referencia al adjunto inline con el PNG del QR (`cid:`),
// que el adaptador de correo envía aparte.
//
// Marcado pensado para clientes de correo, no para navegador: tablas anidadas,
// estilos en línea, condicionales MSO/VML para el fondo en Outlook y media queries
// para apilar en móvil. Al tocarlo, conservar esas piezas.
//
// Nada de flexbox ni de grid: Gmail y Outlook los descartan. La pasarela de logos
// se resolvió con un solo asset ya horneado (`pasarela-de-logos-1.png`, los nueve
// logos en una sola imagen) en vez de sprites CSS por celda, así que solo necesita
// escalar con `max-width:100%` como cualquier otra imagen del correo.
//
// Las imágenes se sirven SIEMPRE desde s3lata.maderasstudio.com. Hubo una versión con
// enlaces de Google Drive y llegaban rotas: Drive responde `cache-control: private,
// max-age=0` y el proxy de imágenes de Gmail no sirve respuestas no cacheables. Los
// archivos de S3 son byte a byte los mismos, así que el diseño no cambia.
const BASE_TEMPLATE = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <!-- Declarar los dos esquemas evita que el modo oscuro de Outlook.com e iOS invierta
       por su cuenta el bloque claro y deje texto oscuro sobre fondo oscuro. No basta por
       sí solo: ver el bloque de defensas de modo oscuro más abajo. -->
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
  <title>Ciudad Maderas Bootcamp 2026</title>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" type="text/css" />
  <!--<![endif]-->
  <!-- Este bloque es TODO o NADA en Gmail: si su saneador encuentra una sola construcción
       que no soporta, borra el bloque entero y con él todas las media queries. Por eso aquí
       no hay `@import` (la fuente ya la pide el <link> de arriba, que al estar fuera del
       <style> no contamina nada), ni `:root` (solo admite selectores de clase, elemento e
       id), ni selectores de atributo (ver el segundo <style>, más abajo). El límite duro es
       de 8192 caracteres, comentarios incluidos. Al añadir reglas, respetar las tres cosas. -->
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
    body{margin:0!important;padding:0!important;width:100%!important;background-color:#0b0620;}
    a{text-decoration:none;}
    .mont{font-family:'Montserrat',Helvetica,Arial,sans-serif!important;}

    /* ============ DEFENSAS DE MODO OSCURO ============
       El bloque del QR es el único claro del correo, y varios clientes en modo oscuro lo
       invierten: el fondo #c6c3d2 se va a oscuro y el texto #1b1430 sale blanco. Eso es
       el "texto en blanco" que aparece en móvil, no un problema de la media query.
       Aquí se reafirman los mismos colores para que la inversión no tenga efecto. Los
       estilos en línea no alcanzan contra esto porque el cliente los reescribe, así que
       hacen falta clases con !important.
       Alcance real: cubre iOS/Apple Mail y Outlook.com. La app de Gmail en Android con
       inversión forzada del sistema ignora todo esto; ahí la única salida segura sería
       quemar el bloque como imagen. */
    @media (prefers-color-scheme:dark){
      .lightbg{background-color:#c6c3d2!important;}
      .dark-title{color:#1b1430!important;}
      .dark-copy{color:#4a4560!important;}
    }
    /* Las variantes con los prefijos de Outlook viven en el segundo <style>. */

    /* Teléfono y ventanas estrechas: las columnas se apilan. */
    @media only screen and (max-width:620px){
      .wrap{width:100%!important;}
      .px{padding-left:26px!important;padding-right:26px!important;}
      .logo{width:230px!important;}
      /* El PNG del QR se genera a 300px, así que a 200 sigue sin interpolar y se
         escanea mejor en la puerta (pantalla con poco brillo, lectores lentos). */
      .qr{width:200px!important;}
      /* El padding-right en línea de la celda del QR descentraría el código al apilarse.
         La celda de texto lo recupera con .stack-pad, que se declara después. */
      .stack{display:block!important;width:100%!important;max-width:100%!important;text-align:center!important;padding-right:0!important;}
      .stack-pad{padding:22px 26px 0 26px!important;}
      /* Bloque de acceso apilado: el texto queda debajo del QR, así que se centra
         con él y sube a negro pleno para leerse a plena luz en la puerta.
         El centrado se declara en el propio <p> y no solo en la celda: el
         align="left" de la celda gana en los clientes que no heredan el
         text-align de .stack. Las variantes con los prefijos de Outlook, que hacen
         falta para que no vuelva el gris al invertir colores, están repetidas en el
         segundo <style>. */
      .access-copy{color:#000000!important;text-align:center!important;}
    }

    /* ============ ESCALONES DEL HEADLINE ============
       "TE CAMBIAN LA FORMA DE" mide 14.30em en Montserrat ExtraBold y 13.24em en el
       fallback Arial/Helvetica (que es lo que se ve en Gmail, porque no carga fuentes
       web). Como el fallback es más angosto, basta dimensionar para Montserrat.
       Cada escalón se calcula para el extremo ESTRECHO de su banda: ancho de columna
       (viewport menos el padding lateral vigente) entre 14.30, redondeado hacia abajo
       con un margen de ~4%.
       Antes había una sola banda de 0-400px fijada en 18px, tamaño pensado para un
       iPhone SE de 320px; como los iPhone actuales miden 390-402px caían también ahí y
       el titular salía cuatro o cinco puntos más chico de lo que cabía. De ahí que se
       viera pequeño. Ahora las bandas son finas y cada ancho recibe su tamaño.
       El orden importa: varias reglas aplican a la vez en una pantalla chica y gana la
       última, así que van de mayor a menor.
       Al cambiar el copy hay que rehacer la cuenta: dos líneas aquí rompen el ritmo
       con "ver el mundo". */
    @media only screen and (max-width:620px){ .h1{font-size:28px!important;line-height:31px!important;} }
    @media only screen and (max-width:480px){ .h1{font-size:26px!important;line-height:29px!important;} }
    @media only screen and (max-width:440px){ .h1{font-size:24px!important;line-height:27px!important;} }
    @media only screen and (max-width:410px){ .h1{font-size:23px!important;line-height:26px!important;} }
    @media only screen and (max-width:380px){ .h1{font-size:21px!important;line-height:24px!important;} }
    @media only screen and (max-width:360px){ .h1{font-size:20px!important;line-height:23px!important;} }
    @media only screen and (max-width:340px){ .h1{font-size:18px!important;line-height:21px!important;} }

    /* Teléfonos estrechos (iPhone SE y similares, 320px). */
    @media only screen and (max-width:400px){
      .px{padding-left:20px!important;padding-right:20px!important;}
      .logo{width:200px!important;}
    }
  </style>
  <!-- ============ SEGUNDO <style>: SOLO PARA OUTLOOK ============
       Outlook.com y Outlook Android reescriben el marcado en modo oscuro y lo prefijan con
       estos atributos: [data-ogsc] cuando cambian un color de texto, [data-ogsb] cuando
       cambian un fondo. Solo se les puede responder con selectores de atributo, y Gmail
       descarta el <style> ENTERO en cuanto ve uno. Por eso van aquí y no arriba: Gmail tira
       este bloque —que no le sirve de nada— y conserva intacto el primero con las media
       queries. No mover estas reglas al otro <style>: era justo lo que rompía el correo en
       la app de Gmail. El orden interno importa, igual que arriba: gana la última. -->
  <style type="text/css">
    [data-ogsc] .lightbg,[data-ogsb] .lightbg{background-color:#c6c3d2!important;}
    [data-ogsc] .dark-title,[data-ogsb] .dark-title{color:#1b1430!important;}
    [data-ogsc] .dark-copy,[data-ogsb] .dark-copy{color:#4a4560!important;}
    /* Repetidas con prefijo porque [data-ogsc] .dark-copy pesa más que una sola clase:
       sin esto volvería el gris al invertir colores en el bloque de acceso apilado. */
    @media only screen and (max-width:620px){
      [data-ogsc] .access-copy,[data-ogsb] .access-copy{color:#000000!important;text-align:center!important;}
    }
  </style>
</head>

<body style="margin:0;padding:0;background-color:#0b0620;">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:#0b0620;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  {{firstName}}, tu acceso a Ciudad Maderas Bootcamp 2026 está listo. Guarda tu código QR: es personal y de un solo uso.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0620;">
  <tr><td align="center">

    <!-- ==================== BLOQUE OSCURO (FONDO) ==================== -->
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:1162px;">
      <v:fill type="frame" src="https://s3lata.maderasstudio.com/email/fondo-correo.png" color="#1b0859" />
      <v:textbox inset="0,0,0,0"><![endif]-->

    <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0"
           background="https://s3lata.maderasstudio.com/email/fondo-correo.png"
           style="width:600px;max-width:600px;background-color:#1b0859;background-image:url('https://s3lata.maderasstudio.com/email/fondo-correo.png');background-repeat:no-repeat;background-position:top center;background-size:cover;">

      <!-- LOGO -->
      <tr>
        <td align="center" style="padding:46px 24px 0 24px;">
          <img src="https://s3lata.maderasstudio.com/email/logobootcampfinal.png" alt="Ciudad Maderas Bootcamp 2026" class="logo" width="278"
               style="width:278px;max-width:76%;height:auto;margin:0 auto;" />
        </td>
      </tr>

      <!-- SALUDO PERSONALIZADO -->
      <tr>
        <td class="px" align="left" style="padding:46px 62px 0 62px;">
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:17px;line-height:24px;font-weight:600;color:#ffffff;">
            Hola, {{firstName}}
          </p>
        </td>
      </tr>

      <!-- HEADLINE -->
      <tr>
        <td class="px" align="left" style="padding:14px 62px 0 62px;">
          <p class="mont" style="margin:0 0 2px 0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:15px;line-height:21px;font-weight:400;color:#e7e4f5;">
            Hay eventos a los que asistes, y hay eventos que
          </p>
          <p class="mont h1" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:-0.3px;text-align:center;">
            Te cambian la forma de
          </p>
          <p class="mont" style="margin:2px 0 0 0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:20px;line-height:26px;font-weight:400;color:#e7e4f5;text-align:right;">
            ver <span style="font-weight:800;color:#ffffff;">el mundo.</span>
          </p>
        </td>
      </tr>

      <!-- CUERPO -->
      <tr>
        <td class="px" align="left" style="padding:30px 62px 0 62px;">
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;text-align:justify;">
            Hoy queremos agradecerte por ser parte de Ciudad Maderas Bootcamp 2026, una edición que hemos diseñado
            con especial atención a cada detalle para reunir en un mismo lugar a personas que comparten algo esencial:
            la intención de ir más allá.
          </p>
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;text-align:justify;">
            Serás parte de una experiencia donde han pasado grandes líderes, referentes y personas que han demostrado
            que los límites muchas veces existen solamente hasta que alguien decide romperlos.
          </p>
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;">
            Y esta vez, tú estarás ahí.
          </p>
        </td>
      </tr>

      <!-- PONENTES -->
      <tr>
        <td class="px" align="left" style="padding:26px 62px 0 62px;">
          <p class="mont" style="margin:0 0 12px 0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:19px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1.1px;">
            Cinco historias. Cinco formas de ver el mundo.
          </p>
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;text-align:justify;">
            Durante esta experiencia tendrás la oportunidad de aprender de grandes referentes que han llevado sus
            límites mucho más allá: de Julio César Chávez, la disciplina y mentalidad de un campeón; de Nick Vujicic,
            la capacidad de transformar la adversidad en propósito; de Rosario Marín, el liderazgo y la determinación
            para abrirse camino; de Karla Wheelock, la valentía para conquistar incluso las cumbres más difíciles;
            y de Carlos Morett, la visión para desafiar lo establecido y convertir los retos en oportunidades.
          </p>
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;text-align:justify;">
            Cinco historias distintas. Cinco perspectivas que pueden cambiar la manera en que ves tus propios límites.
          </p>
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;">
            Y todas estarán reunidas en un mismo lugar.
          </p>
          <p class="mont" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;font-weight:400;color:#e7e4f5;">
            Contigo.
          </p>
        </td>
      </tr>

      <tr><td style="height:54px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!--[if mso]></v:textbox></v:rect><![endif]-->

    <!-- ==================== BLOQUE CLARO: ACCESO / QR ==================== -->
    <table role="presentation" class="wrap lightbg" width="600" cellpadding="0" cellspacing="0" border="0"
           style="width:600px;max-width:600px;background-color:#c6c3d2;">
      <tr>
        <td class="px lightbg" style="padding:34px 40px 22px 40px;background-color:#c6c3d2;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- QR: viaja como adjunto inline, no como URL: Gmail y Outlook descartan las URI data: -->
              <td class="stack" width="180" valign="top" align="center" style="width:180px;padding-right:26px;">
                <img src="cid:{{qrCid}}" alt="Tu código QR de acceso" class="qr" width="170"
                     style="width:170px;max-width:100%;height:auto;margin:0 auto;" />
              </td>
              <!-- Texto -->
              <td class="stack stack-pad" valign="top" align="left">
                <p class="mont dark-title access-copy" style="margin:0 0 12px 0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:18px;line-height:23px;font-weight:700;color:#1b1430;text-transform:uppercase;letter-spacing:.6px;">
                  Tu acceso es personal
                </p>
                <p class="mont dark-copy access-copy" style="margin:0 0 12px 0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:18px;font-weight:400;color:#4a4560;">
                  Antes de tu llegada, asegúrate de tener este código QR a la mano. Es personal, de un solo uso y no debe
                  ser compartido con nadie más.
                </p>
                <p class="mont dark-copy access-copy" style="margin:0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:18px;font-weight:400;color:#4a4560;">
                  Guárdalo bien. Lo necesitarás para acceder al evento.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- PASARELA DE LOGOS -->
      <tr>
        <td class="px lightbg" align="center" style="padding:14px 34px 30px 34px;background-color:#c6c3d2;">
          <img src="https://s3lata.maderasstudio.com/email/pasarela-de-logos-1.png" alt="Grupo Ciudad Maderas" width="470"
               style="width:470px;max-width:100%;height:auto;margin:0 auto;" />
        </td>
      </tr>
    </table>

    <!-- ==================== FOOTER ==================== -->
    <!-- Tabla hermana de las dos anteriores, no anidada dentro del bloque claro: una
         <table> hija directa de otra <table> es marcado inválido y cada cliente la
         recoloca a su manera. -->
    <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0"
           style="width:600px;max-width:600px;background-color:#8b1ff0;">
      <tr>
        <td align="center" style="padding:16px 24px 18px 24px;">
          <p class="mont" style="margin:0 0 8px 0;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:10px;line-height:15px;font-weight:500;color:#ffffff;letter-spacing:.5px;">
            Mailing and ticketing service provided by:
            <!-- El atributo width es obligatorio: el PNG mide 5981px de ancho y Outlook
                 ignora max-width, así que sin él el pie de página se desborda. -->
            <img src="https://s3lata.maderasstudio.com/email/maderas-studio-logo-blanco.png" alt="Maderas Studio" width="70"
                 style="display:inline-block;vertical-align:middle;width:70px;max-width:70px;height:auto;margin-left:4px;" />
          </p>
        </td>
      </tr>
    </table>

  </td></tr>
</table>
</body>
</html>`;

const compiled = Handlebars.compile(BASE_TEMPLATE);

/** @param {{ firstName: string, qrCid: string }} context */
export function renderInvitationEmail(context) {
  return compiled(context);
}

export default { renderInvitationEmail };