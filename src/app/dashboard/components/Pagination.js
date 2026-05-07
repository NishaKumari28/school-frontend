import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange, isDarkMode }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");

    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  return (
    <div className={`flex justify-center items-center gap-2 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          currentPage === 1 
            ? (isDarkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
        }`}
      >
        Previous
      </button>
      
      <div className="flex items-center gap-1 mx-2">
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => page !== "..." && onPageChange(page)}
            disabled={page === "..."}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
              page === currentPage 
                ? 'bg-blue-600 text-white shadow-md' 
                : page === "..." 
                  ? 'bg-transparent text-gray-500 cursor-default' 
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          currentPage === totalPages 
            ? (isDarkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
        }`}
      >
        Next
      </button>
    </div>
  );
}
