import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Stack, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  TextField, MenuItem, InputAdornment, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SendIcon from '@mui/icons-material/Send';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { invitationService } from '../../services/invitationService.js';
import { extractError } from '../../services/api.js';
import { PageHero } from '../../components/PageHero.jsx';
import { StatusPill, STATUS_TONE } from '../../components/StatusPill.jsx';
import { COLORS, FONTS, LINES, eyebrow, figure, properName } from '../../theme/tokens.js';
import { toCsv, downloadCsv } from '../../utils/csv.js';

const STATUS_FILTERS = [
  { value: '', label: 'Todos los estados' },
  { value: 'sin_enviar', label: 'Correo sin enviar' },
  { value: 'fallido', label: 'Correo fallido' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'expirada', label: 'Expirada' },
];

const EMPTY_GUEST_FORM = { region: '', crmId: '', nombre: '', sede: '', asiste: '', email: '', emailCc: '' };

const ERROR_CSV_HEADERS = [
  { key: 'region', label: 'REGIÓN' },
  { key: 'crmId', label: 'ID CRM' },
  { key: 'nombre', label: 'NOMBRE COMPLETO' },
  { key: 'sede', label: 'SEDE' },
  { key: 'asiste', label: 'ASISTE' },
  { key: 'email', label: 'CORREO 1' },
  { key: 'emailCc', label: 'CORREO 2' },
  { key: 'errores', label: 'ERRORES' },
];

const EMPTY_STATS = { total: 0, sinEnviar: 0, porEstado: {} };

const PANEL = {
  bgcolor: COLORS.paper,
  border: `1px solid ${LINES.hairline}`,
};

function MailPill({ sent, applicable }) {
  if (!applicable) return <StatusPill label="No aplica" tone="mute" />;
  return <StatusPill label={sent ? 'Enviado' : 'Sin enviar'} tone={sent ? 'ok' : 'wait'} />;
}

// Cifra con su microetiqueta. Va en el riel de conteo, no en el hero: aquí el
// número es un dato de operación, no un titular.
function Figure({ value, label, accent = COLORS.text }) {
  return (
    <Box sx={{ px: { xs: 2, md: 3.5 }, py: { xs: 2.25, md: 2.75 }, minWidth: 0 }}>
      <Typography component="p" sx={{ ...figure, fontSize: { xs: 34, md: 42 }, color: accent }}>
        {value}
      </Typography>
      <Typography component="p" sx={{ ...eyebrow(), mt: 0.75 }}>
        {label}
      </Typography>
    </Box>
  );
}

