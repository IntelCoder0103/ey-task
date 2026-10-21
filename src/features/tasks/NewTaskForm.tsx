import { useId, useState, type FormEvent } from 'react';
import { pad2 } from '../../lib/format';
import { Button } from '../../ui/Button';
import styles from './NewTaskForm.module.css';

type Props = { nextNumber: number; onAdd: (description: string) => void };

export const NewTaskForm = ({ nextNumber, onAdd }: Props) => {
  const id = useId();
  const [text, setText] = useState('');
  const description = text.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!description) return;
    onAdd(description);
    setText('');
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <span className={styles.number} aria-hidden="true">
        {pad2(nextNumber)}
      </span>
      <label htmlFor={id} className="sr-only">
        New task
      </label>
      <input
        id={id}
        className={styles.input}
        placeholder="Write the next look…"
        maxLength={240}
        autoComplete="off"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Button type="submit" disabled={!description}>
        Add to the edit
      </Button>
    </form>
  );
};
