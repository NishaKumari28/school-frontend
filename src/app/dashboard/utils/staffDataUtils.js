/**
 * Staff Dashboard Data Utilities
 * Handles persistence for Hostel, Library, Transport, and Teacher Attendance
 */

const STORAGE_KEYS = {
  HOSTEL_ROOMS: 'school_hostel_rooms',
  HOSTEL_VISITORS: 'school_hostel_visitors',
  LIBRARY_BOOKS: 'school_library_books',
  LIBRARY_TX: 'school_library_transactions',
  TRANSPORT_VEHICLES: 'school_transport_vehicles',
  TRANSPORT_ROUTES: 'school_transport_routes',
  TEACHER_ATTENDANCE: 'school_teacher_attendance'
};

// --- COMMON UTILS ---
const getLocalData = (key) => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const setLocalData = (key, data) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

export const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

// --- HOSTEL ---
export const hostelUtils = {
  getRooms: () => getLocalData(STORAGE_KEYS.HOSTEL_ROOMS),
  saveRoom: (room) => {
    const rooms = hostelUtils.getRooms();
    const idx = rooms.findIndex(r => r.id === room.id);
    if (idx !== -1) rooms[idx] = room;
    else rooms.push({ ...room, id: room.id || generateId() });
    setLocalData(STORAGE_KEYS.HOSTEL_ROOMS, rooms);
  },
  getVisitors: () => getLocalData(STORAGE_KEYS.HOSTEL_VISITORS),
  addVisitor: (visitor) => {
    const visitors = hostelUtils.getVisitors();
    visitors.push({ ...visitor, id: generateId(), date: new Date().toISOString() });
    setLocalData(STORAGE_KEYS.HOSTEL_VISITORS, visitors);
  }
};

// --- LIBRARY ---
export const libraryUtils = {
  getBooks: () => getLocalData(STORAGE_KEYS.LIBRARY_BOOKS),
  saveBook: (book) => {
    const books = libraryUtils.getBooks();
    const idx = books.findIndex(b => b.id === book.id);
    if (idx !== -1) books[idx] = book;
    else books.push({ ...book, id: book.id || generateId() });
    setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, books);
  },
  getTransactions: () => getLocalData(STORAGE_KEYS.LIBRARY_TX),
  issueBook: (tx) => {
    const txs = libraryUtils.getTransactions();
    txs.push({ ...tx, id: generateId(), status: 'issued', issueDate: new Date().toISOString() });
    setLocalData(STORAGE_KEYS.LIBRARY_TX, txs);
    
    // Decrease stock
    const books = libraryUtils.getBooks();
    const bookIdx = books.findIndex(b => b.id === tx.bookId);
    if (bookIdx !== -1 && books[bookIdx].stock > 0) {
      books[bookIdx].stock -= 1;
      setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, books);
    }
  },
  returnBook: (txId) => {
    const txs = libraryUtils.getTransactions();
    const idx = txs.findIndex(t => t.id === txId);
    if (idx !== -1) {
      txs[idx].status = 'returned';
      txs[idx].returnDate = new Date().toISOString();
      setLocalData(STORAGE_KEYS.LIBRARY_TX, txs);
      
      // Increase stock
      const books = libraryUtils.getBooks();
      const bookIdx = books.findIndex(b => b.id === txs[idx].bookId);
      if (bookIdx !== -1) {
        books[bookIdx].stock += 1;
        setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, books);
      }
    }
  }
};

// --- TRANSPORT ---
export const transportUtils = {
  getVehicles: () => getLocalData(STORAGE_KEYS.TRANSPORT_VEHICLES),
  saveVehicle: (v) => {
    const vehicles = transportUtils.getVehicles();
    const idx = vehicles.findIndex(item => item.id === v.id);
    if (idx !== -1) vehicles[idx] = v;
    else vehicles.push({ ...v, id: v.id || generateId() });
    setLocalData(STORAGE_KEYS.TRANSPORT_VEHICLES, vehicles);
  },
  getRoutes: () => getLocalData(STORAGE_KEYS.TRANSPORT_ROUTES),
  saveRoute: (r) => {
    const routes = transportUtils.getRoutes();
    const idx = routes.findIndex(item => item.id === r.id);
    if (idx !== -1) routes[idx] = r;
    else routes.push({ ...r, id: r.id || generateId() });
    setLocalData(STORAGE_KEYS.TRANSPORT_ROUTES, routes);
  }
};

// --- TEACHER ATTENDANCE ---
export const teacherAttendanceUtils = {
  getAttendance: () => getLocalData(STORAGE_KEYS.TEACHER_ATTENDANCE),
  markAttendance: (record) => {
    const attendance = teacherAttendanceUtils.getAttendance();
    // Record format: { id, teacherId, date, status, markedBy }
    const existingIdx = attendance.findIndex(a => a.teacherId === record.teacherId && a.date === record.date);
    if (existingIdx !== -1) attendance[existingIdx] = { ...attendance[existingIdx], ...record };
    else attendance.push({ ...record, id: generateId() });
    setLocalData(STORAGE_KEYS.TEACHER_ATTENDANCE, attendance);
  }
};

// --- INITIALIZATION ---
export const initializeSampleData = () => {
  if (typeof window === 'undefined') return;
  
  if (hostelUtils.getRooms().length === 0) {
    const sampleRooms = [
      { id: 'h1', roomNumber: '101', type: '4-Seater', floor: '1st', status: 'Available', beds: 4, occupied: 0 },
      { id: 'h2', roomNumber: '102', type: '2-Seater', floor: '1st', status: 'Occupied', beds: 2, occupied: 2 },
      { id: 'h3', roomNumber: '201', type: '4-Seater', floor: '2nd', status: 'Cleaning', beds: 4, occupied: 0 }
    ];
    setLocalData(STORAGE_KEYS.HOSTEL_ROOMS, sampleRooms);
  }
  
  if (libraryUtils.getBooks().length === 0) {
    const sampleBooks = [
      { id: 'b1', title: 'Modern Physics', author: 'H.C. Verma', category: 'Science', stock: 10, isbn: '978-01' },
      { id: 'b2', title: 'Ancient History', author: 'R.S. Sharma', category: 'History', stock: 5, isbn: '978-02' }
    ];
    setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, sampleBooks);
  }

  if (transportUtils.getRoutes().length === 0) {
    const sampleRoutes = [
      { id: 'r1', name: 'Route A - City Center', vehicleId: 'v1', stops: ['Stop 1', 'Stop 2', 'Stop 3'] }
    ];
    setLocalData(STORAGE_KEYS.TRANSPORT_ROUTES, sampleRoutes);
  }
};
