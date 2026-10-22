export type Rule = (value: string) => string | null;

export type Errors<K extends string> = Partial<Record<K, string>>;

export const required =
  (label: string): Rule =>
  (value) =>
    value.trim() ? null : `${label} is required.`;

export const isEmail: Rule = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : 'That email doesn’t look right.';

export const minLength =
  (length: number): Rule =>
  (value) =>
    value.length >= length ? null : `Use at least ${length} characters.`;

export const maxLength =
  (length: number): Rule =>
  (value) =>
    value.trim().length <= length ? null : `Keep it to ${length} characters or fewer.`;

export const optionalWholeNumber =
  (max: number): Rule =>
  (value) => {
    if (value === '') return null;
    if (!/^\d+$/.test(value)) return 'Enter a whole number.';
    return Number(value) <= max ? null : `Enter ${max} or less.`;
  };

export const validate =
  <K extends string>(schema: Record<K, Rule[]>) =>
  (values: Record<K, string>): Errors<K> =>
    Object.fromEntries(
      (Object.entries(schema) as [K, Rule[]][]).flatMap(([field, rules]) => {
        const message = rules.map((rule) => rule(values[field])).find(Boolean);
        return message ? [[field, message]] : [];
      }),
    ) as Errors<K>;
