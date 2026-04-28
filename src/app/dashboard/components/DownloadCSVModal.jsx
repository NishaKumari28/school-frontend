'use client';
import { useState, useEffect } from 'react';
import { downloadUsersCsv } from '../utils/csvUtils';

export default function DownloadCSVModal({
  isOpen,
  onClose,
  users = [],
  role = 'all',
  isDarkMode = false
}) {
  const [quantity, setQuantity] = useState('');

  const total = users.length;
  const displayRole = role === 'all'
    ? 'All Users'
    : role === 'parents'
    ? 'Parents'
    : role === 'staff'
    ? 'Non teaching Staff'
    : role.charAt(0).toUpperCase() + role.slice(1) + 's';

  useEffect(() => {
    if (isOpen) {
      setQuantity(total > 0 ? total.toString() : '');
    }
  }, [isOpen, total]);

  const handleDownload = () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }
    downloadUsersCsv(users, role, qty);
    onClose();
  };

  const handleDownloadAll = () => {
    downloadUsersCsv(users, role, total);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-xl p-6 w-[420px] max-w-full shadow-xl ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          ⬇️ Download {displayRole}
        </h3>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Total available records: <span className="font-semibold">{total}</span>
        </p>

        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Quantity to download
          </label>
          <input
            type="number"
            min={1}
            max={total}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
            placeholder={`Enter number (max ${total})`}
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Leave as-is to download all {total} records, or enter a smaller number.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Download {quantity && parseInt(quantity, 10) > 0 ? Math.min(parseInt(quantity, 10), total) : total} Records
          </button>
          <button
            onClick={handleDownloadAll}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Download All
          </button>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium transition ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

