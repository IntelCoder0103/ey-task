export type Rule = (value: string) => string | null;

export type Errors<K extends string> = Partial<Record<K, string>>;

export const required =
  (label: string): Rule =>
  (value) =>
    value.trim() ? null : `${label} is required.`;

export const isEmail: Rule = (value) =>
  /^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'That email doesn’t look right.';

export const minLength =
  (length: number): Rule =>
  (value) =>
    value.length >= length ? null : `Use at least ${length} characters.`;

export const optionalNumber: Rule = (value) =>
  value === '' || /^\d+$/.test(value) ? null : 'Enter a whole number.';

export const validate =
  <K extends string>(schema: Record<K, Rule[]>) =>
  (values: Record<K, string>): Errors<K> =>
    Object.fromEntries(
      (Object.entries(schema) as [K, Rule[]][]).flatMap(([field, rules]) => {
        const message = rules.map((rule) => rule(values[field])).find(Boolean);
        return message ? [[field, message]] : [];
      }),
    ) as Errors<K>;
