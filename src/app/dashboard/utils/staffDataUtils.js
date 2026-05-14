/**
 * Staff Dashboard Data Utilities
 * Handles persistence for Hostel, Library, Transport, and Teacher Attendance
 */

const STORAGE_KEYS = {
  HOSTEL_ROOMS: 'school_hostel_rooms',
  HOSTEL_VISITORS: 'school_hostel_visitors',
  HOSTEL_ALLOTMENTS: 'school_hostel_allotments',
  HOSTEL_LOGS: 'school_hostel_logs',
  HOSTEL_VISITORS_MEETING: 'school_hostel_visitors_meeting',
  HOSTEL_VISITORS_GENERAL: 'school_hostel_visitors_general',
  LIBRARY_BOOKS: 'school_library_books',
  LIBRARY_TX: 'school_library_transactions',
  LIBRARY_READING_ROOM: 'school_library_reading_room',
  LIBRARY_STUDENT_LENDING: 'school_library_student_lending',
  LIBRARY_TEACHER_LENDING: 'school_library_teacher_lending',
  TRANSPORT_VEHICLES: 'school_transport_vehicles',
  TRANSPORT_ROUTES: 'school_transport_routes',
  TRANSPORT_PASSENGERS: 'school_transport_passengers',
  TRANSPORT_ATTENDANCE: 'school_transport_attendance_logs',
  TEACHER_ATTENDANCE: 'school_teacher_attendance',
  FEE_STRUCTURES: 'school_fee_structures_v2',
  FEE_PAYMENT_PLANS: 'school_fee_payment_plans',
  FEE_INVOICES: 'school_fee_invoices'
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
    const idx = rooms.findIndex(r => r.id === room.id || r.roomNumber === room.roomNumber);
    if (idx !== -1) rooms[idx] = { ...rooms[idx], ...room };
    else rooms.push({ ...room, id: room.id || generateId() });
    setLocalData(STORAGE_KEYS.HOSTEL_ROOMS, rooms);
  },
  deleteRoom: (id) => {
    const rooms = hostelUtils.getRooms();
    const updated = rooms.filter(r => r.id !== id);
    setLocalData(STORAGE_KEYS.HOSTEL_ROOMS, updated);
  },
  updateRoomStatus: (id, status) => {
    const rooms = hostelUtils.getRooms();
    const idx = rooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      rooms[idx].status = status;
      setLocalData(STORAGE_KEYS.HOSTEL_ROOMS, rooms);
    }
  },
  bulkAddRooms: (newRooms) => {
    const rooms = hostelUtils.getRooms();
    newRooms.forEach(nr => {
      const idx = rooms.findIndex(r => r.roomNumber === nr.roomNumber);
      if (idx !== -1) rooms[idx] = { ...rooms[idx], ...nr };
      else rooms.push({ ...nr, id: generateId() });
    });
    setLocalData(STORAGE_KEYS.HOSTEL_ROOMS, rooms);
  },
  
  // Allotments
  getAllotments: () => getLocalData(STORAGE_KEYS.HOSTEL_ALLOTMENTS),
  addAllotment: (allotment) => {
    const allotments = hostelUtils.getAllotments();
    allotments.push({ ...allotment, id: generateId(), date: new Date().toISOString() });
    setLocalData(STORAGE_KEYS.HOSTEL_ALLOTMENTS, allotments);
    
    // Update room occupancy
    const rooms = hostelUtils.getRooms();
    const room = rooms.find(r => r.roomNumber === allotment.roomNumber);
    if (room) {
      room.occupied = (room.occupied || 0) + 1;
      if (room.occupied >= room.beds) room.status = 'Occupied';
      hostelUtils.saveRoom(room);
    }
  },
  bulkAddAllotments: (newAllotments) => {
    newAllotments.forEach(na => {
      hostelUtils.addAllotment({
        ...na,
        date: na.date || new Date().toISOString().split('T')[0]
      });
    });
  },
  removeAllotment: (id) => {
    const allotments = hostelUtils.getAllotments();
    const idx = allotments.findIndex(a => a.id === id);
    if (idx !== -1) {
      const allotment = allotments[idx];
      allotments[idx].leaveDate = new Date().toISOString();
      setLocalData(STORAGE_KEYS.HOSTEL_ALLOTMENTS, allotments);
      
      // Update room occupancy
      const rooms = hostelUtils.getRooms();
      const room = rooms.find(r => r.roomNumber === allotment.roomNumber);
      if (room && room.occupied > 0) {
        room.occupied -= 1;
        if (room.occupied < room.beds) room.status = 'Available';
        hostelUtils.saveRoom(room);
      }
    }
  },

  // Daily Logs
  getLogs: () => getLocalData(STORAGE_KEYS.HOSTEL_LOGS),
  addLog: (log) => {
    const logs = hostelUtils.getLogs();
    const today = new Date().toISOString().split('T')[0];
    
    // Find the LATEST record for this student today that is missing the complementary time
    // We sort by date descending to find the most recent active session
    const existingIdx = logs
      .map((l, index) => ({ ...l, index }))
      .filter(l => 
        l.studentName === log.studentName && 
        new Date(l.date).toISOString().split('T')[0] === today &&
        ((log.type === 'IN' && l.outTime && !l.inTime) || (log.type === 'OUT' && l.inTime && !l.outTime))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.index;

    if (existingIdx !== undefined && existingIdx !== -1) {
      if (log.type === 'IN') logs[existingIdx].inTime = log.time;
      else logs[existingIdx].outTime = log.time;
    } else {
      const newEntry = {
        id: generateId(),
        studentName: log.studentName,
        roomNumber: log.roomNumber,
        date: new Date().toISOString(),
        outTime: log.type === 'OUT' ? log.time : '',
        inTime: log.type === 'IN' ? log.time : ''
      };
      logs.push(newEntry);
    }
    setLocalData(STORAGE_KEYS.HOSTEL_LOGS, logs);
  },

  // Visitors
  getMeetingVisitors: () => getLocalData(STORAGE_KEYS.HOSTEL_VISITORS_MEETING),
  addMeetingVisitor: (v) => {
    const vs = hostelUtils.getMeetingVisitors();
    vs.push({ ...v, id: generateId(), createdAt: new Date().toISOString() });
    setLocalData(STORAGE_KEYS.HOSTEL_VISITORS_MEETING, vs);
  },
  checkoutMeetingVisitor: (id, time) => {
    const vs = hostelUtils.getMeetingVisitors();
    const idx = vs.findIndex(v => v.id === id);
    if (idx !== -1) {
      vs[idx].outTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLocalData(STORAGE_KEYS.HOSTEL_VISITORS_MEETING, vs);
    }
  },
  getGeneralVisitors: () => getLocalData(STORAGE_KEYS.HOSTEL_VISITORS_GENERAL),
  addGeneralVisitor: (v) => {
    const vs = hostelUtils.getGeneralVisitors();
    vs.push({ ...v, id: generateId(), createdAt: new Date().toISOString() });
    setLocalData(STORAGE_KEYS.HOSTEL_VISITORS_GENERAL, vs);
  },
  checkoutGeneralVisitor: (id, time) => {
    const vs = hostelUtils.getGeneralVisitors();
    const idx = vs.findIndex(v => v.id === id);
    if (idx !== -1) {
      vs[idx].outTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLocalData(STORAGE_KEYS.HOSTEL_VISITORS_GENERAL, vs);
    }
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
  deleteBook: (id) => {
    const books = libraryUtils.getBooks();
    const filtered = books.filter(b => b.id !== id);
    setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, filtered);
  },
  bulkAddBooks: (newBooks) => {
    const books = libraryUtils.getBooks();
    newBooks.forEach(nb => {
      const bookIsbn = String(nb.isbn || nb.id || '').trim();
      const bookTitle = String(nb.title || '').trim();
      
      if (!bookIsbn && !bookTitle) return; // skip empty rows

      const idx = books.findIndex(b => {
         const matchIsbn = bookIsbn && (b.isbn === bookIsbn || b.id === bookIsbn);
         const matchTitleAuthor = bookTitle && b.title === bookTitle && b.author === nb.author;
         return matchIsbn || matchTitleAuthor;
      });

      if (idx !== -1) {
        const currentStock = parseInt(books[idx].stock) || 0;
        const addedStock = parseInt(nb.stock) || 1;
        books[idx] = { ...books[idx], ...nb, id: books[idx].id, isbn: bookIsbn || books[idx].isbn, stock: currentStock + addedStock };
      } else {
        books.push({ ...nb, id: generateId(), isbn: bookIsbn, stock: parseInt(nb.stock) || 1 });
      }
    });
    setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, books);
  },
  bulkRemoveBooks: (ids) => {
    const books = libraryUtils.getBooks();
    const cleanIds = ids.map(id => String(id || '').trim()).filter(Boolean);
    const filtered = books.filter(b => !cleanIds.includes(String(b.id)) && !cleanIds.includes(String(b.isbn)));
    setLocalData(STORAGE_KEYS.LIBRARY_BOOKS, filtered);
  },

  // 1. Reading Room Dairy
  getReadingLogs: () => getLocalData(STORAGE_KEYS.LIBRARY_READING_ROOM),
  addReadingLog: (log) => {
    const logs = libraryUtils.getReadingLogs();
    logs.push({ ...log, id: generateId(), issueTime: new Date().toLocaleTimeString(), date: new Date().toISOString().split('T')[0] });
    setLocalData(STORAGE_KEYS.LIBRARY_READING_ROOM, logs);
  },
  returnReadingBook: (id) => {
    const logs = libraryUtils.getReadingLogs();
    const idx = logs.findIndex(l => l.id === id);
    if (idx !== -1) {
      logs[idx].returnTime = new Date().toLocaleTimeString();
      setLocalData(STORAGE_KEYS.LIBRARY_READING_ROOM, logs);
    }
  },

  // 2. Student Lending Dairy
  getStudentLending: () => getLocalData(STORAGE_KEYS.LIBRARY_STUDENT_LENDING),
  issueStudentBook: (lending) => {
    const logs = libraryUtils.getStudentLending();
    logs.push({ ...lending, id: generateId(), issueDate: new Date().toISOString().split('T')[0], status: 'Issued' });
    setLocalData(STORAGE_KEYS.LIBRARY_STUDENT_LENDING, logs);
    
    // Update Stock
    const books = libraryUtils.getBooks();
    const bIdx = books.findIndex(b => b.id === lending.bookId || b.isbn === lending.bookId);
    if (bIdx !== -1) {
      books[bIdx].stock = Math.max(0, (books[bIdx].stock || 0) - 1);
      libraryUtils.saveBook(books[bIdx]);
    }
  },
  returnStudentBook: (id, totalFine = 0, fineEntries = [], status = 'Returned', rDate = null) => {
    const logs = libraryUtils.getStudentLending();
    const idx = logs.findIndex(l => l.id === id);
    if (idx !== -1) {
      logs[idx].returnDate = rDate || new Date().toISOString().split('T')[0];
      logs[idx].fine = totalFine;
      logs[idx].fineEntries = fineEntries;
      logs[idx].status = status;
      setLocalData(STORAGE_KEYS.LIBRARY_STUDENT_LENDING, logs);
      
      const books = libraryUtils.getBooks();
      const bIdx = books.findIndex(b => b.id === logs[idx].bookId);
      if (bIdx !== -1) {
        books[bIdx].stock = (books[bIdx].stock || 0) + 1;
        libraryUtils.saveBook(books[bIdx]);
      }
    }
  },

  // 3. Teacher Lending Dairy
  getTeacherLending: () => getLocalData(STORAGE_KEYS.LIBRARY_TEACHER_LENDING),
  issueTeacherBook: (lending) => {
    const logs = libraryUtils.getTeacherLending();
    logs.push({ ...lending, id: generateId(), issueDate: new Date().toISOString().split('T')[0], status: 'Issued' });
    setLocalData(STORAGE_KEYS.LIBRARY_TEACHER_LENDING, logs);
  },
  returnTeacherBook: (id, totalFine = 0, fineEntries = [], rDate = null) => {
    const logs = libraryUtils.getTeacherLending();
    const idx = logs.findIndex(l => l.id === id);
    if (idx !== -1) {
      logs[idx].returnDate = rDate || new Date().toISOString().split('T')[0];
      logs[idx].fine = totalFine;
      logs[idx].fineEntries = fineEntries;
      logs[idx].status = 'Returned';
      setLocalData(STORAGE_KEYS.LIBRARY_TEACHER_LENDING, logs);
    }
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
  deleteVehicle: (id) => {
    const vehicles = transportUtils.getVehicles().filter(v => v.id !== id);
    setLocalData(STORAGE_KEYS.TRANSPORT_VEHICLES, vehicles);
  },
  getRoutes: () => getLocalData(STORAGE_KEYS.TRANSPORT_ROUTES),
  saveRoute: (r) => {
    const routes = transportUtils.getRoutes();
    const idx = routes.findIndex(item => item.id === r.id);
    if (idx !== -1) routes[idx] = r;
    else routes.push({ ...r, id: r.id || generateId() });
    setLocalData(STORAGE_KEYS.TRANSPORT_ROUTES, routes);
  },
  deleteRoute: (id) => {
    const routes = transportUtils.getRoutes().filter(r => r.id !== id);
    setLocalData(STORAGE_KEYS.TRANSPORT_ROUTES, routes);
  },
  getPassengers: () => getLocalData(STORAGE_KEYS.TRANSPORT_PASSENGERS),
  assignPassenger: (p) => {
    const passengers = transportUtils.getPassengers();
    passengers.push({ ...p, id: generateId() });
    setLocalData(STORAGE_KEYS.TRANSPORT_PASSENGERS, passengers);
  },
  removePassenger: (id) => {
    const passengers = transportUtils.getPassengers().filter(p => p.id !== id);
    setLocalData(STORAGE_KEYS.TRANSPORT_PASSENGERS, passengers);
  },
  getAttendance: () => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSPORT_ATTENDANCE);
    return stored ? JSON.parse(stored) : {};
  },
  toggleAttendance: (date, passengerId, field) => {
    const logs = transportUtils.getAttendance();
    const key = `${date}_${passengerId}`;
    const current = logs[key] || { boarded: false, dropped: false, boardingTime: '-', droppingTime: '-' };
    
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = { 
      ...logs, 
      [key]: { 
        ...current, 
        [field]: !current[field], 
        [`${field}Time`]: !current[field] ? timeNow : '-' 
      } 
    };
    localStorage.setItem(STORAGE_KEYS.TRANSPORT_ATTENDANCE, JSON.stringify(updated));
    return updated;
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

// --- FEE MANAGEMENT ---
export const feeUtils = {
  // Fee Structure (per student)
  getAllStructures: () => getLocalData(STORAGE_KEYS.FEE_STRUCTURES),
  getStructure: (studentId) => {
    const all = feeUtils.getAllStructures();
    return all.find(s => s.studentId === studentId) || null;
  },
  saveStructure: (data) => {
    const all = feeUtils.getAllStructures();
    const idx = all.findIndex(s => s.studentId === data.studentId);
    const total = (
      (parseFloat(data.tuitionFee) || 0) +
      (parseFloat(data.libraryFee) || 0) +
      (parseFloat(data.electricityBill) || 0) +
      (parseFloat(data.waterBill) || 0) +
      (parseFloat(data.dressFee) || 0) +
      (parseFloat(data.bookFee) || 0) +
      (parseFloat(data.transportFee) || 0) +
      (parseFloat(data.fine) || 0)
    );
    const record = { ...data, totalFee: total, updatedAt: new Date().toISOString() };
    if (idx !== -1) all[idx] = record;
    else all.push({ ...record, id: generateId() });
    setLocalData(STORAGE_KEYS.FEE_STRUCTURES, all);
    return record;
  },
  deleteStructure: (studentId) => {
    const all = feeUtils.getAllStructures().filter(s => s.studentId !== studentId);
    setLocalData(STORAGE_KEYS.FEE_STRUCTURES, all);
  },

  // Payment Plans
  getAllPlans: () => getLocalData(STORAGE_KEYS.FEE_PAYMENT_PLANS),
  getPlan: (studentId) => {
    return feeUtils.getAllPlans().find(p => p.studentId === studentId) || null;
  },
  savePlan: (data) => {
    const all = feeUtils.getAllPlans();
    const idx = all.findIndex(p => p.studentId === data.studentId);
    const record = { ...data, updatedAt: new Date().toISOString() };
    if (idx !== -1) all[idx] = record;
    else all.push({ ...record, id: generateId() });
    setLocalData(STORAGE_KEYS.FEE_PAYMENT_PLANS, all);
  },

  // Invoices
  getAllInvoices: () => getLocalData(STORAGE_KEYS.FEE_INVOICES),
  getStudentInvoices: (studentId) => {
    return feeUtils.getAllInvoices().filter(inv => inv.studentId === studentId);
  },
  generateInvoice: (studentId, studentName, structure, plan, installmentNumber = 1) => {
    const invoices = feeUtils.getAllInvoices();
    const planType = plan?.planType || 'one_time';
    const totalFee = (
      (parseFloat(structure.tuitionFee) || 0) +
      (parseFloat(structure.libraryFee) || 0) +
      (parseFloat(structure.electricityBill) || 0) +
      (parseFloat(structure.waterBill) || 0) +
      (parseFloat(structure.dressFee) || 0) +
      (parseFloat(structure.bookFee) || 0) +
      (parseFloat(structure.transportFee) || 0) +
      (parseFloat(structure.fine) || 0)
    );

    // Compute per-invoice fee based on plan
    let invoiceFee = totalFee;
    let installmentMonths = parseInt(plan?.installmentMonths) || 3;
    if (planType === 'installment') {
      invoiceFee = Math.ceil(totalFee / installmentMonths);
    } else if (planType === 'monthly') {
      invoiceFee = Math.ceil(totalFee / 12);
    }

    // Label: "Installment 2 of 3" for installment plans
    let installmentLabel = '';
    if (planType === 'installment') {
      installmentLabel = `Installment ${installmentNumber} of ${installmentMonths}`;
    } else if (planType === 'monthly') {
      installmentLabel = `Month ${installmentNumber}`;
    }

    // Due date: 15 days for one_time, per installment month otherwise
    const dueDays = planType === 'one_time' ? 15 : 30;
    const inv = {
      id: generateId(),
      invoiceNo: `INV-${Date.now()}`,
      studentId,
      studentName,
      generatedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'unpaid',
      ...structure,
      totalFee: invoiceFee,
      paymentPlan: planType,
      installmentMonths: installmentMonths,
      installmentNumber,
      installmentLabel,
      paidAmount: 0,
    };
    invoices.push(inv);
    setLocalData(STORAGE_KEYS.FEE_INVOICES, invoices);
    // Notify other tabs/components
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    return inv;
  },
  markInvoicePaid: (invoiceId, amount) => {
    const invoices = feeUtils.getAllInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      invoices[idx].paidAmount = (parseFloat(invoices[idx].paidAmount) || 0) + parseFloat(amount);
      invoices[idx].status = invoices[idx].paidAmount >= invoices[idx].totalFee ? 'paid' : 'partial';
      invoices[idx].lastPaidAt = new Date().toISOString();
      setLocalData(STORAGE_KEYS.FEE_INVOICES, invoices);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    }
  },
  submitProof: (invoiceId, amount, screenshot) => {
    const invoices = feeUtils.getAllInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      invoices[idx].paymentProof = {
        amount: parseFloat(amount),
        screenshot,
        submittedAt: new Date().toISOString()
      };
      invoices[idx].status = 'processing';
      setLocalData(STORAGE_KEYS.FEE_INVOICES, invoices);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    }
  },
  approvePayment: (invoiceId) => {
    const invoices = feeUtils.getAllInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1 && invoices[idx].paymentProof) {
      const proof = invoices[idx].paymentProof;
      invoices[idx].paidAmount = (parseFloat(invoices[idx].paidAmount) || 0) + proof.amount;
      invoices[idx].status = invoices[idx].paidAmount >= invoices[idx].totalFee ? 'paid' : 'partial';
      invoices[idx].lastPaidAt = new Date().toISOString();
      delete invoices[idx].paymentProof;
      setLocalData(STORAGE_KEYS.FEE_INVOICES, invoices);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    }
  },
  rejectPayment: (invoiceId) => {
    const invoices = feeUtils.getAllInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      invoices[idx].status = 'unpaid';
      delete invoices[idx].paymentProof;
      setLocalData(STORAGE_KEYS.FEE_INVOICES, invoices);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
    }
  },
  deleteInvoice: (invoiceId) => {
    const all = feeUtils.getAllInvoices().filter(i => i.id !== invoiceId);
    setLocalData(STORAGE_KEYS.FEE_INVOICES, all);
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

  if (transportUtils.getVehicles().length === 0) {
    const sampleVehicles = [
      { id: 'v1', busNumber: 'Bus #01', plateNumber: 'KA-01-1234', routeNumber: 'R-101', driverName: 'Rajesh Kumar', driverPhone: '9876543210', capacity: 40, status: 'On Trip' },
      { id: 'v2', busNumber: 'Bus #02', plateNumber: 'KA-01-5678', routeNumber: 'R-102', driverName: 'Suresh Singh', driverPhone: '8765432109', capacity: 32, status: 'Maintenance' },
      { id: 'v3', busNumber: 'Bus #03', plateNumber: 'KA-01-9012', routeNumber: 'R-103', driverName: 'Amit Verma', driverPhone: '7654321098', capacity: 50, status: 'En Route' },
    ];
    setLocalData(STORAGE_KEYS.TRANSPORT_VEHICLES, sampleVehicles);
  }

  if (transportUtils.getRoutes().length === 0) {
    const sampleRoutes = [
      { id: 'r1', name: 'City Center Express', number: 'R-101', stops: ['Terminal A', 'Mall Road', 'Hospital Junction', 'School Gate'], timing: '07:30 AM' },
      { id: 'r2', name: 'North Suburb Route', number: 'R-102', stops: ['Green Park', 'North Square', 'River Side', 'School Gate'], timing: '07:15 AM' },
    ];
    setLocalData(STORAGE_KEYS.TRANSPORT_ROUTES, sampleRoutes);
  }

  if (transportUtils.getPassengers().length === 0) {
    const samplePassengers = [
      { id: 'p1', type: 'Student', name: 'STUDENT 11', vehicleId: 'v1', stop: 'Mall Road' },
      { id: 'p2', type: 'Teacher', name: 'TEACHER 1', vehicleId: 'v1', stop: 'Terminal A' },
    ];
    setLocalData(STORAGE_KEYS.TRANSPORT_PASSENGERS, samplePassengers);
  }

  if (transportUtils.getRoutes().length === 0) {
    const sampleRoutes = [
      { id: 'r1', name: 'Route A - City Center', vehicleId: 'v1', stops: ['Stop 1', 'Stop 2', 'Stop 3'] }
    ];
    setLocalData(STORAGE_KEYS.TRANSPORT_ROUTES, sampleRoutes);
  }
};
