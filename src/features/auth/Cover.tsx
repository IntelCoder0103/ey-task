import type { ReactNode } from 'react';
import { seasonLabel } from '../../lib/format';
import styles from './Cover.module.css';

const coverLines = [
  'Editing your week, one look at a time',
  'The quiet luxury of a short list',
  'Inside: drag, drop, done',
];

export const Cover = ({ children }: { children: ReactNode }) => (
  <main className={styles.page}>
    <section className={styles.cover} aria-labelledby="wordmark">
      <header className={styles.strip}>
        <span>Nº 01</span>
        <span>{seasonLabel()}</span>
        <span className={styles.hideSmall}>The List Issue</span>
      </header>

      <h1 id="wordmark" className={styles.wordmark}>
        Atelier
      </h1>

      <p className={styles.sticker} aria-hidden="true">
        <span>Less,</span>
        <span>but</span>
        <em>finished.</em>
      </p>

      <ol className={styles.lines}>
        {coverLines.map((line, index) => (
          <li key={line}>
            <span className={styles.lineNo}>{String(index + 1).padStart(2, '0')}</span>
            {line}
          </li>
        ))}
      </ol>

      <footer className={styles.colophon}>
        <span className={styles.barcode} aria-hidden="true" />
        <span>Free with discipline</span>
      </footer>

      <span className={styles.spine} aria-hidden="true">
        A to-do edition · {seasonLabel()}
      </span>
    </section>

    <section className={styles.desk}>{children}</section>
  </main>
);
