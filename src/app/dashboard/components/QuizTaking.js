'use client';
import { useState, useEffect, useRef } from 'react';
import quizDataUtils from '../utils/quizDataUtils';

export default function QuizTaking({ quiz, student, isDarkMode, onComplete, onCancel }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(quiz.timer * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);

  const questions = quiz.randomize 
    ? [...quiz.questions].sort(() => Math.random() - 0.5)
    : quiz.questions;

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    clearInterval(timerRef.current);

    // Calculate score
    let correctCount = 0;
    const results = questions.map(q => {
      const studentAnswer = answers[q.id];
      const isCorrect = String(studentAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase();
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);

    const attemptData = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: questions.length - correctCount,
      details: results,
      timeTaken: (quiz.timer * 60) - timeLeft
    };

    quizDataUtils.saveAttempt(attemptData);
    onComplete(attemptData);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Header */}
      <header className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div>
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        <div className={`flex items-center gap-4 px-4 py-2 rounded-full font-mono text-xl ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {formatTime(timeLeft)}
        </div>
        <button
          onClick={() => { if(confirm('Are you sure you want to exit? Your progress will be lost.')) onCancel(); }}
          className="text-gray-500 hover:text-red-500 transition"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-blue-500 transition-all duration-300" 
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
        <div className={`w-full max-w-3xl p-8 rounded-2xl shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="mb-8">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {currentQuestion.difficulty}
            </span>
            <h3 className="text-2xl font-bold mt-4">{currentQuestion.question}</h3>
          </div>

          <div className="space-y-4">
            {currentQuestion.type === 'mcq' && currentQuestion.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleAnswer(currentQuestion.id, opt.label)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  answers[currentQuestion.id] === opt.label
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  answers[currentQuestion.id] === opt.label ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {opt.label}
                </span>
                <span className="text-lg">{opt.text}</span>
              </button>
            ))}

            {currentQuestion.type === 'true_false' && (
              <div className="flex gap-4">
                {['True', 'False'].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAnswer(currentQuestion.id, val)}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all text-xl font-bold ${
                      answers[currentQuestion.id] === val
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-xl outline-none focus:border-blue-500 ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}
                placeholder="Type your answer here..."
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className={`p-6 border-t flex justify-between items-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <button
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          className="px-6 py-3 rounded-lg font-bold border border-gray-300 dark:border-gray-600 disabled:opacity-30"
        >
          Previous
        </button>
        
        <div className="flex gap-3">
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-8 py-3 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-10 py-3 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 transition shadow-lg animate-bounce"
            >
              Finish & Submit
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
