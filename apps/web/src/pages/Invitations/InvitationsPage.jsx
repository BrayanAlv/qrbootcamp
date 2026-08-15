import { useEffect, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { invitationService } from '../../services/invitationService.js';
import { extractError } from '../../services/api.js';
import { PageHero } from '../../components/PageHero.jsx';
import { StatusPill, STATUS_TONE } from '../../components/StatusPill.jsx';
import { COLORS, FONTS, LINES, eyebrow, figure, properName } from '../../theme/tokens.js';

export function InvitationsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    invitationService
      .list()
      .then((data) => setList(data))
      .catch((e) => setError(extractError(e).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        label="Tu lista"
        title={<>Tus<br />invitaciones</>}
        lede="Cada código es personal y se usa una sola vez. Aquí ves a nombre de quién está emitido y en qué punto va."
        aside={
          !loading && !error ? (
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography component="p" sx={{ ...figure, fontSize: 54, color: COLORS.onDark }}>
                {list.length}
              </Typography>
              <Typography component="p" sx={{ ...eyebrow(COLORS.onDarkFaint), mt: 0.5 }}>
                {list.length === 1 ? 'Invitación' : 'Invitaciones'}
              </Typography>
            </Box>
          ) : null
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={26} />
            </Box>
          ) : list.length === 0 ? (
            <Box
              sx={{
                bgcolor: COLORS.paper,
                border: `1px solid ${LINES.hairline}`,
                px: { xs: 3, md: 6 },
                py: { xs: 6, md: 8 },
                textAlign: 'center',
              }}
            >
              <Typography component="p" sx={{ ...eyebrow(), mb: 2 }}>
                Lista vacía
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.serif,
                  fontSize: { xs: 26, md: 32 },
                  fontWeight: 400,
                  lineHeight: 1.2,
                  color: COLORS.text,
                }}
              >
                Todavía no hay ninguna invitación a tu nombre.
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: COLORS.textSoft }}>
                En cuanto se emita, el código QR llega a tu correo.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ bgcolor: COLORS.paper, border: `1px solid ${LINES.hairline}` }}>
              {list.map((inv, index) => (
                <Box
                  key={inv._id}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { sm: 'center' },
                    gap: { xs: 1.5, sm: 3 },
                    px: { xs: 2.5, md: 4 },
                    py: { xs: 3, md: 3.5 },
                    borderTop: index === 0 ? 'none' : `1px solid ${LINES.hairline}`,
                  }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography component="p" sx={{ ...properName, color: COLORS.text }}>
                      {inv.guest.name}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.75,
                        fontSize: 12.5,
                        color: COLORS.neutral,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {inv.guest.email}
                      {inv.eventDate ? ` · ${inv.eventDate}` : ''}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { sm: 'column' },
                      alignItems: { xs: 'center', sm: 'flex-end' },
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <StatusPill label={inv.status} tone={STATUS_TONE[inv.status] ?? 'mute'} />
                    {inv.status === 'pendiente' && (
                      <Typography sx={{ fontSize: 11, color: COLORS.neutral, textAlign: { sm: 'right' } }}>
                        Escanea tu QR en la puerta
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
