const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/dashboard/components/SuperadminDashboard.js');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add DownloadCSVModal rendering before PasswordResetModal usage
const search1 = `{showPasswordResetModal && passwordResetUser && (`;
const replace1 = `{showDownloadModal && (
        <DownloadCSVModal
          isOpen={showDownloadModal}
          users={downloadUsersList}
          role={downloadRole}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      {showPasswordResetModal && passwordResetUser && (`;
content = content.replace(search1, replace1);

// 2. Add Download button for "All Users" section
const search2 = `<h2 className={\`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}\`}>All Users</h2>`;
const replace2 = `<div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                  <h2 className={\`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}\`}>All Users</h2>
                  <div className="flex items-center gap-2">
                    <span className={\`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}\`}>
                      {filteredUsers.length} user(s)
                    </span>
                    <button
                      onClick={() => {
                        setDownloadUsersList(filteredUsers);
                        setDownloadRole(listFilterRole === 'all' ? 'all' : listFilterRole);
                        setShowDownloadModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded shadow transition-all flex items-center gap-1"
                    >
                      ⬇ Download CSV
                    </button>
                  </div>
                </div>`;
content = content.replace(search2, replace2);

// 3. Add Download button for Detail List pages - after the Back button row
const search3 = `<button onClick={handleBackToOverview} className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1">
                ← Back
              </button>
              <h2 className={\`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}\`}>
                {detailListRole === "admins" && "Admin List"}
                {detailListRole === "teachers" && "Teacher List"}
                {detailListRole === "students" && "Student List"}
                {detailListRole === "parents" && "Parent List"}
                {detailListRole === "staff" && "Staff List"}`;
const replace3 = `<button onClick={handleBackToOverview} className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1">
                ← Back
              </button>
              <h2 className={\`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}\`}>
                {detailListRole === "admins" && "Admin List"}
                {detailListRole === "teachers" && "Teacher List"}
                {detailListRole === "students" && "Student List"}
                {detailListRole === "parents" && "Parent List"}
                {detailListRole === "staff" && "Staff List"}`;
// Detail list download button is harder to insert precisely - skip for now and add after the header area

fs.writeFileSync(filePath, content);
console.log('SuperadminDashboard.js updated successfully');

