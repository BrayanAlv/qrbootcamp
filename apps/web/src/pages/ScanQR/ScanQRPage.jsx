import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import {
  Box, Paper, Typography, CircularProgress, ButtonBase,
  IconButton, Dialog, DialogContent, useMediaQuery, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { qrService } from '../../services/qrService.js';
import { extractError } from '../../services/api.js';
import {
  BRAND_ASSETS, BRAND_COLORS, DISPLAY_FONT, MADERAS_LOGO_DARK_FILTER,
} from '../../theme/brand.js';

const SEAL_SIZE = 'min(52vw, 184px)';

// Máximo ancho del cuadro que se decodifica. El canvas de captura de
// @zxing/browser siempre usa la resolución nativa de la cámara (1280x720+),
// y getImageData + conversión a grises + binarización sobre ~1M de px es lo
// que domina el costo por intento en móviles. El QR de la invitación ocupa
// gran parte del cuadro, así que esta reducción no pierde módulos y cada
// intento cuesta ~4x menos (más intentos por segundo, menos traba de UI).
const DECODE_MAX_WIDTH = 640;

class FastBrowserQRCodeReader extends BrowserQRCodeReader {
  decodeFromCanvas(canvas) {
    if (canvas.width <= DECODE_MAX_WIDTH) return super.decodeFromCanvas(canvas);
    if (!this.decodeCanvasCtx) {
      this.decodeCanvas = document.createElement('canvas');
      this.decodeCanvas.width = DECODE_MAX_WIDTH;
      this.decodeCanvas.height = Math.round((canvas.height / canvas.width) * DECODE_MAX_WIDTH);
      this.decodeCanvasCtx = this.decodeCanvas.getContext('2d', { willReadFrequently: true });
      this.decodeCanvasCtx.imageSmoothingEnabled = true;
    }
    this.decodeCanvasCtx.drawImage(canvas, 0, 0, this.decodeCanvas.width, this.decodeCanvas.height);
    return super.decodeFromCanvas(this.decodeCanvas);
  }
}

const SCAN_STATES = {
  IDLE: 'idle',
  PERMISSION: 'permission',
  SCANNING: 'scanning',
  DETECTED: 'detected',
  VALIDATING: 'validating',
  VALID: 'valid',
  QR_ALREADY_USED: 'QR_ALREADY_USED',
  QR_EXPIRED: 'QR_EXPIRED',
  INVALID_QR: 'INVALID_QR',
  ERROR: 'error',
};

const RESULT_STATES = [
  SCAN_STATES.VALID,
  SCAN_STATES.QR_ALREADY_USED,
  SCAN_STATES.QR_EXPIRED,
  SCAN_STATES.INVALID_QR,
  SCAN_STATES.ERROR,
];

// Título y color del círculo del popout de resultado, por estado.
const RESULT_PRESENTATION = {
  [SCAN_STATES.VALID]: { title: '¡Usuario identificado!', color: BRAND_COLORS.statusOk },
  [SCAN_STATES.QR_ALREADY_USED]: { title: '¡Usuario duplicado!', color: BRAND_COLORS.statusError },
  [SCAN_STATES.QR_EXPIRED]: { title: '¡QR expirado!', color: BRAND_COLORS.statusError },
  [SCAN_STATES.INVALID_QR]: { title: '¡QR inválido!', color: BRAND_COLORS.statusError },
  [SCAN_STATES.ERROR]: { title: '¡Error de lectura!', color: BRAND_COLORS.statusError },
};

export function ScanQRPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const controlsRef = useRef(null); // IScannerControls real: el único objeto con .stop()
  const scanning = useRef(false); // bloquea duplicados mientras se procesa
  const focusAppliedRef = useRef(false); // evita reaplicar el foco continuo en cada intento de decode
  const [state, setState] = useState(SCAN_STATES.IDLE);
  const [message, setMessage] = useState(null);
  const [invitation, setInvitation] = useState(null);
  // La cámara sigue montada mientras se muestra el resultado, con el último
  // cuadro congelado detrás del popout. Hay que capturarlo a mano: al detener
  // el lector, zxing libera el srcObject y el <video> se queda en negro.
  const [cameraOn, setCameraOn] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null); // feedback visual del tap-to-focus

  // Tap-to-focus manual: el foco es fijo, no continuo (el autofoco de varios
  // dispositivos caza mal y deja el QR borroso). Cada tap enfoca el punto y
  // lo bloquea ahí. No se consulta getCapabilities() antes de aplicar (iOS
  // Safari no lo expone y el tap quedaba muerto): se intenta pointsOfInterest
  // + focusMode 'single-shot' juntos y, si el navegador rechaza la
  // combinación, se cae a solo 'single-shot'. Si nada es soportado, el tap
  // no enfoca pero el anillo de feedback sí se muestra.
  const handleFocusTap = (e) => {
    const video = videoRef.current;
    const controls = controlsRef.current;
    if (!video || !controls?.streamVideoConstraintsApply) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // El video se pinta con objectFit: 'cover' (recortado), así que el tap se
    // traduce a coordenadas normalizadas (0..1) del cuadro REAL de la cámara,
    // no del elemento <video>: hay que compensar escala y recorte.
    let x = px / rect.width;
    let y = py / rect.height;
    const { videoWidth, videoHeight } = video;
    if (videoWidth && videoHeight) {
      const scale = Math.max(rect.width / videoWidth, rect.height / videoHeight);
      const offX = (rect.width - videoWidth * scale) / 2;
      const offY = (rect.height - videoHeight * scale) / 2;
      x = Math.min(1, Math.max(0, (px - offX) / (videoWidth * scale)));
      y = Math.min(1, Math.max(0, (py - offY) / (videoHeight * scale)));
    }

    const apply = (constraint) => controls.streamVideoConstraintsApply({ advanced: [constraint] });
    // Tap = enfocar en el punto y bloquear ahí (foco manual). Se intenta
    // pointsOfInterest + single-shot juntos; si el navegador rechaza la
    // combinación, se cae a solo single-shot. Si nada es soportado, no enfoca
    // pero el anillo de feedback sí se muestra.
    apply({ pointsOfInterest: [{ x, y }], focusMode: 'single-shot' })
      .catch(() => apply({ focusMode: 'single-shot' }))
      .catch(() => { /* sin foco manual soportado en este navegador */ });

    setFocusPoint({ x: px, y: py });
    setTimeout(() => setFocusPoint(null), 600);
  };

  const freezeFrame = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      setFrozenFrame(canvas.toDataURL('image/jpeg', 0.8));
    } catch { /* ignore */ }
  };

  const set = (s, m = null) => {
    setState(s);
    setMessage(m);
  };

  const stopCamera = async () => {
    scanning.current = false;
    // codeReaderRef no tiene .stop(): ese método vive en el IScannerControls
    // que llega por el callback de decodeFromVideoDevice, guardado en controlsRef.
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    codeReaderRef.current = null;
    // Respaldo: si stopCamera() se llama antes de que llegue el primer callback
    // (controlsRef aún vacío), detener los tracks directamente para no dejar la
    // cámara encendida.
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Solo pide el estado "permission": el lector arranca en el efecto de abajo,
  // cuando el <video> ya está montado en el DOM.
  const startScanner = () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      set(SCAN_STATES.ERROR, 'Este dispositivo no soporta acceso a cámara.');
      return;
    }
    setCameraOn(true);
    set(SCAN_STATES.PERMISSION);
  };

  const handleDetection = async (raw) => {
    set(SCAN_STATES.DETECTED, 'QR escaneado');
    setInvitation(null);

    // La validación arranca de inmediato: los 350ms de feedback ("QR escaneado")
    // corren en paralelo con la red en vez de sumarse a ella. El .catch() es un
    // no-op para evitar "unhandled rejection" mientras corre el feedback; el
    // error se maneja igual en el try/catch de abajo al esperar la promesa.
    const scanPromise = qrService.scan(raw);
    scanPromise.catch(() => {});

    await new Promise((r) => setTimeout(r, 350));
    set(SCAN_STATES.VALIDATING, 'Validando código QR...');

    try {
      // Un solo endpoint autenticado que valida, marca el primer uso de forma
      // atómica y registra el intento en la bitácora de auditoría.
      const body = await scanPromise;
      setInvitation({ ...body.data, status: 'aceptada' });
      set(SCAN_STATES.VALID, 'Invitación válida');
    } catch (err) {
      const { code, message, details } = extractError(err);
      if (code === 'QR_ALREADY_USED') {
        // La API manda el invitado en details para poder nombrarlo en el popout.
        if (details?.guest) setInvitation({ guest: details.guest });
        set(SCAN_STATES.QR_ALREADY_USED, 'Este código QR ya fue utilizado y no puede volver a usarse.');
      } else if (code === 'QR_EXPIRED') {
        set(SCAN_STATES.QR_EXPIRED, 'Este código QR ha expirado.');
      } else if (code === 'INVALID_QR') {
        set(SCAN_STATES.INVALID_QR, 'El código QR no es válido.');
      } else {
        set(SCAN_STATES.ERROR, message || 'Error validando el código QR');
      }
    } finally {
      scanning.current = false;
    }
  };

  useEffect(() => {
    if (state !== SCAN_STATES.PERMISSION) return undefined;

    // Sin TRY_HARDER: cuesta ~2-3x por cuadro y ya no se necesita para
    // compensar la resolución alta (FastBrowserQRCodeReader decodifica sobre
    // una copia de ~640px). delayBetweenScanAttempts baja de los 500ms por
    // default a 80ms: con intentos ahora baratos, la cámara reintenta seguido.
    const reader = new FastBrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 80 });
    codeReaderRef.current = reader;

    // Constraints explícitos (en vez de decodeFromVideoDevice con device
    // undefined) para pedir mayor resolución: cuadros más nítidos que la
    // cámara resuelve más rápido. SIN focusMode 'continuous': el foco es
    // manual (tap), porque en muchos dispositivos el autofoco continuo caza
    // mal y deja el QR borroso. El enfoque inicial se hace luego vía
    // applyConstraints sobre el stream ya negociado (bloque focusAppliedRef
    // de abajo), porque en varios Android el foco solo se puede fijar
    // después de abierto el stream.
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    reader
      .decodeFromConstraints(constraints, videoRef.current, (result, _error, controls) => {
        controlsRef.current = controls; // se refresca en cada intento, no solo al detectar

        if (!focusAppliedRef.current && controls?.streamVideoConstraintsApply) {
          focusAppliedRef.current = true;
          // Foco manual: una sola vez, apenas el stream está corriendo, se
          // enfoca al centro del marco guía y se bloquea ahí (single-shot).
          // Si el dispositivo no soporta pointsOfInterest/focusMode, no pasa
          // nada: solo quedará dependiendo de lo que haga el tap.
          controls.streamVideoConstraintsApply({
            advanced: [{ pointsOfInterest: [{ x: 0.5, y: 0.5 }] }, { focusMode: 'single-shot' }],
          }).catch(() => {});
        }

        if (result?.getText() && !scanning.current) {
          scanning.current = true; // bloquea detecciones repetidas
          freezeFrame(); // antes de stop(): después el <video> ya no tiene imagen
          try { controls.stop(); } catch { /* ignore */ }
          handleDetection(result.getText());
        }
      })
      .catch(() => {
        setCameraOn(false);
        set(SCAN_STATES.ERROR, 'No se pudo acceder a la cámara. Revisa los permisos.');
      });

    // Estado "escaneando" una vez iniciada la cámara
    const timer = setTimeout(() => {
      setState((s) => (s === SCAN_STATES.PERMISSION ? SCAN_STATES.SCANNING : s));
    }, 600);

    return () => {
      clearTimeout(timer);
      focusAppliedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const reset = () => {
    stopCamera();
    setCameraOn(false);
    setFrozenFrame(null);
    setInvitation(null);
    setMessage(null);
    set(SCAN_STATES.IDLE);
  };

  useEffect(() => () => { stopCamera(); }, []);

  const presentation = RESULT_PRESENTATION[state] ?? RESULT_PRESENTATION[SCAN_STATES.ERROR];
  const guestName = invitation?.guest?.name ?? null;

  const resultCard = (
    <>
      <IconButton
        aria-label="Cerrar"
        onClick={reset}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 32,
          height: 32,
          color: alpha(BRAND_COLORS.textDark, 0.55),
          border: `1px solid ${BRAND_COLORS.hairline}`,
          '&:hover': { color: BRAND_COLORS.textDark, bgcolor: alpha(BRAND_COLORS.textDark, 0.04) },
        }}
      >
        <CloseIcon sx={{ fontSize: 17 }} />
      </IconButton>

      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color: alpha(BRAND_COLORS.textDark, 0.45),
          textAlign: 'center',
        }}
      >
        Ciudad Maderas · Bootcamp 2026
      </Typography>

      <Typography
        sx={{
          fontFamily: DISPLAY_FONT,
          fontSize: 34,
          fontWeight: 300,
          lineHeight: 1.15,
          letterSpacing: '0.01em',
          color: BRAND_COLORS.textDark,
          textAlign: 'center',
          mt: 1.25,
          mb: 4,
        }}
      >
        {presentation.title}
      </Typography>

      {/* Sello lacrado: disco de estado con anillos de realce y la silueta
          recortada contra el borde (cabeza + arco de hombros). */}
      <Box
        sx={{
          position: 'relative',
          width: SEAL_SIZE,
          height: SEAL_SIZE,
          mx: 'auto',
          '@media (prefers-reduced-motion: no-preference)': {
            animation: 'sealIn 620ms cubic-bezier(0.16, 0.9, 0.3, 1) both',
          },
          '@keyframes sealIn': {
            from: { opacity: 0, transform: 'scale(0.86)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
        }}
      >
        <Box sx={{ position: 'absolute', inset: -20, borderRadius: '50%', border: `1px solid ${alpha(presentation.color, 0.1)}` }} />
        <Box sx={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `1px solid ${alpha(presentation.color, 0.2)}` }} />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: presentation.color,
            backgroundImage: 'radial-gradient(circle at 32% 24%, rgba(255,255,255,0.26), rgba(255,255,255,0) 58%)',
            boxShadow: `0 18px 38px ${alpha(presentation.color, 0.3)}, inset 0 -8px 20px ${alpha('#000', 0.13)}`,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <PersonIcon
            sx={{ fontSize: 'min(80vw, 285px)', color: BRAND_COLORS.paper, mt: 'min(-8vw, -29px)' }}
          />
        </Box>
      </Box>

      {guestName ? (
        <>
          <Box sx={{ width: 44, height: '1px', bgcolor: BRAND_COLORS.hairline, mx: 'auto', mt: 4.5 }} />
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              lineHeight: 1.5,
              color: BRAND_COLORS.textDark,
              textAlign: 'center',
              mt: 2.5,
            }}
          >
            {guestName}
          </Typography>
        </>
      ) : (
        <Typography
          sx={{
            fontSize: 14,
            lineHeight: 1.6,
            color: alpha(BRAND_COLORS.textDark, 0.6),
            textAlign: 'center',
            mt: 4.5,
            px: 1,
          }}
        >
          {message}
        </Typography>
      )}

      <Box sx={{ height: '1px', bgcolor: BRAND_COLORS.hairline, mt: 4.5 }} />

      <Box
        component="img"
        src={BRAND_ASSETS.maderasStudioLogo}
        alt="Maderas Studio"
        sx={{
          width: 104,
          height: 'auto',
          display: 'block',
          mx: 'auto',
          mt: 3,
          opacity: 0.85,
          filter: MADERAS_LOGO_DARK_FILTER,
        }}
      />
    </>
  );

  const cameraOverlayText = state === SCAN_STATES.DETECTED ? 'QR escaneado' : 'Validando código QR...';

  // ---------------------------------------------------------------- escritorio
  // Todo el contenido se dimensiona en unidades relativas al viewport (vh/%)
  // para caber en la altura disponible bajo el header sin scroll ni zoom, en
  // vez de paddings fijos que podían desbordar en ventanas más bajas.
  const renderDesktop = () => (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 1.5, md: 2 },
        px: 3,
        py: { xs: 2, md: 2.5 },
        backgroundColor: BRAND_COLORS.bgFallback,
        // Viñeta: más clara arriba/centro (donde va el logo, deja ver la imagen)
        // y más oscura hacia los bordes, igual criterio que renderMobile.
        backgroundImage: `radial-gradient(120% 90% at 50% 15%, rgba(11,6,32,0.35) 0%, rgba(11,6,32,0.8) 55%, rgba(11,6,32,0.96) 100%), url(${BRAND_ASSETS.background})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: 'cover',
      }}
    >
      {/* Logo del bootcamp: mismo bloque que renderMobile, sobre el fondo oscuro.
          Se oculta con la cámara activa para dejarle todo el alto disponible al
          visor, igual que renderMobileCamera tampoco lo muestra. */}
      {BRAND_ASSETS.bootcampLogo && !cameraOn && (
        <Box
          component="img"
          src={BRAND_ASSETS.bootcampLogo}
          alt="Ciudad Maderas Bootcamp 2026"
          sx={{ width: 'min(42%, 240px)', maxHeight: '80vh', height: 'auto', objectFit: 'contain' }}
        />
      )}

      <Paper
        sx={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '75dvh',
          overflowY: 'auto',
          borderRadius: '26px',
          bgcolor: BRAND_COLORS.paper,
          boxShadow: '0 32px 70px rgba(11, 6, 32, 0.42)',
          p: { xs: 3, md: 4 },
        }}
      >
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: alpha(BRAND_COLORS.textDark, 0.45),
            textAlign: 'center',
          }}
        >
          Ciudad Maderas · Bootcamp 2026
        </Typography>

        <Typography
          sx={{
            fontFamily: DISPLAY_FONT,
            fontSize: 26,
            fontWeight: 300,
            lineHeight: 1.15,
            letterSpacing: '0.01em',
            color: BRAND_COLORS.textDark,
            textAlign: 'center',
            mt: 0.75,
            mb: cameraOn ? 1.5 : 0.75,
          }}
        >
          Escanear código QR
        </Typography>

        {!cameraOn && (
          <Box sx={{ textAlign: 'center', pt: 1.5 }}>
            <Typography
              sx={{
                color: alpha(BRAND_COLORS.textDark, 0.6),
                fontSize: 13,
                lineHeight: 1.5,
                mb: 2,
                maxWidth: 320,
                mx: 'auto',
              }}
            >
              Apunta la cámara al código QR de la invitación para registrar la entrada.
            </Typography>

            {/* Mismo botón que renderMobile (ícono QR + texto en 2 líneas), con
                borde en vez de blanco puro porque aquí vive sobre tarjeta clara. */}
            <ButtonBase
              onClick={startScanner}
              sx={{
                width: '100%',
                maxWidth: 260,
                mx: 'auto',
                bgcolor: BRAND_COLORS.paper,
                border: `1px solid ${BRAND_COLORS.hairline}`,
                color: BRAND_COLORS.textDark,
                borderRadius: 150,
                px: 2.5,
                py: 1.25,
                gap: 1.5,
                boxShadow: '0 10px 24px rgba(11, 6, 32, 0.12)',
                transition: 'box-shadow 160ms ease, transform 160ms ease',
                '&:hover': {
                  boxShadow: '0 14px 30px rgba(11, 6, 32, 0.18)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                component="img"
                src={BRAND_ASSETS.qrIcon}
                alt=""
                sx={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 500, textAlign: 'left', lineHeight: 1.2 }}>
                Clic para<br />Escanear QR
              </Typography>
            </ButtonBase>

            {/* Pie de marca: mismo texto que renderMobile, mismo tratamiento de
                logo (filtrado a oscuro) que ya usa resultCard sobre tarjeta clara. */}
            <Box sx={{ height: '1px', bgcolor: BRAND_COLORS.hairline, mt: 2.5 }} />
            <Typography
              sx={{ color: alpha(BRAND_COLORS.textDark, 0.5), fontSize: 11, mt: 1.5 }}
            >
              Mailing and ticketing service provided by:
            </Typography>
            <Box
              component="img"
              src={BRAND_ASSETS.maderasStudioLogo}
              alt="Maderas Studio"
              sx={{
                width: 84,
                height: 'auto',
                display: 'block',
                mx: 'auto',
                mt: 1,
                opacity: 0.85,
                filter: MADERAS_LOGO_DARK_FILTER,
              }}
            />
          </Box>
        )}

        {cameraOn && (
          <Box>
            <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', bgcolor: '#000', height: 'min(48vh, 380px)' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                onClick={handleFocusTap}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {frozenFrame && (
                <Box component="img" src={frozenFrame} alt=""
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {focusPoint && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: focusPoint.x,
                    top: focusPoint.y,
                    width: 56,
                    height: 56,
                    ml: '-28px',
                    mt: '-28px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.9)',
                    pointerEvents: 'none',
                    animation: 'focusRing 600ms ease-out both',
                    '@keyframes focusRing': {
                      from: { opacity: 1, transform: 'scale(1.3)' },
                      to: { opacity: 0, transform: 'scale(1)' },
                    },
                  }}
                />
              )}

              {/* marco guía + texto instructivo: mismo criterio que renderMobileCamera */}
              {!RESULT_STATES.includes(state) && (
                <>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'min(50%, 220px)',
                      aspectRatio: '1 / 1',
                      border: '3px solid rgba(255,255,255,0.85)',
                      borderRadius: 4,
                      boxShadow: '0 0 0 100vmax rgba(0,0,0,0.35)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Typography
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 14,
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 500,
                      px: 4,
                    }}
                  >
                    Apunta la cámara al código QR de la invitación · Toca para enfocar
                  </Typography>
                </>
              )}

              {(state === SCAN_STATES.DETECTED || state === SCAN_STATES.VALIDATING) && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.45)', flexDirection: 'column', gap: 1 }}>
                  <CircularProgress color="success" />
                  <Typography color="#fff" fontWeight={700}>{cameraOverlayText}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <ButtonBase
                onClick={reset}
                aria-label="Cancelar escaneo"
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: alpha(BRAND_COLORS.textDark, 0.55),
                  px: 2,
                  py: 0.5,
                  borderRadius: 150,
                  '&:hover': { color: BRAND_COLORS.textDark, bgcolor: alpha(BRAND_COLORS.textDark, 0.04) },
                }}
              >
                Cancelar
              </ButtonBase>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );

  // -------------------------------------------------------------------- móvil
  const renderMobileCamera = () => (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (t) => t.zIndex.modal - 1, // por debajo del popout de resultado
        bgcolor: '#000',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        onClick={handleFocusTap}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {frozenFrame && (
        <Box component="img" src={frozenFrame} alt=""
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {focusPoint && (
        <Box
          sx={{
            position: 'absolute',
            left: focusPoint.x,
            top: focusPoint.y,
            width: 56,
            height: 56,
            ml: '-28px',
            mt: '-28px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.9)',
            pointerEvents: 'none',
            animation: 'focusRing 600ms ease-out both',
            '@keyframes focusRing': {
              from: { opacity: 1, transform: 'scale(1.3)' },
              to: { opacity: 0, transform: 'scale(1)' },
            },
          }}
        />
      )}

      {/* marco guía: se oculta cuando el popout de resultado toma el foco.
          pointerEvents: 'none' — si no, este overlay captura los taps en el
          centro de la pantalla y el tap-to-focus del <video> nunca se entera. */}
      {!RESULT_STATES.includes(state) && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(70vw, 280px)',
              aspectRatio: '1 / 1',
              border: '3px solid rgba(255,255,255,0.85)',
              borderRadius: 4,
              boxShadow: '0 0 0 100vmax rgba(0,0,0,0.45)',
              pointerEvents: 'none',
            }}
          />

          <Typography
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)',
              textAlign: 'center',
              color: '#fff',
              fontWeight: 500,
              px: 4,
              pointerEvents: 'none',
            }}
          >
            Apunta la cámara al código QR de la invitación · Toca para enfocar
          </Typography>
        </>
      )}

      <IconButton
        aria-label="Cerrar cámara"
        onClick={reset}
        sx={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          right: 8,
          color: '#fff',
          bgcolor: 'rgba(0,0,0,0.35)',
        }}
      >
        <CloseIcon />
      </IconButton>

      {(state === SCAN_STATES.DETECTED || state === SCAN_STATES.VALIDATING) && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.6)', flexDirection: 'column', gap: 1 }}>
          <CircularProgress color="success" />
          <Typography color="#fff" fontWeight={700}>{cameraOverlayText}</Typography>
        </Box>
      )}
    </Box>
  );

  const renderMobile = () => (
    <>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'center',
          px: 3,
          pt: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          backgroundColor: BRAND_COLORS.bgFallback,
          backgroundImage: `linear-gradient(180deg, rgba(11,6,32,0) 45%, rgba(11,6,32,0.92) 100%), url(${BRAND_ASSETS.background})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          backgroundSize: '100% 100%',
        }}
      >
        {/* Espacio reservado para el logo: se pinta en cuanto BRAND_ASSETS.bootcampLogo tenga URL. */}
        <Box
          sx={{
            width: '84%',
            maxWidth: 360,
            height: '38vh',
            mt: '6vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {BRAND_ASSETS.bootcampLogo && (
            <Box
              component="img"
              src={BRAND_ASSETS.bootcampLogo}
              alt="Ciudad Maderas Bootcamp 2026"
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </Box>

        <Box sx={{ width: '100%', maxWidth: 280, my: 4 }}>
          <ButtonBase
            onClick={startScanner}
            sx={{
              width: '100%',
              bgcolor: '#fff',
              color: BRAND_COLORS.textDark,
              borderRadius: 150,
              px: 3,
              py: 2.5,
              gap: 2,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}
          >
            <Box
              component="img"
              src={BRAND_ASSETS.qrIcon}
              alt=""
              sx={{ width: 46, height: 46, objectFit: 'contain', flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: 15, fontWeight: 350, textAlign: 'left', lineHeight: 1.25 }}>
              Clic para<br />Escanear QR
            </Typography>
          </ButtonBase>
        </Box>

        <Box>
          <Typography sx={{ color: BRAND_COLORS.textSoft, fontSize: 13, fontWeight: 400, mb: 1.5 }}>
            Mailing and ticketing service provided by:
          </Typography>
          <Box
            component="img"
            src={BRAND_ASSETS.maderasStudioLogo}
            alt="Maderas Studio"
            sx={{ width: 180, maxWidth: '60%', height: 'auto', mx: 'auto', display: 'block' }}
          />
        </Box>
      </Box>

      {cameraOn && renderMobileCamera()}
    </>
  );

  return (
    <>
      {isMobile ? renderMobile() : renderDesktop()}

      {/* Resultado del escaneo: popout sobre el último cuadro de la cámara.
          Solo se cierra con sus botones (sin backdrop ni Esc). */}
      <Dialog
        open={RESULT_STATES.includes(state)}
        onClose={(_e, reason) => { if (reason !== 'backdropClick') reset(); }}
        disableEscapeKeyDown
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            position: 'relative',
            m: 2,
            borderRadius: '26px',
            bgcolor: BRAND_COLORS.paper,
            overflow: 'hidden',
            boxShadow: '0 32px 70px rgba(11, 6, 32, 0.42)',
            // Filete de estado al canto superior: lectura periférica del resultado.
            borderTop: `3px solid ${presentation.color}`,
          },
        }}
      >
        <DialogContent sx={{ px: 4, pt: 6.5, pb: 4, display: 'flex', flexDirection: 'column' }}>
          {resultCard}
        </DialogContent>
      </Dialog>
    </>
  );
}
