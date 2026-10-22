import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Errors } from '../lib/validation';

export const useForm = <K extends string>(
  initial: Record<K, string>,
  check: (values: Record<K, string>) => Errors<K>,
  serverErrors: Partial<Record<string, string>> = {},
) => {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors<K>>({});

  const field = (name: K) => ({
    name,
    value: values[name],
    error: errors[name] ?? serverErrors[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  const handleSubmit = (onValid: (values: Record<K, string>) => void) => (event: FormEvent) => {
    event.preventDefault();
    const found = check(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onValid(values);
  };

  return { values, setValues, field, handleSubmit };
};
