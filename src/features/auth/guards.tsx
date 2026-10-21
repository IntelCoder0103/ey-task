import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { PageLoader } from '../../ui/PageLoader';
import { useMe, useSessionToken } from './hooks';

type FromState = { from?: string } | null;

export const RequireAuth = () => {
  const token = useSessionToken();
  const me = useMe();
  const location = useLocation();

  if (token === null) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (me.isPending) return <PageLoader label="Opening the studio" />;
  if (me.isError) return <ErrorPanel error={me.error} onRetry={() => me.refetch()} />;
  return <Outlet />;
};

export const GuestOnly = () => {
  const token = useSessionToken();
  const from = (useLocation().state as FromState)?.from;
  return token === null ? <Outlet /> : <Navigate to={from ?? '/'} replace />;
};
