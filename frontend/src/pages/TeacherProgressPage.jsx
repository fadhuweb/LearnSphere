import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaBook, FaChartLine, FaCalendarAlt, FaCheck, FaTimes, FaSearch, FaSync, FaFilter, FaUserGraduate, FaChevronRight } from 'react-icons/fa';
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

      if (response.data && typeof response.data === 'object' && response.data.courses) {
        setCourses(response.data.courses);
        setStudents(response.data.students || []);

        if (response.data.message) {
          setErrorMessage(response.data.message);
        }
      } else {
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

  const filteredStudents = students.filter(student => {
    const name = student.name || student.username || '';
    const email = student.email || '';
    const username = student.username || '';

    const matchesSearch =
      username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = selectedCourse === 'all' ||
      student.courses.some(course => course.id.toString() === selectedCourse);

    return matchesSearch && matchesCourse;
  });

  const uniqueCourses = Array.isArray(courses) ? courses : [];

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-green-100 text-green-700 p-2 rounded-xl">
                <FaUserGraduate size={24} />
              </span>
              <span className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Academic Analytics</span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none">
              Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-green-700">Monitoring</span>
            </h1>
          </div>

          <button
            onClick={loadStudentProgress}
            className="group flex items-center justify-center gap-2 bg-white text-gray-900 py-4 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-sm hover:shadow-xl transition-all border border-gray-100 active:scale-95"
          >
            <FaSync className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </button>
        </div>

        {/* Show error message if any */}
        {errorMessage && (
          <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 p-6 rounded-[2rem] flex items-center gap-4 mb-10 shadow-sm">
            <div className="bg-amber-200 p-3 rounded-full">⚠️</div>
            <p className="font-bold">{errorMessage}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<FaGraduationCap className="text-blue-600" />}
            bgColor="bg-blue-50"
            title="Total Students"
            value={students.length}
            description="Active Learners"
          />
          <StatCard
            icon={<FaBook className="text-green-600" />}
            bgColor="bg-green-50"
            title="Active Courses"
            value={uniqueCourses.length}
            description="Courses Taught"
          />
          <StatCard
            icon={<FaChartLine className="text-purple-600" />}
            bgColor="bg-purple-50"
            title="Avg. Progress"
            value={`${Math.round(students.reduce((acc, student) => acc + (student.total_progress || 0), 0) / (students.length || 1))}%`}
            description="Class Completion"
          />
          <StatCard
            icon={<FaCalendarAlt className="text-rose-600" />}
            bgColor="bg-rose-50"
            title="Active Today"
            value={students.filter(student => isActiveRecently(student.last_active)).length}
            description="Last 3 Days"
          />
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 mb-10">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="relative flex-grow group">
              <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
              <input
                type="text"
                placeholder="Search students by name, email or ID..."
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative lg:w-72">
              <FaFilter className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 appearance-none shadow-sm cursor-pointer"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">All Academic Tracks</option>
                {uniqueCourses.map(course => (
                  <option key={course.id} value={course.id.toString()}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">In-Depth Student Performance</h2>
            <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {filteredStudents.length} Results
            </span>
          </div>

          {loading ? (
            <div className="p-20 text-center">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Processing Records...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaSearch className="text-gray-300 text-2xl" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">No Matching Records</h3>
              <p className="text-gray-500 font-medium italic">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Student Profile</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Enrolled In</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Curriculum Progress</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Engagement</th>
                    <th className="px-8 py-6 border-b border-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="group hover:bg-green-50/30 transition-colors">
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <span className="text-white font-black text-sm">
                              {(student.name || student.username).split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-black text-gray-900 leading-none mb-1">{student.name || student.username}</div>
                            <div className="text-[11px] font-bold text-gray-400">@{student.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {student.courses.length > 0 ? (
                            student.courses.map((course, idx) => (
                              <span key={idx} className="bg-white border border-gray-100 px-2 py-1 rounded-md text-[10px] font-bold text-gray-500 shadow-sm truncate">
                                {course.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-300 italic text-[11px]">No active tracks</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 min-w-[240px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                            {student.total_quizzes_passed}/{student.total_quizzes_taken} Quizzes
                          </span>
                          <span className="text-xs font-black text-green-600">{student.total_progress}%</span>
                        </div>
                        <ProgressBar
                          percentage={student.total_progress}
                          color={getProgressColor(student.total_progress)}
                          height="h-2"
                        />
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 mb-1">{formatDate(student.last_active)}</span>
                          {student.last_active && (
                            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest ${isActiveRecently(student.last_active) ? 'text-green-500' : 'text-gray-400'}`}>
                              {isActiveRecently(student.last_active) ? (
                                <><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span> Active Recently</>
                              ) : (
                                <><span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></span> Idle</>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="text-gray-300 group-hover:text-green-600 transition-colors p-2 rounded-xl hover:bg-white shadow-none hover:shadow-sm">
                          <FaChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Premium Stat Card
const StatCard = ({ icon, bgColor, title, value, description }) => (
  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex items-center group hover:shadow-xl transition-all duration-500">
    <div className={`${bgColor} p-5 rounded-2xl mr-6 group-hover:scale-110 transition-transform duration-500`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</div>
      <div className="text-3xl font-black text-gray-900 leading-none mb-1">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 italic">{description}</div>
    </div>
  </div>
);

// Helper function to determine progress bar color
const getProgressColor = (progress) => {
  if (progress < 30) return 'bg-rose-500';
  if (progress < 70) return 'bg-amber-500';
  return 'bg-green-500';
};

// Helper function to check activity
const isActiveRecently = (dateString) => {
  if (!dateString) return false;
  const now = new Date();
  const activeDate = new Date(dateString);
  const diffDays = Math.floor(Math.abs(now - activeDate) / (1000 * 60 * 60 * 24));
  return diffDays <= 3;
};

export default TeacherProgressPage;
