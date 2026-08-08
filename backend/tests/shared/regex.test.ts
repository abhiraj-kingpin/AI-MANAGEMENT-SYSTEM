import { escapeRegExp } from '../../src/shared/utils/regex';

describe('escapeRegExp', () => {
  it('leaves plain alphanumeric text unchanged', () => {
    expect(escapeRegExp('Asha Rao')).toBe('Asha Rao');
  });

  it('escapes every regex metacharacter', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('neutralizes a would-be catastrophic/wildcard search term into a literal match', () => {
    // Without escaping, '.*' as a search term would match every document's
    // name field — the exact injection this function exists to prevent
    // wherever user-supplied search text is fed into `new RegExp(...)`
    // (employee.service.ts#searchEmployees).
    const pattern = new RegExp(escapeRegExp('.*'), 'i');
    expect(pattern.test('Anything at all')).toBe(false);
    expect(pattern.test('literally .*')).toBe(true);
  });

  it('treats a name containing a real special character as a literal substring match', () => {
    const pattern = new RegExp(escapeRegExp('O(Brien)'), 'i');
    expect(pattern.test('Team O(Brien) Reports')).toBe(true);
    expect(pattern.test('OBrien')).toBe(false); // parens are literal, not a capture group
  });

  it('returns an empty string unchanged', () => {
    expect(escapeRegExp('')).toBe('');
  });
});
