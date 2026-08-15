import { Box, Typography } from '@mui/material';
import { COLORS, GRADIENTS, LINES, claim, eyebrow } from '../theme/tokens.js';

// Banda oscura que abre cada pantalla. Es el modo OSCURO de la identidad:
// gradiente diagonal, titular condensado en mayúsculas y una línea de
// posicionamiento en peso ligero. Cierra con un filete duotono que marca el
// salto al modo neutro; ese corte es la única separación entre bloques.
export function PageHero({ label, title, lede, aside, children }) {
  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        backgroundImage: GRADIENTS.hero,
        color: COLORS.onDark,
        px: { xs: 3, md: 6 },
        pt: { xs: 4, md: 6 },
        pb: { xs: 4.5, md: 6 },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          backgroundImage: GRADIENTS.duotone,
        },
      }}
    >
      <Box
        sx={{
          maxWidth: 1180,
          mx: 'auto',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'flex-end' },
          justifyContent: 'space-between',
          gap: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {label && (
            <Typography component="p" sx={{ ...eyebrow(COLORS.onDarkFaint), mb: 1.75 }}>
              {label}
            </Typography>
          )}

          <Typography
            component="h1"
            sx={{ ...claim('clamp(38px, 6vw, 66px)'), color: COLORS.onDark, m: 0 }}
          >
            {title}
          </Typography>

          {lede && (
            <Typography
              sx={{
                mt: 2.25,
                maxWidth: '52ch',
                fontSize: { xs: 14, md: 15.5 },
                fontWeight: 300,
                lineHeight: 1.75,
                color: COLORS.onDarkSoft,
              }}
            >
              {lede}
            </Typography>
          )}

          {children}
        </Box>

        {aside && (
          <Box
            sx={{
              flexShrink: 0,
              pt: { xs: 2.5, md: 0 },
              borderTop: { xs: `1px solid ${LINES.onDark}`, md: 'none' },
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {aside}
          </Box>
        )}
      </Box>
    </Box>
  );
}
