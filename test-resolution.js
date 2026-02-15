const { TokenUpdater } = require('./src/utils/tokenUpdater.ts');
const path = require('path');

async function testTokenResolution() {
  console.log('🧪 Testing Token Reference Resolution...\n');

  try {
    const tokensDir = path.join(__dirname, 'tokens');
    const updater = new TokenUpdater(tokensDir);

    const { allTokens, tokenMap } = updater.getAllTokensWithResolvedRefs();

    console.log('📊 Token Map Sample:');
    let count = 0;
    for (const [path, value] of tokenMap.entries()) {
      if (count < 5) {
        console.log(`   ${path} = ${value}`);
      }
      count++;
    }
    console.log(`   ... and ${count - 5} more tokens\n`);

    // Test some reference resolutions
    console.log('🔗 Testing Reference Resolution:');

    const testCases = [
      '{token.color.base.white.value}',
      '{token.color.white.value}',
      '{token.color.base.teal.A700.value}',
      '#ffffff', // Direct hex value
      'invalid-reference'
    ];

    for (const testCase of testCases) {
      const resolved = updater.resolveTokenReference(testCase, tokenMap);
      const isResolved = resolved !== testCase;

      console.log(`   ${testCase} ${isResolved ? '→' : '='} ${resolved} ${isResolved ? '✓' : '○'}`);
    }

    console.log('\n✅ Token reference resolution test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTokenResolution();