import { Box } from '@mui/material';
import { COLORS, claim } from '../theme/tokens.js';

// Cifra clave en duotono desalineado (rojo/azul sobre blanco). Es el único
// gesto "ruidoso" de la identidad: va una sola vez por pantalla y siempre
// dentro del hero oscuro, nunca sobre neutro ni sobre la franja saturada.
//
// El glitch se dispara al entrar y para: queda el desfase fijo de 3px. Un
// bucle infinito convertiría un detalle de marca en una distracción.
export function GlitchFigure({ children, size = 'clamp(72px, 13vw, 148px)', offset = 3 }) {
  const text = String(children);

  const ghost = {
    content: `"${text}"`,
    position: 'absolute',
    inset: 0,
    // `screen` deja el blanco intacto donde las capas se superponen: el número
    // se lee blanco y el color solo asoma en los bordes desalineados.
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block', ...claim(size), color: COLORS.onDark }}>
      <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>{text}</Box>

      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          '&::before': { ...ghost, color: COLORS.duoRed, transform: `translateX(-${offset}px)` },
          '&::after': { ...ghost, color: COLORS.duoBlue, transform: `translateX(${offset}px)` },
          '@media (prefers-reduced-motion: no-preference)': {
            '&::before': { animation: 'glitchLeft 880ms steps(1, end) both' },
            '&::after': { animation: 'glitchRight 880ms steps(1, end) 60ms both' },
          },
          '@keyframes glitchLeft': {
            '0%': { transform: 'translate(-14px, 3px)', clipPath: 'inset(16% 0 54% 0)' },
            '22%': { transform: 'translate(9px, -4px)', clipPath: 'inset(64% 0 6% 0)' },
            '46%': { transform: 'translate(-11px, 2px)', clipPath: 'inset(2% 0 78% 0)' },
            '70%': { transform: 'translate(5px, 0px)', clipPath: 'inset(46% 0 28% 0)' },
            '100%': { transform: `translate(-${offset}px, 0)`, clipPath: 'inset(0 0 0 0)' },
          },
          '@keyframes glitchRight': {
            '0%': { transform: 'translate(13px, -3px)', clipPath: 'inset(58% 0 10% 0)' },
            '22%': { transform: 'translate(-8px, 4px)', clipPath: 'inset(6% 0 70% 0)' },
            '46%': { transform: 'translate(10px, -1px)', clipPath: 'inset(38% 0 34% 0)' },
            '70%': { transform: 'translate(-4px, 0px)', clipPath: 'inset(74% 0 4% 0)' },
            '100%': { transform: `translate(${offset}px, 0)`, clipPath: 'inset(0 0 0 0)' },
          },
        }}
      />
    </Box>
  );
}
