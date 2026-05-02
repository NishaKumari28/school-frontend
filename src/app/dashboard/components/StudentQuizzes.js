'use client';
import { useState, useEffect, useMemo } from 'react';
import quizDataUtils from '../utils/quizDataUtils';
import QuizTaking from './QuizTaking';

export default function StudentQuizzes({ student, isDarkMode, showMessage }) {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('available');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setQuizzes(quizDataUtils.getAvailableQuizzes(student.className, student.section || student.sec));
    setAttempts(quizDataUtils.getAttemptsForStudent(student.id));
  };

  const handleStartQuiz = (quiz) => {
    const attemptCount = quizDataUtils.getAttemptCount(student.id, quiz.id);
    if (attemptCount >= quiz.attemptLimit) {
      showMessage(`You have reached the maximum attempt limit (${quiz.attemptLimit}) for this quiz.`, 'error');
      return;
    }
    setActiveQuiz(quiz);
  };

  const handleQuizComplete = (result) => {
    setActiveQuiz(null);
    setShowResult(result);
    refreshData();
  };

  const getFeedback = (score) => {
    if (score >= 80) return { text: "Excellent Work 🎉", color: "text-green-600" };
    if (score >= 50) return { text: "Good job 👍", color: "text-blue-600" };
    return { text: "Keep practicing 💪", color: "text-orange-600" };
  };

  const stats = useMemo(() => {
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts) : 0;
    return { totalAttempts, avgScore };
  }, [attempts]);

  const leaderboard = useMemo(() => {
    return quizDataUtils.getLeaderboard(student.className);
  }, [student.className, attempts]);

  if (activeQuiz) {
    return (
      <QuizTaking
        quiz={activeQuiz}
        student={student}
        isDarkMode={isDarkMode}
        onComplete={handleQuizComplete}
        onCancel={() => setActiveQuiz(null)}
      />
    );
  }

  if (showResult) {
    const feedback = getFeedback(showResult.score);
    return (
      <div className="space-y-6">
        <div className={`p-8 rounded-2xl shadow-xl text-center border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'}`}>
          <div className="mb-6">
            <div className={`text-6xl font-bold mb-2 ${showResult.score >= 50 ? 'text-green-500' : 'text-orange-500'}`}>
              {showResult.score}%
            </div>
            <h2 className={`text-2xl font-bold ${feedback.color}`}>{feedback.text}</h2>
            <p className="text-gray-500 mt-2">{showResult.quizTitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-xs text-green-600 font-bold uppercase">Correct</p>
              <p className="text-xl font-bold text-green-700">{showResult.correctAnswers}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-xs text-red-600 font-bold uppercase">Wrong</p>
              <p className="text-xl font-bold text-red-700">{showResult.wrongAnswers}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs text-blue-600 font-bold uppercase">Total</p>
              <p className="text-xl font-bold text-blue-700">{showResult.totalQuestions}</p>
            </div>
          </div>

          <div className="space-y-4 text-left max-w-2xl mx-auto mb-8">
            <h3 className="font-bold text-lg border-b pb-2">Review Answers</h3>
            {showResult.details.map((detail, idx) => (
              <div key={idx} className={`p-4 rounded-xl border-l-4 ${detail.isCorrect ? 'bg-green-50 border-green-500 dark:bg-green-900/10' : 'bg-red-50 border-red-500 dark:bg-red-900/10'}`}>
                <p className="font-medium mb-2">{idx + 1}. {detail.question}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Your Answer:</p>
                    <p className={`font-bold ${detail.isCorrect ? 'text-green-600' : 'text-red-600'}`}>{detail.studentAnswer || '(No answer)'}</p>
                  </div>
                  {!detail.isCorrect && (
                    <div>
                      <p className="text-gray-500">Correct Answer:</p>
                      <p className="font-bold text-green-600">{detail.correctAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowResult(null)}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
          >
            Back to My Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Sub-navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSubTab('available')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeSubTab === 'available' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Available Quizzes
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeSubTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Attempt History
        </button>
        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeSubTab === 'leaderboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Leaderboard
        </button>
      </div>

      {activeSubTab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => {
            const attemptCount = quizDataUtils.getAttemptCount(student.id, quiz.id);
            const isLimitReached = attemptCount >= quiz.attemptLimit;
            
            return (
              <div key={quiz.id} className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-lg`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg leading-tight">{quiz.title}</h3>
                  <div className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs font-bold">
                    {quiz.timer}m
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">{quiz.subject} • {quiz.questions.length} Questions</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">
                    Attempts: {attemptCount} / {quiz.attemptLimit}
                  </span>
                  <button
                    disabled={isLimitReached}
                    onClick={() => handleStartQuiz(quiz)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      isLimitReached 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-blue-200'
                    }`}
                  >
                    {isLimitReached ? 'Max Attempts' : attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}
                  </button>
                </div>
              </div>
            );
          })}
          {quizzes.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-400">No available quizzes for your class.</h3>
              <p className="text-gray-500">Check back later for new assessments.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Quizzes Attempted</p>
                <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-blue-600'}`}>{stats.totalAttempts}</p>
              </div>
              <div className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Average Score</p>
                <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-green-600'}`}>{stats.avgScore}%</p>
              </div>
          </div>

          <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-3 text-xs font-bold uppercase">Quiz Name</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-center">Score</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-center">Date</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {attempts.map((attempt, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{attempt.quizTitle}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-sm ${attempt.score >= 80 ? 'text-green-600 bg-green-50' : attempt.score >= 50 ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50'}`}>
                        {attempt.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {new Date(attempt.attemptedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setShowResult(attempt)}
                        className="text-blue-600 hover:underline text-sm font-bold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attempts.length === 0 && (
              <p className="py-12 text-center text-gray-500 italic">No attempt history found.</p>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'leaderboard' && (
        <div className="max-w-2xl mx-auto">
           <div className={`p-8 rounded-2xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-2xl font-black mb-6 text-center text-blue-600">🏆 Class {student.className} Leaderboard</h2>
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div key={entry.studentId} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${entry.studentId === student.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-900/50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl ${
                      index === 0 ? 'bg-yellow-400 text-white shadow-lg' :
                      index === 1 ? 'bg-gray-300 text-white shadow-md' :
                      index === 2 ? 'bg-orange-400 text-white shadow-md' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-lg">{entry.studentName} {entry.studentId === student.id && "(You)"}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">{entry.attempts} Attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-600">{entry.bestScore}%</p>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-center text-gray-500 py-12 italic">Be the first to attempt a quiz!</p>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
