import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../../api";

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  // Fetch all courses
  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses/`);
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // Fetch all teachers (only users with role 'teacher')
  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users/`);
      const teacherList = response.data.filter((user) => user.role === "teacher");
      setTeachers(teacherList);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  // Handle course creation
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/courses/create/`, newCourse);
      fetchCourses(); // Refresh course list
      setNewCourse({ title: "", description: "" });
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  // Handle course assignment to teacher
  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedTeacher) {
      alert("Please select a course and a teacher.");
      return;
    }
    try {
      await axios.post(`${API_URL}/courses/${selectedCourse}/assign-teacher/`, {
        teacher_id: selectedTeacher,
      });
      alert("Teacher assigned successfully!");
      setSelectedCourse(null);
      setSelectedTeacher("");
    } catch (error) {
      console.error("Error assigning teacher:", error);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Manage Courses</h2>

      {/* Create Course Form */}
      <div className="bg-white shadow-md p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-green-600">Create a New Course</h3>
        <form onSubmit={handleCreateCourse} className="space-y-4 mt-4">
          <input
            type="text"
            placeholder="Course Title"
            className="w-full p-2 border rounded"
            value={newCourse.title}
            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Course Description"
            className="w-full p-2 border rounded"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
            required
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Create Course
          </button>
        </form>
      </div>

      {/* Assign Teacher to Course */}
      <div className="bg-white shadow-md p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-green-600">Assign Teacher to a Course</h3>
        <form onSubmit={handleAssignTeacher} className="space-y-4 mt-4">
          <select
            className="w-full p-2 border rounded"
            value={selectedCourse || ""}
            onChange={(e) => setSelectedCourse(e.target.value)}
            required
          >
            <option value="">Select a Course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <select
            className="w-full p-2 border rounded"
            value={selectedTeacher || ""}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            required
          >
            <option value="">Select a Teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.username}
              </option>
            ))}
          </select>

          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Assign Teacher
          </button>
        </form>
      </div>

      {/* Course List */}
      <h3 className="text-lg font-semibold text-green-600 mb-2">Existing Courses</h3>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-green-600 text-white">
            <th className="p-2 border">Course Title</th>
            <th className="p-2 border">Assigned Teacher</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id} className="text-center border">
              <td className="p-2 border">{course.title}</td>
              <td className="p-2 border">{course.teacher?.username || "Not Assigned"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageCourses;
