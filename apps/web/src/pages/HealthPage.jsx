import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { api } from '../services/api.js';
import { PageHero } from '../components/PageHero.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import { COLORS, FONTS, LINES, eyebrow } from '../theme/tokens.js';

export function HealthPage() {
  const [state, setState] = useState({ loading: true, ok: false, error: null });

  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        const data = res.data;
        setState({
          loading: false,
          ok: data?.success === true && data?.status === 'ok',
          error: null,
        });
      })
      .catch((e) => {
        setState({
          loading: false,
          ok: false,
          error: e?.message || 'No se pudo contactar el API',
        });
      });
  }, []);

  return (
    <>
      <PageHero
        label="Diagnóstico"
        title="Estado del sistema"
        lede="Comprobación directa contra el API que valida los códigos en la puerta."
      />

      <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 4, md: 6 } }}>
        <Box
          sx={{
            maxWidth: 640,
            mx: 'auto',
            bgcolor: COLORS.paper,
            border: `1px solid ${LINES.hairline}`,
            px: { xs: 3, md: 5 },
            py: { xs: 4, md: 5 },
          }}
        >
          <Typography component="p" sx={{ ...eyebrow(), mb: 2 }}>
            Servicio de validación
          </Typography>

          {state.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontSize: 14, color: COLORS.textSoft }}>Consultando el API…</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography
                  sx={{
                    fontFamily: FONTS.serif,
                    fontSize: { xs: 28, md: 34 },
                    fontWeight: 400,
                    lineHeight: 1.2,
                    color: COLORS.text,
                  }}
                >
                  {state.ok ? 'El sistema responde.' : 'El sistema no responde.'}
                </Typography>
                <StatusPill label={state.ok ? 'Operativo' : 'Caído'} tone={state.ok ? 'ok' : 'alert'} />
              </Box>

              <Typography sx={{ mt: 2, fontSize: 14, color: COLORS.textSoft, lineHeight: 1.75 }}>
                {state.ok
                  ? 'Backend y base de datos accesibles. Los códigos QR se pueden validar.'
                  : `Sin conexión con el API: ${state.error}. Revisa el contenedor de la API antes de abrir puertas.`}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </>
  );
}
