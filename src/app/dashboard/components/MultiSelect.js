'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ 
  options, 
  selectedValues, 
  onChange, 
  placeholder = "Select options...", 
  isDarkMode = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Toggle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (option) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className={`w-full px-3 py-2 border rounded text-sm cursor-pointer flex justify-between items-center ${
          isDarkMode 
            ? 'bg-gray-600 border-gray-500 text-white' 
            : 'bg-white border-gray-300 text-gray-800'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-2">
          {selectedValues.length === 0 
            ? <span className="text-gray-400">{placeholder}</span>
            : selectedValues.join(', ')
          }
        </span>
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && (
            <span 
              onClick={handleClearAll} 
              className="text-gray-400 hover:text-red-500 font-bold px-1 rounded-full text-xs"
              title="Clear all"
            >
              ×
            </span>
          )}
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 border rounded shadow-lg max-h-60 overflow-y-auto ${
          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
        }`}>
          {options.length === 0 ? (
            <div className={`p-3 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No options available
            </div>
          ) : (
            <div className="py-1">
              {options.map((option) => (
                <label 
                  key={option} 
                  className={`flex items-center px-4 py-2 cursor-pointer transition-colors ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => handleToggle(option)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3 cursor-pointer"
                  />
                  <span className="text-sm select-none break-words w-full">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
