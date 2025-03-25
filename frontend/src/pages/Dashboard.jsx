import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  FaUserCog, FaBookOpen, FaChalkboardTeacher, FaGraduationCap, FaSearch, 
  FaClock, FaAward, FaChartLine, FaUsers, FaCheckCircle, FaExclamationCircle,
  FaBook, FaUserGraduate, FaCalendarAlt, FaBell
} from "react-icons/fa";
import api from '../api';

const Dashboard = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    // Admin stats
    totalUsers: 0,
    pendingApprovals: 0,
    activeCourses: 0,
    recentActivity: 0,
    
    // Teacher stats
    teachingCourses: 0,
    totalStudents: 0,
    averageScore: 0,
    upcomingDeadlines: 0,
    
    // Student stats
    enrolledCourses: 0,
    completedCourses: 0,
    averageProgress: 0,
    nextDeadline: "No upcoming deadlines"
  });

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data based on user role
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        // Fetch stats based on user role
        let statsResponse;
        if (user?.role === 'admin') {
          statsResponse = await api.dashboard.getAdminStats();
        } else if (user?.role === 'teacher') {
          statsResponse = await api.dashboard.getTeacherStats();
        } else if (user?.role === 'student') {
          statsResponse = await api.dashboard.getStudentStats();
        }

        if (statsResponse?.data) {
          setStats(prevStats => ({
            ...prevStats,
            ...statsResponse.data
          }));
        }

        // Fetch notifications
        const notificationsResponse = await api.dashboard.getNotifications();
        if (notificationsResponse?.data) {
          setNotifications(notificationsResponse.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, user?.role]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "green" }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`text-${color}-600 text-xl`} />
        </div>
        <div className="ml-4">
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const ActionCard = ({ icon: Icon, title, description, href, primary }) => (
    <a 
      href={href} 
      className={`dashboard-card group ${
        primary 
          ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" 
          : "bg-white hover:bg-green-50"
      }`}
    >
      <Icon className={`dashboard-icon ${primary ? "text-white" : "text-green-600 group-hover:text-green-700"}`} />
      <div>
        <h4 className={`font-semibold ${primary ? "text-white" : "text-gray-800"}`}>{title}</h4>
        <p className={`text-sm ${primary ? "text-green-100" : "text-gray-500 group-hover:text-green-600"}`}>
          {description}
        </p>
      </div>
    </a>
  );

  const NotificationCard = ({ title, time, type }) => (
    <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
      <div className={`p-2 rounded-full ${
        type === 'warning' ? 'bg-yellow-100' : type === 'success' ? 'bg-green-100' : 'bg-blue-100'
      }`}>
        <FaBell className={`${
          type === 'warning' ? 'text-yellow-600' : type === 'success' ? 'text-green-600' : 'text-blue-600'
        }`} />
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <FaExclamationCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-green-700">
                Welcome back, {user?.username}!
              </h2>
              <p className="text-gray-600 mt-1">
                <span className="font-medium">{user?.role?.toUpperCase()}</span>
                {stats.lastLogin && ` • Last login: ${new Date(stats.lastLogin).toLocaleString()}`}
              </p>
            </div>
            <div className="hidden sm:block">
              <img
                src={user?.avatar || "https://via.placeholder.com/60"}
                alt="Profile"
                className="w-16 h-16 rounded-full border-4 border-green-100"
              />
            </div>
          </div>
        </div>

        {/* Admin Section */}
        {user?.role === "admin" && (
          <>
            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={FaUsers}
                title="Total Users"
                value={stats.totalUsers}
                subtitle={`${stats.activeUsers || 0} active this month`}
              />
              <StatCard
                icon={FaExclamationCircle}
                title="Pending Approvals"
                value={stats.pendingApprovals}
                color="yellow"
              />
              <StatCard
                icon={FaBook}
                title="Active Courses"
                value={stats.activeCourses}
              />
              <StatCard
                icon={FaChartLine}
                title="Recent Activity"
                value={stats.recentActivity}
                subtitle="Past 24 hours"
              />
            </div>

            {/* Admin Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-green-600 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionCard
                    icon={FaUserCog}
                    title="Manage Users"
                    description="Oversee user accounts and permissions"
                    href="/admin/manage-users"
                    primary
                  />
                  <ActionCard
                    icon={FaBookOpen}
                    title="Manage Courses"
                    description="Create and modify course content"
                    href="/admin/manage-courses"
                  />
                  <ActionCard
                    icon={FaUserGraduate}
                    title="Teacher Management"
                    description="Manage teacher assignments"
                    href="/admin/manage-teachers"
                  />
                  <ActionCard
                    icon={FaCalendarAlt}
                    title="Academic Calendar"
                    description="Schedule and deadlines"
                    href="/admin/calendar"
                  />
                </div>
              </div>

              {/* Recent Notifications */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <NotificationCard
                        key={notification.id || index}
                        title={notification.title}
                        time={notification.time}
                        type={notification.type}
                      />
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No new notifications</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Teacher Section */}
        {user?.role === "teacher" && (
          <>
            {/* Teacher Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={FaChalkboardTeacher}
                title="Teaching Courses"
                value={stats.teachingCourses}
              />
              <StatCard
                icon={FaUserGraduate}
                title="Total Students"
                value={stats.totalStudents}
              />
              <StatCard
                icon={FaAward}
                title="Average Score"
                value={`${stats.averageScore || 0}%`}
              />
              <StatCard
                icon={FaClock}
                title="Upcoming Deadlines"
                value={stats.upcomingDeadlines}
                subtitle="Next 7 days"
              />
            </div>

            {/* Teacher Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Actions */}
              <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-green-600 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionCard
                    icon={FaBookOpen}
                    title="My Courses"
                    description="Manage your course content and materials"
                    href="/my-courses"
                    primary
                  />
                  <ActionCard
                    icon={FaGraduationCap}
                    title="Student Progress"
                    description="Track student performance and engagement"
                    href="/teacher-progress"
                  />
                  <ActionCard
                    icon={FaBook}
                    title="Course Materials"
                    description="Upload and manage learning resources"
                    href="/course-materials"
                  />
                  <ActionCard
                    icon={FaCalendarAlt}
                    title="Schedule"
                    description="Manage classes and deadlines"
                    href="/schedule"
                  />
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <NotificationCard
                        key={notification.id || index}
                        title={notification.title}
                        time={notification.time}
                        type={notification.type}
                      />
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No new notifications</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Student Section */}
        {user?.role === "student" && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={FaBookOpen}
                title="Enrolled Courses"
                value={stats.enrolledCourses}
              />
              <StatCard
                icon={FaAward}
                title="Completed"
                value={stats.completedCourses}
              />
              <StatCard
                icon={FaChartLine}
                title="Average Progress"
                value={`${stats.averageProgress || 0}%`}
              />
              <StatCard
                icon={FaClock}
                title="Next Deadline"
                value={stats.nextDeadline}
              />
            </div>

            {/* Student Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Actions */}
              <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-green-600 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionCard
                    icon={FaSearch}
                    title="Browse Courses"
                    description="Discover new learning opportunities"
                    href="/browse-courses"
                    primary
                  />
                  <ActionCard
                    icon={FaBookOpen}
                    title="My Courses"
                    description="Access your enrolled courses"
                    href="/enrolled-courses"
                  />
                  <ActionCard
                    icon={FaGraduationCap}
                    title="Learning Progress"
                    description="Track your achievements"
                    href="/progress"
                  />
                  <ActionCard
                    icon={FaCalendarAlt}
                    title="Schedule"
                    description="View upcoming deadlines"
                    href="/schedule"
                  />
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <NotificationCard
                        key={notification.id || index}
                        title={notification.title}
                        time={notification.time}
                        type={notification.type}
                      />
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No new notifications</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Notifications Section - Common for all roles */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <NotificationCard
                  key={notification.id || index}
                  title={notification.title}
                  time={notification.time}
                  type={notification.type}
                />
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No new notifications</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
