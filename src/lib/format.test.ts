import { formatDate, issueNumber, pad2, seasonLabel } from './format';

describe('pad2', () => {
  it('zero-pads single digits only', () => {
    expect([1, 9, 10, 123].map(pad2)).toEqual(['01', '09', '10', '123']);
  });
});

describe('issueNumber', () => {
  const now = new Date('2026-10-21T12:00:00Z');

  it('counts weeks since sign-up, starting at issue 01', () => {
    expect(issueNumber('2026-10-20T00:00:00Z', now)).toBe('01');
    expect(issueNumber('2026-09-01T00:00:00Z', now)).toBe('08');
  });

  it('defaults to the first issue when the date is missing or invalid', () => {
    expect(issueNumber(undefined, now)).toBe('01');
    expect(issueNumber('not a date', now)).toBe('01');
  });
});

describe('formatDate', () => {
  it('renders an editorial day-month-year date', () => {
    expect(formatDate('2026-10-21T08:00:00Z')).toBe('21 Oct 2026');
  });
});

describe('seasonLabel', () => {
  it('names the fashion season for a date', () => {
    expect(seasonLabel(new Date('2026-10-21'))).toBe('Autumn / Winter 2026');
    expect(seasonLabel(new Date('2027-04-02'))).toBe('Spring / Summer 2027');
  });
});
