import { stripPatternTokensForStyleDictionary } from '@/lib/stripPatternTokensForStyleDictionary';

describe('stripPatternTokensForStyleDictionary', () => {
  it('removes pattern token leaves but keeps design tokens', () => {
    const input = {
      colors: {
        primary: {
          type: 'color',
          value: '#0056d2',
        },
        pattern: {
          type: 'cssClass',
          value: { name: 'btn', body: '.btn {}' },
        },
      },
    };

    const out = stripPatternTokensForStyleDictionary(input);

    expect(out).toEqual({
      colors: {
        primary: {
          type: 'color',
          value: '#0056d2',
        },
      },
    });
  });

  it('strips htmlCssComponent and htmlTemplate', () => {
    const input = {
      a: { type: 'htmlTemplate', value: { name: 'x', body: '<p/>' } },
      b: { type: 'htmlCssComponent', value: { name: 'y', body: '<div/>', css: 'x{}' } },
      c: { type: 'dimension', value: '8px' },
    };

    const out = stripPatternTokensForStyleDictionary(input);

    expect(out).toEqual({
      c: { type: 'dimension', value: '8px' },
    });
  });

  it('respects $type alias', () => {
    const input = {
      t: { $type: 'cssClass', $value: { name: 'n', body: '' } },
      ok: { $type: 'string', $value: 'hi' },
    };

    const out = stripPatternTokensForStyleDictionary(input);

    expect(out).toEqual({
      ok: { $type: 'string', $value: 'hi' },
    });
  });
});
