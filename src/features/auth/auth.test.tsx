import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { apiBase } from '../../api/config';
import { session } from '../../api/session';
import { DEMO } from '../../demo';
import { network } from '../../test/network';
import { renderApp, signInAsDemo } from '../../test/renderApp';

describe('sign in', () => {
  it('redirects guests to the sign-in cover', async () => {
    renderApp('/tasks/anything');
    expect(await screen.findByRole('heading', { name: /sign in to your edit/i })).toBeInTheDocument();
  });

  it('validates before calling the API', async () => {
    const { user } = renderApp('/signin');
    await user.click(screen.getByRole('button', { name: /enter the studio/i }));
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the server message for wrong credentials', async () => {
    const { user } = renderApp('/signin');
    await user.type(screen.getByLabelText('Email'), DEMO.email);
    await user.type(screen.getByLabelText('Password'), 'not-it');
    await user.click(screen.getByRole('button', { name: /enter the studio/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('signs in with the demo shortcut and lands on the edit', async () => {
    const { user } = renderApp('/signin');
    await user.click(screen.getByRole('button', { name: /use demo/i }));
    await user.click(screen.getByRole('button', { name: /enter the studio/i }));

    expect(await screen.findByRole('heading', { name: /the edit/i })).toBeInTheDocument();
    expect(screen.getByText('Margaux Ellery')).toBeInTheDocument();
    expect(session.get()).not.toBeNull();
  });

  it('signs out back to the cover', async () => {
    await signInAsDemo();
    const { user } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: /sign out/i }));
    expect(await screen.findByRole('heading', { name: /sign in to your edit/i })).toBeInTheDocument();
    expect(session.get()).toBeNull();
  });

  it('drops a session the server no longer recognises', async () => {
    session.set('stale-token');
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /sign in to your edit/i })).toBeInTheDocument();
  });

  it('offers a retry when the profile cannot load', async () => {
    await signInAsDemo();
    network.use(http.get(`${apiBase}/users/me`, () => HttpResponse.json({}, { status: 503 })));
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent(/having a moment/);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('register', () => {
  it('validates every field', async () => {
    const { user } = renderApp('/register');
    await user.type(screen.getByLabelText('Age'), 'old');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 7 characters.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number.')).toBeInTheDocument();
  });

  it('creates an account and opens an empty edit', async () => {
    const { user } = renderApp('/register');
    await user.type(screen.getByLabelText('Name'), 'Ines Duarte');
    await user.type(screen.getByLabelText('Age'), '31');
    await user.type(screen.getByLabelText('Email'), 'ines@atelier.studio');
    await user.type(screen.getByLabelText('Password'), 'seamstress');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(await screen.findByText('Blank pages are in fashion.')).toBeInTheDocument();
    expect(screen.getByText('Ines Duarte')).toBeInTheDocument();
  });

  it('surfaces duplicate emails', async () => {
    const { user } = renderApp('/register');
    await user.type(screen.getByLabelText('Name'), 'Copycat');
    await user.type(screen.getByLabelText('Email'), DEMO.email);
    await user.type(screen.getByLabelText('Password'), 'seamstress');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/already registered/));
  });
});
