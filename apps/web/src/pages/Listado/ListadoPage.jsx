import { memo, useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Alert, CircularProgress, Table, TableHead, TableBody,
  TableRow, TableCell, TablePagination, TextField, MenuItem,
  useMediaQuery, useTheme, Stack, Button, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import { invitationService } from '../../services/invitationService.js';
import { extractError } from '../../services/api.js';
import { PageHero } from '../../components/PageHero.jsx';
import { StatusPill, STATUS_TONE } from '../../components/StatusPill.jsx';
import { useAuthStore } from '../../stores/authStore.js';
import { COLORS, FONTS, LINES, eyebrow, properName } from '../../theme/tokens.js';
import { SearchField } from '../../components/SearchField.jsx';

const STATUS_FILTERS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'expirada', label: 'Expirada' },
];

// Estados de la bitácora de escaneos (traducción a español para la UI).
const SCAN_STATUS_LABEL = {
  valid: 'Válido',
  already_used: 'Ya utilizado',
  expired: 'Expirado',
  invalid: 'Inválido',
  error: 'Error',
};
const scanStatusLabel = (s) => SCAN_STATUS_LABEL[s] ?? s ?? '—';

const fmtDate = (iso) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
};
const fmtTime = (iso) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
};

const PANEL = { bgcolor: COLORS.paper, border: `1px solid ${LINES.hairline}` };

const guestBlock = (inv) => (
  <>
    <Typography component="p" sx={{ ...properName, color: COLORS.text }}>
      {inv.guest?.name}
    </Typography>
    <Typography sx={{ fontSize: 12, color: COLORS.neutral, overflowWrap: 'anywhere' }}>
      {inv.guest?.email}
    </Typography>
  </>
);

const metaBlock = (inv) => (
  <Typography sx={{ mt: 0.5, fontSize: 11, color: COLORS.textSoft, overflowWrap: 'anywhere' }}>
    {[inv.region, inv.sede, inv.asiste].filter(Boolean).join(' · ')}
    {inv.crmId ? ` · CRM ${inv.crmId}` : ''}
  </Typography>
);

// Primer escaneo válido (fecha + hora + operador).
const firstScanBlock = (inv) => {
  const s = inv.scan ?? {};
  if (!s.firstAt) {
    return <Typography sx={{ fontSize: 12, color: COLORS.textSoft }}>—</Typography>;
  }
  return (
    <>
      <Typography sx={{ fontSize: 12, color: COLORS.text }}>{fmtDate(s.firstAt)}</Typography>
      <Typography sx={{ fontSize: 11, color: COLORS.neutral }}>
        {fmtTime(s.firstAt)}{s.firstBy?.name ? ` · ${s.firstBy.name}` : ''}
      </Typography>
    </>
  );
};

// Último intento (fecha/hora + resultado + operador).
const lastScanBlock = (inv) => {
  const s = inv.scan ?? {};
  if (!s.lastAt) {
    return <Typography sx={{ fontSize: 12, color: COLORS.textSoft }}>—</Typography>;
  }
  return (
    <>
      <Typography sx={{ fontSize: 12, color: COLORS.text }}>
        {fmtDate(s.lastAt)} <Box component="span" sx={{ color: COLORS.neutral }}>{fmtTime(s.lastAt)}</Box>
      </Typography>
      <Typography sx={{ fontSize: 11, color: COLORS.neutral }}>
        {scanStatusLabel(s.lastStatus)}{s.lastBy?.name ? ` · ${s.lastBy.name}` : ''}
      </Typography>
    </>
  );
};

const historyButton = (inv, onOpenHistory) => (
  <Tooltip title="Ver historial de intentos">
    <IconButton size="small" onClick={() => onOpenHistory(inv)} aria-label={`Historial de ${inv.guest?.name}`}>
      <HistoryIcon sx={{ fontSize: 18, color: COLORS.neutral }} />
    </IconButton>
  </Tooltip>
);

