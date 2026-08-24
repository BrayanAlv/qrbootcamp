import { Suspense, useState } from 'react';
import {
  Box, Typography, ButtonBase, IconButton, Tooltip, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider, useMediaQuery, useTheme,
  CircularProgress,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { Wordmark } from '../components/Wordmark.jsx';
import { BrandFooter } from '../components/BrandFooter.jsx';
import { COLORS, FONTS, LINES } from '../theme/tokens.js';

const NAV = [
  { path: '/scan', label: 'Escanear', icon: <QrCodeScannerIcon fontSize="small" /> },
  { path: '/lista', label: 'Listado', icon: <PeopleOutlineIcon fontSize="small" /> },
  { path: '/admin/carga', label: 'Invitados', icon: <UploadFileIcon fontSize="small" />, adminOnly: true },
  { path: '/admin/usuarios', label: 'Usuarios', icon: <PersonAddAlt1Icon fontSize="small" />, adminOnly: true },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [menuAnchor, setMenuAnchor] = useState(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === 'admin';
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  const isScan = location.pathname.startsWith('/scan');
  // Sin coincidencia (p. ej. /health) no se marca ninguna sección: es preferible
  // a señalar una en la que no estás.
  const active = NAV.find((item) => location.pathname.startsWith(item.path))?.path ?? null;

  // En móvil, /scan es una pantalla full-bleed con el branding del evento: sin
  // barra ni franja de cierre. La pantalla de escaneo se deja intacta.
  const hideChrome = useMediaQuery(theme.breakpoints.down('sm')) && isScan;

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const goTo = (path) => {
    setMenuAnchor(null);
    navigate(path);
  };

  const navMenu = (
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={() => setMenuAnchor(null)}
      slotProps={{ paper: { sx: { borderRadius: 0.5, mt: 1, minWidth: 210 } } }}
    >
      {items.map((item) => (
        <MenuItem
          key={item.path}
          onClick={() => goTo(item.path)}
          selected={item.path === active}
          sx={{ py: 1.25, fontSize: 13.5 }}
        >
          <ListItemIcon sx={{ color: COLORS.neutral }}>{item.icon}</ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13.5 }}>{item.label}</ListItemText>
        </MenuItem>
      ))}
      <Divider />
      <MenuItem onClick={() => { setMenuAnchor(null); onLogout(); }} sx={{ py: 1.25 }}>
        <ListItemIcon sx={{ color: COLORS.neutral }}><LogoutIcon fontSize="small" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: 13.5 }}>Cerrar sesión</ListItemText>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: COLORS.surface }}>
      {/* Cabecera: mástil sólido en el verde más profundo del gradiente. El
          hero de cada página arranca en ese mismo tono, así que el degradado
          parece salir de aquí en lugar de empezar de cero. */}
      {!hideChrome && (
        <Box
          component="header"
          sx={{
            backgroundColor: COLORS.inkTeal,
            borderBottom: `1px solid ${LINES.onDark}`,
            px: { xs: 2.5, md: 6 },
            py: { xs: 1.5, md: 2 },
          }}
        >
          <Box
            sx={{
              maxWidth: 1180,
              mx: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 2, md: 5 },
            }}
          >
            <ButtonBase
              onClick={() => navigate('/scan')}
              aria-label="Ir al inicio"
              sx={{ textAlign: 'left', borderRadius: 0.5, px: 0.5, py: 0.5, ml: -0.5 }}
            >
              <Wordmark size="sm" />
            </ButtonBase>

            <Box sx={{ flexGrow: 1 }} />

            {!isMobile && (
              <Box component="nav" aria-label="Secciones" sx={{ display: 'flex', gap: 3.5 }}>
                {items.map((item) => {
                  const isActive = item.path === active;
                  return (
                    <ButtonBase
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      aria-current={isActive ? 'page' : undefined}
                      sx={{
                        position: 'relative',
                        px: 0.25,
                        py: 1,
                        fontFamily: FONTS.body,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: isActive ? COLORS.onDark : COLORS.onDarkSoft,
                        transition: 'color 160ms ease',
                        '&:hover': { color: COLORS.onDark },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 2,
                          backgroundColor: COLORS.onDark,
                          transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                          transformOrigin: 'left',
                          transition: 'transform 200ms ease',
                        },
                        '&:hover::after': { transform: 'scaleX(1)', backgroundColor: COLORS.onDarkFaint },
                      }}
                    >
                      {item.label}
                    </ButtonBase>
                  );
                })}
              </Box>
            )}

            {!isMobile && user && (
              <Box sx={{ textAlign: 'right', pl: 2, borderLeft: `1px solid ${LINES.onDark}` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.onDark, lineHeight: 1.3 }}>
                  {user.name}
                </Typography>
                <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.onDarkFaint }}>
                  {isAdmin ? 'Administración' : 'Acceso'}
                </Typography>
              </Box>
            )}

            {isMobile ? (
              <IconButton
                aria-label="Abrir menú"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ color: COLORS.onDark }}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <Tooltip title="Cerrar sesión">
                <IconButton onClick={onLogout} aria-label="Cerrar sesión" sx={{ color: COLORS.onDarkSoft, '&:hover': { color: COLORS.onDark } }}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Móvil + /scan: la pantalla de escaneo ocupa todo, el menú flota. */}
      {hideChrome && (
        <IconButton
          aria-label="Abrir menú"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            right: 8,
            zIndex: (t) => t.zIndex.appBar,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <MoreVertIcon />
        </IconButton>
      )}

      {navMenu}

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
              <CircularProgress size={26} />
            </Box>
          }
        >
          <Outlet />
        </Suspense>
      </Box>

      {/* La franja de cierre no entra en /scan: esa pantalla queda tal cual. */}
      {!isScan && <BrandFooter />}
    </Box>
  );
}
