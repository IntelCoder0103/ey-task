import { Link } from 'react-router-dom';
import { isEmail, minLength, optionalNumber, required, validate } from '../../lib/validation';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { useForm } from '../../hooks/useForm';
import styles from './AuthForm.module.css';
import { Cover } from './Cover';
import { useRegister } from './hooks';

const check = validate({
  name: [required('Name')],
  email: [required('Email'), isEmail],
  password: [required('Password'), minLength(7)],
  age: [optionalNumber],
});

export const RegisterPage = () => {
  const register = useRegister();
  const { field, handleSubmit } = useForm({ name: '', email: '', password: '', age: '' }, check);

  const subscribe = handleSubmit(({ age, ...rest }) =>
    register.mutate({ ...rest, ...(age ? { age: Number(age) } : {}) }),
  );

  return (
    <Cover>
      <form className={styles.form} onSubmit={subscribe} noValidate>
        <header>
          <p className={styles.kicker}>New subscription</p>
          <h2 className={styles.title}>
            Start your <em>first issue.</em>
          </h2>
        </header>

        <div className={styles.row}>
          <Field label="Name" autoComplete="name" placeholder="Margaux Ellery" {...field('name')} />
          <Field label="Age" inputMode="numeric" placeholder="—" {...field('age')} />
        </div>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          {...field('email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="Seven characters or more."
          {...field('password')}
        />

        {register.isError && (
          <p className={styles.alert} role="alert">
            {register.error.message}
          </p>
        )}

        <Button type="submit" className={styles.submit} busy={register.isPending}>
          {register.isPending ? 'Printing your issue' : 'Subscribe — it’s free'}
        </Button>

        <p className={styles.switch}>
          Already subscribed? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </Cover>
  );
};
