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
  'bg-purple-100': 'dark:bg-purple-900/40',
  'text-purple-700': 'dark:text-purple-300',
  'text-purple-600': 'dark:text-purple-400',
  'text-gray-900': 'dark:text-white',
  'text-gray-800': 'dark:text-gray-100',
  'text-gray-700': 'dark:text-gray-200',
  'bg-blue-100': 'dark:bg-blue-900/40',
  'bg-red-50': 'dark:bg-red-900/40',
  'text-red-500': 'dark:text-red-400',
  'bg-green-100': 'dark:bg-green-900/40',
  'text-green-700': 'dark:text-green-300',
  'active:bg-gray-100': 'dark:active:bg-gray-700',
  'active:bg-gray-200': 'dark:active:bg-gray-600',
  'hover:bg-gray-100': 'dark:hover:bg-gray-700',
  'hover:bg-gray-200': 'dark:hover:bg-gray-600',
  'bg-yellow-100': 'dark:bg-yellow-900/40',
  'text-yellow-800': 'dark:text-yellow-300',
  'text-orange-800': 'dark:text-orange-300',
  'bg-orange-100': 'dark:bg-orange-900/40',
  'bg-gray-100': 'dark:bg-gray-700',
  'bg-gray-50': 'dark:bg-gray-800',
  'border-gray-200': 'dark:border-gray-600',
  'border-gray-100': 'dark:border-gray-700',
};

function processFile(file) {
  if (!file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace in clsx/template literals specifically
  content = content.replace(/(["'`])([^"'`]+)\1/g, (match, quote, inner) => {
    // Check if it's likely a tailwind class string
    if (!inner.match(/\b(bg-|text-|border-|shadow-|p-|m-|rounded|flex|grid|block|hover:|active:)\b/)) return match;
    
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
      changed = true;
      return `${quote}${newArr.join(' ')}${quote}`;
    }
    return match;
  });

  if (changed) {
    console.log('Fixed more dark classes', file);
    fs.writeFileSync(file, content);
  }
}

walk('./src', processFile);
