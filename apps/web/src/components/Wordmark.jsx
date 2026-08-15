import { Box, Typography } from '@mui/material';
import { COLORS, FONTS } from '../theme/tokens.js';

// Marca en dos pisos: el nombre en serif (herencia) y la campaña en
// condensada (impacto). Nunca se mezclan en la misma línea; esa separación es
// lo que impide que la marca se lea como un logotipo genérico de producto.
export function Wordmark({ size = 'md', color = COLORS.onDark, softColor = COLORS.onDarkSoft }) {
  const compact = size === 'sm';

  return (
    <Box sx={{ lineHeight: 1 }}>
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontFamily: FONTS.serif,
          fontWeight: 400,
          fontSize: compact ? 19 : 26,
          letterSpacing: '0.06em',
          lineHeight: 1.1,
          color,
        }}
      >
        Ciudad Maderas
      </Typography>
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontFamily: FONTS.condensed,
          fontWeight: 700,
          fontSize: compact ? 11 : 13,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          mt: compact ? 0.1 : 0.3,
          color: softColor,
        }}
      >
        Bootcamp 2026
      </Typography>
    </Box>
  );
}