export function AdminImportPage() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);

  // Filtros y paginación. `page` es 0-indexado (convención de MUI); el API espera 1-indexado.
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  const [sendingId, setSendingId] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const [sendError, setSendError] = useState(null);
  const sendPollRef = useRef(null);

  // { type: 'resend' | 'delete', inv }
  const [confirm, setConfirm] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_GUEST_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Al cambiar un filtro, volver a la primera página (si no, se vería una página vacía).
  useEffect(() => {
    setPage(0);
  }, [status, debouncedSearch]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [data, counters] = await Promise.all([
        invitationService.listSent({
          status,
          q: debouncedSearch,
          page: page + 1,
          limit: rowsPerPage,
        }),
        invitationService.stats(),
      ]);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setStats(counters);
    } catch (e) {
      setListError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page, rowsPerPage]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileName(file?.name ?? '');
  };

  const onImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await invitationService.importExcel(selectedFile);
      setImportResult(result);
      setSelectedFile(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadList();
    } catch (e) {
      setImportError(extractError(e).message);
    } finally {
      setImporting(false);
    }
  };

  const onSendOne = async (id) => {
    setSendingId(id);
    setSendError(null);
    try {
      await invitationService.sendOne(id);
      await loadList();
    } catch (e) {
      setSendError(extractError(e).message);
    } finally {
      setSendingId(null);
    }
  };

  // El envío corre en segundo plano en el servidor (puede tardar minutos con
  // miles de correos); acá solo hacemos polling del progreso cada 2s.
  const pollSendStatus = useCallback(async () => {
    try {
      const state = await invitationService.sendStatus();
      setSendProgress(state);
      if (state.running) {
        sendPollRef.current = setTimeout(pollSendStatus, 2000);
      } else {
        setBulkSending(false);
        await loadList();
      }
    } catch (e) {
      setSendError(extractError(e).message);
      setBulkSending(false);
    }
  }, [loadList]);

  useEffect(() => () => clearTimeout(sendPollRef.current), []);

  const onSendAllPending = async () => {
    setBulkSending(true);
    setSendError(null);
    setSendProgress(null);
    try {
      const state = await invitationService.sendAll();
      setSendProgress(state);
      if (state.running) {
        sendPollRef.current = setTimeout(pollSendStatus, 2000);
      } else {
        setBulkSending(false);
        await loadList();
      }
    } catch (e) {
      setSendError(extractError(e).message);
      setBulkSending(false);
    }
  };

  const onDownloadErrorsCsv = () => {
    if (!importResult?.errors?.length) return;
    const rows = importResult.errors.map((e) => ({ ...e.row, errores: e.errores.join('; ') }));
    downloadCsv('invitados-con-error.csv', toCsv(rows, ERROR_CSV_HEADERS));
  };

  const onAddGuest = async () => {
    setAddSaving(true);
    setAddError(null);
    try {
      await invitationService.create(addForm);
      setAddOpen(false);
      setAddForm(EMPTY_GUEST_FORM);
      await loadList();
    } catch (e) {
      setAddError(extractError(e).message);
    } finally {
      setAddSaving(false);
    }
  };

  const onConfirm = async () => {
    if (!confirm) return;
    setConfirming(true);
    setSendError(null);
    try {
      if (confirm.type === 'resend') await invitationService.resendOne(confirm.inv._id);
      else await invitationService.remove(confirm.inv._id);
      setConfirm(null);
      await loadList();
    } catch (e) {
      setSendError(extractError(e).message);
      setConfirm(null);
    } finally {
      setConfirming(false);
    }
  };

  // `ccEmail` va en copia del mismo correo, así que hay un único estado de envío.
  const isSent = (inv) => inv.emailStatus?.attendee === true;

  const hasFilters = status !== '' || debouncedSearch !== '';

  // Las tres acciones de una fila. Se comparten entre la tabla de escritorio y
  // las fichas de móvil para que el vocabulario sea idéntico en ambos.
  const rowActions = (inv, { full = false } = {}) => (
    <Stack direction="row" spacing={0.5} justifyContent={full ? 'flex-start' : 'flex-end'} alignItems="center">
      <Button
        size="small"
        variant={full ? 'outlined' : 'text'}
        disabled={isSent(inv) || sendingId === inv._id}
        onClick={() => onSendOne(inv._id)}
        startIcon={sendingId === inv._id ? <CircularProgress size={13} /> : <SendIcon sx={{ fontSize: 15 }} />}
        sx={{ fontSize: 10.5 }}
      >
        Enviar
      </Button>
      <Tooltip title={inv.usedAt ? 'La invitación ya fue utilizada' : 'Reenviar con un QR nuevo'}>
        <span>
          <IconButton
            size="small"
            aria-label="Reenviar invitación"
            disabled={!isSent(inv) || Boolean(inv.usedAt)}
            onClick={() => setConfirm({ type: 'resend', inv })}
            sx={{ color: COLORS.inkNavy }}
          >
            <ForwardToInboxIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={inv.usedAt ? 'La invitación ya fue utilizada' : 'Eliminar invitado'}>
        <span>
          <IconButton
            size="small"
            aria-label="Eliminar invitado"
            disabled={Boolean(inv.usedAt)}
            onClick={() => setConfirm({ type: 'delete', inv })}
            sx={{ color: COLORS.duoRed }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  const guestBlock = (inv) => (
    <>
      <Typography component="p" sx={{ ...properName, color: COLORS.text }}>
        {inv.guest.name}
      </Typography>
      <Typography sx={{ fontSize: 12, color: COLORS.neutral, overflowWrap: 'anywhere' }}>
        {inv.guest.email}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: COLORS.textSoft, overflowWrap: 'anywhere' }}>
        {[inv.region, inv.sede, inv.asiste].filter(Boolean).join(' · ')}
        {inv.crmId ? ` · CRM ${inv.crmId}` : ''}
      </Typography>
      {inv.guest.emailError && (
        <Typography sx={{ mt: 0.5, fontSize: 11, color: COLORS.duoRed, overflowWrap: 'anywhere' }}>
          Error de envío: {inv.guest.emailError}
        </Typography>
      )}
    </>
  );

  return (
    <>
      <PageHero
        label="Administración"
        title="Control de invitados"
        lede="Cada fila del archivo se convierte en un acceso único. Cárgalos, revisa a quién le llegó el correo y reemite solo lo necesario."
      />

      {/* Riel de conteo: el pulso de la operación, en cifras tabulares. */}
      <Box sx={{ px: { xs: 2.5, md: 6 }, pt: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            ...PANEL,
            maxWidth: 1180,
            mx: 'auto',
            // Los filetes entre cifras son el propio fondo asomando por el gap:
            // así se parten limpio al pasar de 4 columnas a 2.
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: '1px',
            backgroundColor: LINES.hairline,
            '& > *': { backgroundColor: COLORS.paper },
          }}
        >
          <Figure value={stats.total} label="Cargadas" />
          <Figure
            value={stats.sinEnviar}
            label="Correo sin enviar"
            accent={stats.sinEnviar > 0 ? COLORS.duoRed : COLORS.text}
          />
          <Figure value={stats.porEstado?.pendiente ?? 0} label="Pendientes" />
          <Figure value={stats.porEstado?.aceptada ?? 0} label="Aceptadas" accent={COLORS.inkTeal} />
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 3, md: 4 } }}>
        <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
          {/* ── Bloque funcional: la carga del archivo ─────────────────── */}
          <Box
            sx={{
              backgroundColor: '#E7E7EC',
              border: `1px solid ${LINES.hairlineStrong}`,
              px: { xs: 2.5, md: 4 },
              py: { xs: 3, md: 3.5 },
              mb: { xs: 4, md: 5 },
            }}
          >
            <Typography component="p" sx={{ ...eyebrow(), mb: 2 }}>
              Carga masiva
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon sx={{ fontSize: 17 }} />}>
                Elegir archivo
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv"
                  onChange={onFileChange}
                />
              </Button>

              <Typography
                sx={{
                  flexGrow: 1,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: fileName ? COLORS.text : COLORS.textSoft,
                  fontWeight: fileName ? 600 : 400,
                  overflowWrap: 'anywhere',
                }}
              >
                {fileName || 'Columnas: región, id_crm, nombre_completo, sede, asiste, correo1, correo2'}
              </Typography>

              <Button
                variant="contained"
                disabled={!selectedFile || importing}
                onClick={onImport}
                startIcon={importing ? <CircularProgress size={14} color="inherit" /> : null}
              >
                Importar
              </Button>
            </Stack>

            {importError && <Alert severity="error" sx={{ mt: 2.5 }}>{importError}</Alert>}
            {importResult && (
              <Alert severity={importResult.errors?.length ? 'warning' : 'success'} sx={{ mt: 2.5 }}>
                Total: {importResult.total} · Nuevos: {importResult.inserted} · Ya existían: {importResult.skippedExisting}
                {importResult.errors?.length ? ` · Filas con error: ${importResult.errors.length}` : ''}
                {importResult.errors?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {importResult.errors.map((e) => (
                      <Typography key={e.fila} sx={{ fontSize: 12 }}>
                        Fila {e.fila}: {e.errores.join(', ')}
                      </Typography>
                    ))}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
                      onClick={onDownloadErrorsCsv}
                      sx={{ mt: 1.5, fontSize: 11 }}
                    >
                      Descargar filas con error
                    </Button>
                  </Box>
                )}
              </Alert>
            )}
          </Box>

          {/* ── Listado ─────────────────────────────────────────────────── */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ sm: 'flex-end' }}
            sx={{ mb: 2.5 }}
          >
            <Box>
              <Typography component="p" sx={{ ...eyebrow(), mb: 1 }}>
                Listado
              </Typography>
              <Typography
                component="h2"
                sx={{
                  fontFamily: FONTS.serif,
                  fontSize: { xs: 28, md: 34 },
                  fontWeight: 400,
                  lineHeight: 1.1,
                  color: COLORS.text,
                  m: 0,
                }}
              >
                Invitados cargados
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
              <Button
                variant="outlined"
                startIcon={<PersonAddAlt1Icon sx={{ fontSize: 16 }} />}
                onClick={() => setAddOpen(true)}
                sx={{ flex: { xs: 1, sm: 'initial' } }}
              >
                Agregar invitado
              </Button>
              <Button
                variant="outlined"
                startIcon={bulkSending ? <CircularProgress size={14} /> : <SendIcon sx={{ fontSize: 16 }} />}
                disabled={bulkSending}
                onClick={onSendAllPending}
                sx={{ flex: { xs: 1, sm: 'initial' } }}
              >
                Enviar pendientes
              </Button>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              size="small"
              placeholder="Buscar por nombre o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: COLORS.neutral }} />
                  </InputAdornment>
                ),
              }}
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
          </Stack>

          {sendError && <Alert severity="error" sx={{ mb: 2.5 }}>{sendError}</Alert>}
          {sendProgress && (
            <Alert severity={sendProgress.running ? 'info' : sendProgress.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2.5 }}>
              {sendProgress.running
                ? `Enviando… ${sendProgress.processed}/${sendProgress.total} · ${sendProgress.failed} fallidos`
                : sendProgress.total > 0
                  ? `Envío terminado: ${sendProgress.sent} enviados · ${sendProgress.failed} fallidos de ${sendProgress.total}`
                  : 'No había correos pendientes de enviar.'}
              {' '}Un correo puede fallar de forma permanente (dominio de envío sin verificar, dirección inexistente); revisa el filtro "Correo fallido" para ver el motivo de cada uno.
            </Alert>
          )}
          {listError && <Alert severity="error" sx={{ mb: 2.5 }}>{listError}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={26} />
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ ...PANEL, px: 3, py: { xs: 6, md: 8 }, textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: FONTS.serif,
                  fontSize: { xs: 24, md: 28 },
                  fontWeight: 400,
                  color: COLORS.text,
                }}
              >
                {hasFilters
                  ? 'Ningún invitado coincide con el filtro.'
                  : 'Todavía no cargaste ningún invitado.'}
              </Typography>
              <Typography sx={{ mt: 1.5, fontSize: 14, color: COLORS.textSoft }}>
                {hasFilters
                  ? 'Cambia el estado o limpia la búsqueda.'
                  : 'Sube el archivo de invitados para generar sus accesos.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={PANEL}>
              {/* Escritorio: tabla con filetes. Móvil: una ficha por invitado,
                  porque una tabla de siete columnas en un teléfono solo se
                  puede leer arrastrando. */}
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
                        <Box sx={{ minWidth: 0 }}>{guestBlock(inv)}</Box>
                        <StatusPill label={inv.status} tone={STATUS_TONE[inv.status] ?? 'mute'} />
                      </Stack>

                      {inv.ccEmail && (
                        <Typography sx={{ mt: 1.25, fontSize: 12, color: COLORS.textSoft }}>
                          Copia: {inv.ccEmail}
                        </Typography>
                      )}

                      {/* En la tabla el encabezado dice qué es el indicador;
                          en la ficha hay que decirlo en la propia fila. */}
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
                        <Typography component="span" sx={{ ...eyebrow(), minWidth: 92 }}>
                          Correo
                        </Typography>
                        <MailPill sent={inv.emailStatus?.attendee === true} applicable />
                      </Stack>

                      <Box sx={{ mt: 2 }}>{rowActions(inv, { full: true })}</Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '30%' }}>Invitado</TableCell>
                        <TableCell>Copia</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Correo</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((inv) => (
                        <TableRow key={inv._id} hover>
                          <TableCell sx={{ py: 1.75 }}>{guestBlock(inv)}</TableCell>
                          <TableCell>
                            {inv.ccEmail ? (
                              <Typography sx={{ fontSize: 11.5, color: COLORS.neutral, overflowWrap: 'anywhere' }}>
                                {inv.ccEmail}
                              </Typography>
                            ) : (
                              <Box component="span" sx={{ color: COLORS.neutral }}>—</Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusPill label={inv.status} tone={STATUS_TONE[inv.status] ?? 'mute'} />
                          </TableCell>
                          <TableCell><MailPill sent={inv.emailStatus?.attendee === true} applicable /></TableCell>
                          <TableCell align="right">{rowActions(inv)}</TableCell>
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
                onPageChange={(_e, next) => setPage(next)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
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
          )}
        </Box>
      </Box>

      <Dialog
        open={Boolean(confirm)}
        onClose={() => !confirming && setConfirm(null)}
        slotProps={{ paper: { sx: { borderRadius: 0.5, borderTop: `3px solid ${confirm?.type === 'delete' ? COLORS.duoRed : COLORS.inkNavy}` } } }}
      >
        <DialogTitle>
          {confirm?.type === 'resend' ? 'Reenviar invitación' : 'Eliminar invitado'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14, lineHeight: 1.75 }}>
            {confirm?.type === 'resend' ? (
              <>
                Se enviará de nuevo el correo a <strong>{confirm?.inv?.guest?.email}</strong>
                {confirm?.inv?.ccEmail ? ` y en copia a ${confirm.inv.ccEmail}` : ''}.
                {' '}Se genera un <strong>código QR nuevo</strong> y el enviado antes deja de funcionar.
              </>
            ) : (
              <>
                Se eliminará a <strong>{confirm?.inv?.guest?.name}</strong> ({confirm?.inv?.guest?.email}).
                {' '}Esta acción no se puede deshacer.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirm(null)} disabled={confirming} sx={{ color: COLORS.textSoft }}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirming}
            color={confirm?.type === 'delete' ? 'error' : 'primary'}
            variant="contained"
            startIcon={confirming ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {confirm?.type === 'resend' ? 'Reenviar' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => !addSaving && setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar invitado</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <TextField
              label="Nombre completo"
              required
              value={addForm.nombre}
              onChange={(e) => setAddForm((f) => ({ ...f, nombre: e.target.value }))}
            />
            <TextField
              label="ID CRM"
              required
              value={addForm.crmId}
              onChange={(e) => setAddForm((f) => ({ ...f, crmId: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Región"
                value={addForm.region}
                onChange={(e) => setAddForm((f) => ({ ...f, region: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Sede"
                value={addForm.sede}
                onChange={(e) => setAddForm((f) => ({ ...f, sede: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              label="Asiste"
              value={addForm.asiste}
              onChange={(e) => setAddForm((f) => ({ ...f, asiste: e.target.value }))}
            />
            <TextField
              label="Correo 1"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              label="Correo 2 (copia)"
              value={addForm.emailCc}
              onChange={(e) => setAddForm((f) => ({ ...f, emailCc: e.target.value }))}
              helperText="Alcanza con que uno de los dos correos sea válido: ese recibe el QR."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddOpen(false)} disabled={addSaving} sx={{ color: COLORS.textSoft }}>
            Cancelar
          </Button>
          <Button
            onClick={onAddGuest}
            disabled={addSaving || !addForm.nombre.trim() || !addForm.crmId.trim()}
            variant="contained"
            startIcon={addSaving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AdminImportPage;
