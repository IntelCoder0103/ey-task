import { Link, Outlet } from 'react-router-dom';
import { issueNumber, seasonLabel } from '../../lib/format';
import { Button } from '../../ui/Button';
import { useCurrentUser, useSignOut } from '../auth/hooks';
import { UNDO_MS, usePendingDeletes } from '../tasks/pendingDeletes';
import { PendingDeletesProvider } from '../tasks/PendingDeletesProvider';
import { useTaskList } from '../tasks/queries';
import { UndoSlips } from '../tasks/UndoSlips';
import styles from './StudioLayout.module.css';

const Studio = () => {
  const user = useCurrentUser();
  const signOut = useSignOut();
  const deletes = usePendingDeletes();
  const { data: tasks = [] } = useTaskList();

  const leave = () => deletes.flush().then(() => signOut.mutate());

  return (
    <div className={styles.shell}>
      <header className={styles.masthead}>
        <Link to="/" className={styles.wordmark}>
          Atelier
        </Link>
        <p className={styles.meta}>
          <span>Issue Nº {issueNumber(user.createdAt)}</span>
          <span className={styles.season}>{seasonLabel()}</span>
        </p>
        <div className={styles.reader}>
          <span className={styles.name}>
            Edited by <em>{user.name}</em>
          </span>
          <Button variant="quiet" onClick={leave} busy={signOut.isPending}>
            Sign out
          </Button>
        </div>
      </header>

      <Outlet />

      <footer className={styles.colophon}>
        <span>Atelier — a to-do edition</span>
        <span>Set in Fraunces, Instrument Sans &amp; JetBrains Mono</span>
      </footer>

      <UndoSlips
        tasks={tasks.filter((task) => deletes.pending.includes(task.id))}
        delayMs={UNDO_MS}
        onUndo={deletes.undo}
      />
    </div>
  );
};

export const StudioLayout = () => (
  <PendingDeletesProvider>
    <Studio />
  </PendingDeletesProvider>
);
