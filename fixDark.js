import fs from 'fs';
import path from 'path';

function walk(dir, call) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full, call);
    else call(full);
  }
}

function processFile(file) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // For anything with 'bg-gray-100', if 'dark:bg-gray-800' is in the same string, change it to 'dark:bg-gray-700'
  newContent = newContent.replace(/className=(["'])(.*?)\1/g, (match, quote, classes) => {
    if (classes.includes('bg-gray-100') && classes.includes('dark:bg-gray-800')) {
      return `className=${quote}${classes.replace('dark:bg-gray-800', 'dark:bg-gray-700')}${quote}`;
    }
    if (classes.includes('bg-gray-200') && classes.includes('dark:bg-gray-700')) {
      return `className=${quote}${classes.replace(/\bdark:bg-gray-700\b/, 'dark:bg-gray-600')}${quote}`;
    }
    return match;
  });

  newContent = newContent.replace(/className=\{`([^`]+)`\}/g, (match, classes) => {
    if (classes.includes('bg-gray-100') && classes.includes('dark:bg-gray-800')) {
      return `className={\`${classes.replace('dark:bg-gray-800', 'dark:bg-gray-700')}\`}`;
    }
    if (classes.includes('bg-gray-200') && classes.includes('dark:bg-gray-700')) {
      return `className={\`${classes.replace(/\bdark:bg-gray-700\b/, 'dark:bg-gray-600')}\`}`;
    }
    return match;
  });

  if (newContent !== content) {
    console.log('Fixed', file);
    fs.writeFileSync(file, newContent);
  }
}

walk('./src', processFile);
