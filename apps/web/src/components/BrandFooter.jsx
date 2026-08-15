import { Box, Typography } from '@mui/material';
import { COLORS, GRADIENTS, PARTNER_STRIP, eyebrow } from '../theme/tokens.js';

// Franja de cierre: el modo SATURADO. Púrpura pleno, logos de aliados en
// blanco y una línea de crédito técnico. No lleva enlaces ni navegación; es un
// remate de marca, no un mapa del sitio.
export function BrandFooter() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundImage: GRADIENTS.strip,
        color: COLORS.onDark,
        px: 3,
        py: { xs: 4, md: 4.5 },
        textAlign: 'center',
      }}
    >
      <Typography component="p" sx={{ ...eyebrow('rgba(255,255,255,0.72)'), mb: 2.5 }}>
        Aliados del Bootcamp
      </Typography>

      <Box
        component="img"
        src={PARTNER_STRIP.src}
        alt="Aliados del Bootcamp Ciudad Maderas 2026"
        loading="lazy"
        sx={{
          display: 'block',
          width: '100%',
          maxWidth: PARTNER_STRIP.maxWidth,
          height: 'auto',
          mx: 'auto',
        }}
      />

      <Typography
        sx={{
          mt: 3,
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.05em',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        Mailing y ticketing por Maderas Studio · Cada código QR es de un solo uso
      </Typography>
    </Box>
  );
}
