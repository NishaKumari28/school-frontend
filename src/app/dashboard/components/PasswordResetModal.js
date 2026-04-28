import { useState } from 'react';

export default function PasswordResetModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName, 
  userNumber,
  isDarkMode 
}) {
  if (!isOpen) return null;

  // Calculate the new generated password
  const last4 = userNumber ? String(userNumber).slice(-4) : '****';
  const newPassword = `VSMS@${last4}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-xl p-8 w-96 max-w-full text-center shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Are you sure?
        </h3>
        
        <p className={`mb-8 text-[15px] leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <span className="font-semibold">{userName}</span>'s password will be changed to <span className="font-bold underline text-blue-600">{newPassword}</span>. 
          <br />Do you want to proceed?
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={onConfirm}
            className="bg-indigo-500 text-white font-medium px-8 py-2 rounded shadow hover:bg-indigo-600 transition-colors"
          >
            Yes
          </button>
          <button
            onClick={onClose}
            className="bg-red-500 text-white font-medium px-8 py-2 rounded shadow hover:bg-red-600 transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}