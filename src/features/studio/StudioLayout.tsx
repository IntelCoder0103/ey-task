import { Link, Outlet } from 'react-router-dom';
import { issueNumber, seasonLabel } from '../../lib/format';
import { Button } from '../../ui/Button';
import { useCurrentUser, useSignOut } from '../auth/hooks';
import styles from './StudioLayout.module.css';

export const StudioLayout = () => {
  const user = useCurrentUser();
  const signOut = useSignOut();

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
          <Button variant="quiet" onClick={() => signOut.mutate()} busy={signOut.isPending}>
            Sign out
          </Button>
        </div>
      </header>

      <Outlet />

      <footer className={styles.colophon}>
        <span>Atelier — a to-do edition</span>
        <span>Set in Fraunces, Instrument Sans &amp; JetBrains Mono</span>
      </footer>
    </div>
  );
};