// Panel (tabla + paginación + estados vacío/carga) memoizado: no se re-renderiza
// cuando cambian estados de la página ajenos a las filas (export, errores...).
const GuestsPanel = memo(function GuestsPanel({
  items, total, page, rowsPerPage, isCompact, loading, hasFilters,
  onOpenHistory, onPageChange, onRowsPerPageChange,
}) {
  if (loading) {
    return (
      <Box sx={{ ...PANEL, display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }
  if (items.length === 0) {
    return (
      <Box sx={{ ...PANEL, px: 3, py: { xs: 6, md: 8 }, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: FONTS.serif, fontSize: 28, fontWeight: 400, color: COLORS.text }}>
          {hasFilters ? 'Nadie coincide con el filtro.' : 'Aún no hay invitados cargados.'}
        </Typography>
        <Typography sx={{ mt: 1.5, fontSize: 14, color: COLORS.textSoft }}>
          Cambia el estado o limpia la búsqueda.
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={PANEL}>
      {isCompact ? (
        <Box>
          {items.map((inv, index) => (
            <Box
              key={inv._id}
              sx={{
                px: 2.5,
                py: 3,
                borderTop: index === 0 ? 'none' : `1px solid ${LINES.hairline}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                  {guestBlock(inv)}
                  {metaBlock(inv)}
                </Box>
                <StatusPill label={inv.status} tone={STATUS_TONE[inv.status] ?? 'mute'} />
              </Stack>
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: COLORS.textSoft }}>
                  Primer escaneo: {fmtDate(inv.scan?.firstAt) ?? '—'}
                  {fmtTime(inv.scan?.firstAt) ? ` · ${fmtTime(inv.scan?.firstAt)}` : ''}
                  {' '}· Intentos: {inv.scan?.attempts ?? 0}
                  {' '}· Último: {scanStatusLabel(inv.scan?.lastStatus)}
                </Typography>
                {historyButton(inv, onOpenHistory)}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '26%' }}>Persona</TableCell>
                <TableCell>Región · Sede · Asiste</TableCell>
                <TableCell align="right">Estado</TableCell>
                <TableCell>Primer escaneo</TableCell>
                <TableCell align="center">Intentos</TableCell>
                <TableCell>Último intento</TableCell>
                <TableCell align="center" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((inv) => (
                <TableRow key={inv._id} hover>
                  <TableCell sx={{ py: 1.75 }}>
                    {guestBlock(inv)}
                    {metaBlock(inv)}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12.5, color: COLORS.text }}>
                      {[inv.region, inv.sede, inv.asiste].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                    {inv.crmId && (
                      <Typography sx={{ mt: 0.25, fontSize: 11, color: COLORS.neutral }}>
                        CRM {inv.crmId}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <StatusPill label={inv.status} tone={STATUS_TONE[inv.status] ?? 'mute'} />
                  </TableCell>
                  <TableCell>{firstScanBlock(inv)}</TableCell>
                  <TableCell align="center">
                    <Typography sx={{ fontSize: 14, fontVariantNumeric: 'tabular-nums', color: COLORS.text }}>
                      {inv.scan?.attempts ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell>{lastScanBlock(inv)}</TableCell>
                  <TableCell align="center">{historyButton(inv, onOpenHistory)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Filas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        sx={{
          borderTop: `1px solid ${LINES.hairline}`,
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: 12,
            color: COLORS.textSoft,
          },
        }}
      />
    </Box>
  );
});

export function ListadoPage() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const role = useAuthStore((s) => s.user?.role);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Exportación Excel (solo admin) e historial por persona.
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [historyInv, setHistoryInv] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => { setPage(0); }, [status, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invitationService.listRegistry({
        status,
        q: debouncedSearch,
        page: page + 1,
        limit: rowsPerPage,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      await invitationService.exportExcel();
    } catch (e) {
      setExportError(extractError(e).message);
    } finally {
      setExporting(false);
    }
  }, []);

  const openHistory = useCallback(async (inv) => {
    setHistoryInv(inv);
    setHistoryItems([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const data = await invitationService.scanHistory(inv._id, { page: 1, limit: 200 });
      setHistoryItems(data.items ?? []);
    } catch (e) {
      setHistoryError(extractError(e).message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  return (
    <>
      <PageHero
        label="Puerta"
        title={<>Personas<br />y estatus</>}
        lede="Padrón completo de invitados. Consulta a nombre de quién está cada acceso, cómo va y qué le corresponde en puerta."
        aside={
          !loading && !error ? (
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography component="p" sx={{ fontFamily: FONTS.condensed, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 54, color: COLORS.onDark, lineHeight: 1 }}>
                {total}
              </Typography>
              <Typography component="p" sx={{ ...eyebrow(COLORS.onDarkFaint), mt: 0.5 }}>
                {total === 1 ? 'Persona' : 'Personas'}
              </Typography>
            </Box>
          ) : null
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <SearchField
              placeholder="Buscar por nombre o email"
              onChange={setDebouncedSearch}
            />
            <TextField
              select
              size="small"
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: { sm: 210 } }}
            >
              {STATUS_FILTERS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            {role === 'admin' && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={exporting || loading}
                onClick={handleExport}
                sx={{ alignSelf: { sm: 'flex-start' }, whiteSpace: 'nowrap' }}
              >
                {exporting ? 'Exportando…' : 'Exportar Excel'}
              </Button>
            )}
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {exportError && <Alert severity="error" sx={{ mb: 3 }}>{exportError}</Alert>}

          <GuestsPanel
            items={items}
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            isCompact={isCompact}
            loading={loading}
            hasFilters={status !== '' || debouncedSearch !== ''}
            onOpenHistory={openHistory}
            onPageChange={(_e, next) => setPage(next)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
          />
        </Box>
      </Box>

      {/* Historial de intentos de una persona */}
      <Dialog
        open={historyInv !== null}
        onClose={() => setHistoryInv(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontFamily: FONTS.condensed,
            fontWeight: 700,
            fontSize: 24,
            color: COLORS.text,
            px: 3,
            pt: 2.5,
            pb: 1,
          }}
        >
          Historial de escaneos
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3 }}>
          {historyInv && (
            <Box sx={{ mb: 2 }}>
              <Typography component="p" sx={{ ...properName, color: COLORS.text }}>
                {historyInv.guest?.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.textSoft }}>
                {historyInv.guest?.email}
                {historyInv.crmId ? ` · CRM ${historyInv.crmId}` : ''}
              </Typography>
            </Box>
          )}

          {historyError && <Alert severity="error" sx={{ mb: 2 }}>{historyError}</Alert>}

          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={26} />
            </Box>
          ) : historyItems.length === 0 ? (
            <Typography sx={{ py: 3, textAlign: 'center', color: COLORS.textSoft }}>
              Sin intentos registrados para esta persona.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: 80 }}>Intento</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Hora</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell>Primero válido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyItems.map((h) => (
                  <TableRow key={h._id}>
                    <TableCell align="center">
                      <Typography sx={{ fontVariantNumeric: 'tabular-nums', color: COLORS.text }}>
                        {h.attemptNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{fmtDate(h.scannedAt) ?? '—'}</TableCell>
                    <TableCell>{fmtTime(h.scannedAt) ?? '—'}</TableCell>
                    <TableCell>{h.scanner?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Typography sx={{ color: COLORS.text }}>{scanStatusLabel(h.status)}</Typography>
                    </TableCell>
                    <TableCell>{h.isFirstValid ? 'Sí' : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setHistoryInv(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ListadoPage;