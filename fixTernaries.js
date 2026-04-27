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

const map = {
  'bg-white': 'dark:bg-gray-800',
  'bg-gray-50': 'dark:bg-gray-900',
  'bg-gray-100': 'dark:bg-gray-700',
  'bg-gray-100/50': 'dark:bg-gray-700/50',
  'bg-gray-200': 'dark:bg-gray-600',
  'border-gray-100': 'dark:border-gray-700',
  'border-gray-200': 'dark:border-gray-600',
  'text-gray-900': 'dark:text-white',
  'text-gray-800': 'dark:text-gray-100',
  'text-gray-700': 'dark:text-gray-200',
  'text-gray-600': 'dark:text-gray-300',
  'text-gray-500': 'dark:text-gray-400',
};

function processFile(file) {
  if (!file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Find strings inside ternaries like ? "bg-white" : "..."
  // It's safest to just replace any quoted string containing these classes if they don't already have dark: variants
  newContent = newContent.replace(/(["'`])([^"'`]+)\1/g, (match, quote, inner) => {
    // Only process if it feels like a class string
    if (!inner.match(/\b(bg-|text-|border-|shadow-|p-|m-|rounded|flex|grid|block)\b/)) return match;
    
    let arr = inner.split(/\s+/);
    let newArr = [...arr];
    let changedInside = false;

    for (const c of arr) {
      if (map[c] && !arr.includes(map[c])) {
        newArr.push(map[c]);
        changedInside = true;
      }
    }
    
    if (changedInside) {
      return `${quote}${newArr.join(' ')}${quote}`;
    }
    return match;
  });

  if (newContent !== content) {
    console.log('Fixed ternaries', file);
    fs.writeFileSync(file, newContent);
  }
}

walk('./src', processFile);
