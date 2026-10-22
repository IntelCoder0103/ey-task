import { isEmail, maxLength, minLength, optionalWholeNumber, required, validate } from './validation';

describe('rules', () => {
  it('required rejects blank strings', () => {
    expect(required('Name')('  ')).toBe('Name is required.');
    expect(required('Name')('Ada')).toBeNull();
  });

  it('isEmail checks the shape of an address', () => {
    expect(isEmail('nope')).toMatch(/look right/);
    expect(isEmail('a@b.c')).toMatch(/look right/);
    expect(isEmail('ada@atelier.studio')).toBeNull();
  });

  it('minLength and maxLength bound the length', () => {
    expect(minLength(7)('short')).toBe('Use at least 7 characters.');
    expect(minLength(7)('longer!')).toBeNull();
    expect(maxLength(3)('four')).toBe('Keep it to 3 characters or fewer.');
    expect(maxLength(3)(' abc ')).toBeNull();
  });

  it('optionalWholeNumber allows empty or whole numbers up to a maximum', () => {
    const age = optionalWholeNumber(150);
    expect(age('')).toBeNull();
    expect(age('31')).toBeNull();
    expect(age('-1')).toMatch(/whole number/);
    expect(age('3.5')).toMatch(/whole number/);
    expect(age('151')).toBe('Enter 150 or less.');
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
