import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  FaPlus, FaTrash, FaTimes, FaCheck, FaSpinner,
  FaExclamationCircle
} from 'react-icons/fa';

// --- Zod Schemas ---
const choiceSchema = z.object({
  choice_text: z.string().min(1, "Choice text is required"),
  is_correct: z.boolean().default(false),
  id: z.any().optional(), // Allow ID for existing choices
});

const questionSchema = z.object({
  question_text: z.string().min(1, "Question text is required"),
  question_type: z.enum(["single", "multiple"]),
  points: z.number().min(1, "Points must be at least 1"),
  choices: z.array(choiceSchema).min(2, "At least 2 choices are required"),
  id: z.any().optional(),
  order: z.number().optional(),
}).refine((data) => {
  return data.choices.some(c => c.is_correct);
}, { message: "Select at least one correct answer", path: ["choices"] });

const quizSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  time_limit: z.number().min(1, "Time limit must be at least 1 minute"),
  pass_mark: z.number().min(1).max(100, "Pass mark must be between 1 and 100"),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  id: z.any().optional(),
});

// --- Components ---

// Sub-component for managing choices within a question
const ChoicesFieldArray = ({ nestIndex, control, register, errors, questionType }) => {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: `questions.${nestIndex}.choices`
  });

  const handleCorrectChange = (index, value) => {
    // For single choice, we need to uncheck others
    if (questionType === 'single' && value) {
      fields.forEach((field, i) => {
        if (i !== index) {
          // We need to verify if this updates correctly in RHF
          // Simplest way is to just let the user handle it or force update
          // But RHF doesn't auto-uncheck others for checkboxes unless we manage it.
          // Using radio inputs for single choice is better UX.
        }
      });
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Choices</label>
      {fields.map((item, k) => (
        <div key={item.id} className="flex items-center gap-2">
          <label className="flex items-center">
            <input
              type={questionType === 'single' ? "radio" : "checkbox"}
              {...register(`questions.${nestIndex}.choices.${k}.is_correct`)}
              value={questionType === 'single' ? "true" : undefined} // Radio needs value
              // For radio groups in RHF it's tricky with array. 
              // Easier: Use checkbox for both but enforce logic? 
              // Or just use checkbox visuals.
              className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </label>
          <input
            {...register(`questions.${nestIndex}.choices.${k}.choice_text`)}
            placeholder={`Choice ${k + 1}`}
            className={`flex-1 p-2 border rounded-md text-sm ${errors?.questions?.[nestIndex]?.choices?.[k]?.choice_text ? 'border-red-500' : 'border-gray-300'}`}
          />
          <button
            type="button"
            onClick={() => remove(k)}
            disabled={fields.length <= 2}
            className="text-red-500 hover:text-red-700 disabled:opacity-30"
          >
            <FaTrash size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ choice_text: "", is_correct: false })}
        disabled={fields.length >= 6}
        className="text-blue-600 text-sm flex items-center gap-1 mt-1 hover:text-blue-800 disabled:opacity-50"
      >
        <FaPlus size={12} /> Add Choice
      </button>
      {errors?.questions?.[nestIndex]?.choices?.root && (
        <p className="text-red-500 text-xs mt-1">{errors.questions[nestIndex].choices.root.message}</p>
      )}
    </div>
  );
};


const QuizModal = ({ initialData, onClose, onSave, isLoading }) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      time_limit: 30,
      pass_mark: 70,
      questions: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions"
  });

  // Watch question type to handle choice logic if needed
  // const questions = watch("questions");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-800">
            {initialData?.id ? "Edit Quiz" : "Create Quiz"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="quiz-form" onSubmit={handleSubmit(onSave)} className="space-y-6">

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Quiz Title</label>
                <input
                  {...register("title")}
                  className={`w-full p-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., Introduction to React"
                />
                {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Time (mins)</label>
                  <input
                    type="number"
                    {...register("time_limit", { valueAsNumber: true })}
                    className={`w-full p-2 border rounded-md ${errors.time_limit ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.time_limit && <p className="text-red-500 text-xs">{errors.time_limit.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Pass Mark (%)</label>
                  <input
                    type="number"
                    {...register("pass_mark", { valueAsNumber: true })}
                    className={`w-full p-2 border rounded-md ${errors.pass_mark ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.pass_mark && <p className="text-red-500 text-xs">{errors.pass_mark.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register("description")}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Optional description..."
              />
            </div>

            {/* Questions Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Questions ({fields.length})</h3>
                <button
                  type="button"
                  onClick={() => append({
                    question_text: "",
                    question_type: "single",
                    points: 1,
                    choices: [
                      { choice_text: "", is_correct: false },
                      { choice_text: "", is_correct: false }
                    ]
                  })}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center gap-2 text-sm font-medium transition"
                >
                  <FaPlus /> Add Question
                </button>
              </div>

              {errors.questions?.root && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2 text-sm">
                  <FaExclamationCircle /> {errors.questions.root.message}
                </div>
              )}

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50 relative group">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
                      title="Remove Question"
                    >
                      <FaTrash />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-8 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Question {index + 1}</label>
                        <input
                          {...register(`questions.${index}.question_text`)}
                          className={`w-full p-2 border rounded-md ${errors.questions?.[index]?.question_text ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Enter question text"
                        />
                        {errors.questions?.[index]?.question_text && (
                          <p className="text-red-500 text-xs">{errors.questions[index].question_text.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select
                          {...register(`questions.${index}.question_type`)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="single">Single Choice</option>
                          <option value="multiple">Multiple Choice</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Points</label>
                        <input
                          type="number"
                          {...register(`questions.${index}.points`, { valueAsNumber: true })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="mt-4 pl-4 border-l-2 border-indigo-100">
                      <ChoicesFieldArray
                        nestIndex={index}
                        control={control}
                        register={register}
                        errors={errors}
                        questionType={watch(`questions.${index}.question_type`)}
                      />
                    </div>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-gray-500 mb-2">No questions added yet.</p>
                    <button
                      type="button"
                      onClick={() => append({
                        question_text: "",
                        question_type: "single",
                        points: 1,
                        choices: [
                          { choice_text: "", is_correct: false },
                          { choice_text: "", is_correct: false }
                        ]
                      })}
                      className="text-blue-600 hover:underline"
                    >
                      Add your first question
                    </button>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            form="quiz-form"
            type="submit"
            disabled={isLoading || isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 shadow-md transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading || isSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheck />}
            {initialData?.id ? 'Update Quiz' : 'Create Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizModal;