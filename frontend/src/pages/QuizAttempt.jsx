import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import QuizTimer from './QuizTimer';

function QuizAttempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (quizId) {
      initializeQuizAttempt();
    }
  }, [quizId]);

  const initializeQuizAttempt = async () => {
    try {
      setLoading(true);
      console.log("Starting or resuming quiz attempt for quiz ID:", quizId);

      // Start or resume a quiz attempt
      const response = await api.student.startQuizAttempt(quizId);
      console.log("Quiz attempt response:", response.data);

      // Store the attempt ID
      const newAttemptId = response.data.attempt_id;
      setAttemptId(newAttemptId);

      // Fetch the first question
      if (newAttemptId) {
        await fetchCurrentQuestion(newAttemptId);
      } else {
        toast.error('Unable to start quiz attempt');
        navigate('/enrolled-courses');
      }
    } catch (error) {
      console.error('Error initializing quiz attempt:', error);
      toast.error('Failed to start quiz attempt');
      navigate('/enrolled-courses');
    }
  };

  const fetchCurrentQuestion = async (attemptIdToUse) => {
    try {
      const actualAttemptId = attemptIdToUse || attemptId;
      if (!actualAttemptId) {
        toast.error('No active quiz attempt');
        return;
      }

      console.log("Fetching current question for attempt ID:", actualAttemptId);
      const response = await api.student.getCurrentQuestion(actualAttemptId);
      console.log("Current question response:", response.data);

      if (response.data.message === "Quiz attempt already completed") {
        const resultsResponse = await api.student.getQuizResults(actualAttemptId);
        setQuizCompleted(true);
        setQuizResults(resultsResponse.data);
        return;
      }

      // The backend returns question data nested under the 'question' key
      if (!response.data.question) {
        console.error('No question data in response:', response.data);
        toast.error('Failed to fetch question data');
        return;
      }

      // Map backend response to the format expected by the component
      const questionData = {
        id: response.data.question.id,
        question_text: response.data.question.text,          // Map 'text' to 'question_text'
        question_type: response.data.question.type || 'single',  // Default to single choice if not provided
        choices: response.data.question.choices.map(choice => ({
          id: choice.id,
          choice_text: choice.text                  // Map 'text' to 'choice_text'
        }))
      };

      setCurrentQuestion(questionData);
      setCurrentQuestionIndex(response.data.current_question_index || 1);
      setTotalQuestions(response.data.total_questions || 0);
      setTimeRemaining(response.data.time_remaining);
      setSelectedChoices([]);
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('Failed to fetch question');
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceSelect = (choiceId) => {
    if (currentQuestion.question_type === 'single') {
      setSelectedChoices([choiceId]);
    } else {
      setSelectedChoices(prev => {
        if (prev.includes(choiceId)) {
          return prev.filter(id => id !== choiceId);
        }
        return [...prev, choiceId];
      });
    }
  };

  const submitAnswer = async () => {
    if (selectedChoices.length === 0) {
      toast.warning('Please select an answer');
      return;
    }

    try {
      setLoading(true);

      // Make sure selected_choices is an array of numbers (not strings)
      const numericChoices = selectedChoices.map(choice =>
        typeof choice === 'string' ? parseInt(choice, 10) : choice
      );

      const payload = {
        selected_choices: numericChoices
      };

      console.log("Submitting answer for attempt:", attemptId);
      console.log("Payload:", JSON.stringify(payload));
      console.log("Selected choices types:", numericChoices.map(c => typeof c));

      const response = await api.student.submitAnswer(attemptId, payload);
      console.log("Submit answer response:", response.data);

      // Fetch next question after submitting answer
      await fetchCurrentQuestion();
    } catch (error) {
      console.error('Error submitting answer:', error.response?.data || error.message);
      toast.error(`Failed to submit answer: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const completeQuiz = async () => {
    try {
      setLoading(true);

      console.log("Completing quiz attempt:", attemptId);
      const response = await api.student.completeQuizAttempt(attemptId);

      console.log("Quiz completion response:", response.data);
      setQuizCompleted(true);
      setQuizResults(response.data);
      toast.success('Quiz completed!');
    } catch (error) {
      console.error('Error completing quiz:', error);

      // Extract more detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);

        // Show specific error message if available
        const errorMessage = error.response.data.error || 'Failed to complete quiz';
        toast.error(errorMessage);
      } else {
        toast.error('Failed to complete quiz');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    try {
      setLoading(true);

      console.log("Completing quiz attempt:", attemptId);
      const response = await api.student.completeQuizAttempt(attemptId);

      setQuizCompleted(true);
      setQuizResults(response.data);
      toast.success('Quiz completed!');
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast.error('Failed to complete quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Quiz Results</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-gray-800 mb-2">
              {quizResults.score}%
            </p>
            <p className="text-lg text-gray-600">
              {quizResults.passed ? 'Passed!' : 'Not passed'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-xl font-semibold">{quizResults.total_questions}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Correct Answers</p>
              <p className="text-xl font-semibold">{quizResults.correct_answers}</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => navigate('/enrolled-courses')}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Timer and Question Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold">
            Question {currentQuestionIndex} {totalQuestions > 0 ? `of ${totalQuestions}` : ''}
          </h2>
          {timeRemaining !== null && timeRemaining !== undefined && (
            <div className="timer-container">
              <QuizTimer
                initialTime={timeRemaining}
                onTimeUp={handleTimeUp}
              />
            </div>
          )}
        </div>
      </div>

      {/* Question Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : currentQuestion ? (
          <>
            <p className="text-lg mb-6">{currentQuestion.question_text}</p>

            <div className="space-y-3 mb-6">
              {currentQuestion.choices && Array.isArray(currentQuestion.choices) ? (
                currentQuestion.choices.map((choice) => (
                  <label
                    key={choice.id}
                    className={`flex items-center p-3 rounded border cursor-pointer transition-colors
                      ${selectedChoices.includes(choice.id)
                        ? 'bg-blue-50 border-blue-500'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type={currentQuestion.question_type === 'single' ? 'radio' : 'checkbox'}
                      checked={selectedChoices.includes(choice.id)}
                      onChange={() => handleChoiceSelect(choice.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">{choice.choice_text}</span>
                  </label>
                ))
              ) : (
                <p className="text-red-500">No choices available for this question</p>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={submitAnswer}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                disabled={selectedChoices.length === 0 || loading}
              >
                Submit Answer
              </button>
              <button
                onClick={completeQuiz}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                disabled={loading}
              >
                Finish Quiz
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-red-500">No question available</p>
        )}
      </div>
    </div>
  );
}

export default QuizAttempt;
