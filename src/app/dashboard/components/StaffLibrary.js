'use client';
import { useState, useMemo } from 'react';
import { libraryUtils } from '../utils/staffDataUtils';

export default function StaffLibrary({ isDarkMode, showMessage, allUsers }) {
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [issueForm, setIssueForm] = useState({ userId: '', dueDate: '' });

  const books = useMemo(() => libraryUtils.getBooks(), [refreshKey]);
  const transactions = useMemo(() => libraryUtils.getTransactions(), [refreshKey]);

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.isbn.includes(searchQuery)
  );

  const handleIssueBook = (e) => {
    e.preventDefault();
    libraryUtils.issueBook({
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      userId: issueForm.userId,
      userName: allUsers.find(u => u.id === issueForm.userId)?.name || 'Unknown',
      dueDate: issueForm.dueDate
    });
    setShowIssueModal(false);
    setRefreshKey(prev => prev + 1);
    if (showMessage) showMessage('Book issued successfully', 'success');
  };

  const handleReturnBook = (txId) => {
    libraryUtils.returnBook(txId);
    setRefreshKey(prev => prev + 1);
    if (showMessage) showMessage('Book returned successfully', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub Navigation */}
      <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-gray-800 w-fit">
        <button 
          onClick={() => setActiveSubTab('inventory')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'inventory' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
        >
          Book Catalog
        </button>
        <button 
          onClick={() => setActiveSubTab('transactions')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'transactions' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
        >
          Issue / Returns
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by title, author, or ISBN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}
          />
        </div>
      </div>

      {activeSubTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <div key={book.id} className={`p-5 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
              <div className="flex gap-4">
                <div className="w-20 h-28 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-3xl shadow-inner">
                  📚
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{book.title}</h3>
                  <p className="text-xs text-slate-500 mb-2">by {book.author}</p>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-[10px] font-bold text-slate-600 dark:text-gray-400">
                    {book.category}
                  </span>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Available</p>
                      <p className={`text-sm font-bold ${book.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{book.stock} Units</p>
                    </div>
                    <button 
                      disabled={book.stock === 0}
                      onClick={() => { setSelectedBook(book); setShowIssueModal(true); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${book.stock > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      Issue Book
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'transactions' && (
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <h2 className="text-xl font-bold mb-4">Library Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-slate-50 text-slate-500'}>
                <tr>
                  <th className="text-left p-4">Book Details</th>
                  <th className="text-left p-4">Issued To</th>
                  <th className="text-left p-4">Issue Date</th>
                  <th className="text-left p-4">Due Date</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-center p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-4">
                      <p className="font-bold">{tx.bookTitle}</p>
                      <p className="text-[10px] text-slate-400">ID: {tx.bookId}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{tx.userName}</p>
                      <p className="text-[10px] text-blue-500">{tx.userId}</p>
                    </td>
                    <td className="p-4 text-xs">{new Date(tx.issueDate).toLocaleDateString()}</td>
                    <td className="p-4 text-xs font-bold text-orange-600">{new Date(tx.dueDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${tx.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {tx.status === 'issued' && (
                        <button 
                          onClick={() => handleReturnBook(tx.id)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                        >
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-2">Issue Book</h3>
            <p className="text-sm text-slate-500 mb-6">Issuing: <span className="font-bold text-slate-800 dark:text-white">{selectedBook?.title}</span></p>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400">Borrower (Student/Teacher)</label>
                <select 
                  required
                  value={issueForm.userId}
                  onChange={(e) => setIssueForm({...issueForm, userId: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700 font-medium"
                >
                  <option value="">Select User</option>
                  {allUsers.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400">Due Date</label>
                <input 
                  type="date"
                  required
                  value={issueForm.dueDate}
                  onChange={(e) => setIssueForm({...issueForm, dueDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700 font-medium"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowIssueModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30">Confirm Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
