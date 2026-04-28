const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/dashboard/components/SuperadminDashboard.js');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add DownloadCSVModal rendering before PasswordResetModal
const passwordResetModalAnchor = `      {/* Password Reset Modal */}\n      {showPasswordResetModal && passwordResetUser && (`;
if (content.includes(passwordResetModalAnchor) && !content.includes('showDownloadModal && (')) {
  const newModal = `      {/* CSV Download Modal */}\n      {showDownloadModal && (\n        <DownloadCSVModal\n          isOpen={showDownloadModal}\n          users={downloadUsersList}\n          role={downloadRole}\n          onClose={() => setShowDownloadModal(false)}\n        />\n      )}\n\n      {/* Password Reset Modal */}\n      {showPasswordResetModal && passwordResetUser && (`;
  content = content.replace(passwordResetModalAnchor, newModal);
}

// 2. Add Download button for "All Users" section
const allUsersHeading = `                <h2 className={\`text-xl font-bold mb-4 \${isDarkMode ? 'text-white' : 'text-gray-800'}\`}>All Users</h2>`;
if (content.includes(allUsersHeading) && !content.includes('filteredUsers.length} user(s)')) {
  const newHeading = `                <div className="flex flex-wrap justify-between items-center mb-4 gap-3">\n                  <h2 className={\`text-xl font-bold \${isDarkMode ? 'text-white' : 'text-gray-800'}\`}>All Users</h2>\n                  <div className="flex items-center gap-2">\n                    <span className={\`text-xs \${isDarkMode ? 'text-gray-400' : 'text-gray-500'}\`}>\n                      {filteredUsers.length} user(s)\n                    </span>\n                    <button\n                      onClick={() => {\n                        setDownloadUsersList(filteredUsers);\n                        setDownloadRole(listFilterRole === 'all' ? 'all' : listFilterRole);\n                        setShowDownloadModal(true);\n                      }}\n                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded shadow transition-all flex items-center gap-1"\n                    >\n                      ⬇ Download CSV\n                    </button>\n                  </div>\n                </div>`;
  content = content.replace(allUsersHeading, newHeading);
}

// 3. Non teaching Staff rename in display labels
content = content.replace(/title="Staff"/g, 'title="Non teaching Staff"');
content = content.replace(/"Staff List"/g, '"Non teaching Staff List"');
content = content.replace(/>Staff<\\/option>/g, '>Non teaching Staff</option>');

fs.writeFileSync(filePath, content);
console.log('SuperadminDashboard.js patched successfully!');

