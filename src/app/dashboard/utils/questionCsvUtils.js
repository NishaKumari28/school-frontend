/**
 * CSV Import/Export utilities for Quiz Questions
 */

import Papa from 'papaparse';
import { generateId } from './quizDataUtils';

/**
 * Parse CSV content and convert to questions array
 * Expected format: Question,Option A,Option B,Option C,Option D,Correct Answer,Difficulty
 * Or: Question,Correct Answer (for short_answer and true_false)
 */
export const parseQuestionCsv = (csvContent) => {
  if (!csvContent || !csvContent.trim()) {
    return { success: false, questions: [], error: 'Empty CSV content' };
  }

  const result = Papa.parse(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  if (result.errors.length > 0) {
    return { success: false, questions: [], error: result.errors[0].message };
  }

  const questions = [];
  const errors = [];

  result.data.forEach((row, index) => {
    try {
      const question = row['Question'] || row['question'];
      if (!question || !question.trim()) {
        errors.push(`Row ${index + 2}: Question text is required`);
        return;
      }

      const correctAnswer = row['Correct Answer'] || row['correct answer'];
      if (!correctAnswer || !correctAnswer.trim()) {
        errors.push(`Row ${index + 2}: Correct answer is required`);
        return;
      }

      // Determine question type based on available options
      const optionA = row['Option A'] || row['option a'];
      const optionB = row['Option B'] || row['option b'];
      const optionC = row['Option C'] || row['option c'];
      const optionD = row['Option D'] || row['option d'];

      let type = 'short_answer';
      const options = [];

      // If all options are present, it's likely an MCQ
      if (optionA && optionB && optionC && optionD) {
        type = 'mcq';
        options.push(
          { label: 'A', text: optionA.trim() },
          { label: 'B', text: optionB.trim() },
          { label: 'C', text: optionC.trim() },
          { label: 'D', text: optionD.trim() }
        );
      } else if (
        (correctAnswer.toLowerCase() === 'true' || correctAnswer.toLowerCase() === 'false') &&
        !optionC && !optionD
      ) {
        // Check if it's a true/false question
        type = 'true_false';
      }

      const difficulty = (row['Difficulty'] || row['difficulty'] || 'medium').toLowerCase();

      questions.push({
        id: generateId(),
        type,
        question: question.trim(),
        options: type === 'mcq' ? options : [],
        correctAnswer: correctAnswer.trim(),
        difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium'
      });
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err.message}`);
    }
  });

  if (questions.length === 0 && errors.length > 0) {
    return { success: false, questions: [], error: errors.join(', ') };
  }

  return {
    success: true,
    questions,
    warnings: errors.length > 0 ? errors : []
  };
};

/**
 * Generate CSV template for questions
 */
export const generateQuestionCsvTemplate = (type = 'all') => {
  const templates = {
    mcq: 'Question,Option A,Option B,Option C,Option D,Correct Answer,Difficulty\n"What is 2+2?","3","4","5","6","B","easy"\n"What is the capital of France?","London","Paris","Berlin","Rome","B","medium"',
    true_false: 'Question,Correct Answer,Difficulty\n"The earth is round.","True","easy"\n"Water boils at 100°C.","True","medium"',
    short_answer: 'Question,Correct Answer,Difficulty\n"What is the square root of 144?","12","medium"\n"Who wrote Romeo and Juliet?","Shakespeare","hard"',
    all: 'Question,Option A,Option B,Option C,Option D,Correct Answer,Difficulty\n"What is 2+2?","3","4","5","6","B","easy"\n"Is the earth round?","True","","","","True","easy"\n"What is 5×5?","20","25","30","35","B","medium"'
  };

  return templates[type] || templates.all;
};

/**
 * Export questions to CSV format
 */
export const exportQuestionsToCsv = (questions) => {
  const rows = questions.map(q => {
    const row = {
      Question: q.question,
      'Correct Answer': q.correctAnswer,
      Difficulty: q.difficulty || 'medium'
    };

    if (q.type === 'mcq' && q.options) {
      row['Option A'] = q.options[0]?.text || '';
      row['Option B'] = q.options[1]?.text || '';
      row['Option C'] = q.options[2]?.text || '';
      row['Option D'] = q.options[3]?.text || '';
    }

    return row;
  });

  return Papa.unparse(rows);
};

/**
 * Download questions as CSV file
 */
export const downloadQuestionsCsv = (questions, filename = 'questions.csv') => {
  if (!questions || questions.length === 0) {
    alert('No questions to download.');
    return;
  }

  const csv = exportQuestionsToCsv(questions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse uploaded CSV file
 */
export const parseQuestionFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = parseQuestionCsv(e.target.result);
      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.error));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

export default {
  parseQuestionCsv,
  generateQuestionCsvTemplate,
  exportQuestionsToCsv,
  downloadQuestionsCsv,
  parseQuestionFile
};
