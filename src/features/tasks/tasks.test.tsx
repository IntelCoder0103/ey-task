import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { apiBase } from '../../api/config';
import { renderApp, signInAsDemo } from '../../test/renderApp';
import { backend, network } from '../../test/network';
import { SEARCH_DEBOUNCE_MS, UNDO_MS } from './TaskListPage';

const rowTitles = () =>
  within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('link')
    .map((link) => link.textContent);

const stored = (description: string) => backend.ordered().find((task) => task.description === description);

const openEdit = async (route = '/', options?: { fakeTimers?: boolean }) => {
  await signInAsDemo();
  const view = renderApp(route, options);
  await screen.findByRole('list', { name: 'Tasks' });
  return view;
};

describe('the edit (task list)', () => {
  it('lists the demo tasks with numbering, counts and progress', async () => {
    await openEdit();
    expect(rowTitles()).toHaveLength(5);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Finished' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByRole('button', { name: /finished\s*2/i })).toBeInTheDocument();
  });

  it('adds a task optimistically and keeps it after the server confirms', async () => {
    const { user } = await openEdit();
    await user.type(screen.getByLabelText('New task'), 'Steam the silk blouse{Enter}');

    expect(screen.getByText('Steam the silk blouse')).toBeInTheDocument();
    expect(screen.getByLabelText('New task')).toHaveValue('');
    await waitFor(() => expect(rowTitles()).toContain('Steam the silk blouse'));
    expect(stored('Steam the silk blouse')).toMatchObject({ position: 5 });
  });

  it('pauses reordering while a new task is still being filed', async () => {
    let release: () => void = () => undefined;
    network.use(
      http.post(
        `${apiBase}/tasks`,
        () =>
          new Promise<Response>(
            (resolve) => (release = () => resolve(HttpResponse.json({}, { status: 503 }))),
          ),
      ),
    );
    const { user } = await openEdit();
    await user.type(screen.getByLabelText('New task'), 'Press the pleats{Enter}');

    expect(screen.getByText('Press the pleats')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move/ })).not.toBeInTheDocument();

    release();
    expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save');
    expect(screen.getAllByRole('button', { name: /^Move/ }).length).toBeGreaterThan(0);
  });

  it('ignores blank submissions', async () => {
    const { user } = await openEdit();
    await user.type(screen.getByLabelText('New task'), '   ');
    expect(screen.getByRole('button', { name: /add to the edit/i })).toBeDisabled();
  });

  it('toggles completion and filters by status', async () => {
    const { user } = await openEdit();
    const checkbox = screen.getByRole('checkbox', { name: /finished: draft the autumn moodboard/i });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await waitFor(() => expect(stored('Draft the autumn moodboard')?.completed).toBe(true));

    await user.click(screen.getByRole('button', { name: /^finished/i }));
    expect(rowTitles()).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /in progress/i }));
    expect(rowTitles()).not.toContain('Draft the autumn moodboard');
  });

  it('rolls back an optimistic toggle when the server refuses', async () => {
    network.use(
      http.patch(`${apiBase}/tasks/:id`, () => HttpResponse.json({ error: 'Nope' }, { status: 500 })),
    );
    const { user } = await openEdit();
    const checkbox = screen.getByRole('checkbox', { name: /finished: draft the autumn moodboard/i });
    await user.click(checkbox);

    expect(await screen.findByRole('alert')).toHaveTextContent('That change didn’t save — Nope');
    expect(checkbox).not.toBeChecked();
  });

  it('reorders with the move buttons and persists the order on the server', async () => {
    const { user, unmount } = await openEdit();
    const [first, second] = rowTitles();
    await user.click(screen.getByRole('button', { name: `Move “${second}” up` }));
    expect(rowTitles().slice(0, 2)).toEqual([second, first]);
    expect(screen.getByRole('button', { name: `Move “${second}” up` })).toBeDisabled();
    await waitFor(() => expect(stored(second!)?.position).toBe(0));

    unmount();
    renderApp('/');
    await screen.findByRole('list', { name: 'Tasks' });
    expect(rowTitles().slice(0, 2)).toEqual([second, first]);
  });

  it('searches on the server, keeps numbering and pauses reordering', async () => {
    const { user } = await openEdit();
    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'TAILOR');

    await waitFor(() => expect(rowTitles()).toEqual(['Call the tailor about the trouser hem']));
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move/ })).not.toBeInTheDocument();
    expect(screen.getByText('Clear the search to rearrange')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(rowTitles()).toHaveLength(5));
  });

  it('explains when a search finds nothing', async () => {
    await signInAsDemo();
    renderApp('/?q=sequins');
    expect(await screen.findByText('Nothing matches “sequins”.')).toBeInTheDocument();
  });

  it('debounces search requests', async () => {
    const seen: string[] = [];
    network.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.href.startsWith(`${apiBase}/tasks`)) seen.push(url.searchParams.get('q') ?? '');
    });
    const { user } = await openEdit();
    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'linen');
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS * 2));
    await waitFor(() => expect(rowTitles()).toHaveLength(1));

    expect(seen.filter(Boolean)).toEqual(['linen']);
    network.events.removeAllListeners();
  });

  it('removes a task after the undo window, or restores it on undo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = await openEdit('/', { fakeTimers: true });
    const [first, second] = rowTitles();

    await user.click(screen.getByRole('button', { name: `Remove “${first}”` }));
    expect(rowTitles()).not.toContain(first);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(rowTitles()).toContain(first);

    await user.click(screen.getByRole('button', { name: `Remove “${second}”` }));
    await act(() => vi.advanceTimersByTimeAsync(UNDO_MS));
    await waitFor(() => expect(stored(second!)).toBeUndefined());
    expect(rowTitles()).not.toContain(second);
    vi.useRealTimers();
  });

  it('shows a tailored empty state per view', async () => {
    await backend.store.update((state) => [
      { ...state, tasks: state.tasks.map((task) => ({ ...task, completed: true })) },
      null,
    ]);
    await signInAsDemo();
    const { user } = renderApp('/?view=open');
    expect(await screen.findByText('Nothing outstanding.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /everything/i }));
    expect(rowTitles()).toHaveLength(5);
  });

  it('explains when the list cannot load', async () => {
    network.use(http.get(`${apiBase}/tasks`, () => HttpResponse.json({}, { status: 500 })));
    await signInAsDemo();
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'The rail is empty.' })).toBeInTheDocument();
  });
});

