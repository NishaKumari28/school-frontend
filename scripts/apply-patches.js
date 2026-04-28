const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../src/app/dashboard/components/SuperadminDashboard.js');
let c = fs.readFileSync(FILE, 'utf-8');

function replaceOnce(search, replace) {
  if (!c.includes(search)) {
    console.log('MISSING:', search.slice(0, 60));
    return false;
  }
  c = c.replace(search, replace);
  console.log('APPLIED:', search.slice(0, 60));
  return true;
}

// 1. Add DownloadCSVModal rendering
replaceOnce(
  `      {/* Password Reset Modal */}\n      {showPasswordResetModal && passwordResetUser && (`,
  `      {/* CSV Download Modal */}\n      {showDownloadModal && (\n        <DownloadCSVModal\n          isOpen={showDownloadModal}\n          users={downloadUsersList}\n          role={downloadRole}\n          onClose={() => setShowDownloadModal(false)}\n        />\n      )}\n\n      {/* Password Reset Modal */}\n      {showPasswordResetModal && passwordResetUser && (`
);

// 2. Add Download button to "All Users" section
replaceOnce(
  `                <h2 className={\\`text-xl font-bold mb-4 \\${isDarkMode ? 'text-white' : 'text-gray-800'}\\`}>All Users</h2>`,
  `                <div className="flex flex-wrap justify-between items-center mb-4 gap-3">\n                  <h2 className={\\`text-xl font-bold \\${isDarkMode ? 'text-white' : 'text-gray-800'}\\`}>All Users</h2>\n                  <div className="flex items-center gap-2">\n                    <span className={\\`text-xs \\${isDarkMode ? 'text-gray-400' : 'text-gray-500'}\\`}>\n                      {filteredUsers.length} user(s)\n                    </span>\n                    <button\n                      onClick={() => {\n                        setDownloadUsersList(filteredUsers);\n                        setDownloadRole(listFilterRole === 'all' ? 'all' : listFilterRole);\n                        setShowDownloadModal(true);\n                      }}\n                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded shadow transition-all flex items-center gap-1"\n                    >\n                      ⬇ Download CSV\n                    </button>\n                  </div>\n                </div>`
);

// 3. Rename Staff to Non teaching Staff in display labels
replaceOnce(
  `title="Staff"`,
  `title="Non teaching Staff"`
);

replaceOnce(
  `"Staff List"`,
  `"Non teaching Staff List"`
);

replaceOnce(
  `>Staff</option>`,
  `>Non teaching Staff</option>`
);

fs.writeFileSync(FILE, c);
console.log('File saved.');
