import { createTheme } from '@mui/material/styles';
import { COLORS, FONTS, LINES } from './tokens.js';

// El tema cubre el modo NEUTRO de la identidad: contenido, formularios y
// tablas sobre gris claro. Las zonas oscuras y la franja saturada se pintan en
// los componentes (`PageHero`, `BrandFooter`) con los gradientes de tokens.js.
//
// Se evita a propósito sobrescribir Paper, Dialog, Chip y CircularProgress:
// son los componentes de los que cuelga la pantalla de escaneo, que queda tal
// cual. Lo único que hereda de aquí es la paleta.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: COLORS.inkNavy, dark: COLORS.inkTeal, light: COLORS.inkViolet, contrastText: COLORS.white },
    secondary: { main: COLORS.saturated, light: COLORS.saturatedHi, contrastText: COLORS.white },
    error: { main: COLORS.duoRed },
    info: { main: COLORS.duoBlue },
    success: { main: COLORS.inkTeal },
    background: { default: COLORS.surface, paper: COLORS.paper },
    text: { primary: COLORS.text, secondary: COLORS.textSoft },
    divider: LINES.hairline,
  },
  // Radio corto: el lujo aquí es el filete y el aire, no la esquina blanda.
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: FONTS.body,
    button: {
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.65 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 2, paddingInline: 20 },
        sizeLarge: { paddingBlock: 14, fontSize: 12.5 },
        outlined: { borderColor: LINES.hairlineStrong },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          backgroundColor: COLORS.white,
          '& fieldset': { borderColor: LINES.hairlineStrong },
          '&:hover fieldset': { borderColor: COLORS.neutral },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 14, '&.Mui-focused': { color: COLORS.inkNavy } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: LINES.hairline },
        head: {
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: COLORS.neutral,
          backgroundColor: 'transparent',
          borderBottomColor: LINES.hairlineStrong,
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.inkNavy,
          fontSize: 11,
          letterSpacing: '0.04em',
          borderRadius: 2,
        },
        arrow: { color: COLORS.inkNavy },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 2, fontSize: 13.5, alignItems: 'center' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontFamily: FONTS.serif, fontSize: 26, fontWeight: 500 },
      },
    },
  },
});
