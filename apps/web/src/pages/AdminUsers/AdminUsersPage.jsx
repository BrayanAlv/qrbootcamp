import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Stack, Switch, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { usersService } from '../../services/usersService.js';
import { extractError } from '../../services/api.js';
import { PageHero } from '../../components/PageHero.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { COLORS, FONTS, LINES, eyebrow, figure, properName } from '../../theme/tokens.js';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'user' };

const PANEL = {
  bgcolor: COLORS.paper,
  border: `1px solid ${LINES.hairline}`,
};

const ROLE_LABEL = { admin: 'Administrador', user: 'Acceso puerta' };

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await usersService.list());
    } catch (e) {
      setError(extractError(e).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onAdd = async () => {
    setSaving(true);
    setAddError(null);
    try {
      await usersService.create(form);
      setAddOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setAddError(extractError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (user) => {
    setError(null);
    try {
      await usersService.update(user._id, { isActive: !user.isActive });
      await load();
    } catch (e) {
      setError(extractError(e).message);
    }
  };

  return (
    <>
      <PageHero
        label="Administración"
        title={<>Acceso<br />de puerta</>}
        lede="Da de alta a quién escaneará y consultará el listado de personas con su estatus. El rol de puerta no carga, envía ni elimina invitaciones."
      />

      <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ sm: 'flex-end' }}
            sx={{ mb: 3 }}
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
                Usuarios
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon sx={{ fontSize: 16 }} />}
              onClick={() => setAddOpen(true)}
              sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
            >
              Nuevo usuario
            </Button>
          </Stack>

          {loading ? (
            <Box sx={{ ...PANEL, display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={26} />
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ ...PANEL, px: 3, py: { xs: 6, md: 8 }, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: FONTS.serif, fontSize: 28, fontWeight: 400, color: COLORS.text }}>
                Todavía no hay usuarios.
              </Typography>
              <Typography sx={{ mt: 1.5, fontSize: 14, color: COLORS.textSoft }}>
                Crea el primero para que pueda escanear y ver el listado de personas.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ ...PANEL, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '34%' }}>Usuario</TableCell>
                    <TableCell>Acceso</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Activo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell sx={{ py: 1.75 }}>
                        <Typography component="p" sx={{ ...properName, color: COLORS.text }}>
                          {user.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: COLORS.neutral, overflowWrap: 'anywhere' }}>
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusPill label={ROLE_LABEL[user.role] ?? user.role} tone={user.role === 'admin' ? 'ok' : 'wait'} />
                      </TableCell>
                      <TableCell>
                        <StatusPill label={user.isActive ? 'Activo' : 'Inactivo'} tone={user.isActive ? 'ok' : 'mute'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={user.isActive ? 'Desactivar acceso' : 'Activar acceso'}>
                          <span>
                            <Switch
                              size="small"
                              checked={user.isActive}
                              onChange={() => onToggleActive(user)}
                              disabled={saving}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Totales compactos */}
          <Box
            sx={{
              ...PANEL,
              mt: 3,
              maxWidth: 1180,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: '1px',
              backgroundColor: LINES.hairline,
              '& > *': { backgroundColor: COLORS.paper },
            }}
          >
            <StatBox value={users.length} label="Usuarios" />
            <StatBox value={users.filter((u) => u.role === 'user').length} label="Acceso puerta" />
            <StatBox value={users.filter((u) => u.role === 'admin').length} label="Administradores" />
            <StatBox value={users.filter((u) => !u.isActive).length} label="Inactivos" accent={COLORS.duoRed} />
          </Box>
        </Box>
      </Box>

      <Dialog open={addOpen} onClose={() => !saving && setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <TextField
              label="Nombre completo"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Correo"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              label="Contraseña"
              type="password"
              required
              helperText="Mínimo 8 caracteres."
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <TextField
              select
              label="Acceso"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              helperText="'Acceso puerta' solo escanea y ve el listado de personas."
            >
              <MenuItem value="user">Acceso puerta</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving} sx={{ color: COLORS.textSoft }}>
            Cancelar
          </Button>
          <Button
            onClick={onAdd}
            disabled={saving || !form.name.trim() || !form.email.trim() || form.password.length < 8}
            variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function StatBox({ value, label, accent = COLORS.text }) {
  return (
    <Box sx={{ px: 3, py: 2.75, minWidth: 0 }}>
      <Typography component="p" sx={{ ...figure, fontSize: 34, color: accent }}>
        {value}
      </Typography>
      <Typography component="p" sx={{ ...eyebrow(), mt: 0.75 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default AdminUsersPage;