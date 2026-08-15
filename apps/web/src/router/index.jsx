import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout.jsx';
import { RequireAuth } from './RequireAuth.jsx';
import { RequireAdmin } from './RequireAdmin.jsx';
import { LoginPage } from '../pages/Login/LoginPage.jsx';
import { ScanQRPage } from '../pages/ScanQR/ScanQRPage.jsx';
import { InvitationsPage } from '../pages/Invitations/InvitationsPage.jsx';
import { AdminImportPage } from '../pages/AdminImport/AdminImportPage.jsx';
import { HealthPage } from '../pages/HealthPage.jsx';

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
          { path: 'invitations', element: <InvitationsPage /> },
          { path: 'health', element: <HealthPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'admin/carga', element: <AdminImportPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/scan" replace /> },
]);