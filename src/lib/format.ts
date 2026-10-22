const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const issueNumber = (since: string | undefined, now = new Date()) => {
  const start = since ? Date.parse(since) : NaN;
  const weeks = Number.isNaN(start) ? 0 : Math.max(0, Math.floor((now.getTime() - start) / WEEK_MS));
  return pad2(weeks + 1);
};

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export const seasonLabel = (date = new Date()) => {
  const month = date.getMonth();
  return month >= 2 && month <= 7
    ? `Spring / Summer ${date.getFullYear()}`
    : `Autumn / Winter ${date.getFullYear()}`;
};
