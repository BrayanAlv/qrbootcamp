import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout.jsx';
import { RequireAuth } from './RequireAuth.jsx';
import { RequireAdmin } from './RequireAdmin.jsx';
import { LoginPage } from '../pages/Login/LoginPage.jsx';

// Code-splitting por ruta: cada página se carga al navegar a ella, reduciendo
// el JS que se evalúa al arrancar y por interacción de navegación.
const ScanQRPage = lazy(() => import('../pages/ScanQR/ScanQRPage.jsx').then((m) => ({ default: m.ScanQRPage })));
const ListadoPage = lazy(() => import('../pages/Listado/ListadoPage.jsx').then((m) => ({ default: m.ListadoPage })));
const AdminImportPage = lazy(() => import('../pages/AdminImport/AdminImportPage.jsx').then((m) => ({ default: m.AdminImportPage })));
const AdminUsersPage = lazy(() => import('../pages/AdminUsers/AdminUsersPage.jsx').then((m) => ({ default: m.AdminUsersPage })));
const HealthPage = lazy(() => import('../pages/HealthPage.jsx').then((m) => ({ default: m.HealthPage })));

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/scan" replace /> },
          { path: 'scan', element: <ScanQRPage /> },
          { path: 'lista', element: <ListadoPage /> },
          { path: 'health', element: <HealthPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'admin/carga', element: <AdminImportPage /> },
              { path: 'admin/usuarios', element: <AdminUsersPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/scan" replace /> },
]);