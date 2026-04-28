const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/app/dashboard/components/SuperadminDashboard.js');
let c = fs.readFileSync(file, 'utf-8');

// Add DownloadCSVModal render
if (!c.includes('showDownloadModal && (')) {
  c = c.replace(
    '      {showPasswordResetModal && passwordResetUser && (',
    `      {showDownloadModal && (
        <DownloadCSVModal
          isOpen={showDownloadModal}
          users={downloadUsersList}
          role={downloadRole}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      {showPasswordResetModal && passwordResetUser && (`
  );
}

// Rename Staff card title
if (c.includes('title="Staff"')) {
  c = c.replace(/title="Staff"/g, 'title="Non teaching Staff"');
}

// Rename Staff List heading
if (c.includes('"Staff List"')) {
  c = c.replace(/"Staff List"/g, '"Non teaching Staff List"');
}

// Rename Staff option in dropdown
if (c.includes('>Staff</option>')) {
  c = c.replace(/>Staff<\/option>/g, '>Non teaching Staff</option>');
}

fs.writeFileSync(file, c);
console.log('Done!');

