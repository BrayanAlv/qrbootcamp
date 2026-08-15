import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'admin') return <Navigate to="/scan" replace />;
  return <Outlet />;
}

export default RequireAdmin;
