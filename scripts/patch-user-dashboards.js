const fs = require('fs');
const path = require('path');

const dashboards = [
  'StudentDashboard.js',
  'TeacherDashboard.js',
  'ParentDashboard.js',
  'StaffDashboard.js'
];

const dir = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'components');

const replacements = [
  {
    regex: /className="bg-white([^"]*)"/g,
    replace: "className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''}$1`}"
  },
  {
    regex: /className='bg-white([^']*)'/g,
    replace: "className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''}$1`}"
  },
  {
    regex: /className="([^"]*)text-slate-800([^"]*)"/g,
    replace: "className={`$1${isDarkMode ? 'text-white' : 'text-slate-800'}$2`}"
  },
  {
    regex: /className='([^']*)text-slate-900([^']*)'/g,
    replace: "className={`$1${isDarkMode ? 'text-white' : 'text-slate-900'}$2`}"
  },
  {
    regex: /className="([^"]*)text-gray-800([^"]*)"/g,
    replace: "className={`$1${isDarkMode ? 'text-white' : 'text-gray-800'}$2`}"
  },
  {
    regex: /className="([^"]*)text-slate-600([^"]*)"/g,
    replace: "className={`$1${isDarkMode ? 'text-gray-300' : 'text-slate-600'}$2`}"
  },
  {
    regex: /className='([^']*)text-slate-700([^']*)'/g,
    replace: "className={`$1${isDarkMode ? 'text-gray-300' : 'text-slate-700'}$2`}"
  },
  {
    regex: /className="([^"]*)bg-slate-50([^"]*)"/g,
    replace: "className={`$1${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}$2`}"
  },
  {
    regex: /className='([^']*)bg-slate-50([^']*)'/g,
    replace: "className={`$1${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}$2`}"
  },
  {
    regex: /className="([^"]*)border-slate-200([^"]*)"/g,
    replace: "className={`$1${isDarkMode ? 'border-gray-700' : 'border-slate-200'}$2`}"
  },
  {
    regex: /className='([^']*)border-slate-200([^']*)'/g,
    replace: "className={`$1${isDarkMode ? 'border-gray-700' : 'border-slate-200'}$2`}"
  },
  // Fix the root container for each dashboard
  {
    regex: /<div className="mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-\[260px_1fr\]">/g,
    replace: "<div className={`mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-[260px_1fr] ${isDarkMode ? 'dark text-white' : ''}`}>"
  },
  {
    regex: /<div className='mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-\[260px_1fr\]'>/g,
    replace: "<div className={`mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-[260px_1fr] ${isDarkMode ? 'dark text-white' : ''}`}>"
  }
];

let totalChanges = 0;

dashboards.forEach(file => {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(({ regex, replace }) => {
      content = content.replace(regex, replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
      totalChanges++;
    } else {
      console.log(`No matching classes found in ${file} or already updated.`);
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log(`Done patching. Files updated: ${totalChanges}`);
