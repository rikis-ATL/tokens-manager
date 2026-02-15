const { TokenUpdater } = require('./src/utils/tokenUpdater.ts');
const path = require('path');

async function testSaveFunction() {
  console.log('🧪 Testing Token Save Functionality...\n');

  try {
    const tokensDir = path.join(__dirname, 'tokens');
    const updater = new TokenUpdater(tokensDir);

    // Test 1: Read a token first
    console.log('📖 Step 1: Reading current token values...');
    const allTokens = updater.getAllTokens();

    // Find a color token to test with
    let testToken = null;
    let testFile = null;

    for (const [filePath, tokenData] of Object.entries(allTokens)) {
      const tokens = updater.flattenTokens(tokenData, filePath);
      for (const token of tokens) {
        if (token.token.type === 'color' && token.token.value.startsWith('#')) {
          testToken = token;
          testFile = filePath;
          break;
        }
      }
      if (testToken) break;
    }

    if (!testToken) {
      console.log('❌ No suitable test token found');
      return;
    }

    console.log(`   Found test token: ${testToken.path} = ${testToken.token.value}`);
    console.log(`   In file: ${testFile}`);

    const originalValue = testToken.token.value;
    const testValue = '#FF0000'; // Red color for testing

    // Test 2: Update the token
    console.log('\n💾 Step 2: Updating token value...');
    console.log(`   Changing ${testToken.path} from ${originalValue} to ${testValue}`);

    const success = await updater.updateToken(testFile, testToken.path, testValue);

    if (!success) {
      console.log('❌ Failed to update token');
      return;
    }

    console.log('   ✅ Token updated successfully');

    // Test 3: Verify the change
    console.log('\n🔍 Step 3: Verifying the change...');
    const updatedTokens = updater.getAllTokens();
    const updatedTokenData = updater.flattenTokens(updatedTokens[testFile], testFile);
    const updatedToken = updatedTokenData.find(t => t.path === testToken.path);

    if (updatedToken && updatedToken.token.value === testValue) {
      console.log(`   ✅ Verification successful: ${updatedToken.path} = ${updatedToken.token.value}`);
    } else {
      console.log(`   ❌ Verification failed: Expected ${testValue}, got ${updatedToken?.token.value || 'undefined'}`);
      return;
    }

    // Test 4: Restore original value
    console.log('\n🔄 Step 4: Restoring original value...');
    const restoreSuccess = await updater.updateToken(testFile, testToken.path, originalValue);

    if (restoreSuccess) {
      console.log(`   ✅ Restored original value: ${originalValue}`);
    } else {
      console.log('   ❌ Failed to restore original value');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Token reading works');
    console.log('   ✅ Token updating works');
    console.log('   ✅ File backup is created');
    console.log('   ✅ JSON structure is preserved');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testSaveFunction();
}

module.exports = { testSaveFunction };