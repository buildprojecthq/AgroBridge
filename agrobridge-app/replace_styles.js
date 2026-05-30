const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src/screens', (filePath) => {
  if (filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/Inter_400Regular/g, 'NotoSans_400Regular');
    content = content.replace(/Inter_500Medium/g, 'NotoSans_500Medium');
    content = content.replace(/Inter_600SemiBold/g, 'NotoSans_600SemiBold');
    content = content.replace(/Inter_700Bold/g, 'NotoSans_700Bold');
    content = content.replace(/Inter_800ExtraBold/g, 'NotoSans_800ExtraBold');
    content = content.replace(/#2d6a4f/g, '#029a43'); // Common Green
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
