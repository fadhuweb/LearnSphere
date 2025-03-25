// src/components/QuizModal.jsx
import React, { useState } from 'react';
import { 
  FaPlus, FaTrash, FaTimes, FaCheck, FaSpinner, 
  FaArrowUp, FaArrowDown, FaEdit 
} from 'react-icons/fa';

const QuizModal = ({ topic, quizData, setQuizData, onClose, onSave, loading }) => {
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: "",
    question_type: "single",
    points: 1,
    choices: [
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false }
    ]
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  const handleQuestionSubmit = () => {
    // Validate question
    if (!currentQuestion.question_text.trim()) {
      alert("Question text is required");
      return;
    }

    // Validate choices
    if (currentQuestion.choices.some(c => !c.choice_text.trim())) {
      alert("All choices must have text");
      return;
    }

    if (!currentQuestion.choices.some(c => c.is_correct)) {
      alert("At least one choice must be correct");
      return;
    }

    // Add or update question
    if (editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...quizData.questions];
      updatedQuestions[editingQuestionIndex] = { ...currentQuestion };
      setQuizData({ ...quizData, questions: updatedQuestions });
    } else {
      // Add new question
      setQuizData({
        ...quizData,
        questions: [...quizData.questions, { ...currentQuestion }]
      });
    }

    // Reset form
    setCurrentQuestion({
      question_text: "",
      question_type: "single",
      points: 1,
      choices: [
        { choice_text: "", is_correct: false },
        { choice_text: "", is_correct: false }
      ]
    });
    setEditingQuestionIndex(null);
  };

  const handleEditQuestion = (index) => {
    setCurrentQuestion({ ...quizData.questions[index] });
    setEditingQuestionIndex(index);
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = quizData.questions.filter((_, i) => i !== index);
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  const handleAddChoice = () => {
    if (currentQuestion.choices.length >= 6) {
      alert("Maximum 6 choices allowed");
      return;
    }
    setCurrentQuestion({
      ...currentQuestion,
      choices: [...currentQuestion.choices, { choice_text: "", is_correct: false }]
    });
  };

  const handleRemoveChoice = (index) => {
    if (currentQuestion.choices.length <= 2) {
      alert("Minimum 2 choices required");
      return;
    }
    setCurrentQuestion({
      ...currentQuestion,
      choices: currentQuestion.choices.filter((_, i) => i !== index)
    });
  };

  const handleChoiceTextChange = (index, value) => {
    const updatedChoices = [...currentQuestion.choices];
    updatedChoices[index] = { ...updatedChoices[index], choice_text: value };
    setCurrentQuestion({ ...currentQuestion, choices: updatedChoices });
  };

  const handleChoiceCorrectChange = (index, checked) => {
    const updatedChoices = [...currentQuestion.choices];
    
    if (currentQuestion.question_type === "single") {
      // For single choice, uncheck all others
      updatedChoices.forEach((choice, i) => {
        choice.is_correct = i === index ? checked : false;
      });
    } else {
      // For multiple choice, just toggle this one
      updatedChoices[index] = { ...updatedChoices[index], is_correct: checked };
    }
    
    setCurrentQuestion({ ...currentQuestion, choices: updatedChoices });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-700">
              {quizData.id ? "Edit Quiz" : "Create Quiz"}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Quiz Basic Info */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quiz Title
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                placeholder="Enter quiz title"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pass Mark (%)
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-md"
                  value={quizData.pass_mark}
                  onChange={(e) => setQuizData({ ...quizData, pass_mark: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-md"
                  value={quizData.time_limit}
                  onChange={(e) => setQuizData({ ...quizData, time_limit: Math.max(1, parseInt(e.target.value) || 1) })}
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full p-2 border rounded-md"
              value={quizData.description}
              onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
              placeholder="Enter quiz description"
              rows="3"
            />
          </div>

          {/* Questions List */}
          {quizData.questions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Questions ({quizData.questions.length})
              </h3>
              <div className="space-y-3">
                {quizData.questions.map((question, index) => (
                  <div key={index} className="border rounded-md p-3 bg-gray-50">
                    <div className="flex justify-between">
                      <div>
                        <span className="font-medium">Question {index + 1}:</span> {question.question_text}
                        <div className="text-sm text-gray-500 mt-1">
                          {question.question_type === "single" ? "Single choice" : "Multiple choice"} 
                          • {question.points} point{question.points !== 1 ? 's' : ''}
                        </div>
                        <div className="mt-2 ml-4">
                          {question.choices.map((choice, choiceIndex) => (
                            <div key={choiceIndex} className="flex items-center gap-2 text-sm">
                              <span className={choice.is_correct ? "text-green-600 font-medium" : "text-gray-600"}>
                                {choice.is_correct ? "✓" : "○"} {choice.choice_text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditQuestion(index)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Question Form */}
          <div className="border-t pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              {editingQuestionIndex !== null ? "Edit Question" : "Add New Question"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={currentQuestion.question_text}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                  placeholder="Enter question text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type
                  </label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={currentQuestion.question_type}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value })}
                  >
                    <option value="single">Single Answer</option>
                    <option value="multiple">Multiple Answers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choices
                </label>
                {currentQuestion.choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type={currentQuestion.question_type === "single" ? "radio" : "checkbox"}
                      checked={choice.is_correct}
                      onChange={(e) => handleChoiceCorrectChange(index, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded-md"
                      value={choice.choice_text}
                      onChange={(e) => handleChoiceTextChange(index, e.target.value)}
                      placeholder={`Choice ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveChoice(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={currentQuestion.choices.length <= 2}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddChoice}
                  className="text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-2"
                  disabled={currentQuestion.choices.length >= 6}
                >
                  <FaPlus /> Add Choice
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleQuestionSubmit}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
                >
                  {editingQuestionIndex !== null ? (
                    <>
                      <FaCheck /> Update Question
                    </>
                  ) : (
                    <>
                      <FaPlus /> Add Question
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 border-t pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || quizData.questions.length === 0 || !quizData.title}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <FaCheck /> Save Quiz
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizModal;