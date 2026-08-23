import { escapeRegExp } from '../../src/shared/utils/regex';

describe('escapeRegExp', () => {
  it('leaves plain alphanumeric text unchanged', () => {
    expect(escapeRegExp('Asha Rao')).toBe('Asha Rao');
  });

  it('escapes every regex metacharacter', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('neutralizes a would-be catastrophic/wildcard search term into a literal match', () => {
    const pattern = new RegExp(escapeRegExp('.*'), 'i');
    expect(pattern.test('Anything at all')).toBe(false);
    expect(pattern.test('literally .*')).toBe(true);
  });

  it('treats a name containing a real special character as a literal substring match', () => {
    const pattern = new RegExp(escapeRegExp('O(Brien)'), 'i');
    expect(pattern.test('Team O(Brien) Reports')).toBe(true);
    expect(pattern.test('OBrien')).toBe(false);
  });

  it('returns an empty string unchanged', () => {
    expect(escapeRegExp('')).toBe('');
  });
});
