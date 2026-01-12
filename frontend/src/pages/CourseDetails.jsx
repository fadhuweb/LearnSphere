import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // Import React Query hooks
import api from '../api';
import { toast } from 'react-toastify';
import TopicLock from '../components/TopicLock'; // Import TopicLock
import LoadingSpinner from '../components/LoadingSpinner'; // Import LoadingSpinner
import DOMPurify from 'dompurify';

function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);

  // Fetch Course Details
  const {
    data: course,
    isLoading: isCourseLoading,
    error: courseError
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const response = await api.student.getCourseDetails(courseId);
      return response.data;
    },
    // select: (data) => data, // Optional: transform data if needed
  });

  // Derived state for active topic (default to first)
  // We don't need state for this if we just default to first available, 
  // but to keep previous logic of "auto-select first", we can just use the data directly or simple logic.
  // Actually, we can just let the user click. Or auto-select first lesson.

  // Fetch Active Lesson Details
  const {
    data: activeLesson,
    isLoading: isLessonLoading
  } = useQuery({
    queryKey: ['lesson', activeLessonId],
    queryFn: async () => {
      const response = await api.student.getLessonDetails(activeLessonId);
      return response.data;
    },
    enabled: !!activeLessonId, // Only fetch if ID is set
    onError: (error) => {
      toast.error(`Failed to fetch lesson details: ${error.message}`);
    }
  });

  // Fetch Active Quiz Details
  const {
    data: activeQuiz,
    isLoading: isQuizLoading
  } = useQuery({
    queryKey: ['quiz', activeQuizId], // We use a unique key for the quiz
    queryFn: async () => {
      // We need topicId for the API call, but activeQuizId currently stores... 
      // Wait, the API `getQuizDetails` expects (courseId, topicId). 
      // My previous logic passed `handleQuizClick(topic.id)`.
      const response = await api.student.getQuizDetails(courseId, activeQuizId);
      return response.data;
    },
    enabled: !!activeQuizId,
    onError: () => toast.error('Failed to fetch quiz details')
  });

  const handleLessonClick = (lesson) => {
    setActiveLessonId(lesson.id);
    setActiveQuizId(null);
    setQuizAttempt(null);
  };

  const handleQuizClick = (topicId) => {
    setActiveQuizId(topicId); // activeQuizId here acts as the topicId for fetching
    setActiveLessonId(null);
    setQuizAttempt(null);
  };

  const startQuiz = async () => {
    try {
      if (!activeQuiz) {
        toast.error('No quiz selected');
        return;
      }
      const response = await api.student.startQuizAttempt(activeQuiz.id);
      navigate(`/quiz/${activeQuiz.id}/attempt`);
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast.error('Failed to start quiz');
    }
  };

  if (isCourseLoading) return <LoadingSpinner />;
  if (courseError) return <div className="p-8 text-center text-red-600">Failed to load course details.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white py-8 px-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">{course?.title}</h1>
          <div className="flex items-center mt-2">
            <span className="text-blue-200 text-sm mr-4">
              <span className="font-medium">Instructor:</span> {course?.teacher?.name || 'Not Assigned'}
            </span>
            <span className="text-blue-200 text-sm">
              <span className="font-medium">Topics:</span> {course?.topics?.length || 0}
            </span>
            <span className="text-blue-200 text-sm ml-4">
              <span className="font-medium">Quizzes:</span> {course?.topics?.filter(topic => topic.has_quiz).length || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div>
          {/* Course Description Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">About This Course</h2>
            <p className="text-gray-600">{course?.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Topics and Lessons Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">Course Content</h2>
                {course?.topics?.map((topic, index) => (
                  <div key={topic.id} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-medium text-sm mr-2">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-gray-800">{topic.title}</h3>
                      </div>
                      {/* Topic Lock Indicator */}
                      <TopicLock isLocked={topic.is_locked} />
                    </div>

                    {/* Debug information */}
                    {/* <div className="pl-8 text-xs text-gray-500 mb-1">
                        {topic.lessons ? `${topic.lessons.length} lessons` : 'No lessons'}
                      </div> */}

                    <ul className={`space-y-1 pl-8 ${topic.is_locked ? 'opacity-50 pointer-events-none' : ''}`}>
                      {topic.lessons && Array.isArray(topic.lessons) && topic.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <button
                            onClick={() => handleLessonClick(lesson)}
                            disabled={topic.is_locked}
                            className={`w-full text-left px-3 py-2 rounded flex items-center ${activeLessonId === lesson.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm">{lesson.title}</span>
                            {lesson.is_completed && <span className="ml-auto text-green-500 text-xs">✓</span>}
                          </button>
                        </li>
                      ))}
                      {topic.has_quiz && (
                        <li>
                          <button
                            onClick={() => handleQuizClick(topic.id)} // Pass topic.id which acts as fetch key
                            disabled={topic.is_locked || !topic.quiz_available}
                            className={`w-full text-left px-3 py-2 rounded flex items-center ${activeQuizId === topic.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-sm font-medium">Topic Quiz</span>
                            {!topic.quiz_available && !topic.is_locked && (
                              <span className="ml-auto text-xs text-orange-400" title="Complete all lessons first">⚠</span>
                            )}
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3">
              {isLessonLoading ? (
                <LoadingSpinner />
              ) : activeLesson ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-800">{activeLesson.title}</h2>
                  </div>
                  <div className="p-6">
                    <div className="prose max-w-none">
                      {activeLesson.description && (
                        <div className="mb-4">
                          <h3 className="font-medium text-gray-700 mb-2">Description:</h3>
                          <p>{activeLesson.description}</p>
                        </div>
                      )}

                      {/* Show helpful message if content seems missing */}
                      {!activeLesson.description && !activeLesson.pdf && !activeLesson.video &&
                        !activeLesson.pdf_url && !activeLesson.video_url && !activeLesson.external_links?.length && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="font-medium text-gray-700 mb-1">No content available yet</h3>
                            <p className="text-gray-600 text-sm">The instructor has not uploaded content for this lesson yet.</p>
                          </div>
                        )}

                      {/* PDF Display */}
                      {(activeLesson.pdf_url || activeLesson.pdf) && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <h3 className="font-medium text-gray-700 mb-2">Lesson PDF:</h3>
                          <div className="mb-2">
                            <object
                              data={activeLesson.pdf_url || activeLesson.pdf}
                              type="application/pdf"
                              width="100%"
                              height="600px"
                              className="border rounded shadow-sm"
                            >
                              <div className="bg-red-50 text-red-600 p-4 rounded">
                                <p>It appears your browser doesn't support embedded PDFs.</p>
                                <a
                                  href={activeLesson.pdf_url || activeLesson.pdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 mt-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                >
                                  Download PDF Material
                                </a>
                              </div>
                            </object>
                          </div>
                        </div>
                      )}

                      {/* Video Display */}
                      {(activeLesson.video_url || activeLesson.video) && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <h3 className="font-medium text-gray-700 mb-2">Lesson Video:</h3>
                          <div className="rounded overflow-hidden shadow-sm">
                            <video
                              controls
                              width="100%"
                              height="auto"
                              className="bg-black"
                              controlsList="nodownload"
                            >
                              <source src={activeLesson.video_url || activeLesson.video} />
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        </div>
                      )}

                      {/* External Links Display */}
                      {activeLesson.external_links && activeLesson.external_links.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <h3 className="font-medium text-gray-700 mb-2">Additional Resources:</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {activeLesson.external_links.map((link, index) => {
                              const url = typeof link === 'string' ? link : link.url;
                              const title = typeof link === 'string' ? link : (link.title || link.url);
                              return (
                                <li key={index}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800"
                                  >
                                    {title}
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* Contextual Help Display */}
                      {/* Contextual Help/Content Display */}
                      {activeLesson.contextual_help && (
                        <div className="mt-6 pt-4 border-t border-gray-100 bg-white p-4 rounded">
                          <div
                            className="text-sm text-gray-700 lesson-content"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeLesson.contextual_help) }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : isQuizLoading ? (
                <LoadingSpinner />
              ) : activeQuiz ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <>
                    <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
                      <h2 className="text-xl font-semibold text-gray-800">{activeQuiz.title}</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-xs uppercase tracking-wide text-blue-700 mb-1">Time Limit</div>
                          <div className="text-lg font-semibold flex items-center">
                            {/* SVG Icon */}
                            {activeQuiz.time_limit} minutes
                          </div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <div className="text-xs uppercase tracking-wide text-indigo-700 mb-1">Questions</div>
                          <div className="text-lg font-semibold flex items-center">
                            {/* SVG Icon */}
                            {activeQuiz.question_count || activeQuiz.total_questions || (activeQuiz.questions ? activeQuiz.questions.length : 0)} in total
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-xs uppercase tracking-wide text-purple-700 mb-1">Pass Mark</div>
                          <div className="text-lg font-semibold flex items-center">
                            {/* SVG Icon */}
                            {activeQuiz.pass_mark}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 mb-4 px-4 py-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded">
                        <p>Once you start the quiz, you must complete it within the time limit.</p>
                      </div>

                      <button
                        onClick={startQuiz}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center font-medium rounded-md hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                      >
                        Start Quiz Now
                      </button>
                    </div>
                  </>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Ready to Start Learning?</h3>
                  <p className="text-gray-600 mb-6">Select a lesson or quiz from the sidebar to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseDetails;
