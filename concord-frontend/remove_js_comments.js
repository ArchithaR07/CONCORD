import fs from 'fs';
import path from 'path';
import stripComments from 'strip-comments';

const dir = process.argv[2];

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(fullPath);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      console.log('Stripping comments from:', fullPath);
      const code = fs.readFileSync(fullPath, 'utf8');
      try {
        const stripped = stripComments(code);
        fs.writeFileSync(fullPath, stripped, 'utf8');
      } catch(e) {
        console.error('Failed on', fullPath, e);
      }
    }
  }
}

walkDir(dir);
console.log('JS/TS Comment stripping complete.');
