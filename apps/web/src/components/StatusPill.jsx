import { Box } from '@mui/material';
import { COLORS, LINES } from '../theme/tokens.js';

// Estado en versalitas sobre un filete, en lugar de la píldora de color de
// serie: dentro del sistema el estado es un dato, no una alerta. El color solo
// separa lo resuelto (teal) de lo que exige acción (rojo de campaña).
const TONES = {
  ok: { fg: COLORS.inkTeal, bg: 'rgba(11, 59, 60, 0.09)', bd: 'rgba(11, 59, 60, 0.22)' },
  wait: { fg: COLORS.textSoft, bg: 'rgba(140, 140, 150, 0.12)', bd: LINES.hairlineStrong },
  alert: { fg: COLORS.duoRed, bg: 'rgba(230, 57, 70, 0.08)', bd: 'rgba(230, 57, 70, 0.28)' },
  mute: { fg: COLORS.neutral, bg: 'transparent', bd: LINES.hairline },
};

export const STATUS_TONE = {
  aceptada: 'ok',
  pendiente: 'wait',
  rechazada: 'alert',
  expirada: 'mute',
};

export function StatusPill({ label, tone = 'wait' }) {
  const t = TONES[tone] ?? TONES.wait;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.15,
        py: 0.45,
        borderRadius: 0.5,
        border: `1px solid ${t.bd}`,
        backgroundColor: t.bg,
        color: t.fg,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}
