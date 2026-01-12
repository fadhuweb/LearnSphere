import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { FaExclamationCircle, FaUserCircle } from "react-icons/fa";
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

// Role-specific overview components
import AdminOverview from "../components/dashboard/AdminOverview";
import TeacherOverview from "../components/dashboard/TeacherOverview";
import StudentOverview from "../components/dashboard/StudentOverview";

const Dashboard = () => {
  const { user, token } = useContext(AuthContext);

  // Fetch Stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['dashboard', 'stats', user?.role],
    queryFn: async () => {
      if (!user?.role) return null;
      let response;
      if (user.role === 'admin') {
        response = await api.dashboard.getAdminStats();
      } else if (user.role === 'teacher') {
        response = await api.dashboard.getTeacherStats();
      } else if (user.role === 'student') {
        response = await api.dashboard.getStudentStats();
      }
      return response?.data || {};
    },
    enabled: !!token && !!user?.role,
  });

  // Fetch Notifications
  const {
    data: notifications = [],
    isLoading: notificationsLoading
  } = useQuery({
    queryKey: ['dashboard', 'notifications'],
    queryFn: async () => {
      const response = await api.dashboard.getNotifications();
      return response?.data || [];
    },
    enabled: !!token,
  });

  if (statsLoading || notificationsLoading) return <LoadingSpinner />;

  if (statsError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md animate-fade-in shadow-2xl border-none">
          <div className="p-4 bg-red-50 rounded-full w-fit mx-auto mb-6">
            <FaExclamationCircle className="text-red-500 text-5xl" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Service Interruption</h2>
          <p className="text-gray-500 font-medium mb-8">
            We're having trouble reaching the analytics server. Please try again in a few moments.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Fallback defaults for safety
  const safeStats = {
    totalUsers: stats?.totalUsers || 0,
    activeUsers: stats?.activeUsers || 0,
    pendingApprovals: stats?.pendingApprovals || 0,
    activeCourses: stats?.activeCourses || 0,
    recentActivity: stats?.recentActivity || 0,
    teachingCourses: stats?.teachingCourses || 0,
    totalStudents: stats?.totalStudents || 0,
    averageScore: stats?.averageScore || 0,
    upcomingDeadlines: stats?.upcomingDeadlines || 0,
    enrolledCourses: stats?.enrolledCourses || 0,
    completedCourses: stats?.completedCourses || 0,
    averageProgress: stats?.averageProgress || 0,
    nextDeadline: stats?.nextDeadline || 'No upcoming deadlines',
    totalQuizzes: stats?.totalQuizzes || 0,
    quizzesPassed: stats?.quizzesPassed || 0,
    lastLogin: stats?.lastLogin
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Modern Header Interface */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                {user?.role} Portal
              </span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Hello, <span className="text-green-600">{user?.username}</span>
            </h1>
            <p className="text-gray-400 font-bold tracking-tight">
              {safeStats.lastLogin
                ? `System Session: ${new Date(safeStats.lastLogin).toLocaleDateString()} @ ${new Date(safeStats.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : "Welcome to your personalized learning workspace."}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl shadow-xl glass-card border-none hover-scale cursor-pointer">
            {user?.avatar ? (
              <img
                src={user?.avatar}
                alt="Profile"
                className="w-14 h-14 rounded-xl object-cover border-2 border-green-50 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
                {user?.username?.[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-black text-gray-800 uppercase tracking-tighter">{user?.username}</p>
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active Member</p>
            </div>
          </div>
        </header>

        {/* Dynamic Role-Based Content */}
        <main className="relative z-10 transition-all duration-500">
          {user?.role === "admin" && <AdminOverview stats={safeStats} notifications={notifications} />}
          {user?.role === "teacher" && <TeacherOverview stats={safeStats} notifications={notifications} />}
          {user?.role === "student" && <StudentOverview stats={safeStats} notifications={notifications} />}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
