import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuthStore } from '../../stores/authStore.js';
import { extractError } from '../../services/api.js';
import { Wordmark } from '../../components/Wordmark.jsx';
import { GlitchFigure } from '../../components/GlitchFigure.jsx';
import { BrandFooter } from '../../components/BrandFooter.jsx';
import { COLORS, GRADIENTS, LINES, claim, eyebrow, FONTS } from '../../theme/tokens.js';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/scan', { replace: true });
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Pantalla partida: a la izquierda el bloque oscuro de campaña, a la
          derecha el bloque neutro de acceso. Se tocan pero no se mezclan; esa
          es la regla de composición de la identidad. */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
        }}
      >
        {/* ── Bloque oscuro ─────────────────────────────────────────────── */}
        <Box
          sx={{
            position: 'relative',
            backgroundImage: GRADIENTS.hero,
            color: COLORS.onDark,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: { xs: 3.5, md: 7 },
            pt: { xs: 6, md: 8 },
            pb: { xs: 6, md: 8 },
            // Filete duotono en el canto que da al bloque de acceso: abajo
            // cuando los bloques se apilan, al costado cuando van en paralelo.
            '&::after': {
              content: '""',
              position: 'absolute',
              backgroundImage: GRADIENTS.duotone,
              inset: 'auto 0 0 0',
              height: 2,
            },
            '@media (min-width: 900px)': {
              '&::after': {
                inset: '0 0 0 auto',
                width: 2,
                height: 'auto',
                backgroundImage: GRADIENTS.duotoneVertical,
              },
            },
          }}
        >
          <Wordmark />

          <Box sx={{ py: { xs: 6, md: 8 } }}>
            <Typography component="p" sx={{ ...eyebrow(COLORS.onDarkFaint), mb: 2 }}>
              Control de acceso · Edición 2026
            </Typography>

            <Typography component="h1" sx={{ ...claim('clamp(56px, 9vw, 118px)'), m: 0 }}>
              Bootcamp
            </Typography>

            {/* Único gesto duotono de la pantalla. */}
            <Box sx={{ mt: { xs: 0.5, md: 1 } }}>
              <GlitchFigure size="clamp(56px, 9vw, 118px)">2026</GlitchFigure>
            </Box>

            <Box sx={{ width: 56, height: '1px', bgcolor: LINES.onDark, my: { xs: 4, md: 5 } }} />

            {/* Contraste de pesos: la primera línea susurra, la segunda afirma. */}
            <Typography
              sx={{
                maxWidth: '26ch',
                fontSize: { xs: 20, md: 25 },
                fontWeight: 200,
                lineHeight: 1.4,
                color: COLORS.onDarkSoft,
              }}
            >
              Hay eventos a los que asistes.
              <Box
                component="span"
                sx={{ display: 'block', fontWeight: 700, color: COLORS.onDark, mt: 0.75 }}
              >
                Y hay eventos que cambian la forma en que inviertes.
              </Box>
            </Typography>
          </Box>

          <Typography sx={{ fontSize: 12, fontWeight: 300, color: COLORS.onDarkFaint, letterSpacing: '0.04em' }}>
            Ciudad Maderas · Maderas Studio
          </Typography>
        </Box>

        {/* ── Bloque neutro: el acceso ──────────────────────────────────── */}
        <Box
          sx={{
            backgroundColor: COLORS.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3.5, md: 7 },
            py: { xs: 6, md: 8 },
          }}
        >
          <Box component="form" onSubmit={onSubmit} sx={{ width: '100%', maxWidth: 380 }}>
            <Typography component="p" sx={{ ...eyebrow(), mb: 2 }}>
              Acceso al panel
            </Typography>

            <Typography
              component="h2"
              sx={{
                fontFamily: FONTS.serif,
                fontWeight: 400,
                fontSize: { xs: 34, md: 40 },
                lineHeight: 1.1,
                letterSpacing: '0.01em',
                color: COLORS.text,
                m: 0,
              }}
            >
              Tu acceso es personal.
            </Typography>

            <Typography sx={{ mt: 2, mb: 4, fontSize: 14, color: COLORS.textSoft, lineHeight: 1.75 }}>
              Solo el equipo del Bootcamp valida los códigos en la puerta. Entra con
              el correo con el que te dimos de alta.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <TextField
              label="Correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="email"
              required
            />
            <TextField
              label="Contraseña"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="current-password"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPass((v) => !v)}
                      edge="end"
                      aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3.5 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Entrar'}
            </Button>

            <Box sx={{ height: '1px', bgcolor: LINES.hairline, mt: 5, mb: 2.5 }} />
            <Typography sx={{ fontSize: 11.5, color: COLORS.neutral, lineHeight: 1.7 }}>
              Cada sesión y cada validación quedan registradas a nombre de quien entra.
            </Typography>
          </Box>
        </Box>
      </Box>

      <BrandFooter />
    </Box>
  );
}
