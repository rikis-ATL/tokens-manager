const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Token utilities
class TokenUpdater {
  constructor(tokensDir) {
    this.tokensDir = tokensDir;
  }

  getAllTokenFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        files.push(...this.getAllTokenFiles(path.join(dir, item.name)));
      } else if (item.name.endsWith('.json')) {
        files.push(path.join(dir, item.name));
      }
    }

    return files;
  }

  getAllTokens() {
    const allTokens = {};
    const tokenFiles = this.getAllTokenFiles(this.tokensDir);

    for (const filePath of tokenFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const tokenData = JSON.parse(content);
        const relativePath = path.relative(this.tokensDir, filePath);
        allTokens[relativePath] = tokenData;
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }

    return allTokens;
  }

  flattenTokens(obj, filePath) {
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

  async updateToken(filePath, tokenPath, newValue) {
    try {
      const fullPath = path.join(this.tokensDir, filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Token file not found: ${filePath}`);
      }

      // Read current file content
      const content = fs.readFileSync(fullPath, 'utf-8');
      const tokenData = JSON.parse(content);

      // Create backup
      const backupPath = `${fullPath}.backup-${Date.now()}`;
      fs.copyFileSync(fullPath, backupPath);

      // Update the specific token
      const pathParts = tokenPath.split('.');
      let current = tokenData;

      // Navigate to the token location
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          throw new Error(`Token path not found: ${tokenPath}`);
        }
        current = current[pathParts[i]];
      }

      const lastPart = pathParts[pathParts.length - 1];
      if (!current[lastPart] || typeof current[lastPart] !== 'object' || !current[lastPart].value) {
        throw new Error(`Token not found at path: ${tokenPath}`);
      }

      // Update the value
      current[lastPart].value = newValue;

      // Save the updated file
      fs.writeFileSync(fullPath, JSON.stringify(tokenData, null, 2));

      return true;
    } catch (error) {
      console.error('Error updating token:', error);
      return false;
    }
  }
}

// Initialize token updater
const tokensDir = path.join(__dirname, 'tokens');
const updater = new TokenUpdater(tokensDir);

// Routes
app.get('/api/tokens', (req, res) => {
  try {
    const allTokens = updater.getAllTokens();
    const flatTokens = [];

    for (const [filePath, tokenData] of Object.entries(allTokens)) {
      const section = filePath.split('/')[0];
      const tokens = updater.flattenTokens(tokenData, filePath);

      for (const tokenInfo of tokens) {
        flatTokens.push({
          ...tokenInfo,
          section
        });
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

    res.json({
      rawFiles: allTokens,
      flatTokens: tokensBySection
    });
  } catch (error) {
    console.error('Error loading tokens:', error);
    res.status(500).json({ error: 'Failed to load tokens' });
  }
});

app.put('/api/tokens/*', (req, res) => {
  try {
    const { tokenPath, newValue } = req.body;

    if (!tokenPath || newValue === undefined) {
      return res.status(400).json({ error: 'Missing tokenPath or newValue' });
    }

    const filePath = req.params[0]; // Get everything after /api/tokens/

    updater.updateToken(filePath, tokenPath, newValue).then(success => {
      if (!success) {
        return res.status(500).json({ error: 'Failed to update token' });
      }

      res.json({
        success: true,
        message: 'Token updated successfully',
        tokenPath,
        newValue
      });
    });
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Token Manager server running on http://localhost:${PORT}`);
  console.log(`📁 Serving tokens from: ${tokensDir}`);

  // Check if tokens directory exists
  if (fs.existsSync(tokensDir)) {
    const tokenFiles = updater.getAllTokenFiles(tokensDir);
    console.log(`📊 Found ${tokenFiles.length} token files`);
  } else {
    console.log('⚠️  Tokens directory not found. Make sure symlink is created.');
  }
});