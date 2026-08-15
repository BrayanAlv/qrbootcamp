import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ScanQRPage } from './pages/ScanQR/ScanQRPage.jsx';
import { theme } from './theme/index.js';
import './theme/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ScanQRPage />
    </ThemeProvider>
  </React.StrictMode>,
);
