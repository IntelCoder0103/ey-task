import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { authApi } from '../../api/client';
import type { AuthResponse, Credentials, Registration } from '../../api/schemas';
import { session } from '../../api/session';

const meKey = (token: string | null) => ['me', token] as const;

export const useSessionToken = () => useSyncExternalStore(session.subscribe, session.get);

export const useMe = () => {
  const token = useSessionToken();
  return useQuery({ queryKey: meKey(token), queryFn: authApi.me, enabled: token !== null });
};

export const useCurrentUser = () => {
  const { data } = useMe();
  if (!data) throw new Error('useCurrentUser must be rendered inside <RequireAuth>.');
  return data;
};

const useAuthMutation = <V>(request: (variables: V) => Promise<AuthResponse>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: ({ user, token }) => {
      client.clear();
      client.setQueryData(meKey(token), user);
      session.set(token);
    },
  });
};

export const useSignIn = () => useAuthMutation<Credentials>(authApi.login);

export const useRegister = () => useAuthMutation<Registration>(authApi.register);

export const useSignOut = () =>
  useMutation({
    mutationFn: () => authApi.logout().catch(() => null),
    onSettled: session.clear,
  });

export const useClearCacheOnSignOut = () => {
  const client = useQueryClient();
  useEffect(
    () =>
      session.subscribe(() => {
        if (session.get() === null) client.clear();
      }),
    [client],
  );
};
