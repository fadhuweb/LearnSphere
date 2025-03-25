import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';

function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching course details for courseId:', courseId);
      const response = await api.student.getCourseDetails(courseId);
      console.log('Course details response:', response.data);
      
      // Debug course structure
      if (response.data.topics) {
        console.log(`Topics found: ${response.data.topics.length}`);
        response.data.topics.forEach((topic, index) => {
          console.log(`Topic ${index + 1}: ${topic.title}`);
          console.log(`  Lessons available: ${topic.lessons ? topic.lessons.length : 'No lessons array'}`);
          if (topic.lessons) {
            topic.lessons.forEach((lesson, i) => {
              console.log(`    Lesson ${i + 1}: ${lesson.title} (ID: ${lesson.id})`);
            });
          }
        });
      } else {
        console.error('No topics found in the course data');
      }
      
      if (response.data.topics && response.data.topics.length > 0) {
        // Auto-select the first topic if none is selected
        if (!activeTopicId) {
          setActiveTopicId(response.data.topics[0].id);
        }
      }

      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast.error('Failed to fetch course details');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = async (lesson) => {
    try {
      setLessonLoading(true);
      console.log('Fetching lesson details for lesson ID:', lesson.id);
      const response = await api.student.getLessonDetails(lesson.id);
      console.log('Lesson details response:', response.data);
      
      // Check if we got a valid response with content
      if (!response.data) {
        console.error('Received empty lesson data');
        toast.error('Error: Lesson data is empty');
        return;
      }
      
      setActiveLesson(response.data);
      setActiveQuiz(null);
      setQuizAttempt(null);
    } catch (error) {
      console.error('Error fetching lesson details:', error);
      toast.error(`Failed to fetch lesson details: ${error.message || 'Unknown error'}`);
    } finally {
      setLessonLoading(false);
    }
  };

  const handleQuizClick = async (topicId) => {
    try {
      setQuizLoading(true);
      const response = await api.student.getQuizDetails(courseId, topicId);
      setActiveQuiz(response.data);
      setActiveLesson(null);
      setQuizAttempt(null);
    } catch (error) {
      toast.error('Failed to fetch quiz details');
    } finally {
      setQuizLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      if (!activeQuiz || !activeTopicId) {
        toast.error('No quiz selected');
        return;
      }
      
      console.log("Starting quiz attempt for quiz:", activeQuiz);
      
      // Use the quiz ID from activeQuiz instead of the topic ID
      const response = await api.student.startQuizAttempt(activeQuiz.id);
      console.log("Quiz attempt started successfully:", response.data);
      
      // Update the navigation URL to match the route defined in App.jsx
      navigate(`/quiz/${activeQuiz.id}/attempt`);
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast.error('Failed to start quiz');
    }
  };

  const submitQuizAnswer = async (questionId, answerId) => {
    try {
      await api.student.submitQuizAnswer(quizAttempt.id, questionId, answerId);
      toast.success('Answer submitted');
    } catch (error) {
      toast.error('Failed to submit answer');
    }
  };

  const completeQuiz = async () => {
    try {
      const response = await api.student.completeQuizAttempt(quizAttempt.id);
      toast.success(`Quiz completed! Score: ${response.data.score}%`);
      setQuizAttempt(null);
      setActiveQuiz(null);
    } catch (error) {
      toast.error('Failed to complete quiz');
    }
  };

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
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-lg text-gray-600">Loading course details...</p>
            </div>
          </div>
        ) : course ? (
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
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-medium text-sm mr-2">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-gray-800">{topic.title}</h3>
                      </div>
                      
                      {/* Debug information */}
                      <div className="pl-8 text-xs text-gray-500 mb-1">
                        {topic.lessons && Array.isArray(topic.lessons) ? 
                          `${topic.lessons.length} lessons available` : 
                          'No lessons data'}
                      </div>
                      
                      <ul className="space-y-1 pl-8">
                        {topic.lessons && Array.isArray(topic.lessons) && topic.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <button
                              onClick={() => handleLessonClick(lesson)}
                              className={`w-full text-left px-3 py-2 rounded flex items-center ${activeLesson?.id === lesson.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm">{lesson.title}</span>
                            </button>
                          </li>
                        ))}
                        {topic.has_quiz && (
                          <li>
                            <button
                              onClick={() => handleQuizClick(topic.id)}
                              className={`w-full text-left px-3 py-2 rounded flex items-center ${activeQuiz?.topic_id === topic.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="text-sm font-medium">Topic Quiz</span>
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
                {lessonLoading ? (
                  <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                      <p className="text-gray-600">Loading lesson content...</p>
                    </div>
                  </div>
                ) : activeLesson ? (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                      <h2 className="text-xl font-semibold text-gray-800">{activeLesson.title}</h2>
                    </div>
                    <div className="p-6">
                      <div className="prose max-w-none">
                        {/* Debug information - uncomment when debugging */}
                        {/* <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                          <p>Available fields: {Object.keys(activeLesson).join(', ')}</p>
                        </div> */}
                        
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
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
                              {activeLesson.external_links.map((link, index) => (
                                <li key={index}>
                                  <a 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800"
                                  >
                                    {link.title || link.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Contextual Help Display */}
                        {activeLesson.contextual_help && (
                          <div className="mt-6 pt-4 border-t border-gray-100 bg-blue-50 p-4 rounded">
                            <h3 className="font-medium text-gray-700 mb-2">Content</h3>
                            <p className="text-sm text-gray-600">{activeLesson.contextual_help}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeQuiz ? (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {quizLoading ? (
                      <div className="p-8 flex items-center justify-center">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                          <p className="text-gray-600">Loading quiz content...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
                          <h2 className="text-xl font-semibold text-gray-800">{activeQuiz.title}</h2>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="text-xs uppercase tracking-wide text-blue-700 mb-1">Time Limit</div>
                              <div className="text-lg font-semibold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activeQuiz.time_limit} minutes
                              </div>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-lg">
                              <div className="text-xs uppercase tracking-wide text-indigo-700 mb-1">Questions</div>
                              <div className="text-lg font-semibold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activeQuiz.total_questions} in total
                              </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <div className="text-xs uppercase tracking-wide text-purple-700 mb-1">Pass Mark</div>
                              <div className="text-lg font-semibold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activeQuiz.pass_mark}%
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 mb-4 px-4 py-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm">Once you start the quiz, you must complete it within the time limit. Make sure you're ready before proceeding.</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={startQuiz}
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center font-medium rounded-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-all flex items-center justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start Quiz Now
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Ready to Start Learning?</h3>
                    <p className="text-gray-600 mb-6">Select a lesson or quiz from the sidebar to begin your educational journey.</p>
                    <div className="text-sm text-indigo-600">
                      <span className="inline-flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tip: Complete lessons in order for the best learning experience
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Course Data Available</h3>
            <p className="text-gray-600 mb-6">Please try again later or contact support if the issue persists.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseDetails;
