import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';
import ProgressBar from '../components/ProgressBar';

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">My Enrolled Courses</h1>

      {courses.length === 0 ? (
        <div className="text-center text-gray-600">
          <p>You are not enrolled in any courses yet.</p>
          <Link to="/browse-courses" className="text-green-600 hover:text-green-700 underline mt-2 inline-block">
            Browse Available Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">{course.title}</h2>
                <p className="text-gray-600 mb-4">{course.description}</p>
                <div className="flex flex-col space-y-4">
                  <div className="text-sm text-gray-500">
                    <p>Teacher: {course.teacher_name}</p>
                    <p>Topics: {course.topic_count}</p>
                    <p>Quizzes: {course.quiz_count || 0}</p>

                    <div className="mt-2">
                      <ProgressBar percentage={course.progress} />
                    </div>
                    <p>Students: {course.enrolled_students_count}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Link
                      to={`/courses/${course.id}`}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                    >
                      View Course
                    </Link>
                    <button
                      onClick={() => handleUnenroll(course.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                    >
                      Unenroll
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EnrolledCourses;
