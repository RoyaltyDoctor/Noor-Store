import fs from 'fs';
let settings = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

settings = settings.replace(/rounded-2xl shadow-sm border border-gray-100 overflow-hidden/g, 'rounded-xl shadow-sm border border-gray-100 overflow-hidden');
settings = settings.replace(/rounded-2xl shadow-sm border border-gray-100 p-5/g, 'rounded-xl shadow-sm border border-gray-100 p-5');

fs.writeFileSync('src/pages/Settings.tsx', settings);
console.log("Settings.tsx Restored");
