import axios from "axios";

// Base API URL
// Use the current origin in production, or fallback to local dev URL
export const API_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? "http://127.0.0.1:8000/api"
  : `${window.location.origin}/api`;

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Create the api object with all endpoints
const api = {
  auth: {
    login: (credentials) => axios.post(
      `${API_URL}/auth/login/`,
      credentials,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    ),
    register: (userData) => axios.post(
      `${API_URL}/auth/register/`,
      userData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    ),
    passwordReset: (email) => axios.post(
      `${API_URL}/auth/password-reset/`,
      { email },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    ),
    passwordResetConfirm: (uid, token, password) => axios.post(
      `${API_URL}/auth/password-reset-confirm/`,
      { uid, token, password },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    ),
  },
  admin: {
    // User Management
    fetchUsers: async () => {
      return axios.get(`${API_URL}/admin/users/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    approveUser: async (userId) => {
      return axios.post(`${API_URL}/admin/users/${userId}/approve/`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    suspendUser: async (userId) => {
      return axios.patch(`${API_URL}/admin/users/${userId}/suspend/`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    removeUser: async (userId) => {
      return axios.delete(`${API_URL}/admin/users/${userId}/remove/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    reactivateUser: async (userId) => {
      return axios.patch(`${API_URL}/admin/users/${userId}/reactivate/`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },

    // Course Management
    fetchCourses: async () => {
      return axios.get(`${API_URL}/courses/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    createCourse: async (courseData) => {
      return axios.post(`${API_URL}/courses/create/`, courseData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    updateCourse: async (courseId, updatedData) => {
      return axios.put(`${API_URL}/courses/${courseId}/update/`, updatedData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    deleteCourse: async (courseId) => {
      return axios.delete(`${API_URL}/courses/${courseId}/delete/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    },
    assignTeacherToCourse: async (courseId, teacherId) => {
      return axios.patch(
        `${API_URL}/courses/${courseId}/assign-teacher/`,
        { teacher_id: teacherId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
    },
  },

  teacher: {
    // Course Management
    getCourses: () =>
      axiosInstance.get('/teacher/courses/'),
    getDetailedCourse: async (courseId) => {
      return axiosInstance.get(`/teacher/courses/${courseId}/detail/`);
    },

    // Topic Management
    createTopic: (courseId, data) =>
      axiosInstance.post(`/teacher/courses/${courseId}/topics/create/`, data),

    updateTopic: (courseId, topicId, data) =>
      axiosInstance.put(`/teacher/courses/${courseId}/topics/${topicId}/update/`, data),

    deleteTopic: (courseId, topicId) =>
      axiosInstance.delete(`/teacher/courses/${courseId}/topics/${topicId}/delete/`),

    // Lesson Management
    createLesson: async (courseId, topicId, lessonData) => {
      // Check if lessonData is already a FormData object
      let formData;
      if (lessonData instanceof FormData) {
        formData = lessonData;

        // Debug log
        console.log("Using provided FormData:");
        for (let pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }
      } else {
        // Create a new FormData if it's a regular object
        formData = new FormData();

        if (lessonData.title) formData.append("title", lessonData.title);
        if (lessonData.description) formData.append("description", lessonData.description);
        if (lessonData.order) formData.append("order", lessonData.order);

        // Handle different content types
        if (lessonData.contextual_help) {
          formData.append("contextual_help", lessonData.contextual_help);
        }
        if (lessonData.pdf) formData.append("pdf", lessonData.pdf);
        if (lessonData.video) formData.append("video", lessonData.video);
        if (Array.isArray(lessonData.external_links)) {
          formData.append("external_links", JSON.stringify(lessonData.external_links));
        }

        // Debug log
        console.log("Created new FormData:");
        for (let pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }
      }

      return axiosInstance.post(
        `/teacher/courses/${courseId}/topics/${topicId}/lessons/create/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    updateLesson: async (courseId, topicId, lessonId, formData) => {
      return axiosInstance.put(
        `/teacher/lessons/${lessonId}/update/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    deleteLesson: async (courseId, topicId, lessonId) => {
      return axiosInstance.delete(
        `/teacher/lessons/${lessonId}/delete/`
      );
    },
    fetchLessonsByCourse: async (courseId) => {
      return axiosInstance.get(`/courses/${courseId}/lessons/`);
    },

    // Quiz Management
    getQuiz: (courseId, topicId) =>
      axiosInstance.get(`/teacher/courses/${courseId}/topics/${topicId}/quiz/get/`),
    createQuiz: (courseId, topicId, data) =>
      axiosInstance.post(`/teacher/courses/${courseId}/topics/${topicId}/quiz/`, data),
    updateQuiz: (courseId, topicId, data) =>
      axiosInstance.put(`/teacher/courses/${courseId}/topics/${topicId}/quiz/update/`, data),
    deleteQuiz: (courseId, topicId) =>
      axiosInstance.delete(`/teacher/courses/${courseId}/topics/${topicId}/quiz/delete/`),
    getQuizStatistics: (courseId, topicId) =>
      axiosInstance.get(`/teacher/courses/${courseId}/topics/${topicId}/quiz/statistics/`),

    // Quiz Attempts
    getQuizAttempts: async (courseId, topicId) => {
      return axiosInstance.get(`/teacher/courses/${courseId}/topics/${topicId}/quiz/attempts/`);
    },

    startQuizAttempt: (quizId) =>
      axiosInstance.post(`/quizzes/${quizId}/start_attempt/`),

    getCurrentQuestion: (attemptId) =>
      axiosInstance.get(`/quiz-attempts/${attemptId}/current_question/`),

    submitQuizAnswer: (attemptId, selectedChoices) =>
      axiosInstance.post(`/quiz-attempts/${attemptId}/answer_question/`, {
        selected_choices: selectedChoices
      }),

    submitQuizAttempt: (attemptId) =>
      axiosInstance.post(`/quiz-attempts/${attemptId}/submit/`),

    checkQuizAvailability: async (topicId) => {
      return axiosInstance.get(`/topics/${topicId}/quiz-availability/`);
    }
  },
  student: {
    // Course Management
    fetchAvailableCourses: () =>
      axiosInstance.get('/courses/available/'),
    enrollInCourse: (courseId) =>
      axiosInstance.post(`/courses/${courseId}/enroll/`),
    fetchEnrolledCourses: () =>
      axiosInstance.get('/student/courses/'),
    unenrollFromCourse: (courseId) =>
      axiosInstance.post(`/courses/${courseId}/unenroll/`),
    getCourseProgress: (courseId) =>
      axiosInstance.get(`/student/courses/${courseId}/progress/`),
    getCourseDetails: (courseId) =>
      axiosInstance.get(`/courses/${courseId}/`),
    getTopics: (courseId) =>
      axiosInstance.get(`/courses/${courseId}/topics/`),
    getLessonDetails: (lessonId) =>
      axiosInstance.get(`/lessons/${lessonId}/`),

    // Quiz Management
    getQuizDetails: (courseId, topicId) => axiosInstance.get(`/courses/${courseId}/topics/${topicId}/quiz/get/`),
    startQuizAttempt: (quizId) => axiosInstance.post(`/quizzes/${quizId}/start_attempt/`),
    getCurrentQuestion: (attemptId) => axiosInstance.get(`/quiz-attempts/${attemptId}/current_question/`),
    submitAnswer: (attemptId, data) => axiosInstance.post(`/quiz-attempts/${attemptId}/answer/`, data),
    completeQuizAttempt: (attemptId) => axiosInstance.post(`/quiz-attempts/${attemptId}/submit/`),
    getQuizResults: (attemptId) => axiosInstance.get(`/quiz-attempts/${attemptId}/results/`),
  },
  progress: {
    // Get student progress for teachers
    getTeacherProgress: () => axiosInstance.get('/teacher/progress/'),
    // Get personal progress for students
    getStudentProgress: () => axiosInstance.get('/student/progress/'),
  },
  dashboard: {
    // Admin dashboard stats
    getAdminStats: () =>
      axiosInstance.get('/dashboard/stats/'),

    // Teacher dashboard stats
    getTeacherStats: () =>
      axiosInstance.get('/dashboard/stats/'),

    // Student dashboard stats
    getStudentStats: () =>
      axiosInstance.get('/dashboard/stats/'),

    // Get notifications
    getNotifications: () =>
      axiosInstance.get('/dashboard/notifications/'),
  },
};

// Error handling interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;