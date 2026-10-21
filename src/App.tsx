import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth } from './features/auth/guards';
import { useClearCacheOnSignOut } from './features/auth/hooks';
import { RegisterPage } from './features/auth/RegisterPage';
import { SignInPage } from './features/auth/SignInPage';
import { StudioLayout } from './features/studio/StudioLayout';
import { TaskDetailPage } from './features/tasks/TaskDetailPage';
import { TaskListPage } from './features/tasks/TaskListPage';

export const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export const AppRoutes = () => {
  useClearCacheOnSignOut();
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<StudioLayout />}>
          <Route index element={<TaskListPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App = ({ client }: { client: QueryClient }) => (
  <QueryClientProvider client={client}>
    <BrowserRouter future={routerFuture}>
      <AppRoutes />
    </BrowserRouter>
  </QueryClientProvider>
);
