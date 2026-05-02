/**
 * LMS Quiz & Assessment Module - Data Utilities
 * Handles all quiz, question, and attempt data in localStorage
 */

// Local storage keys
const STORAGE_KEYS = {
  QUIZZES: 'lms_quizzes',
  ATTEMPTS: 'lms_attempts',
  QUESTIONS: 'lms_questions'
};

// Generate unique ID
export const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

// Get quiz by ID
export const getQuizById = (quizId) => {
  const quizzes = getAllQuizzes();
  return quizzes.find(q => q.id === quizId);
};

// Get all quizzes
export const getAllQuizzes = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.QUIZZES);
  return stored ? JSON.parse(stored) : [];
};

// Save quiz
export const saveQuiz = (quiz) => {
  if (typeof window === 'undefined') return;
  const quizzes = getAllQuizzes();
  const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
  
  if (existingIndex !== -1) {
    quizzes[existingIndex] = { ...quizzes[existingIndex], ...quiz, updatedAt: new Date().toISOString() };
  } else {
    quizzes.push({ ...quiz, id: quiz.id || generateId(), createdAt: new Date().toISOString() });
  }
  
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
};

// Delete quiz
export const deleteQuiz = (quizId) => {
  if (typeof window === 'undefined') return;
  const quizzes = getAllQuizzes().filter(q => q.id !== quizId);
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
};

// Get questions for a quiz
export const getQuestionsForQuiz = (quizId) => {
  const quizzes = getAllQuizzes();
  const quiz = quizzes.find(q => q.id === quizId);
  return quiz?.questions || [];
};

// Save questions for a quiz
export const saveQuestionsForQuiz = (quizId, questions) => {
  if (typeof window === 'undefined') return;
  const quizzes = getAllQuizzes();
  const quizIndex = quizzes.findIndex(q => q.id === quizId);
  
  if (quizIndex !== -1) {
    quizzes[quizIndex].questions = questions;
    quizzes[quizIndex].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  }
};

// Get all attempts
export const getAllAttempts = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
  return stored ? JSON.parse(stored) : [];
};

// Get attempts for a student
export const getAttemptsForStudent = (studentId) => {
  return getAllAttempts().filter(a => a.studentId === studentId);
};

// Get attempts for a quiz
export const getAttemptsForQuiz = (quizId) => {
  return getAllAttempts().filter(a => a.quizId === quizId);
};

// Get attempt count for student on a quiz
export const getAttemptCount = (studentId, quizId) => {
  return getAllAttempts().filter(a => a.studentId === studentId && a.quizId === quizId).length;
};

// Save attempt
export const saveAttempt = (attempt) => {
  if (typeof window === 'undefined') return;
  const attempts = getAllAttempts();
  attempts.push({
    ...attempt,
    id: attempt.id || generateId(),
    attemptedAt: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
};

// Get quiz statistics for a specific quiz
export const getQuizStats = (quizId) => {
  const attempts = getAttemptsForQuiz(quizId);
  const totalAttempts = attempts.length;
  
  if (totalAttempts === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      passRate: 0
    };
  }
  
  const scores = attempts.map(a => a.score || 0);
  const averageScore = scores.reduce((a, b) => a + b, 0) / totalAttempts;
  const correctAnswers = attempts.reduce((acc, a) => acc + (a.correctAnswers || 0), 0);
  const wrongAnswers = attempts.reduce((acc, a) => acc + (a.wrongAnswers || 0), 0);
  
  return {
    totalAttempts,
    averageScore: Math.round(averageScore * 10) / 10,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    correctAnswers,
    wrongAnswers,
    passRate: totalAttempts > 0 ? Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * 100) : 0
  };
};

// Get student-wise performance
export const getStudentPerformance = (quizId) => {
  const attempts = getAttemptsForQuiz(quizId);
  const studentMap = new Map();
  
  attempts.forEach(attempt => {
    const existing = studentMap.get(attempt.studentId);
    if (!existing || attempt.score > existing.score) {
      studentMap.set(attempt.studentId, {
        studentId: attempt.studentId,
        studentName: attempt.studentName,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        attemptedAt: attempt.attemptedAt
      });
    }
  });
  
  return Array.from(studentMap.values()).sort((a, b) => b.score - a.score);
};

// Get leaderboard for a class
export const getLeaderboard = (className, limit = 3) => {
  const attempts = getAllAttempts();
  const studentMap = new Map();
  
  attempts.forEach(attempt => {
    const studentClass = attempt.className || attempt.studentClass;
    if (studentClass !== className) return;
    
    const existing = studentMap.get(attempt.studentId);
    if (!existing || attempt.score > existing.bestScore) {
      studentMap.set(attempt.studentId, {
        studentId: attempt.studentId,
        studentName: attempt.studentName,
        bestScore: attempt.score,
        totalQuestions: attempt.totalQuestions,
        attempts: 1
      });
    } else {
      existing.attempts += 1;
    }
  });
  
  return Array.from(studentMap.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, limit);
};

// Get quizzes available for a student
export const getAvailableQuizzes = (studentClass, studentSection) => {
  const quizzes = getAllQuizzes();
  return quizzes.filter(q => {
    // Check if quiz is active
    if (q.status !== 'active') return false;
    // Check if class matches
    if (q.className && q.className !== studentClass) return false;
    // Check if section matches (if specified)
    if (q.section && q.section !== studentSection) return false;
    return true;
  });
};

// Initialize with sample data
export const initializeSampleQuizzes = () => {
  if (typeof window === 'undefined') return;
  if (getAllQuizzes().length > 0) return;
  
  const sampleQuizzes = [
    {
      id: generateId(),
      title: 'Math Basics Quiz',
      className: '10',
      section: 'A',
      subject: 'Mathematics',
      academicYear: '2024-25',
      board: 'CBSE',
      status: 'active',
      timer: 30, // minutes
      attemptLimit: 2,
      randomize: true,
      questions: [
        {
          id: generateId(),
          type: 'mcq',
          question: 'What is the value of 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 'B',
          difficulty: 'easy'
        },
        {
          id: generateId(),
          type: 'mcq',
          question: 'What is 12 × 12?',
          options: ['124', '144', '134', '154'],
          correctAnswer: 'B',
          difficulty: 'medium'
        },
        {
          id: generateId(),
          type: 'true_false',
          question: 'Zero is a positive number.',
          correctAnswer: 'False',
          difficulty: 'easy'
        },
        {
          id: generateId(),
          type: 'short_answer',
          question: 'What is the square root of 144?',
          correctAnswer: '12',
          difficulty: 'medium'
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: generateId(),
      title: 'Science General Knowledge',
      className: '10',
      section: 'A',
      subject: 'Science',
      academicYear: '2024-25',
      board: 'CBSE',
      status: 'active',
      timer: 20,
      attemptLimit: 2,
      randomize: false,
      questions: [
        {
          id: generateId(),
          type: 'mcq',
          question: 'What is the chemical formula for water?',
          options: ['H2O', 'CO2', 'NaCl', 'O2'],
          correctAnswer: 'A',
          difficulty: 'easy'
        },
        {
          id: generateId(),
          type: 'mcq',
          question: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
          correctAnswer: 'B',
          difficulty: 'easy'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];
  
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(sampleQuizzes));
};

// Export functions
export default {
  generateId,
  getQuizById,
  getAllQuizzes,
  saveQuiz,
  deleteQuiz,
  getQuestionsForQuiz,
  saveQuestionsForQuiz,
  getAllAttempts,
  getAttemptsForStudent,
  getAttemptsForQuiz,
  getAttemptCount,
  saveAttempt,
  getQuizStats,
  getStudentPerformance,
  getLeaderboard,
  getAvailableQuizzes,
  initializeSampleQuizzes,
  STORAGE_KEYS
};