describe('task detail', () => {
  const nth = (index: number) => backend.ordered()[index]!;

  it('opens from the list and shows the hang tag', async () => {
    const { user } = await openEdit();
    await user.click(screen.getByRole('link', { name: nth(0).description }));

    expect(await screen.findByRole('heading', { level: 1, name: nth(0).description })).toBeInTheDocument();
    const tag = screen.getByRole('complementary', { name: 'Details' });
    expect(within(tag).getByText('Status').nextSibling).toHaveTextContent('Finished');
    expect(screen.getByText(/Look Nº 01/)).toBeInTheDocument();
  });

  it('edits the copy and toggles status', async () => {
    await signInAsDemo();
    const { id } = nth(1);
    const { user } = renderApp(`/tasks/${id}`);
    await user.click(await screen.findByRole('button', { name: 'Edit copy' }));

    const editor = screen.getByLabelText('Task description');
    await user.clear(editor);
    await user.type(editor, 'Return the swatches by courier{Enter}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Return the swatches by courier' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark as finished' }));
    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    await waitFor(() =>
      expect(nth(1)).toMatchObject({ id, description: 'Return the swatches by courier', completed: true }),
    );
  });

  it('cancels editing with Escape', async () => {
    await signInAsDemo();
    const { user } = renderApp(`/tasks/${nth(0).id}`);
    await user.click(await screen.findByRole('button', { name: 'Edit copy' }));
    await user.type(screen.getByLabelText('Task description'), ' changed{Escape}');
    expect(screen.getByRole('heading', { level: 1, name: nth(0).description })).toBeInTheDocument();
  });

  it('pages to the next look', async () => {
    await signInAsDemo();
    const { user } = renderApp(`/tasks/${nth(0).id}`);
    const next = nth(1).description;
    await user.click(await screen.findByRole('link', { name: new RegExp(next) }));
    expect(await screen.findByRole('heading', { level: 1, name: next })).toBeInTheDocument();
    expect(screen.getByText(/Look Nº 02/)).toBeInTheDocument();
  });

  it('removes after confirmation and returns to the list', async () => {
    await signInAsDemo();
    const doomed = nth(0);
    const { user } = renderApp(`/tasks/${doomed.id}`);
    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Yes, remove it' }));

    expect(await screen.findByRole('heading', { name: /the edit/i })).toBeInTheDocument();
    await waitFor(() => expect(stored(doomed.description)).toBeUndefined());
  });

  it('reports a missing task as out of print', async () => {
    await signInAsDemo();
    renderApp('/tasks/does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Out of print.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
