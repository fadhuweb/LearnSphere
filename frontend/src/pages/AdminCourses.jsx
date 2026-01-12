import React, { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../context/AuthContext";
import { FaEdit, FaTrash, FaUserPlus, FaTimes, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

const AdminCourses = () => {
  const { token } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // removed newCourse state
  const [editCourse, setEditCourse] = useState(null);
  const [teacherInputs, setTeacherInputs] = useState({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: ""
    }
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.admin.fetchCourses();
      setCourses(res.data || []);
    } catch (error) {
      console.error("Error fetching courses", error);
      setError(error.message || "Failed to load courses");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (data) => {
    try {
      // setLoading(true); // handled by isSubmitting
      await api.admin.createCourse(data);
      reset();
      toast.success("Course created successfully");
      await loadCourses();
    } catch (error) {
      console.error("Error creating course", error);
      toast.error(error.message || "Failed to create course");
    } finally {
      // setLoading(false);
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editCourse) return;
    try {
      setLoading(true);
      await api.admin.updateCourse(editCourse.id, editCourse);
      setEditCourse(null);
      toast.success("Course updated successfully");
      await loadCourses();
    } catch (error) {
      console.error("Error updating course", error);
      toast.error(error.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    try {
      setLoading(true);
      await api.admin.deleteCourse(courseId);
      toast.success("Course deleted successfully");
      await loadCourses();
    } catch (error) {
      console.error("Error deleting course", error);
      toast.error(error.message || "Failed to delete course");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (courseId) => {
    const teacherData = teacherInputs[courseId] || {};
    if (!teacherData.id || !teacherData.name) {
      toast.error("Please enter both teacher ID and name.");
      return;
    }
    try {
      setLoading(true);
      await api.admin.assignTeacherToCourse(courseId, teacherData.id);
      setTeacherInputs({ ...teacherInputs, [courseId]: { id: "", name: "" } });
      toast.success("Teacher assigned successfully");
      await loadCourses();
    } catch (error) {
      console.error("Error assigning teacher", error);
      toast.error(error.message || "Failed to assign teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherInputChange = (courseId, field, value) => {
    setTeacherInputs({
      ...teacherInputs,
      [courseId]: { ...teacherInputs[courseId], [field]: value },
    });
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-green-700 mb-8 text-center">
        Course Management
      </h1>

      {/* Add New Course Form */}
      <div className="w-full max-w-2xl">
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-semibold text-green-600 mb-4 text-center">
            Add New Course
          </h2>
          <form onSubmit={handleSubmit(handleCreateCourse)} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Course Title"
                className={`w-full p-3 border rounded-md focus:ring focus:ring-green-300 ${errors.title ? 'border-red-500' : ''}`}
                {...register("title")}
                disabled={isSubmitting || loading}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <textarea
                placeholder="Course Description"
                className={`w-full p-3 border rounded-md focus:ring focus:ring-green-300 ${errors.description ? 'border-red-500' : ''}`}
                {...register("description")}
                disabled={isSubmitting || loading}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isSubmitting || loading}
            >
              {(isSubmitting || loading) ? <FaSpinner className="animate-spin" /> : null}
              Create Course
            </button>
          </form>
        </div>
      </div>

      {/* Course List */}
      <div className="mt-12 bg-white p-6 rounded-lg shadow-lg border w-full max-w-6xl">
        <h2 className="text-3xl font-semibold text-green-700 mb-6 text-center">
          Existing Courses
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading courses...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadCourses}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No courses available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-green-50 p-6 rounded-lg shadow-lg border border-green-300 transition hover:shadow-2xl"
              >
                {editCourse?.id === course.id ? (
                  <form onSubmit={handleUpdateCourse} className="space-y-4">
                    <input
                      type="text"
                      className="w-full p-2 border rounded-md"
                      value={editCourse.title}
                      onChange={(e) => setEditCourse({ ...editCourse, title: e.target.value })}
                      required
                    />
                    <textarea
                      className="w-full p-2 border rounded-md"
                      value={editCourse.description}
                      onChange={(e) => setEditCourse({ ...editCourse, description: e.target.value })}
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex-1"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditCourse(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-green-700">{course.title}</h3>
                    <p className="text-gray-600 mt-2">{course.description}</p>

                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => setEditCourse(course)}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-yellow-600 transition-all"
                        disabled={loading}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-red-600 transition-all"
                        disabled={loading}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>

                    {/* Teacher Assignment Fields */}
                    <div className="mt-4 space-y-2">
                      <input
                        type="text"
                        placeholder="Teacher Name"
                        className="border p-2 rounded-md w-full text-center"
                        value={teacherInputs[course.id]?.name || ""}
                        onChange={(e) => handleTeacherInputChange(course.id, "name", e.target.value)}
                        disabled={loading}
                      />
                      <input
                        type="text"
                        placeholder="Teacher ID"
                        className="border p-2 rounded-md w-full text-center"
                        value={teacherInputs[course.id]?.id || ""}
                        onChange={(e) => handleTeacherInputChange(course.id, "id", e.target.value)}
                        disabled={loading}
                      />
                      <button
                        onClick={() => handleAssignTeacher(course.id)}
                        className="w-full bg-blue-500 text-white p-2 rounded-md flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                        Assign Teacher
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;