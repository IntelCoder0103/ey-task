import { isEmail, minLength, optionalNumber, required, validate } from './validation';

describe('rules', () => {
  it('required rejects blank strings', () => {
    expect(required('Name')('  ')).toBe('Name is required.');
    expect(required('Name')('Ada')).toBeNull();
  });

  it('isEmail checks the shape of an address', () => {
    expect(isEmail('nope')).toMatch(/look right/);
    expect(isEmail('ada@atelier.studio')).toBeNull();
  });

  it('minLength counts characters', () => {
    expect(minLength(7)('short')).toBe('Use at least 7 characters.');
    expect(minLength(7)('longer!')).toBeNull();
  });

  it('optionalNumber allows empty or whole non-negative numbers', () => {
    expect(optionalNumber('')).toBeNull();
    expect(optionalNumber('31')).toBeNull();
    expect(optionalNumber('-1')).toMatch(/whole number/);
    expect(optionalNumber('3.5')).toMatch(/whole number/);
  });
});

describe('validate', () => {
  const check = validate({
    email: [required('Email'), isEmail],
    password: [required('Password'), minLength(7)],
  });

  it('reports the first failing rule per field', () => {
    expect(check({ email: '', password: 'abc' })).toEqual({
      email: 'Email is required.',
      password: 'Use at least 7 characters.',
    });
  });

  it('returns an empty object when everything passes', () => {
    expect(check({ email: 'a@b.co', password: 'atelier2026' })).toEqual({});
  });
});
