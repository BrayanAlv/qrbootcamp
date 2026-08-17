import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Alert, CircularProgress, Table, TableHead, TableBody,
  TableRow, TableCell, TablePagination, TextField, MenuItem, InputAdornment,
  useMediaQuery, useTheme, Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { invitationService } from '../../services/invitationService.js';
import { extractError } from '../../services/api.js';
import { PageHero } from '../../components/PageHero.jsx';
import { StatusPill, STATUS_TONE } from '../../components/StatusPill.jsx';
import { COLORS, FONTS, LINES, eyebrow, properName } from '../../theme/tokens.js';

const STATUS_FILTERS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'expirada', label: 'Expirada' },
];

const PANEL = { bgcolor: COLORS.paper, border: `1px solid ${LINES.hairline}` };

export function ListadoPage() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

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

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ ...PANEL, display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={26} />
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ ...PANEL, px: 3, py: { xs: 6, md: 8 }, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: FONTS.serif, fontSize: 28, fontWeight: 400, color: COLORS.text }}>
                {status !== '' || debouncedSearch !== '' ? 'Nadie coincide con el filtro.' : 'Aún no hay invitados cargados.'}
              </Typography>
              <Typography sx={{ mt: 1.5, fontSize: 14, color: COLORS.textSoft }}>
                Cambia el estado o limpia la búsqueda.
              </Typography>
            </Box>
          ) : (
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
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '40%' }}>Persona</TableCell>
                        <TableCell>Región · Sede · Asiste</TableCell>
                        <TableCell align="right">Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((inv) => (
                        <TableRow key={inv._id} hover>
                          <TableCell sx={{ py: 1.75 }}>{guestBlock(inv)}</TableCell>
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
    </>
  );
}

export default ListadoPage;