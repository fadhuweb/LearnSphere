teacher: {
  // ... your existing teacher methods ...
  
  createQuiz: (topicId, quizData) =>
    axios.post(`/api/teacher/courses/topics/${topicId}/quiz/`, quizData),
  
  updateQuiz: (quizId, quizData) =>
    axios.put(`/api/quizzes/${quizId}/`, quizData),
  
  getQuiz: (quizId) =>
    axios.get(`/api/quizzes/${quizId}/`),
  
  getQuizStatistics: (quizId) =>
    axios.get(`/api/quizzes/${quizId}/statistics/`),
}, 