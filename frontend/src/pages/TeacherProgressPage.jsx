import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaBook, FaChartLine, FaCalendarAlt, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';
import api from '../api';
import ProgressBar from '../components/ProgressBar';

const TeacherProgressPage = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [courses, setCourses] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadStudentProgress();
  }, []);

  const loadStudentProgress = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.progress.getTeacherProgress();

      // Check if we got the new response format
      if (response.data && typeof response.data === 'object' && response.data.courses) {
        setCourses(response.data.courses);
        setStudents(response.data.students || []);

        // Set error message if provided
        if (response.data.message) {
          setErrorMessage(response.data.message);
        }
      } else {
        // Handle old response format (just an array of students)
        setStudents(response.data || []);
      }
    } catch (error) {
      console.error('Error loading student progress:', error);
      toast.error('Failed to load student progress data');
      setErrorMessage('Failed to load progress data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search term and selected course
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = selectedCourse === 'all' ||
      student.courses.some(course => course.id.toString() === selectedCourse);

    return matchesSearch && matchesCourse;
  });

  // Get unique course list for filter dropdown
  const uniqueCourses = Array.isArray(courses) ? courses : [];

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          <FaGraduationCap className="inline-block mr-2 text-green-600" />
          Student Progress Monitoring
        </h1>
        <button
          onClick={loadStudentProgress}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
          Refresh Data
        </button>
      </div>

      {/* Show error message if any */}
      {errorMessage && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}

      {/* Filters section */}
      {courses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center w-full md:w-1/2">
              <div className="relative w-full">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, username or email..."
                  className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-1/3">
              <select
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">All Courses</option>
                {uniqueCourses.map(course => (
                  <option key={course.id} value={course.id.toString()}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FaGraduationCap className="text-2xl text-blue-500" />}
            title="Total Students"
            value={students.length}
            description="Students enrolled in your courses"
          />

          <StatCard
            icon={<FaBook className="text-2xl text-green-500" />}
            title="Total Courses"
            value={uniqueCourses.length}
            description="Courses you are teaching"
          />

          <StatCard
            icon={<FaChartLine className="text-2xl text-purple-500" />}
            title="Avg. Completion Rate"
            value={`${Math.round(students.reduce((acc, student) => acc + student.total_progress, 0) / (students.length || 1))}%`}
            description="Average course completion rate"
          />

          <StatCard
            icon={<FaCalendarAlt className="text-2xl text-red-500" />}
            title="Active Today"
            value={students.filter(student => isActiveRecently(student.last_active)).length}
            description="Students active in last 3 days"
          />
        </div>
      )}

      {/* Student Progress List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <h2 className="text-xl font-semibold p-4 bg-gray-100 border-b">Student Progress List</h2>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading student data...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {courses.length > 0
              ? "No students are enrolled in your courses yet."
              : "You don't have any courses assigned. Please contact an administrator."}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || selectedCourse !== 'all'
              ? 'No students match your search criteria'
              : 'No students enrolled in your courses yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-800 font-medium">{student.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name || student.username}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {student.courses.length > 0
                          ? student.courses.map(course => course.title).join(', ')
                          : 'No courses'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full">
                          <ProgressBar
                            percentage={student.total_progress}
                            color={getProgressColor(student.total_progress)}
                            height="h-2.5"
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-700">{student.total_progress}%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {student.total_quizzes_passed} of {student.total_quizzes_taken} quizzes passed
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center">
                          <span className="mr-2">Attempts:</span>
                          <span className="font-medium">{student.total_quizzes_taken}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">Pass rate:</span>
                          <span className="font-medium">
                            {student.total_quizzes_taken > 0
                              ? `${Math.round((student.total_quizzes_passed / student.total_quizzes_taken) * 100)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">Avg. score:</span>
                          <span className="font-medium">
                            {student.total_quizzes_taken > 0
                              ? `${student.avg_quiz_score}%`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{formatDate(student.last_active)}</div>
                      {student.last_active && (
                        <div className="text-xs text-gray-500">
                          {isActiveRecently(student.last_active)
                            ? <span className="text-green-600 flex items-center"><FaCheck className="mr-1" /> Recently active</span>
                            : <span className="text-gray-500 flex items-center"><FaTimes className="mr-1" /> Not recently active</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

// Helper component for stats cards
const StatCard = ({ icon, title, value, description }) => (
  <div className="bg-white rounded-lg shadow p-6 flex items-start">
    <div className="p-3 rounded-full bg-gray-100 mr-4">
      {icon}
    </div>
    <div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium text-gray-800">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  </div>
);

// Helper function to determine progress bar color
const getProgressColor = (progress) => {
  if (progress < 30) return 'bg-red-500';
  if (progress < 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

// Helper function to check if student was active recently (within 3 days)
const isActiveRecently = (dateString) => {
  if (!dateString) return false;

  const now = new Date();
  const activeDate = new Date(dateString);
  const diffTime = Math.abs(now - activeDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= 3; // Active within last 3 days
};

export default TeacherProgressPage;
