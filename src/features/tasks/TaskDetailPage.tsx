import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isApiError } from '../../api/http';
import type { Task } from '../../api/schemas';
import { formatDate, pad2 } from '../../lib/format';
import { Button } from '../../ui/Button';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { PageLoader } from '../../ui/PageLoader';
import { useDeleteTask, useTask, useTaskList, useUpdateTask } from './queries';
import styles from './TaskDetailPage.module.css';

const BackLink = () => (
  <Link to="/" className={styles.back}>
    ← Back to the edit
  </Link>
);

type EditorProps = { initial: string; onSave: (description: string) => void; onCancel: () => void };

const CopyEditor = ({ initial, onSave, onCancel }: EditorProps) => {
  const [text, setText] = useState(initial);
  const description = text.trim();

  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (description) onSave(description);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') onCancel();
    if (event.key === 'Enter' && !event.shiftKey) save(event);
  };

  return (
    <form className={styles.editor} onSubmit={save}>
      <label htmlFor="copy" className="sr-only">
        Task description
      </label>
      <textarea
        id="copy"
        className={styles.textarea}
        value={text}
        maxLength={240}
        rows={3}
        autoFocus
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={!description}>
          Save copy
        </Button>
        <Button variant="line" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

const Pager = ({ previous, next }: { previous?: Task; next?: Task }) => (
  <nav className={styles.pager} aria-label="More looks">
    {previous ? (
      <Link to={`/tasks/${previous.id}`} className={styles.page}>
        <span className={styles.pageLabel}>← Previous look</span>
        <span className={styles.pageTitle}>{previous.description}</span>
      </Link>
    ) : (
      <span />
    )}
    {next && (
      <Link to={`/tasks/${next.id}`} className={`${styles.page} ${styles.nextPage}`}>
        <span className={styles.pageLabel}>Next look →</span>
        <span className={styles.pageTitle}>{next.description}</span>
      </Link>
    )}
  </nav>
);

const TaskDetail = () => {
  const { id = '' } = useParams();
  const detail = useTask(id);
  const { data: tasks = [] } = useTaskList();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (detail.isPending) return <PageLoader label="Pulling the file" />;

  if (detail.isError) {
    const missing = isApiError(detail.error) && detail.error.status === 404;
    return (
      <main className={styles.article}>
        <BackLink />
        <ErrorPanel
          error={detail.error}
          title={missing ? 'Out of print.' : 'A misprint.'}
          onRetry={missing ? undefined : () => detail.refetch()}
        />
      </main>
    );
  }

  const task = detail.data;
  const index = tasks.findIndex(({ id }) => id === task.id);
  const patch = (change: Partial<Pick<Task, 'description' | 'completed'>>) =>
    update.mutate({ id: task.id, patch: change });

  const discard = () => {
    remove.mutate(task.id);
    navigate('/', { replace: true });
  };

  return (
    <main className={styles.article}>
      <BackLink />

      <p className={styles.kicker}>
        Look Nº {pad2(task.position + 1)}
        {tasks.length > 0 && <span> of {pad2(tasks.length)}</span>}
      </p>

      <div className={styles.spread}>
        <div className={styles.story}>
          {editing ? (
            <CopyEditor
              initial={task.description}
              onCancel={() => setEditing(false)}
              onSave={(description) => {
                patch({ description });
                setEditing(false);
              }}
            />
          ) : (
            <h1 className={styles.headline} data-done={task.completed || undefined}>
              {task.description}
            </h1>
          )}

          <p className={styles.standfirst}>
            {task.completed
              ? 'Finished and filed. Reopen it if the season changes its mind.'
              : 'Still on the rail. Finish it, refine the copy, or let it go.'}
          </p>

          {update.isError && (
            <p className={styles.alert} role="alert">
              That change didn’t save — {update.error.message}
            </p>
          )}

          {!editing && (
            <div className={styles.actions}>
              <Button onClick={() => patch({ completed: !task.completed })}>
                {task.completed ? 'Reopen' : 'Mark as finished'}
              </Button>
              <Button variant="line" onClick={() => setEditing(true)}>
                Edit copy
              </Button>
              {confirming ? (
                <span className={styles.confirm}>
                  <Button variant="line" className={styles.danger} onClick={discard}>
                    Yes, remove it
                  </Button>
                  <Button variant="quiet" onClick={() => setConfirming(false)}>
                    Keep
                  </Button>
                </span>
              ) : (
                <Button variant="quiet" onClick={() => setConfirming(true)}>
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>

        <aside className={styles.tag} aria-label="Details">
          <span className={styles.hole} aria-hidden="true" />
          <dl>
            <div>
              <dt>Style Nº</dt>
              <dd>{task.id.slice(-6).toUpperCase()}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{task.completed ? 'Finished' : 'In progress'}</dd>
            </div>
            <div>
              <dt>Filed</dt>
              <dd>{formatDate(task.createdAt)}</dd>
            </div>
            <div>
              <dt>Revised</dt>
              <dd>{formatDate(task.updatedAt)}</dd>
            </div>
          </dl>
          {task.completed && (
            <span className={styles.stamp} aria-hidden="true">
              Finished
            </span>
          )}
        </aside>
      </div>

      <Pager previous={tasks[index - 1]} next={index >= 0 ? tasks[index + 1] : undefined} />
    </main>
  );
};

export const TaskDetailPage = () => <TaskDetail key={useParams().id} />;
