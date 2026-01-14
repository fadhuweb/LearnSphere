import React, { useState, useEffect } from 'react';
import api from '../api';
import { FaChalkboardTeacher, FaUsers, FaBook, FaSearch, FaChevronRight, FaGraduationCap } from 'react-icons/fa';
import { toast } from 'react-toastify';

const BrowseCourses = () => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      const response = await api.student.fetchAvailableCourses();
      setAvailableCourses(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to fetch available courses');
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      await api.student.enrollInCourse(courseId);
      // Refresh the course list
      fetchAvailableCourses();
      toast.success('🎉 Successfully enrolled in the course!');
    } catch (err) {
      console.error('Error enrolling:', err);
      toast.error('Failed to enroll. Please try again.');
    }
  };

  const filteredCourses = availableCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-green-100 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          <p className="mt-6 text-gray-500 font-bold uppercase tracking-widest text-[10px] text-center">Loading Knowledge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px]">
      {/* Premium Header Section */}
      <div className="bg-white border-b border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-green-50 rounded-full blur-3xl opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-100 text-green-700 p-2 rounded-xl">
                  <FaGraduationCap size={24} />
                </span>
                <span className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Student Center</span>
              </div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
                Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-green-700">Courses</span>
              </h1>
              <p className="text-gray-500 text-lg max-w-xl font-medium">
                Master new skills with our industry-leading courses. Find the perfect path for your learning journey today.
              </p>
            </div>

            <div className="relative group w-full lg:w-96">
              <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by title or topic..."
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-[2rem] font-bold text-gray-700 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-dashed border-gray-100 p-20 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaBook className="text-3xl text-gray-300" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 font-medium">We couldn't find any courses matching your search. Try a broader term?</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-6 text-green-600 font-black uppercase tracking-widest text-[10px] hover:underline"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 flex flex-col h-full"
              >
                {/* Course Header Decoration */}
                <div className="h-32 bg-gradient-to-br from-green-400 to-green-600 relative overflow-hidden p-6 flex flex-col justify-end">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full decoration-none"></div>
                  <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-black opacity-5 rounded-full decoration-none"></div>
                  <span className="relative z-10 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase self-start">
                    {course.topics_count} Topics
                  </span>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-gray-500 font-medium text-sm line-clamp-3 mb-6 flex-grow">
                    {course.description}
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-2xl">
                      <div className="bg-white p-2 rounded-lg shadow-sm text-green-500">
                        <FaChalkboardTeacher />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Instructor</p>
                        <p className="font-bold">{course.teacher?.name || 'Academic Team'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <FaUsers className="text-green-500 opacity-70" />
                        <span>{course.enrolled_students || 0} LearnSphere Students</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        <span>{course.quiz_count || 0} Quizzes</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEnroll(course.id)}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-green-600 active:scale-95 transition-all"
                  >
                    Enroll Now <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseCourses;