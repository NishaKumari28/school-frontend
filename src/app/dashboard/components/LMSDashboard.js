'use client';
import { useState, useEffect, useMemo } from 'react';
import quizDataUtils from '../utils/quizDataUtils';
import questionCsvUtils from '../utils/questionCsvUtils';
import AnalyticsChart from './Charts';

export default function LMSDashboard({ user, isDarkMode, showMessage, classOptions = [], yearOptions = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  
  // Quiz Form State
  const [quizForm, setQuizForm] = useState({
    title: '',
    className: '',
    subject: '',
    academicYear: '2024-25',
    board: 'CBSE',
    timer: 30,
    attemptLimit: 2,
    randomize: false,
    status: 'active',
    questions: []
  });

  // Load Data
  useEffect(() => {
    quizDataUtils.initializeSampleQuizzes();
    refreshData();
  }, []);

  const refreshData = () => {
    setQuizzes(quizDataUtils.getAllQuizzes());
    setAttempts(quizDataUtils.getAllAttempts());
  };

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setQuizForm({
      title: '',
      className: '',
      subject: '',
      academicYear: '2024-25',
      board: 'CBSE',
      timer: 30,
      attemptLimit: 2,
      randomize: false,
      status: 'active',
      questions: []
    });
    setShowQuizModal(true);
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({ ...quiz });
    setShowQuizModal(true);
  };

  const handleDeleteQuiz = (id) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      quizDataUtils.deleteQuiz(id);
      refreshData();
      showMessage('Quiz deleted successfully', 'success');
    }
  };

  const handleSaveQuiz = () => {
    if (!quizForm.title || !quizForm.className || !quizForm.subject) {
      showMessage('Please fill all required fields', 'error');
      return;
    }
    
    quizDataUtils.saveQuiz(quizForm);
    setShowQuizModal(false);
    refreshData();
    showMessage(editingQuiz ? 'Quiz updated successfully' : 'Quiz created successfully', 'success');
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await questionCsvUtils.parseQuestionFile(file);
      if (result.success) {
        setQuizForm(prev => ({
          ...prev,
          questions: [...prev.questions, ...result.questions]
        }));
        showMessage(`${result.questions.length} questions uploaded successfully`, 'success');
      } else {
        showMessage(result.error, 'error');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
    e.target.value = '';
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: quizDataUtils.generateId(),
      type: 'mcq',
      question: '',
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' }
      ],
      correctAnswer: 'A',
      difficulty: 'medium'
    };
    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const handleUpdateQuestion = (index, field, value) => {
    const updatedQuestions = [...quizForm.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuizForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const handleUpdateOption = (qIndex, oIndex, value) => {
    const updatedQuestions = [...quizForm.questions];
    const updatedOptions = [...updatedQuestions[qIndex].options];
    updatedOptions[oIndex] = { ...updatedOptions[oIndex], text: value };
    updatedQuestions[qIndex].options = updatedOptions;
    setQuizForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const removeQuestion = (index) => {
    const updatedQuestions = quizForm.questions.filter((_, i) => i !== index);
    setQuizForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  // Analytics Helpers
  const quizStats = useMemo(() => {
    return quizzes.map(q => ({
      id: q.id,
      title: q.title,
      ...quizDataUtils.getQuizStats(q.id)
    }));
  }, [quizzes, attempts]);

  const leaderboard = useMemo(() => {
    // Group by class if needed, for now just show all for the teacher's classes
    const classes = [...new Set(quizzes.map(q => q.className))];
    const boards = {};
    classes.forEach(c => {
      boards[c] = quizDataUtils.getLeaderboard(c);
    });
    return boards;
  }, [quizzes, attempts]);

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Sub-navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSubTab('quizzes')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeSubTab === 'quizzes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Manage Quizzes
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeSubTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Analytics & Reports
        </button>
        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeSubTab === 'leaderboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Leaderboard
        </button>
      </div>

      {activeSubTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Quizzes</h2>
            <button
              onClick={handleCreateQuiz}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+ Create Quiz</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz.id} className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{quiz.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${quiz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {quiz.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {quiz.subject} | Class {quiz.className} | {quiz.questions.length} Questions
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditQuiz(quiz)}
                    className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {quizzes.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                No quizzes created yet. Click "Create Quiz" to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Summary Cards */}
            <div className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Quizzes</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{quizzes.length}</p>
            </div>
            <div className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{attempts.length}</p>
            </div>
            <div className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Score</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {attempts.length > 0 ? Math.round(attempts.reduce((acc, a) => acc + (a.score || 0), 0) / attempts.length) : 0}%
              </p>
            </div>
            <div className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Quizzes</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{quizzes.filter(q => q.status === 'active').length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className="font-bold mb-4">Quiz Performance Overview</h3>
              <AnalyticsChart 
                title="Average Score per Quiz (%)"
                data={quizStats}
                xKey="title"
                type="bar"
                series={[{ dataKey: 'averageScore', name: 'Avg. Score', color: '#3b82f6' }]}
                height={300}
              />
            </div>
            <div className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className="font-bold mb-4">Pass Rate per Quiz (%)</h3>
              <AnalyticsChart 
                title="Pass Rate (%)"
                data={quizStats}
                xKey="title"
                type="bar"
                series={[{ dataKey: 'passRate', name: 'Pass Rate', color: '#10b981' }]}
                height={300}
              />
            </div>
          </div>

          <div className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold mb-4">Quiz-wise Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="py-2 px-4">Quiz Title</th>
                    <th className="py-2 px-4">Attempts</th>
                    <th className="py-2 px-4">Avg. Score</th>
                    <th className="py-2 px-4">Highest</th>
                    <th className="py-2 px-4">Correct vs Wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {quizStats.map(stat => (
                    <tr key={stat.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-3 px-4 font-medium">{stat.title}</td>
                      <td className="py-3 px-4">{stat.totalAttempts}</td>
                      <td className="py-3 px-4">{stat.averageScore}%</td>
                      <td className="py-3 px-4">{stat.highestScore}%</td>
                      <td className="py-3 px-4">
                        <div className="flex h-2 w-32 rounded-full overflow-hidden bg-gray-100">
                          <div className="bg-green-500" style={{ width: `${stat.passRate}%` }}></div>
                          <div className="bg-red-500" style={{ width: `${100 - stat.passRate}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {stat.correctAnswers} / {stat.wrongAnswers + stat.correctAnswers}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'leaderboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(leaderboard).map(([className, students]) => (
            <div key={className} className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className="font-bold text-lg mb-4 text-blue-600 flex items-center gap-2">
                🏆 Class {className} Leaderboard
              </h3>
              <div className="space-y-4">
                {students.map((student, index) => (
                  <div key={student.studentId} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                      index === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{student.studentName}</p>
                      <p className="text-xs text-gray-500">{student.attempts} Attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{student.bestScore}%</p>
                    </div>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-center text-gray-500 py-4 italic">No attempts yet</p>
                )}
              </div>
            </div>
          ))}
          {Object.keys(leaderboard).length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              Create and activate quizzes to see the leaderboard.
            </div>
          )}
        </div>
      )}

      {/* Quiz Create/Edit Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl my-auto rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-blue-600 text-white">
              <h2 className="text-2xl font-bold">{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
              <button onClick={() => setShowQuizModal(false)} className="hover:bg-white/20 p-1 rounded-full transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quiz Title *</label>
                    <input
                      type="text"
                      value={quizForm.title}
                      onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject *</label>
                    <input
                      type="text"
                      value={quizForm.subject}
                      onChange={(e) => setQuizForm({...quizForm, subject: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                      placeholder="e.g. Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Class *</label>
                    <select
                      value={quizForm.className}
                      onChange={(e) => setQuizForm({...quizForm, className: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                    >
                      <option value="">Select Class</option>
                      {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Academic Year</label>
                    <select
                      value={quizForm.academicYear}
                      onChange={(e) => setQuizForm({...quizForm, academicYear: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                    >
                      <option value="">Select Year</option>
                      {yearOptions.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rules Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-3">Quiz Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Time Limit (Minutes)</label>
                    <input
                      type="number"
                      value={quizForm.timer}
                      onChange={(e) => setQuizForm({...quizForm, timer: parseInt(e.target.value) || 0})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Attempt Limit</label>
                    <input
                      type="number"
                      value={quizForm.attemptLimit}
                      onChange={(e) => setQuizForm({...quizForm, attemptLimit: parseInt(e.target.value) || 1})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={quizForm.status}
                      onChange={(e) => setQuizForm({...quizForm, status: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="randomize"
                    checked={quizForm.randomize}
                    onChange={(e) => setQuizForm({...quizForm, randomize: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="randomize" className="text-sm font-medium">Randomize question order for students</label>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-3">Questions ({quizForm.questions.length})</h3>
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Import CSV
                      <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                    </label>
                    <button
                      onClick={handleAddQuestion}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-1"
                    >
                      <span className="text-lg leading-none">+</span> Add Question
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {quizForm.questions.map((q, qIndex) => (
                    <div key={q.id} className={`p-6 rounded-xl border relative ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <button
                        onClick={() => removeQuestion(qIndex)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Question {qIndex + 1}</label>
                          <textarea
                            value={q.question}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'question', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                            placeholder="Enter question text"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select
                            value={q.type}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'type', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                          >
                            <option value="mcq">MCQ</option>
                            <option value="true_false">True/False</option>
                            <option value="short_answer">Short Answer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Difficulty</label>
                          <select
                            value={q.difficulty}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'difficulty', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      {q.type === 'mcq' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Options</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, oIndex) => (
                              <div key={opt.label} className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 w-6">{opt.label}.</span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                                  placeholder={`Option ${opt.label}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Correct Answer</label>
                            <select
                              value={q.correctAnswer}
                              onChange={(e) => handleUpdateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              className={`w-full max-w-[120px] px-3 py-1.5 text-sm rounded border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Correct Answer</label>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'correctAnswer', e.target.value)}
                            className={`w-full max-w-[150px] px-3 py-1.5 text-sm rounded border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                          >
                            <option value="True">True</option>
                            <option value="False">False</option>
                          </select>
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Correct Answer (Keywords/Exact)</label>
                          <input
                            type="text"
                            value={q.correctAnswer}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'correctAnswer', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                            placeholder="Expected answer"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {quizForm.questions.length === 0 && (
                    <div className="py-8 text-center text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                      No questions added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowQuizModal(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuiz}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-bold"
              >
                Save Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
