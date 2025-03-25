import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard"
import Dashboard from "./pages/Dashboard"
import ManageUsers from "./pages/ManageUsers"
import AdminCourses from "./pages/AdminCourses";
import TeacherCourses from "./pages/TeacherCourses";
import EnrolledCourses from "./pages/EnrolledCourses";
import CourseDetails from "./pages/CourseDetails";
import QuizAttempt from './pages/QuizAttempt';
import TeacherProgressPage from './pages/TeacherProgressPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BrowseCourses from './pages/BrowseCourses';

function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-green-600 text-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">EduPlatform</h1>
          <div className="space-x-6">
            <Link to="/" className="hover:text-gray-300 transition">Home</Link>
            {!user ? (
              <>
                <Link to="/login" className="hover:text-gray-300 transition">Login</Link>
                <Link to="/register" className="hover:text-gray-300 transition">Register</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="hover:text-gray-300 transition">Dashboard</Link>
                {user.role === 'student' && (
                  <>
                    <Link to="/enrolled-courses" className="hover:text-gray-300 transition">My Courses</Link>
                    <Link to="/browse-courses" className="hover:text-gray-300 transition">Browse Courses</Link>
                  </>
                )}
                <button onClick={logout} className="bg-red-500 px-4 py-2 rounded text-white hover:bg-red-600 transition">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="flex-grow flex items-center justify-center p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
          <Route path="/admin/manage-users" element={<ProtectedRoute element={<ManageUsers />} />} />
          <Route path="/admin/manage-courses" element={<ProtectedRoute element={<AdminCourses />} />} />
          <Route path="/my-courses" element={<ProtectedRoute element={<TeacherCourses />} />} />
          <Route path="/browse-courses" element={<ProtectedRoute element={<BrowseCourses />} />} />
          <Route path="/enrolled-courses" element={<ProtectedRoute element={<EnrolledCourses />} />} />
          <Route path="/courses/:courseId" element={<ProtectedRoute element={<CourseDetails />} />} />
          <Route path="/quiz/:quizId/attempt" element={<QuizAttempt />} />
          <Route path="/teacher-progress" element={<ProtectedRoute element={<TeacherProgressPage />} />} />
          {/* Add a redirect for '/courses' to '/enrolled-courses' */}
          <Route path="/courses" element={<Navigate replace to="/enrolled-courses" />} />
        </Routes>
      </div>

      {/* Footer */}
      <footer className="bg-green-700 text-white text-center p-3">
        &copy; {new Date().getFullYear()} EduPlatform. All Rights Reserved.
      </footer>

      {/* Add ToastContainer at the root level */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;
