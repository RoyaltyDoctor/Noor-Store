import fs from 'fs';

let batches = fs.readFileSync('src/pages/Batches.tsx', 'utf8');

batches = batches.replace(/لديك \{batches\.length\} سلة/, 'لديك {batches.filter(b => b.status !== "DELIVERED").length} سلة مفتوحة');
batches = batches.replace(/<Plus className="w-4 h-4" \/> إضافة سلة/, '<Plus className="w-4 h-4" /> سلة جديدة');
batches = batches.replace(/<span className="text-base font-bold text-gray-500/g, '<span className="text-sm font-bold text-gray-500');
batches = batches.replace(/"w-full text-right px-4 py-2 text-base sm:text-lg/g, '"w-full text-right px-4 py-2 text-sm sm:text-base');

if (!batches.includes('<Filter className="w-5 h-5" />')) {
  // restore filter button
  batches = batches.replace(/\{\/\* Filters Dropdown Popup \*\/\}/g, `
          <button
            onClick={() => { setShowFilters(!showFilters); setShowSortDropdown(false); }}
            className={clsx(
              "p-2 rounded-xl border transition-colors relative",
              (
                isMultiSelectMode
                  ? selectedStatusesMult.length < 5
                  : selectedStatus !== "ACTIVE"
              )
                ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
            )}
            title="تصفية حسب الحالة"
          >
            <Filter className="w-5 h-5" />
            {isMultiSelectMode ? (
              selectedStatusesMult.length < 5 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white"></div>
              )
            ) : (
              selectedStatus !== "ACTIVE" && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border border-white"></div>
              )
            )}
          </button>
          {/* Filters Dropdown Popup */}`);
}

fs.writeFileSync('src/pages/Batches.tsx', batches);

let home = fs.readFileSync('src/pages/Home.tsx', 'utf8');
home = home.replace(/<Plus className="w-4 h-4" \/> إضافة طلبية/, '<Plus className="w-4 h-4" /> طلبية جديدة');
home = home.replace(/<span className="text-base font-bold text-gray-500/g, '<span className="text-sm font-bold text-gray-500');
home = home.replace(/"w-full text-right px-4 py-2 text-base sm:text-lg/g, '"w-full text-right px-4 py-2 text-sm sm:text-base');
home = home.replace(/"w-full text-right px-3 py-2 text-base sm:text-lg/g, '"w-full text-right px-3 py-2 text-xs sm:text-sm');
home = home.replace(/"w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700\/50 text-base sm:text-lg/g, '"w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm');

home = home.replace(/<span className="text-sm font-bold text-gray-500 dark:text-gray-400">\s*تاريخ الطلبية/g, '<span className="text-xs font-bold text-gray-500 dark:text-gray-400">\n                تاريخ الطلبية');
home = home.replace(/<span className="text-sm font-bold text-gray-500 dark:text-gray-400">\s*طريقة الفلترة/g, '<span className="text-xs font-bold text-gray-500 dark:text-gray-400">\n                طريقة الفلترة');

// For multi filter
home = home.replace(/text-base font-bold dark:border-gray-700/g, 'text-[11px] font-bold dark:border-gray-700');
// The CheckSquare size changed?
home = home.replace(/<CheckSquare className="w-5 h-5 /g, '<CheckSquare className="w-4 h-4 ');
home = home.replace(/<Square className="w-5 h-5 /g, '<Square className="w-4 h-4 ');
home = home.replace(/"w-5 h-5 rounded-full border/g, '"w-4 h-4 rounded-full border');
home = home.replace(/w-2 h-2 bg-white/g, 'w-1.5 h-1.5 bg-white');


fs.writeFileSync('src/pages/Home.tsx', home);

let cust = fs.readFileSync('src/pages/Customers.tsx', 'utf8');
cust = cust.replace(/<span className="text-base font-bold text-gray-500/g, '<span className="text-sm font-bold text-gray-500');
cust = cust.replace(/<ArrowDown className="w-5 h-5" \/>/g, '<ArrowDown className="w-4 h-4" />');
cust = cust.replace(/<ArrowUp className="w-5 h-5" \/>/g, '<ArrowUp className="w-4 h-4" />');
cust = cust.replace(/"w-full flex items-center justify-between text-base sm:text-lg/g, '"w-full flex items-center justify-between text-sm sm:text-base');

fs.writeFileSync('src/pages/Customers.tsx', cust);
console.log("Done");
