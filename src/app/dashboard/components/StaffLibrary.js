'use client';
import { useState, useMemo, useRef } from 'react';
import { libraryUtils, generateId } from '../utils/staffDataUtils';
import Papa from 'papaparse';

function SearchableSelect({ options, value, onChange, placeholder, isDarkMode }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = options.filter(o => o.searchStr.toLowerCase().includes(query.toLowerCase()));
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-2xl border text-left cursor-pointer flex justify-between items-center text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </div>
      
      {isOpen && (
        <div className={`absolute z-[110] w-full mt-2 rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <div className="p-3 border-b dark:border-gray-700">
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-400'}`}
            />
          </div>
          <div className="overflow-y-auto max-h-48 p-1.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs font-bold text-center text-slate-400">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value} 
                  onClick={() => { onChange(opt.value); setIsOpen(false); setQuery(''); }}
                  className={`px-4 py-3 text-xs font-bold rounded-xl cursor-pointer transition-all ${value === opt.value ? 'bg-blue-600 text-white shadow-md' : isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 hover:text-blue-700 text-slate-600'}`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
}

function SearchableMultiSelect({ options, selectedValues, onChange, placeholder, isDarkMode }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = options.filter(o => o.searchStr.toLowerCase().includes(query.toLowerCase()));

  const toggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-2xl border text-left cursor-pointer flex justify-between items-center text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`}
      >
        <span className="truncate pr-4">{selectedValues.length > 0 ? `${selectedValues.length} selected` : placeholder}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </div>
      
      {isOpen && (
        <div className={`absolute z-[110] w-full mt-2 rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <div className="p-3 border-b dark:border-gray-700">
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-400'}`}
            />
          </div>
          <div className="overflow-y-auto max-h-48 p-1.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs font-bold text-center text-slate-400">No results found</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div 
                    key={opt.value} 
                    onClick={(e) => { e.stopPropagation(); toggleOption(opt.value); }}
                    className={`px-4 py-3 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-300' : isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-slate-50 hover:text-slate-700 text-slate-600'}`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
}

export default function StaffLibrary({ isDarkMode, showMessage, students = [], teachers = [], staffClassOptions = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [readingSearch, setReadingSearch] = useState({ query: '', date: '' });
  const [studentSearch, setStudentSearch] = useState({ query: '', date: '' });
  const [teacherSearch, setTeacherSearch] = useState({ query: '', date: '' });
  const [readingStudentSearch, setReadingStudentSearch] = useState('');
  const [lendingStudentSearch, setLendingStudentSearch] = useState('');
  
  // Modal States
  const [showBookModal, setShowBookModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showStudentLendingModal, setShowStudentLendingModal] = useState(false);
  const [showTeacherLendingModal, setShowTeacherLendingModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeReturnId, setActiveReturnId] = useState(null);
  const [fineEntries, setFineEntries] = useState([]);
  const [currentFine, setCurrentFine] = useState({ reason: 'Late Return Fine', customReason: '', amount: 0 });
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States
  const [bookForm, setBookForm] = useState({ title: '', author: '', subject: 'Science', class: '10th', isbn: '', stock: 1 });
  const [readingForm, setReadingForm] = useState({ studentId: '', selectedBooks: [] });
  const [studentLendingForm, setStudentLendingForm] = useState({ studentId: '', selectedBooks: [], expectedReturnDate: '' });
  const [teacherLendingForm, setTeacherLendingForm] = useState({ teacherId: '', selectedBooks: [], expectedReturnDate: '' });

  const fileInputAddRef = useRef(null);
  const fileInputRemoveRef = useRef(null);

  // Data Fetching
  const books = useMemo(() => libraryUtils.getBooks(), [refreshKey]);
  const readingLogs = useMemo(() => libraryUtils.getReadingLogs(), [refreshKey]);
  const studentLending = useMemo(() => libraryUtils.getStudentLending(), [refreshKey]);
  const teacherLending = useMemo(() => libraryUtils.getTeacherLending(), [refreshKey]);

  // Filters
  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Options for custom selects
  const studentOptions = useMemo(() => students.map(s => ({
    value: s.id,
    label: `${s.name} (Class ${s.class} - Sec ${s.section || s.sec || ''})`,
    searchStr: `${s.name} ${s.class} ${s.section || s.sec || ''}`
  })), [students]);

  const teacherOptions = useMemo(() => teachers.map(t => ({
    value: t.id,
    label: `${t.name} (${t.subject})`,
    searchStr: `${t.name} ${t.subject}`
  })), [teachers]);

  const bookOptions = useMemo(() => books.filter(b => b.stock > 0).map(b => ({
    value: b.id,
    label: `${b.title} (Available: ${b.stock})`,
    searchStr: `${b.title} ${b.isbn} ${b.subject}`
  })), [books]);

  // Handlers
  const handleSaveBook = (e) => {
    e.preventDefault();
    libraryUtils.saveBook(bookForm);
    setShowBookModal(false);
    setRefreshKey(k => k + 1);
    showMessage('Book record updated', 'success');
  };

  const handleReadingSession = (e) => {
    e.preventDefault();
    if (!readingForm.studentId || readingForm.selectedBooks.length === 0) {
      showMessage('Please select a student and at least one book', 'error');
      return;
    }
    const student = students.find(s => s.id === readingForm.studentId);
    readingForm.selectedBooks.forEach(bookId => {
      const book = books.find(b => b.id === bookId);
      if (book) {
        libraryUtils.addReadingLog({
          studentName: student?.name || '',
          class: student?.class || '',
          sec: student?.section || student?.sec || '',
          bookId: book.isbn || book.id,
          bookSubject: book.subject || 'General'
        });
      }
    });
    setShowReadingModal(false);
    setRefreshKey(k => k + 1);
    showMessage(`Reading session started for ${readingForm.selectedBooks.length} book(s)`, 'success');
  };

  const handleStudentLending = (e) => {
    e.preventDefault();
    if (!studentLendingForm.studentId || studentLendingForm.selectedBooks.length === 0) {
      showMessage('Please select a student and at least one book', 'error');
      return;
    }
    const student = students.find(s => s.id === studentLendingForm.studentId);
    studentLendingForm.selectedBooks.forEach(bookId => {
      const book = books.find(b => b.id === bookId);
      if (book) {
        libraryUtils.issueStudentBook({
          studentName: student?.name || '',
          class: student?.class || '',
          sec: student?.section || student?.sec || '',
          bookName: book.title,
          bookId: book.isbn || book.id,
          expectedReturnDate: studentLendingForm.expectedReturnDate
        });
      }
    });
    setShowStudentLendingModal(false);
    setRefreshKey(k => k + 1);
    showMessage(`${studentLendingForm.selectedBooks.length} book(s) issued to student`, 'success');
  };

  const handleTeacherLending = (e) => {
    e.preventDefault();
    if (!teacherLendingForm.teacherId || teacherLendingForm.selectedBooks.length === 0) {
      showMessage('Please select a teacher and at least one book', 'error');
      return;
    }
    const teacher = teachers.find(t => t.id === teacherLendingForm.teacherId);
    teacherLendingForm.selectedBooks.forEach(bookId => {
      const book = books.find(b => b.id === bookId);
      if (book) {
        libraryUtils.issueTeacherBook({
          teacherName: teacher?.name || '',
          teacherSubject: teacher?.subject || '',
          bookSubject: book.subject || 'General',
          bookId: book.isbn || book.id,
          expectedReturnDate: teacherLendingForm.expectedReturnDate
        });
      }
    });
    setShowTeacherLendingModal(false);
    setRefreshKey(k => k + 1);
    showMessage(`${teacherLendingForm.selectedBooks.length} book(s) issued to teacher`, 'success');
  };

  const downloadSampleAdd = () => {
    const csv = "title,author,subject,class,id,stock\nScience Explorer,Dr. Smith,Quantum Physics,10th A,B-900@1,5\nHistory of India,R.K. Gupta,Medieval Era,12th C,H-200#X,3";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'library_bulk_add_sample.csv'; a.click();
  };

  const downloadSampleRemove = () => {
    const csv = "id\nB-900@1\nH-200#X";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'library_bulk_remove_sample.csv'; a.click();
  };

  const handleBulkAdd = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (res) => {
          libraryUtils.bulkAddBooks(res.data);
          setRefreshKey(k => k + 1);
          showMessage(`Bulk added ${res.data.length} books`, 'success');
        }
      });
    }
  };

  const handleBulkRemove = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (res) => {
          const ids = res.data.map(d => d.id).filter(i => i);
          libraryUtils.bulkRemoveBooks(ids);
          setRefreshKey(k => k + 1);
          showMessage(`Bulk removed ${ids.length} books`, 'success');
        }
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col gap-4">
        <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl w-fit ${isDarkMode ? 'bg-gray-800' : 'bg-slate-100'}`}>
          {['inventory', 'reading-room', 'student-lending', 'teacher-lending'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all capitalize tracking-tight ${
                activeSubTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' 
                  : `${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-slate-600 hover:text-slate-700'}`
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Inventory Tab */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black">Book Inventory</h2>
              <p className="text-sm text-slate-600 font-medium">Manage your library's collection subject-wise</p>
            </div>
            <div className="flex gap-2">
              <input type="file" ref={fileInputAddRef} className="hidden" onChange={handleBulkAdd} />
              <input type="file" ref={fileInputRemoveRef} className="hidden" onChange={handleBulkRemove} />
              
              <div className="dropdown relative group">
                <button className={`px-4 py-2 border rounded-xl text-xs font-black flex items-center gap-2 transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}>
                  📥 Samples
                </button>
                <div className={`absolute top-full right-0 mt-2 w-48 rounded-2xl shadow-2xl border transition-all z-50 overflow-hidden hidden group-hover:block ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                  <button onClick={downloadSampleAdd} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-tight transition-all border-b ${isDarkMode ? 'hover:bg-gray-700 text-gray-300 border-gray-700' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-slate-100'}`}>Add Books Template</button>
                  <button onClick={downloadSampleRemove} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-tight transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`}>Remove Books Template</button>
                </div>
              </div>

              <button onClick={() => fileInputAddRef.current.click()} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all">+ Bulk Add</button>
              <button onClick={() => fileInputRemoveRef.current.click()} className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 transition-all">- Bulk Remove</button>
              <button onClick={() => { setBookForm({ title:'', author:'', subject:'Science', class:'10th', isbn:'', stock:1 }); setShowBookModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all">+ Add Book</button>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
                <input 
                  placeholder="Search by Title, Subject, or Class..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-600 border-b text-[10px] font-black uppercase tracking-widest">
                    <th className="p-4 text-left">Book Title</th>
                    <th className="p-4 text-left">Author</th>
                    <th className="p-4 text-left">Subject</th>
                    <th className="p-4 text-left">Class</th>
                    <th className="p-4 text-left">Book ID</th>
                    <th className="p-4 text-center">Stock</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredBooks.map(b => (
                    <tr key={b.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40">
                      <td className="p-4">
                        <p className="font-black text-blue-600">{b.title}</p>
                      </td>
                      <td className="p-4 text-xs font-medium">{b.author}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-tight">{b.subject}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black">Class {b.class}</span>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-600">{b.isbn || b.id}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-lg font-black text-xs ${b.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {b.stock} units
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => { libraryUtils.deleteBook(b.id); setRefreshKey(k=>k+1); showMessage('Book removed','warning'); }} className="text-red-500 hover:underline font-bold text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reading Room Tab */}
      {activeSubTab === 'reading-room' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-indigo-600">Reading Room Dairy</h2>
              <p className="text-sm text-slate-600 font-medium">Tracking in-library study sessions</p>
            </div>
            <div className="flex gap-2">
               <div className="relative">
                 <input 
                   placeholder="Search Student, Book ID, Subject..." 
                   value={readingSearch.query}
                   onChange={e => setReadingSearch({...readingSearch, query: e.target.value})}
                   className={`pl-9 pr-4 py-2 rounded-xl border text-xs w-64 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                 />
                 <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
               </div>
               <input 
                 type="date" 
                 value={readingSearch.date}
                 onChange={e => setReadingSearch({...readingSearch, date: e.target.value})}
                 className={`px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
               />
               <button onClick={() => setShowReadingModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20">+ Log Session</button>
            </div>
          </div>
          
          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-600 border-b text-[10px] font-black uppercase tracking-widest">
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Student Info</th>
                  <th className="p-4 text-left">Book ID</th>
                  <th className="p-4 text-left">Subject</th>
                  <th className="p-4 text-left">In Time</th>
                  <th className="p-4 text-left">Out Time</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {readingLogs
                  .filter(l => {
                    const q = readingSearch.query.toLowerCase();
                    const matchesQuery = !q || l.studentName.toLowerCase().includes(q) || l.bookId.toLowerCase().includes(q) || l.bookSubject.toLowerCase().includes(q);
                    const matchesDate = !readingSearch.date || l.date === readingSearch.date;
                    return matchesQuery && matchesDate;
                  })
                  .map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40">
                    <td className="p-4 text-xs font-bold text-indigo-600">{l.date}</td>
                    <td className="p-4">
                      <p className="font-bold">{l.studentName}</p>
                      <p className="text-[10px] text-slate-500">Class {l.class} - Sec {l.sec}</p>
                    </td>
                    <td className="p-4 text-xs font-mono">{l.bookId}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">{l.bookSubject}</span>
                    </td>
                    <td className="p-4 font-mono text-xs text-emerald-600 font-bold">{l.issueTime}</td>
                    <td className="p-4 font-mono text-xs text-red-500 font-bold">{l.returnTime || '--:--'}</td>
                    <td className="p-4 text-right">
                      {!l.returnTime ? (
                        <button onClick={() => { libraryUtils.returnReadingBook(l.id); setRefreshKey(k=>k+1); }} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all">MARK RETURN</button>
                      ) : (
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-tighter">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Student Lending Tab */}
      {activeSubTab === 'student-lending' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-orange-600">Student Lending Dairy</h2>
              <p className="text-sm text-slate-600 font-medium">Tracking books taken out for home study</p>
            </div>
            <div className="flex gap-2">
               <div className="relative">
                 <input 
                   placeholder="Name, Book ID, Subject..." 
                   value={studentSearch.query}
                   onChange={e => setStudentSearch({...studentSearch, query: e.target.value})}
                   className={`pl-9 pr-4 py-2 rounded-xl border text-xs w-64 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                 />
                 <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
               </div>
               <input 
                 type="date" 
                 value={studentSearch.date}
                 onChange={e => setStudentSearch({...studentSearch, date: e.target.value})}
                 className={`px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
               />
               <button onClick={() => setShowStudentLendingModal(true)} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20">+ Issue Book</button>
            </div>
          </div>
          
          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-600 border-b text-[10px] font-black uppercase">
                  <th className="p-4 text-left">Borrower</th>
                  <th className="p-4 text-left">Book Info</th>
                  <th className="p-4 text-left">Dates</th>
                  <th className="p-4 text-left">Fine</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {studentLending
                  .filter(l => {
                    const q = studentSearch.query.toLowerCase();
                    const matchesQuery = !q || l.studentName.toLowerCase().includes(q) || l.bookId.toLowerCase().includes(q) || l.bookName.toLowerCase().includes(q);
                    const matchesDate = !studentSearch.date || l.issueDate === studentSearch.date || l.expectedReturnDate === studentSearch.date;
                    return matchesQuery && matchesDate;
                  })
                  .map(l => (
                  <tr key={l.id}>
                    <td className="p-4">
                      <p className="font-bold">{l.studentName}</p>
                      <p className="text-[10px] text-slate-500">Class {l.class}-{l.sec}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-orange-600">{l.bookName}</p>
                      <p className="text-[10px] text-slate-500">ID: {l.bookId}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-[10px] text-slate-500">Issued: {l.issueDate}</p>
                      <p className="text-[10px] font-bold text-red-500">Exp: {l.expectedReturnDate}</p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        {(l.fineEntries || []).map((f, i) => (
                           <p key={i} className="text-[9px] text-red-600 font-bold leading-tight">{f.reason === 'Other' ? (f.customReason || 'Custom Fine') : f.reason}: ₹{f.amount}</p>
                        ))}
                        <p className="font-black text-xs">Total: ₹{l.fine || 0}</p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {l.status === 'Issued' ? (
                        <button onClick={() => { 
                          setActiveReturnId(l.id);
                          setFineEntries([]);
                          setReturnDate(new Date().toISOString().split('T')[0]);
                          setCurrentFine({ reason: 'Late Return Fine', customReason: '', amount: 0 });
                          
                          // Auto-suggest late fine if overdue
                          const today = new Date().toISOString().split('T')[0];
                          if (today > l.expectedReturnDate) {
                            setFineEntries([{ reason: 'Late Return Fine', amount: 10 }]); // Suggested default
                          }
                          
                          setShowReturnModal(true);
                        }} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black border border-red-100 hover:bg-red-100 transition-all">RETURN BOOK</button>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-500 font-bold text-[10px] uppercase">Returned</span>
                          <span className="text-[9px] text-slate-500">on {l.returnDate}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Teacher Lending Tab */}
      {activeSubTab === 'teacher-lending' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-emerald-600">Teacher Lending Dairy</h2>
              <p className="text-sm text-slate-600 font-medium">Tracking books issued to faculty members</p>
            </div>
            <div className="flex gap-2">
               <div className="relative">
                 <input 
                   placeholder="Name, Book ID, Subject..." 
                   value={teacherSearch.query}
                   onChange={e => setTeacherSearch({...teacherSearch, query: e.target.value})}
                   className={`pl-9 pr-4 py-2 rounded-xl border text-xs w-64 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                 />
                 <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
               </div>
               <input 
                 type="date" 
                 value={teacherSearch.date}
                 onChange={e => setTeacherSearch({...teacherSearch, date: e.target.value})}
                 className={`px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
               />
               <button onClick={() => setShowTeacherLendingModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20">+ Issue to Teacher</button>
            </div>
          </div>
          
          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-600 border-b text-[10px] font-black uppercase">
                  <th className="p-4 text-left">Teacher</th>
                  <th className="p-4 text-left">Book/Subject</th>
                  <th className="p-4 text-left">Return Exp.</th>
                  <th className="p-4 text-left">Fine</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {teacherLending
                  .filter(l => {
                    const q = teacherSearch.query.toLowerCase();
                    const matchesQuery = !q || l.teacherName.toLowerCase().includes(q) || l.bookId.toLowerCase().includes(q) || l.bookSubject.toLowerCase().includes(q);
                    const matchesDate = !teacherSearch.date || l.issueDate === teacherSearch.date || l.expectedReturnDate === teacherSearch.date;
                    return matchesQuery && matchesDate;
                  })
                  .map(l => (
                  <tr key={l.id}>
                    <td className="p-4">
                      <p className="font-bold">{l.teacherName}</p>
                      <p className="text-[10px] text-slate-500">{l.teacherSubject}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-emerald-600">ID: {l.bookId}</p>
                      <p className="text-[10px] text-slate-500">{l.bookSubject}</p>
                    </td>
                    <td className="p-4 text-xs font-bold text-red-500">Exp: {l.expectedReturnDate}</td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        {(l.fineEntries || []).map((f, i) => (
                           <p key={i} className="text-[9px] text-red-600 font-bold leading-tight">{f.reason === 'Other' ? (f.customReason || 'Custom Fine') : f.reason}: ₹{f.amount}</p>
                        ))}
                        <p className="font-black text-xs">Total: ₹{l.fine || 0}</p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {l.status === 'Issued' ? (
                        <button onClick={() => { 
                          setActiveReturnId(l.id);
                          setFineEntries([]);
                          setReturnDate(new Date().toISOString().split('T')[0]);
                          setCurrentFine({ reason: 'Late Return Fine', customReason: '', amount: 0 });
                          
                          // Auto-suggest late fine if overdue
                          const today = new Date().toISOString().split('T')[0];
                          if (today > l.expectedReturnDate) {
                            setFineEntries([{ reason: 'Late Return Fine', amount: 10 }]);
                          }
                          
                          setShowReturnModal(true);
                        }} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all">MARK RETURN</button>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-tighter">Returned</span>
                          <span className="text-[9px] text-slate-500">on {l.returnDate}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showBookModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">Library Book Record</h3>
             <form onSubmit={handleSaveBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Book Title</label>
                      <input required value={bookForm.title} onChange={e=>setBookForm({...bookForm, title:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Author</label>
                      <input required value={bookForm.author} onChange={e=>setBookForm({...bookForm, author:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Subject</label>
                      <input 
                        required 
                        placeholder="e.g. Physics, History..."
                        value={bookForm.subject} 
                        onChange={e=>setBookForm({...bookForm, subject:e.target.value})} 
                        className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Class</label>
                      <select 
                        required
                        value={bookForm.class} 
                        onChange={e=>setBookForm({...bookForm, class:e.target.value})} 
                        className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                      >
                         <option value="">Select Class</option>
                         {staffClassOptions.map((c, i) => (
                           <option key={i} value={c}>{c}</option>
                         ))}
                      </select>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Book ID</label>
                      <input 
                        required 
                        placeholder="e.g. B-101#2024"
                        value={bookForm.isbn} 
                        onChange={e=>setBookForm({...bookForm, isbn:e.target.value})} 
                        className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Quantity (Stock)</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={bookForm.stock} 
                        onChange={e=>setBookForm({...bookForm, stock:e.target.value})} 
                        className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} 
                      />
                   </div>
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowBookModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl">Save Book</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {showReadingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">Reading Room Entry</h3>
             <form onSubmit={handleReadingSession} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Student</label>
                   <SearchableSelect 
                     options={studentOptions} 
                     value={readingForm.studentId} 
                     onChange={(val) => setReadingForm({...readingForm, studentId: val})} 
                     placeholder="-- Choose Student --" 
                     isDarkMode={isDarkMode} 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Select Book(s)</label>
                   <SearchableMultiSelect 
                     options={bookOptions} 
                     selectedValues={readingForm.selectedBooks} 
                     onChange={(vals) => setReadingForm({...readingForm, selectedBooks: vals})} 
                     placeholder="-- Choose Book(s) --" 
                     isDarkMode={isDarkMode} 
                   />
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowReadingModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl">Start Session</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {showStudentLendingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">Issue Book to Student</h3>
             <form onSubmit={handleStudentLending} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Student</label>
                   <SearchableSelect 
                     options={studentOptions} 
                     value={studentLendingForm.studentId} 
                     onChange={(val) => setStudentLendingForm({...studentLendingForm, studentId: val})} 
                     placeholder="-- Choose Student --" 
                     isDarkMode={isDarkMode} 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Select Book(s)</label>
                   <SearchableMultiSelect 
                     options={bookOptions} 
                     selectedValues={studentLendingForm.selectedBooks} 
                     onChange={(vals) => setStudentLendingForm({...studentLendingForm, selectedBooks: vals})} 
                     placeholder="-- Choose Book(s) --" 
                     isDarkMode={isDarkMode} 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Expected Return Date</label>
                   <input type="date" required value={studentLendingForm.expectedReturnDate} onChange={e=>setStudentLendingForm({...studentLendingForm, expectedReturnDate:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowStudentLendingModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-orange-600 text-white font-black shadow-xl">Confirm Issue</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {showTeacherLendingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">Issue Book to Teacher</h3>
             <form onSubmit={handleTeacherLending} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Teacher</label>
                   <SearchableSelect 
                     options={teacherOptions} 
                     value={teacherLendingForm.teacherId} 
                     onChange={(val) => setTeacherLendingForm({...teacherLendingForm, teacherId: val})} 
                     placeholder="-- Choose Teacher --" 
                     isDarkMode={isDarkMode} 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Select Book(s)</label>
                   <SearchableMultiSelect 
                     options={bookOptions} 
                     selectedValues={teacherLendingForm.selectedBooks} 
                     onChange={(vals) => setTeacherLendingForm({...teacherLendingForm, selectedBooks: vals})} 
                     placeholder="-- Choose Book(s) --" 
                     isDarkMode={isDarkMode} 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500">Expected Return Date</label>
                   <input type="date" required value={teacherLendingForm.expectedReturnDate} onChange={e=>setTeacherLendingForm({...teacherLendingForm, expectedReturnDate:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowTeacherLendingModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-xl">Confirm Issue</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* 5. Return Book Fine Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-slate-100'}`}>
             <h3 className={`text-xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Process Return & Fines</h3>
             
             <div className="space-y-5">
                {/* Dates Section */}
                <div className="grid grid-cols-2 gap-3">
                   <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-100'}`}>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Expected On</p>
                      <p className={`text-sm font-black ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                        {activeSubTab === 'student-lending' 
                          ? studentLending.find(x=>x.id === activeReturnId)?.expectedReturnDate 
                          : teacherLending.find(x=>x.id === activeReturnId)?.expectedReturnDate}
                      </p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 ml-2">Actual Return</label>
                      <input 
                        type="date" 
                        value={returnDate} 
                        onChange={e => {
                          const newDate = e.target.value;
                          setReturnDate(newDate);
                          const exp = activeSubTab === 'student-lending' 
                            ? studentLending.find(x=>x.id === activeReturnId)?.expectedReturnDate 
                            : teacherLending.find(x=>x.id === activeReturnId)?.expectedReturnDate;
                          
                          if (newDate > exp && !fineEntries.some(f => f.reason === 'Late Return Fine')) {
                             setFineEntries([...fineEntries, { reason: 'Late Return Fine', amount: 10 }]);
                          }
                        }}
                        className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                      />
                   </div>
                </div>

                {/* Fine Entry Section */}
                <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-slate-50/50 border-slate-200'}`}>
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Add Fine Entry</p>
                   <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <select 
                          value={currentFine.reason} 
                          onChange={e=>setCurrentFine({...currentFine, reason:e.target.value})} 
                          className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-bold appearance-none cursor-pointer ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                        >
                           <option>Late Return Fine</option>
                           <option>Book Damage Fine</option>
                           <option>Book Issued Fee</option>
                           <option>Missing Pages Fine</option>
                           <option value="Other">Other (Custom)</option>
                        </select>
                        <input 
                          type="number" 
                          placeholder="₹"
                          value={currentFine.amount} 
                          onChange={e=>setCurrentFine({...currentFine, amount:e.target.value})} 
                          className={`w-24 px-4 py-3 rounded-2xl border text-xs font-black ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`} 
                        />
                        <button 
                          onClick={() => {
                            if (currentFine.amount > 0) {
                              const entry = { ...currentFine };
                              if (entry.reason === 'Other' && !entry.customReason) entry.customReason = 'Custom Fine';
                              setFineEntries([...fineEntries, entry]);
                              setCurrentFine({ reason: 'Late Return Fine', customReason: '', amount: 0 });
                            }
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                          <span className="text-xl font-bold">+</span>
                        </button>
                      </div>
                      {currentFine.reason === 'Other' && (
                        <input 
                          placeholder="Type custom reason..."
                          value={currentFine.customReason}
                          onChange={e => setCurrentFine({...currentFine, customReason: e.target.value})}
                          className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium animate-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                        />
                      )}
                   </div>
                </div>

                {/* List of Applied Fines */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                   {fineEntries.map((f, i) => (
                     <div key={i} className={`flex justify-between items-center p-3 rounded-2xl border animate-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'bg-red-900/10 border-red-500/20' : 'bg-red-50/50 border-red-100'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-tight ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{f.reason === 'Other' ? f.customReason : f.reason}</span>
                        <div className="flex items-center gap-3">
                           <span className={`text-xs font-black ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>₹{f.amount}</span>
                           <button onClick={() => setFineEntries(fineEntries.filter((_, idx) => idx !== i))} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-800/30 text-red-400 transition-all">×</button>
                        </div>
                     </div>
                   ))}
                </div>
                
                {/* Total Section */}
                <div className={`p-6 rounded-[2rem] shadow-xl transition-all ${isDarkMode ? 'bg-gradient-to-br from-indigo-600 to-blue-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Total Charge</span>
                      <span className="text-2xl font-black text-white drop-shadow-md">₹{fineEntries.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toFixed(2)}</span>
                   </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-2">
                   <button onClick={()=>setShowReturnModal(false)} className={`flex-1 py-4 rounded-2xl font-bold transition-all active:scale-95 ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                   <button onClick={()=>{
                      const totalFine = fineEntries.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
                      if (activeSubTab === 'student-lending') {
                        libraryUtils.returnStudentBook(activeReturnId, totalFine, fineEntries, 'Returned', returnDate);
                      } else {
                        libraryUtils.returnTeacherBook(activeReturnId, totalFine, fineEntries, returnDate);
                      }
                      setShowReturnModal(false);
                      setRefreshKey(k=>k+1);
                      showMessage('Book return processed successfully', 'success');
                   }} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95">Complete Process</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
