// frontend/src/components/quiz/QuizCreation.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';

const QuizCreation = ({ topicId, courseId, onQuizCreated }) => {
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    pass_mark: 60,
    time_limit: '', // Optional
    required_lessons: 0, // Number of lessons required before quiz is available
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'single',
    points: 1,
    choices: [
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingQuiz, setExistingQuiz] = useState(null);

  useEffect(() => {
    fetchExistingQuiz();
  }, [courseId, topicId]);

  const fetchExistingQuiz = async () => {
    try {
      console.log(`Fetching quiz for course ${courseId}, topic ${topicId}`);
      const response = await api.teacher.getQuiz(courseId, topicId);
      
      if (response.data) {
        console.log("Received quiz data:", JSON.stringify(response.data, null, 2));
        
        // Ensure the quiz data includes a questions array (even if empty)
        const formattedQuizData = {
          ...response.data,
          questions: Array.isArray(response.data.questions) ? response.data.questions : []
        };
        
        console.log("Formatted quiz data:", JSON.stringify(formattedQuizData, null, 2));
        
        setExistingQuiz(formattedQuizData);
        setQuizData(formattedQuizData);
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch quiz');
      }
    }
  };

  const validateQuiz = () => {
    if (!quizData.title.trim()) {
      toast.error('Quiz title is required');
      return false;
    }
    if (quizData.questions.length === 0) {
      toast.error('Add at least one question');
      return false;
    }
    if (quizData.pass_mark < 0 || quizData.pass_mark > 100) {
      toast.error('Pass mark must be between 0 and 100');
      return false;
    }
    return true;
  };

  const validateQuestion = () => {
    if (!currentQuestion.question_text.trim()) {
      toast.error('Question text is required');
      return false;
    }
    if (!currentQuestion.choices.some(c => c.is_correct)) {
      toast.error('Select at least one correct answer');
      return false;
    }
    if (currentQuestion.choices.some(c => !c.choice_text.trim())) {
      toast.error('All choices must have text');
      return false;
    }
    return true;
  };

  const addQuestion = () => {
    if (!validateQuestion()) return;

    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, { 
        ...currentQuestion, 
        order: prev.questions.length + 1 
      }]
    }));

    // Reset current question
    setCurrentQuestion({
      question_text: '',
      question_type: 'single',
      points: 1,
      choices: [
        { choice_text: '', is_correct: false },
        { choice_text: '', is_correct: false }
      ]
    });
  };

  const addChoice = () => {
    if (currentQuestion.choices.length >= 6) {
      toast.error('Maximum 6 choices allowed');
      return;
    }

    setCurrentQuestion(prev => ({
      ...prev,
      choices: [...prev.choices, { choice_text: '', is_correct: false }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateQuiz()) return;

    setIsSubmitting(true);
    try {
      let response;
      console.log("Submitting quiz data:", JSON.stringify(quizData, null, 2));
      
      if (existingQuiz) {
        // Make sure we're including the questions in the update call
        response = await api.teacher.updateQuiz(courseId, topicId, quizData);
        console.log("Quiz update response:", response.data);
        
        // Important: Since the API response doesn't include questions, keep the questions from the submitted data
        const updatedQuizData = {
          ...response.data,
          questions: quizData.questions || []
        };
        
        console.log("Final quiz state after update:", JSON.stringify(updatedQuizData, null, 2));
        
        // Update state with combined data (API response + original questions)
        setQuizData(updatedQuizData);
        setExistingQuiz(updatedQuizData);
        
        toast.success('Quiz updated successfully');
      } else {
        response = await api.teacher.createQuiz(courseId, topicId, quizData);
        console.log("Quiz creation response:", response.data);
        
        // Important: Since the API response doesn't include questions, keep the questions from the submitted data
        const updatedQuizData = {
          ...response.data,
          questions: quizData.questions || []
        };
        
        console.log("Final quiz state after creation:", JSON.stringify(updatedQuizData, null, 2));
        
        // Update state with combined data (API response + original questions)
        setQuizData(updatedQuizData);
        setExistingQuiz(updatedQuizData);
        
        toast.success('Quiz created successfully');
      }
      
      // We no longer need to fetch the quiz data again since we're already maintaining the questions
      // in our local state. Fetching would actually overwrite our complete data with incomplete data.
      // await fetchExistingQuiz();
      
      // Pass the COMPLETE updated quiz data with questions to the parent component
      // We were passing response.data which doesn't include questions!
      onQuizCreated(updatedQuizData);
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error(error.response?.data?.message || 'Failed to save quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...quizData.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + direction];
    newQuestions[index + direction] = temp;
    
    // Update order numbers
    newQuestions.forEach((q, i) => q.order = i + 1);
    
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = quizData.questions.filter((_, i) => i !== index);
    // Update order numbers
    newQuestions.forEach((q, i) => q.order = i + 1);
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const removeChoice = (index) => {
    if (currentQuestion.choices.length <= 2) {
      toast.error('Minimum 2 choices required');
      return;
    }
    setCurrentQuestion(prev => ({
      ...prev,
      choices: prev.choices.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">
        {existingQuiz ? 'Edit Quiz' : 'Create Quiz'}
      </h2>

      {/* Quiz Details Form */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Quiz Title"
          className="w-full p-2 border rounded"
          value={quizData.title}
          onChange={e => setQuizData({ ...quizData, title: e.target.value })}
          required
        />

        <textarea
          placeholder="Quiz Description"
          className="w-full p-2 border rounded"
          value={quizData.description}
          onChange={e => setQuizData({ ...quizData, description: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pass Mark (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full p-2 border rounded"
              value={quizData.pass_mark}
              onChange={e => setQuizData({ ...quizData, pass_mark: parseInt(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Time Limit (minutes)</label>
            <input
              type="number"
              min="0"
              className="w-full p-2 border rounded"
              value={quizData.time_limit}
              onChange={e => setQuizData({ ...quizData, time_limit: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Required Lessons</label>
            <input
              type="number"
              min="0"
              className="w-full p-2 border rounded"
              value={quizData.required_lessons}
              onChange={e => setQuizData({ ...quizData, required_lessons: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Questions</h3>
        {quizData.questions.map((question, index) => (
          <div key={index} className="mb-4 p-4 border rounded">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">Question {index + 1}</h4>
              <div className="flex space-x-2">
                {index > 0 && (
                  <button
                    onClick={() => moveQuestion(index, -1)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <FaArrowUp />
                  </button>
                )}
                {index < quizData.questions.length - 1 && (
                  <button
                    onClick={() => moveQuestion(index, 1)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <FaArrowDown />
                  </button>
                )}
                <button
                  onClick={() => removeQuestion(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            <p className="mb-2">{question.question_text}</p>
            <div className="ml-4">
              {question.choices.map((choice, choiceIndex) => (
                <div key={choiceIndex} className="flex items-center">
                  <span className={choice.is_correct ? "text-green-600" : "text-gray-600"}>
                    {String.fromCharCode(65 + choiceIndex)}.
                  </span>
                  <span className="ml-2">{choice.choice_text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Question Form */}
      <div className="mb-8 p-4 border rounded">
        <h3 className="text-xl font-semibold mb-4">Add New Question</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Question Text"
            className="w-full p-2 border rounded"
            value={currentQuestion.question_text}
            onChange={e => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
          />

          <div className="space-y-2">
            {currentQuestion.choices.map((choice, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={choice.is_correct}
                  onChange={e => {
                    const newChoices = [...currentQuestion.choices];
                    newChoices[index] = { ...choice, is_correct: e.target.checked };
                    setCurrentQuestion({ ...currentQuestion, choices: newChoices });
                  }}
                  className="h-4 w-4"
                />
                <input
                  type="text"
                  placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                  value={choice.choice_text}
                  onChange={e => {
                    const newChoices = [...currentQuestion.choices];
                    newChoices[index] = { ...choice, choice_text: e.target.value };
                    setCurrentQuestion({ ...currentQuestion, choices: newChoices });
                  }}
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={() => removeChoice(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={addChoice}
              className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <FaPlus className="mr-2" /> Add Choice
            </button>
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add Question
            </button>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : existingQuiz ? 'Update Quiz' : 'Create Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizCreation;