import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './theme/index.js';
import { AppLayout } from './layout/AppLayout.jsx';
import { InvitationsPage } from './pages/Invitations/InvitationsPage.jsx';
import { AdminImportPage } from './pages/AdminImport/AdminImportPage.jsx';
import { HealthPage } from './pages/HealthPage.jsx';
import { invitationService } from './services/invitationService.js';
import { useAuthStore } from './stores/authStore.js';
import api from './services/api.js';
import './theme/global.css';

const guests = [
  { name: 'María Fernanda Ochoa', email: 'mf.ochoa@grupovertice.mx' },
  { name: 'Ricardo Salinas Peña', email: 'rsalinas@inmobiliariasur.com' },
  { name: 'Ana Lucía Bermúdez', email: 'ana.bermudez@capitalmx.com' },
  { name: 'Jorge Iván Treviño', email: 'jtrevino@altaresidencial.mx' },
];

const statuses = ['aceptada', 'pendiente', 'expirada', 'rechazada'];
const regiones = ['CDMX', 'NTE', 'OCC', 'SUR'];
const sedes = ['Presencial', 'Virtual', 'Presencial', 'Virtual'];
const asistencias = ['Sí', 'No', 'Sí', 'Sí'];

const items = guests.map((guest, i) => ({
  _id: `id-${i}`,
  guest,
  ccEmail: i % 2 === 0 ? 'p.ruiz@asistentes.mx' : null,
  crmId: String(100001 + i),
  region: regiones[i],
  sede: sedes[i],
  asiste: asistencias[i],
  status: statuses[i],
  emailStatus: { attendee: i !== 1 },
  usedAt: i === 0 ? '2026-03-11' : null,
  eventDate: '12 de marzo, 2026',
}));

useAuthStore.setState({
  user: { name: 'Brayan Álvarez', email: 'brayan.alvarez@ciudadmaderas.com', role: 'admin' },
  accessToken: 'preview',
  initializing: false,
});

invitationService.list = async () => items;
invitationService.listSent = async () => ({ items, total: 128, page: 1, limit: 25 });
invitationService.stats = async () => ({
  total: 128,
  sinEnviar: 12,
  porEstado: { pendiente: 90, aceptada: 26 },
});
api.get = async () => ({ data: { success: true, status: 'ok' } });

const initial = window.location.hash.slice(1) || '/invitations';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/invitations" element={<InvitationsPage />} />
            <Route path="/admin/carga" element={<AdminImportPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="*" element={<Navigate to="/invitations" replace />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
