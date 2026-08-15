import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/index.jsx';
import { theme } from './theme/index.js';
import { configureAuth } from './services/api.js';
import { useAuthStore } from './stores/authStore.js';
import { authService } from './services/authService.js';
import './theme/global.css';

// Conecta el store de auth con el interceptor de Axios (refresh en 401).
configureAuth({
  accessTokenGetter: () => useAuthStore.getState().accessToken,
  accessTokenSetter: (token) => useAuthStore.getState().setAccessToken(token),
  refreshHandler: async () => {
    const refreshed = await authService.refresh();
    useAuthStore.getState().setAccessToken(refreshed.accessToken);
    return refreshed.accessToken;
  },
  authFailureHandler: () => useAuthStore.getState().logout(),
});

// Arranca la sesión (me o refresh) antes de renderizar.
useAuthStore
  .getState()
  .init()
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </React.StrictMode>,
    );
  });