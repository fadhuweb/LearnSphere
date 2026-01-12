import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { api } from "../api";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaEdit,
  FaCheck,
  FaTrash,
  FaTimes,
  FaFilePdf,
  FaVideo,
  FaLink,
  FaTextHeight,
  FaChevronUp,
  FaChevronDown,
  FaSpinner,
  FaExclamationTriangle,
  FaSync,
  FaQuestionCircle,
  FaClock,
  FaGraduationCap,
  FaPercentage,
  FaChevronRight,
  FaList,
  FaBook
} from "react-icons/fa";
import axios from "axios";

import QuizModal from "../components/QuizModal";
import RichTextEditor from "../components/RichTextEditor";

const TeacherCourses = () => {
  const [courses, setCourses] = useState([]);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newLesson, setNewLesson] = useState({
    title: "",
    description: "",
    contentType: "",
    content: "",
    file: null,
    topicId: null,
    courseId: null,
    order: 1,
  });
  const [expandedTopics, setExpandedTopics] = useState({});
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingLessonData, setEditingLessonData] = useState({
    title: "",
    description: "",
    contentType: "",
    content: "",
    file: null,
  });
  const [loading, setLoading] = useState({
    courses: false,
    updateTopic: false,
    deleteTopic: false,
    createLesson: false,
    updateLesson: false,
    deleteLesson: false,
    saveQuiz: false,
  });
  const [error, setError] = useState(null);
  const [quizModal, setQuizModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizModalData, setQuizModalData] = useState(null);
  const [quizStatistics, setQuizStatistics] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [expandedQuizIds, setExpandedQuizIds] = useState({});
  const [loadingQuizQuestions, setLoadingQuizQuestions] = useState({});
  const [completeQuizData, setCompleteQuizData] = useState({});
  const [expandedCourses, setExpandedCourses] = useState({});
  const [courseDetailData, setCourseDetailData] = useState({});
  const [loadingCourseDetails, setLoadingCourseDetails] = useState({});
  const [showLessonForm, setShowLessonForm] = useState(false);



  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (quizModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [quizModal]);

  const loadCourses = async () => {
    try {
      setLoading(prev => ({ ...prev, courses: true }));
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.teacher.getCourses();
      console.log('Raw API Response:', response);

      if (!response.data) {
        throw new Error('No data received from server');
      }

      let coursesData;
      if (Array.isArray(response.data)) {
        coursesData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        coursesData = response.data.data;
      } else if (typeof response.data === 'object') {
        coursesData = [response.data];
      } else {
        coursesData = [];
      }

      console.log('Processed Courses Data:', coursesData);
      console.log('First course topics:', coursesData[0]?.topics);

      if (coursesData[0]?.topics?.length > 0) {
        console.log('First topic quiz data:', coursesData[0].topics[0].quiz);
      }

      setCourses(coursesData);

      if (coursesData.length === 0) {
        toast.info('No courses are currently assigned to you');
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.detail
        || error.message
        || 'An unknown error occurred';

      setError(errorMessage);
      toast.error(`Failed to load courses: ${errorMessage}`);
      setCourses([]);
    } finally {
      setLoading(prev => ({ ...prev, courses: false }));
    }
  };

  const handleAddTopic = async (courseId) => {
    const title = window.prompt("Enter topic title:");
    if (!title?.trim()) return;

    try {
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Please log in again");
        // Optionally redirect to login page
        return;
      }

      await api.teacher.createTopic(courseId, { title: title.trim() });
      await loadCourses();
      toast.success("Topic created successfully");
    } catch (error) {
      console.error("Error creating topic:", error);
      if (error.response?.status === 401) {
        toast.error("Please log in again");
        // Optionally redirect to login page
      } else {
        const errorMessage = error.response?.data?.message || error.message;
        toast.error(`Failed to create topic: ${errorMessage}`);
      }
    }
  };

  const handleUpdateTopic = async (courseId, topicId) => {
    if (!editingTitle.trim()) {
      toast.error("Topic title cannot be empty");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, updateTopic: true }));
      await api.teacher.updateTopic(courseId, topicId, { title: editingTitle.trim() });
      await loadCourses();
      setEditingTopic(null);
      setEditingTitle("");
      toast.success("Topic updated successfully");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("Error updating topic:", errorMessage);
      toast.error(`Failed to update topic: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, updateTopic: false }));
    }
  };

  const handleDeleteTopic = async (courseId, topicId) => {
    if (!window.confirm("Are you sure you want to delete this topic?")) return;

    try {
      setLoading(prev => ({ ...prev, deleteTopic: true }));
      await api.teacher.deleteTopic(courseId, topicId);
      await loadCourses();
      toast.success("Topic deleted successfully");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("Error deleting topic:", errorMessage);
      toast.error(`Failed to delete topic: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, deleteTopic: false }));
    }
  };

  const handleCreateLesson = async (topic, courseId) => {
    // If no form data yet, just show the form
    if (!newLesson.title && !newLesson.description && !newLesson.contentType) {
      // If no form data, set the topic and course IDs and show a form
      setNewLesson(prev => ({
        ...prev,
        topicId: topic.id,
        courseId: courseId,
      }));
      setShowLessonForm(true);
      return;
    }

    // Validate required fields
    if (!newLesson.title?.trim()) {
      toast.error("Lesson title is required.");
      return;
    }

    if (!newLesson.description?.trim()) {
      toast.error("Lesson description is required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", newLesson.title.trim());
    formData.append("description", newLesson.description.trim());

    // Debug - Log FormData before content type handling
    console.log("FormData initial fields:", {
      title: newLesson.title.trim(),
      description: newLesson.description.trim()
    });

    // Handle different content types
    if (newLesson.contentType === "text") {
      if (!newLesson.content.trim()) {
        toast.error("Please enter the text content");
        return;
      }
      formData.append("contextual_help", newLesson.content.trim());
      console.log("Adding text content:", newLesson.content.trim());
    }
    else if (newLesson.contentType === "link") {
      if (!newLesson.content.trim()) {
        toast.error("Please enter a valid URL");
        return;
      }
      formData.append("external_links", JSON.stringify([{ url: newLesson.content.trim(), title: "Resource Link" }]));
      console.log("Adding link object:", JSON.stringify([{ url: newLesson.content.trim(), title: "Resource Link" }]));
    }
    else if (newLesson.contentType === "pdf" || newLesson.contentType === "video") {
      if (!newLesson.file) {
        toast.error(`Please select a ${newLesson.contentType.toUpperCase()} file`);
        return;
      }

      // Explicitly log the file being uploaded
      console.log(`Uploading ${newLesson.contentType} file:`, {
        name: newLesson.file.name,
        size: newLesson.file.size,
        type: newLesson.file.type
      });

      // Append with correct field name
      formData.append(newLesson.contentType, newLesson.file);
    }
    else {
      toast.error("Please provide the required content");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, createLesson: true }));

      // We use either the parameters passed to this function or the values stored in newLesson state
      const lessonCourseId = courseId || newLesson.courseId;
      const lessonTopicId = topic?.id || newLesson.topicId;

      // Log the request details
      console.log("Making API request to:",
        `/teacher/courses/${lessonCourseId}/topics/${lessonTopicId}/lessons/create/`);
      console.log("FormData entries:");
      for (let pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[0] === 'pdf' || pair[0] === 'video' ? '[File]' : pair[1]}`);
      }

      const response = await api.teacher.createLesson(
        lessonCourseId,
        lessonTopicId,
        formData
      );

      console.log("API Response:", response);

      toast.success("Lesson created successfully");
      setNewLesson({
        title: "",
        description: "",
        contentType: "",
        content: "",
        file: null,
        topicId: null,
        courseId: null,
        order: 1,
        id: null,
      });
      setShowLessonForm(false);

      await loadCourses();
    } catch (error) {
      console.error("Error creating lesson:", error);
      console.error("Error response:", error.response?.data);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.detail ||
        Object.values(error.response?.data || {})[0]?.[0] ||
        error.message;
      toast.error(`Failed to create lesson: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, createLesson: false }));
    }
  };

  const handleDeleteLesson = async (courseId, topicId, lessonId) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;

    try {
      setLoading(prev => ({ ...prev, deleteLesson: true }));
      await api.teacher.deleteLesson(courseId, topicId, lessonId);
      await loadCourses();
      toast.success("Lesson deleted successfully");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("Error deleting lesson:", errorMessage);
      toast.error(`Failed to delete lesson: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, deleteLesson: false }));
    }
  };

  const handleEditLesson = (courseId, topicId, lesson) => {
    setNewLesson({
      id: lesson.id,
      title: lesson.title || "",
      description: lesson.description || "",
      contentType: lesson.pdf ? "pdf" :
        lesson.video ? "video" :
          lesson.external_links?.length > 0 ? "link" :
            lesson.contextual_help ? "text" : "",
      content: lesson.external_links?.length > 0 ? lesson.external_links[0] :
        lesson.contextual_help || "",
      file: null,
      topicId: topicId,
      courseId,
      order: lesson.order || 1,
    });

    setShowLessonForm(true);
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();

    if (!newLesson.title.trim() || !newLesson.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, updateLesson: true }));
      const formData = new FormData();
      formData.append("title", newLesson.title.trim());
      formData.append("description", newLesson.description.trim());

      if (newLesson.contentType === "text") {
        if (!newLesson.content.trim()) {
          toast.error("Please enter the text content");
          return;
        }
        formData.append("contextual_help", newLesson.content.trim());
      } else if (newLesson.contentType === "link") {
        if (!newLesson.content.trim()) {
          toast.error("Please enter a valid URL");
          return;
        }
        formData.append("external_links", JSON.stringify([{ url: newLesson.content.trim(), title: "Resource Link" }]));
      } else if (newLesson.file) {
        // Fix: Append file to the correct field name (pdf or video) instead of using contentType as the field name
        if (newLesson.contentType === "pdf") {
          formData.append("pdf", newLesson.file);
        } else if (newLesson.contentType === "video") {
          formData.append("video", newLesson.file);
        }

        // Add debugging
        console.log(`Appending ${newLesson.contentType} file:`, newLesson.file);
      } else {
        toast.error("Please provide the required content");
        return;
      }

      await api.teacher.updateLesson(
        newLesson.courseId,
        newLesson.topicId,
        newLesson.id,
        formData
      );

      toast.success("Lesson updated successfully");
      setNewLesson({
        title: "",
        description: "",
        contentType: "",
        content: "",
        file: null,
        topicId: null,
        courseId: null,
        order: 1,
        id: null,
      });
      setShowLessonForm(false);
      await loadCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("Error updating lesson:", errorMessage);
      toast.error(`Failed to update lesson: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, updateLesson: false }));
    }
  };

  const toggleTopicExpansion = (topicId) => {
    console.log('Toggling topic expansion for:', topicId);
    console.log('Current expandedTopics:', expandedTopics);
    setExpandedTopics((prevState) => {
      const newState = {
        ...prevState,
        [topicId]: !prevState[topicId],
      };
      console.log('New expandedTopics state:', newState);
      return newState;
    });
  };

  const loadQuizStatistics = async (topic) => {
    try {
      setLoading(prev => ({ ...prev, loadStatistics: true }));
      const response = await api.teacher.getQuizStatistics(topic.course_id, topic.id);
      setQuizStatistics(response.data);
    } catch (error) {
      console.error("Error loading quiz statistics:", error);
      toast.error("Failed to load quiz statistics");
    } finally {
      setLoading(prev => ({ ...prev, loadStatistics: false }));
    }
  };

  const handleViewQuizStatistics = async (topic) => {
    try {
      setLoading(prev => ({ ...prev, loadStatistics: true }));
      const response = await api.teacher.getQuizStatistics(topic.course_id, topic.id);
      setQuizStatistics(response.data);
    } catch (error) {
      console.error("Error loading quiz statistics:", error);
      toast.error("Failed to load quiz statistics");
    } finally {
      setLoading(prev => ({ ...prev, loadStatistics: false }));
    }
  };

  const handleDeleteQuiz = async (topic) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      await api.teacher.deleteQuiz(topic.course_id, topic.id);
      toast.success("Quiz deleted successfully");
      await loadCourses(); // Refresh the course list
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  const toggleQuizExpansion = useCallback(async (quizId, topic, courseId) => {
    setExpandedQuizIds(prev => {
      // If we're closing the expansion, just toggle
      if (prev[quizId]) {
        return {
          ...prev,
          [quizId]: !prev[quizId]
        };
      }

      // If we're opening and don't have the data, fetch it
      if (!completeQuizData[quizId]) {
        // Prepare topic with course ID for the API call
        const topicWithCourse = {
          ...topic,
          course_id: courseId
        };

        // Start loading
        setLoadingQuizQuestions(prev => ({
          ...prev,
          [quizId]: true
        }));

        // Fetch the complete quiz data
        fetchCompleteQuizData(topicWithCourse)
          .then(data => {
            if (data) {
              setCompleteQuizData(prev => ({
                ...prev,
                [quizId]: data
              }));
            }
          })
          .catch(error => {
            console.error("Error loading quiz questions:", error);
          })
          .finally(() => {
            setLoadingQuizQuestions(prev => ({
              ...prev,
              [quizId]: false
            }));
          });
      }

      // Toggle expansion
      return {
        ...prev,
        [quizId]: !prev[quizId]
      };
    });
  }, [expandedQuizIds, completeQuizData]);

  // Add this new function to fetch complete quiz data with questions
  const fetchCompleteQuizData = async (topic) => {
    if (!topic || !topic.quiz) return null;

    try {
      console.log(`Fetching complete quiz data for topic ${topic.id}, course ${topic.course_id}`);
      const response = await api.teacher.getQuiz(topic.course_id, topic.id);

      console.log('Complete quiz data received:', response.data);
      console.log('Questions in response:', response.data?.questions);
      console.log('Question count:', response.data?.questions?.length || 0);

      // Return the complete quiz data
      return response.data;
    } catch (error) {
      console.error('Error fetching complete quiz data:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      toast.error('Could not load quiz questions');
      return null;
    }
  };

  const toggleCourseExpansion = useCallback(async (courseId) => {
    setExpandedCourses(prev => {
      // Toggle expansion
      const newState = {
        ...prev,
        [courseId]: !prev[courseId]
      };

      // If we're expanding and don't have detailed data, fetch it
      if (newState[courseId] && !courseDetailData[courseId]) {
        setLoadingCourseDetails(prev => ({
          ...prev,
          [courseId]: true
        }));

        api.teacher.getDetailedCourse(courseId)
          .then(response => {
            console.log(`Detailed course data received for course ${courseId}:`, response.data);

            // Store the complete course data with quiz questions
            setCourseDetailData(prev => ({
              ...prev,
              [courseId]: response.data
            }));
          })
          .catch(error => {
            console.error(`Error loading detailed course data for course ${courseId}:`, error);
            if (error.response) {
              console.error('Error response details:', {
                status: error.response.status,
                data: error.response.data
              });
            }
            toast.error('Failed to load complete course data');
          })
          .finally(() => {
            setLoadingCourseDetails(prev => ({
              ...prev,
              [courseId]: false
            }));
          });
      }

      return newState;
    });
  }, [courseDetailData]);

  const handleQuizSave = async (data) => {
    try {
      setLoading(prev => ({ ...prev, saveQuiz: true }));
      const courseId = selectedTopic.course_id;
      const topicId = selectedTopic.id;

      if (editingQuiz) {
        await api.teacher.updateQuiz(courseId, topicId, data);
        toast.success("Quiz updated successfully");
      } else {
        await api.teacher.createQuiz(courseId, topicId, data);
        toast.success("Quiz created successfully");
      }

      setQuizModal(false);
      setEditingQuiz(null);
      setQuizModalData(null);
      loadCourses(); // Refresh

      // Refresh detailed course data if we have it
      if (courseId && courseDetailData[courseId]) {
        const refreshedData = await api.teacher.getDetailedCourse(courseId);
        setCourseDetailData(prev => ({
          ...prev,
          [courseId]: refreshedData.data
        }));
      }

    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(prev => ({ ...prev, saveQuiz: false }));
    }
  };

  const handleCreateQuiz = async (topic, courseId) => {
    try {
      setSelectedTopic({
        id: topic.id,
        course_id: courseId
      });
      setQuizModalData(null);
      setEditingQuiz(null);
      setQuizModal(true);
    } catch (error) {
      console.error("Error in handleCreateQuiz:", error);
      toast.error("Error setting up quiz creation.");
    }
  };

  const handleEditQuiz = async (topic) => {
    try {
      setLoading(prev => ({ ...prev, loadStatistics: true }));
      const response = await api.teacher.getQuiz(topic.course_id, topic.id);
      const quiz = response.data;

      const formattedData = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        pass_mark: quiz.pass_mark,
        time_limit: quiz.time_limit,
        questions: quiz.questions ? quiz.questions.map(q => ({
          ...q,
          choices: q.choices || []
        })) : []
      };

      setQuizModalData(formattedData);
      setSelectedTopic({ id: topic.id, course_id: topic.course_id });
      setEditingQuiz(quiz.id);
      setQuizModal(true);
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error("Failed to load quiz details");
    } finally {
      setLoading(prev => ({ ...prev, loadStatistics: false }));
    }
  };

  const renderTopicQuiz = (topic, courseId) => {
    // Determine if we should use detailed data
    const isDetailedDataAvailable = courseDetailData[courseId];

    // If we have detailed data, use the topic from that
    const detailedTopic = isDetailedDataAvailable ?
      courseDetailData[courseId].topics.find(t => t.id === topic.id) :
      null;

    // Use detailed topic data if available
    const topicToUse = detailedTopic || topic;

    // Ensure topic has course_id for quiz operations
    const topicWithCourse = {
      ...topicToUse,
      course_id: courseId
    };

    // Use the component-level state for tracking quiz expansion
    const isQuizExpanded = topicToUse.quiz && expandedQuizIds[topicToUse.quiz.id];

    // Quiz data is now directly available from the detailed topic
    const quizToDisplay = topicToUse.quiz;
    const hasQuestions = quizToDisplay && quizToDisplay.questions && quizToDisplay.questions.length > 0;

    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between items-center">
          <h6 className="text-lg font-semibold text-gray-700">
            Quiz
          </h6>
          {topicToUse.quiz ? (
            <div className="flex gap-4">
              <button
                onClick={() => handleViewQuizStatistics(topicWithCourse)}
                className="bg-blue-500 text-white px-3 py-1 rounded-md flex items-center gap-1 hover:bg-blue-600 transition"
              >
                <FaGraduationCap /> View Statistics
              </button>
              <button
                onClick={() => handleEditQuiz(topicWithCourse)}
                className="bg-yellow-500 text-white px-3 py-1 rounded-md flex items-center gap-1 hover:bg-yellow-600 transition"
              >
                <FaEdit /> Edit Quiz
              </button>
              <button
                onClick={() => handleDeleteQuiz(topicWithCourse)}
                className="bg-red-500 text-white px-3 py-1 rounded-md flex items-center gap-1 hover:bg-red-600 transition"
              >
                <FaTrash /> Delete Quiz
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleCreateQuiz(topicWithCourse, courseId)}
              className="bg-green-500 text-white px-3 py-1 rounded-md flex items-center gap-1 hover:bg-green-600 transition"
            >
              <FaPlus /> Add Quiz
            </button>
          )}
        </div>
        {topicToUse.quiz && (
          <div className="mt-2 bg-white p-4 rounded-md border shadow-sm">
            {/* Quiz Header with Title and Toggle */}
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedQuizIds(prev => ({
                ...prev,
                [topicToUse.quiz.id]: !prev[topicToUse.quiz.id]
              }))}
            >
              <h6 className="text-xl font-bold text-green-700">{quizToDisplay.title}</h6>
              <span className="text-green-600">
                {isQuizExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </span>
            </div>

            {/* Quiz Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 border-b pb-3">
              <div className="bg-green-50 p-3 rounded-md flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500 uppercase">Time Limit</span>
                <div className="flex items-center mt-1">
                  <FaClock className="text-yellow-500 mr-2" />
                  <span className="text-xl font-bold">{quizToDisplay.time_limit} Minutes</span>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-md flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500 uppercase">Pass Mark</span>
                <div className="flex items-center mt-1">
                  <FaPercentage className="text-green-500 mr-2" />
                  <span className="text-xl font-bold">{quizToDisplay.pass_mark}%</span>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-md flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500 uppercase">Questions</span>
                <div className="flex items-center mt-1">
                  <FaQuestionCircle className="text-blue-500 mr-2" />
                  <span className="text-xl font-bold">{quizToDisplay.question_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Quiz Description */}
            {quizToDisplay.description && (
              <div className="mt-3">
                <h6 className="text-sm text-gray-500 uppercase mb-1">Description</h6>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{quizToDisplay.description}</p>
              </div>
            )}

            {/* Loading indicator */}
            {loadingCourseDetails[courseId] && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-2 text-gray-600">Loading quiz data...</p>
              </div>
            )}

            {/* Expanded Quiz Content - Questions */}
            {isQuizExpanded && hasQuestions && (
              <div className="mt-4">
                <h6 className="text-sm text-gray-500 uppercase mb-2">Questions</h6>
                <div className="space-y-4">
                  {quizToDisplay.questions.map((question, qIndex) => (
                    <div key={question.id || qIndex} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between">
                        <h6 className="font-semibold text-gray-800">
                          {qIndex + 1}. {question.question_text}
                        </h6>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {question.question_type === 'single' ? 'Single Choice' : 'Multiple Choice'}
                        </span>
                      </div>

                      <div className="mt-2 pl-6">
                        <p className="text-xs text-gray-500 mb-1">Points: {question.points}</p>
                        <ul className="space-y-2 mt-2">
                          {question.choices && question.choices.map((choice, cIndex) => (
                            <li
                              key={choice.id || cIndex}
                              className={`flex items-center p-2 rounded-md ${choice.is_correct ? 'bg-green-100 border-green-300 border' : 'bg-white border'}`}
                            >
                              <span className={`inline-block w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs ${choice.is_correct ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                                {choice.is_correct ? <FaCheck /> : cIndex + 1}
                              </span>
                              <span>{choice.choice_text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No questions message */}
            {isQuizExpanded && !hasQuestions && !loadingCourseDetails[courseId] && (
              <div className="mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded-md">
                <p className="text-center text-yellow-700">This quiz doesn't have any questions yet. Edit the quiz to add questions.</p>
              </div>
            )}

            {/* Show View Questions button if not expanded */}
            {!isQuizExpanded && (
              <div className="mt-3 text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Make sure we have detailed data before expanding
                    if (!isDetailedDataAvailable) {
                      toggleCourseExpansion(courseId);
                    }
                    setExpandedQuizIds(prev => ({
                      ...prev,
                      [topicToUse.quiz.id]: !prev[topicToUse.quiz.id]
                    }));
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center justify-center mx-auto"
                >
                  <FaChevronDown className="mr-1" /> View Questions ({quizToDisplay.question_count || 0})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">
              Manage Your Courses
            </span>
          </h1>
          <p className="text-center text-gray-500 mb-6 max-w-2xl mx-auto">
            Edit and organize your course content to provide the best learning experience for your students.
          </p>
        </div>
      </div>

      {/* Courses Section */}
      <div className="container mx-auto py-8 px-4">
        {loading.courses ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            <p className="ml-4 text-lg text-gray-600">Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center max-w-2xl mx-auto border border-gray-200">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3293/3293620.png"
              alt="No courses"
              className="w-32 h-32 mx-auto mb-4 opacity-60"
            />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Courses Yet</h3>
            <p className="text-gray-500 mb-6">
              You haven't been assigned any courses yet. Contact an administrator if you believe this is an error.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-lg">
                {/* Course Header */}
                <div
                  className="bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 p-6 cursor-pointer"
                  onClick={() => toggleCourseExpansion(course.id)}
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                      <span className="bg-green-100 text-green-700 p-2 rounded-full mr-3">
                        <FaGraduationCap className="text-xl" />
                      </span>
                      {course.title}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                        {course.topics.length} {course.topics.length === 1 ? 'Topic' : 'Topics'}
                      </span>
                      <button
                        className="text-gray-500 hover:text-gray-800 transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCourseExpansion(course.id);
                        }}
                      >
                        {expandedCourses[course.id] ?
                          <FaChevronUp className="text-xl" /> :
                          <FaChevronDown className="text-xl" />
                        }
                      </button>
                    </div>
                  </div>
                  {course.description && (
                    <p className="mt-2 text-gray-600 max-w-3xl">{course.description}</p>
                  )}
                </div>

                {/* Course Content (Topics) */}
                {expandedCourses[course.id] && (
                  <div className="p-6">
                    {/* Loading state */}
                    {loadingCourseDetails[course.id] && (
                      <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                        <span className="ml-3 text-gray-600">Loading course details...</span>
                      </div>
                    )}

                    {/* Topics */}
                    {!loadingCourseDetails[course.id] && (
                      <>
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                            <FaList className="mr-2 text-green-600" /> Topics
                          </h3>
                          <button
                            onClick={() => handleAddTopic(course.id)}
                            className="bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-lg transition duration-200 flex items-center gap-1"
                          >
                            <FaPlus /> Add Topic
                          </button>
                        </div>

                        {course.topics.length === 0 ? (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                            <p className="text-gray-500">No topics created yet. Add your first topic to get started.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {course.topics.sort((a, b) => a.order - b.order).map((topic) => (
                              <div key={topic.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                {/* Topic Header */}
                                <div className="bg-gray-100 p-4 border-b border-gray-200">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-gray-700">
                                      {topic.order}. {topic.title}
                                    </h4>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditTopic(topic, course.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="Edit Topic"
                                      >
                                        <FaEdit />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTopic(course.id, topic.id)}
                                        className="text-red-600 hover:text-red-800"
                                        title="Delete Topic"
                                      >
                                        <FaTrash />
                                      </button>
                                    </div>
                                  </div>
                                  {topic.description && (
                                    <p className="mt-1 text-sm text-gray-600">{topic.description}</p>
                                  )}
                                </div>

                                {/* Topic Content */}
                                <div className="p-4">
                                  {/* Lessons Section */}
                                  <div className="mb-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <h5 className="text-sm font-medium text-gray-500 uppercase flex items-center">
                                        <FaBook className="mr-1 text-blue-500" /> Lessons
                                      </h5>
                                      <button
                                        onClick={() => handleCreateLesson(topic, course.id)}
                                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded flex items-center gap-1 transition duration-200"
                                      >
                                        <FaPlus /> Add Lesson
                                      </button>
                                    </div>
                                    {topic.lessons && topic.lessons.length > 0 ? (
                                      <div className="space-y-2">
                                        {topic.lessons.sort((a, b) => a.order - b.order).map((lesson) => (
                                          <div key={lesson.id} className="bg-white rounded border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                                            <div className="flex justify-between items-center">
                                              <div className="flex items-center">
                                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs font-medium">
                                                  {lesson.order}
                                                </span>
                                                <h6 className="font-medium text-gray-800">{lesson.title}</h6>
                                              </div>
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleEditLesson(course.id, topic.id, lesson)}
                                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                                  title="Edit Lesson"
                                                >
                                                  <FaEdit />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteLesson(course.id, topic.id, lesson.id)}
                                                  className="text-red-600 hover:text-red-800 text-sm"
                                                  title="Delete Lesson"
                                                >
                                                  <FaTrash />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 py-2 text-center bg-gray-50 rounded border border-dashed border-gray-300">
                                        No lessons created yet
                                      </p>
                                    )}
                                  </div>

                                  {/* Quiz Section */}
                                  {renderTopicQuiz(topic, course.id)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {quizModal && (
        <QuizModal
          initialData={quizModalData}
          onClose={() => setQuizModal(false)}
          onSave={handleQuizSave}
          isLoading={loading.saveQuiz}
        />
      )}

      {showLessonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {newLesson.id ? 'Edit Lesson' : 'Add New Lesson'}
              </h3>
              <button
                onClick={() => {
                  setShowLessonForm(false);
                  setNewLesson({
                    title: "",
                    description: "",
                    contentType: "",
                    content: "",
                    file: null,
                    topicId: null,
                    courseId: null,
                    order: 1,
                  });
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (newLesson.id) {
                // If lesson has ID, it's an update
                handleUpdateLesson(e);
              } else {
                // New lesson
                handleCreateLesson({
                  id: newLesson.topicId
                }, newLesson.courseId);
              }
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lessonTitle">
                  Title*
                </label>
                <input
                  id="lessonTitle"
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lessonDescription">
                  Description*
                </label>
                <textarea
                  id="lessonDescription"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                  value={newLesson.description}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Content Type*
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${newLesson.contentType === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setNewLesson(prev => ({ ...prev, contentType: 'text' }))}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${newLesson.contentType === 'link' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setNewLesson(prev => ({ ...prev, contentType: 'link' }))}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${newLesson.contentType === 'pdf' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setNewLesson(prev => ({ ...prev, contentType: 'pdf', file: null }))}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${newLesson.contentType === 'video' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setNewLesson(prev => ({ ...prev, contentType: 'video', file: null }))}
                  >
                    Video
                  </button>
                </div>
              </div>

              {newLesson.contentType === 'text' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lessonContent">
                    Content*
                  </label>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lessonContent">
                    Content*
                  </label>
                  <RichTextEditor
                    value={newLesson.content}
                    onChange={(content) => setNewLesson(prev => ({ ...prev, content: content }))}
                    placeholder="Enter lesson content here..."
                    style={{ height: '200px', marginBottom: '50px' }}
                  />
                </div>
              )}

              {newLesson.contentType === 'link' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lessonLink">
                    URL*
                  </label>
                  <input
                    id="lessonLink"
                    type="url"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={newLesson.content}
                    onChange={(e) => setNewLesson(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="https://example.com"
                    required
                  />
                </div>
              )}

              {(newLesson.contentType === 'pdf' || newLesson.contentType === 'video') && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lessonFile">
                    {newLesson.contentType === 'pdf' ? 'PDF File*' : 'Video File*'}
                  </label>
                  <input
                    id="lessonFile"
                    type="file"
                    accept={newLesson.contentType === 'pdf' ? '.pdf' : 'video/*'}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      console.log('File selected:', file);
                      setNewLesson(prev => ({
                        ...prev,
                        file: file || null
                      }));
                    }}
                    required
                  />
                  {newLesson.file && (
                    <div className="mt-2 text-sm text-green-600">
                      Selected file: {newLesson.file.name} ({Math.round(newLesson.file.size / 1024)} KB)
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonForm(false);
                    setNewLesson({
                      title: "",
                      description: "",
                      contentType: "",
                      content: "",
                      file: null,
                      topicId: null,
                      courseId: null,
                      order: 1,
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                  disabled={loading.createLesson}
                >
                  {loading.createLesson ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Lesson'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Additional modals remain unchanged */}
    </div>
  );
};

export default TeacherCourses;
