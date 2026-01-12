import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingSpinner from "./components/LoadingSpinner";
import Navbar from "./components/Navbar";

// Lazy-loaded components
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ManageUsers = lazy(() => import("./pages/ManageUsers"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const TeacherCourses = lazy(() => import("./pages/TeacherCourses"));
const EnrolledCourses = lazy(() => import("./pages/EnrolledCourses"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const QuizAttempt = lazy(() => import('./pages/QuizAttempt'));
const TeacherProgressPage = lazy(() => import('./pages/TeacherProgressPage'));
const BrowseCourses = lazy(() => import('./pages/BrowseCourses'));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));

function App() {
  return (
    <div className="bg-white min-h-screen flex flex-col pt-16">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-0 md:p-6 overflow-x-hidden">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
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
            <Route path="/courses" element={<Navigate replace to="/enrolled-courses" />} />
          </Routes>
        </Suspense>
      </main>

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
