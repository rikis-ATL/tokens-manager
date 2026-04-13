import { resolveFigmaCredentials } from '../figma-credentials';

describe('resolveFigmaCredentials', () => {
  it('prefers localStorage when token and fileKey are present', () => {
    const ls = JSON.stringify({ token: 'pat-ls', fileKey: 'key-ls' });
    expect(
      resolveFigmaCredentials(ls, 'pat-db', 'key-db')
    ).toEqual({ token: 'pat-ls', fileKey: 'key-ls' });
  });

  it('falls back to collection when localStorage is absent', () => {
    expect(
      resolveFigmaCredentials(null, 'pat-db', 'key-db')
    ).toEqual({ token: 'pat-db', fileKey: 'key-db' });
  });

  it('falls back when localStorage JSON is invalid', () => {
    expect(
      resolveFigmaCredentials('{', 'pat-db', 'key-db')
    ).toEqual({ token: 'pat-db', fileKey: 'key-db' });
  });

  it('falls back when localStorage omits fileKey', () => {
    const ls = JSON.stringify({ token: 'only-token' });
    expect(
      resolveFigmaCredentials(ls, 'pat-db', 'key-db')
    ).toEqual({ token: 'pat-db', fileKey: 'key-db' });
  });

  it('returns null when nothing is configured', () => {
    expect(resolveFigmaCredentials(null, null, null)).toBeNull();
    expect(resolveFigmaCredentials('{}', '', '  ')).toBeNull();
  });
});
