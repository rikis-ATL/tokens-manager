const fs = require('fs');
const path = require('path');

function getAllTokenFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      files.push(...getAllTokenFiles(path.join(dir, item.name)));
    } else if (item.name.endsWith('.json')) {
      files.push(path.join(dir, item.name));
    }
  }

  return files;
}

function flattenTokens(obj, filePath) {
  const result = [];

  function traverse(current, currentPath = '') {
    for (const [key, value] of Object.entries(current)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
        result.push({
          path: newPath,
          token: value,
          filePath
        });
      } else if (value && typeof value === 'object') {
        traverse(value, newPath);
      }
    }
  }

  traverse(obj);
  return result;
}

async function testTokenParsing() {
  console.log('🧪 Testing Token Parsing API Logic...\n');

  try {
    const tokensDir = path.join(__dirname, 'tokens');
    console.log(`📁 Looking for tokens in: ${tokensDir}`);

    const tokenFiles = getAllTokenFiles(tokensDir);
    console.log(`📄 Found ${tokenFiles.length} token files:`);
    tokenFiles.forEach(file => {
      const relativePath = path.relative(tokensDir, file);
      console.log(`   - ${relativePath}`);
    });
    console.log();

    const allTokens = {};
    const flatTokens = [];

    for (const filePath of tokenFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const tokenData = JSON.parse(content);
        const relativePath = path.relative(tokensDir, filePath);

        allTokens[relativePath] = tokenData;

        const section = relativePath.split('/')[0];
        const tokens = flattenTokens(tokenData, relativePath);

        for (const tokenInfo of tokens) {
          flatTokens.push({
            ...tokenInfo,
            section
          });
        }
      } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error.message);
      }
    }

    // Group tokens by section for display
    const tokensBySection = flatTokens.reduce((acc, tokenInfo) => {
      if (!acc[tokenInfo.section]) {
        acc[tokenInfo.section] = [];
      }
      acc[tokenInfo.section].push(tokenInfo);
      return acc;
    }, {});

    console.log('📊 Token Summary:');
    console.log(`   Total tokens parsed: ${flatTokens.length}`);
    console.log(`   Sections found: ${Object.keys(tokensBySection).length}`);
    console.log();

    console.log('🏷️ Tokens by Section:');
    for (const [section, tokens] of Object.entries(tokensBySection)) {
      console.log(`   ${section}: ${tokens.length} tokens`);

      // Show first few tokens as examples
      const examples = tokens.slice(0, 3);
      for (const token of examples) {
        const color = token.token.type === 'color' ? `(${token.token.value})` : '';
        console.log(`      ${token.path} = ${token.token.value} [${token.token.type}] ${color}`);
      }
      if (tokens.length > 3) {
        console.log(`      ... and ${tokens.length - 3} more`);
      }
      console.log();
    }

    console.log('✅ Token parsing completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTokenParsing();