import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import ProgressBar from '../components/ProgressBar';
import { FaBookOpen, FaAward, FaSignOutAlt, FaRocket, FaChevronRight } from 'react-icons/fa';

function EnrolledCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const response = await api.student.fetchEnrolledCourses();
      setCourses(response.data);
    } catch (error) {
      toast.error('Failed to fetch enrolled courses');
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to unenroll from this course? Your progress will be lost.')) return;

    try {
      await api.student.unenrollFromCourse(courseId);
      toast.success('Successfully unenrolled from course');
      fetchEnrolledCourses(); // Refresh the list
    } catch (error) {
      toast.error('Failed to unenroll from course');
      console.error('Error unenrolling from course:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full mb-6">
            <FaRocket className="animate-bounce" />
            <span className="text-xs font-black uppercase tracking-widest">Your Learning Path</span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4">
            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Courses</span>
          </h1>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            Pick up right where you left off. Every lesson takes you one step closer to mastery.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-16 shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <FaBookOpen className="text-4xl text-gray-300" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">No Active Enrollments</h2>
            <p className="text-gray-500 font-medium mb-10 leading-relaxed">
              You haven't joined any courses yet. Explore our catalog to find your next favorite subject!
            </p>
            <Link
              to="/browse-courses"
              className="inline-flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 hover:shadow-2xl transition-all active:scale-95"
            >
              Start Browsing <FaChevronRight />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {courses.map((course) => (
              <div key={course.id} className="group bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="p-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <span className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                      <FaAward size={20} />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {course.progress === 100 ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </h2>
                  <p className="text-gray-500 font-medium text-sm line-clamp-2 mb-8">
                    {course.description}
                  </p>

                  <div className="mt-auto space-y-6">
                    <div className="bg-gray-50 rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Progress</span>
                        <span className="text-sm font-black text-indigo-600">{Math.round(course.progress)}%</span>
                      </div>
                      <ProgressBar percentage={course.progress} />
                    </div>

                    <div className="flex gap-4">
                      <Link
                        to={`/courses/${course.id}`}
                        className="flex-grow flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
                      >
                        Continue <FaChevronRight size={10} />
                      </Link>
                      <button
                        onClick={() => handleUnenroll(course.id)}
                        className="p-4 bg-gray-100 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                        title="Unenroll"
                      >
                        <FaSignOutAlt />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EnrolledCourses;
