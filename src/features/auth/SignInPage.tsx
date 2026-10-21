import { Link } from 'react-router-dom';
import { usingMock } from '../../api/config';
import { DEMO } from '../../mocks/demo';
import { isEmail, required, validate } from '../../lib/validation';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { useForm } from '../../hooks/useForm';
import styles from './AuthForm.module.css';
import { Cover } from './Cover';
import { useSignIn } from './hooks';

const check = validate({ email: [required('Email'), isEmail], password: [required('Password')] });

export const SignInPage = () => {
  const signIn = useSignIn();
  const { field, handleSubmit, setValues } = useForm({ email: '', password: '' }, check);

  return (
    <Cover>
      <form className={styles.form} onSubmit={handleSubmit((values) => signIn.mutate(values))} noValidate>
        <header>
          <p className={styles.kicker}>Subscriber entrance</p>
          <h2 className={styles.title}>
            Sign in to <em>your edit.</em>
          </h2>
        </header>

        {usingMock && (
          <aside className={styles.demo}>
            <span>
              <strong>Preview edition</strong>
              {DEMO.email} · {DEMO.password}
            </span>
            <Button variant="line" onClick={() => setValues({ ...DEMO })}>
              Use demo
            </Button>
          </aside>
        )}

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          {...field('email')}
        />
        <Field label="Password" type="password" autoComplete="current-password" {...field('password')} />

        {signIn.isError && (
          <p className={styles.alert} role="alert">
            {signIn.error.message}
          </p>
        )}

        <Button type="submit" className={styles.submit} busy={signIn.isPending}>
          {signIn.isPending ? 'Opening the studio' : 'Enter the studio →'}
        </Button>

        <p className={styles.switch}>
          New to Atelier? <Link to="/register">Take out a subscription</Link>
        </p>
      </form>
    </Cover>
  );
};
