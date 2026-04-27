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
  'bg-gray-100': 'dark:bg-gray-800',
  'bg-gray-200': 'dark:bg-gray-700',
  'border-gray-100': 'dark:border-gray-700',
  'border-gray-200': 'dark:border-gray-600',
  'border-b': 'dark:border-gray-700',
  'border-t': 'dark:border-gray-700',
  'text-gray-900': 'dark:text-white',
  'text-gray-800': 'dark:text-gray-100',
  'text-gray-700': 'dark:text-gray-200',
  'text-gray-600': 'dark:text-gray-300',
  'text-gray-500': 'dark:text-gray-400',
  'bg-purple-50': 'dark:bg-purple-900/30',
  'bg-blue-50': 'dark:bg-blue-900/30',
  'bg-blue-100': 'dark:bg-blue-900/50',
  'bg-green-50': 'dark:bg-green-900/30',
  'bg-red-50': 'dark:bg-red-900/30',
  'bg-amber-50': 'dark:bg-amber-900/30',
  'bg-yellow-50': 'dark:bg-yellow-900/30',
  'bg-yellow-50/50': 'dark:bg-yellow-900/20',
  'text-purple-600': 'dark:text-purple-400',
  'text-purple-700': 'dark:text-purple-300',
  'text-purple-800': 'dark:text-purple-200',
  'text-purple-900': 'dark:text-purple-100',
  'text-blue-600': 'dark:text-blue-400',
  'text-blue-700': 'dark:text-blue-300',
  'text-blue-800': 'dark:text-blue-200',
  'text-amber-800': 'dark:text-amber-200',
  'text-amber-600': 'dark:text-amber-400',
  'text-green-600': 'dark:text-green-400',
  'text-red-600': 'dark:text-red-400',
  'shadow-sm': 'dark:shadow-none',
  'shadow-md': 'dark:shadow-none',
  'shadow-lg': 'dark:shadow-none',
  'shadow-xl': 'dark:shadow-none',
  'shadow-2xl': 'dark:shadow-none'
};

function processFile(file) {
  if (!file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // replace exact matches of className values
  content = content.replace(/className=(["'])(.*?)\1/g, (match, quote, classes) => {
    const arr = classes.split(/\s+/);
    let newArr = [...arr];
    for (const c of arr) {
      if (map[c] && !arr.includes(map[c])) {
        newArr.push(map[c]);
      }
    }
    
    if (arr.length !== newArr.length) {
      changed = true;
      return `className=${quote}${newArr.join(' ')}${quote}`;
    }
    return match;
  });
  
  // replace classes in template literals
  content = content.replace(/className=\{`([^`]+)`\}/g, (match, classes) => {
    let newClasses = classes;
    for (const [k, v] of Object.entries(map)) {
      const regex = new RegExp(`(^|\\s)${k.replace('/', '\\\\/')}(\\s|$)`, 'g');
      if (regex.test(newClasses) && !newClasses.includes(v)) {
        changed = true;
        newClasses = newClasses.replace(regex, `$1${k} ${v}$2`);
      }
    }
    if (newClasses !== classes) {
       return `className={\`${newClasses}\`}`;
    }
    return match;
  });
  
  if (changed) {
    console.log('Updated', file);
    fs.writeFileSync(file, content);
  }
}

walk('./src', processFile);
