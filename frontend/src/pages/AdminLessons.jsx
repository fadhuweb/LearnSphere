import React, { useState, useEffect, useContext } from "react";
import { fetchLessonsByCourse, createLesson, updateLesson, deleteLesson } from "../api";
import { AuthContext } from "../context/AuthContext";
import { FaEdit, FaTrash } from "react-icons/fa";

const AdminLessons = () => {
  const { token } = useContext(AuthContext);
  const [lessons, setLessons] = useState([]);
  const [newLesson, setNewLesson] = useState({ title: "", content: "", course: "" });
  const [editLesson, setEditLesson] = useState(null);

  // ✅ Load lessons on mount
  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const res = await fetchLessons(token);
      setLessons(res.data);
    } catch (error) {
      console.error("Error fetching lessons", error);
    }
  };

  // ✅ Create a new lesson
  const handleCreateLesson = async (e) => {
    e.preventDefault();
    try {
      await createLesson(token, newLesson);
      setNewLesson({ title: "", content: "", course: "" });
      loadLessons();
    } catch (error) {
      console.error("Error creating lesson", error);
    }
  };

  // ✅ Update a lesson
  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    if (!editLesson) return;
    try {
      await updateLesson(token, editLesson.id, editLesson);
      setEditLesson(null);
      loadLessons();
    } catch (error) {
      console.error("Error updating lesson", error);
    }
  };

  // ✅ Delete a lesson
  const handleDeleteLesson = async (lessonId) => {
    try {
      await deleteLesson(token, lessonId);
      loadLessons();
    } catch (error) {
      console.error("Error deleting lesson", error);
    }
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-green-700 mb-8 text-center">
        Lesson Management
      </h1>

      {/* ✅ Lesson Form */}
      <div className="w-full max-w-2xl">
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-semibold text-green-600 mb-4 text-center">
            {editLesson ? "Edit Lesson" : "Add New Lesson"}
          </h2>
          <form onSubmit={editLesson ? handleUpdateLesson : handleCreateLesson} className="space-y-4">
            <input
              type="text"
              placeholder="Lesson Title"
              className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
              value={editLesson ? editLesson.title : newLesson.title}
              onChange={(e) =>
                editLesson
                  ? setEditLesson({ ...editLesson, title: e.target.value })
                  : setNewLesson({ ...newLesson, title: e.target.value })
              }
              required
            />
            <textarea
              placeholder="Lesson Content"
              className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
              value={editLesson ? editLesson.content : newLesson.content}
              onChange={(e) =>
                editLesson
                  ? setEditLesson({ ...editLesson, content: e.target.value })
                  : setNewLesson({ ...newLesson, content: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Course ID"
              className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
              value={editLesson ? editLesson.course : newLesson.course}
              onChange={(e) =>
                editLesson
                  ? setEditLesson({ ...editLesson, course: e.target.value })
                  : setNewLesson({ ...newLesson, course: e.target.value })
              }
              required
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition-all"
            >
              {editLesson ? "Update Lesson" : "Create Lesson"}
            </button>
          </form>
        </div>
      </div>

      {/* ✅ Lessons List */}
      <div className="mt-12 bg-white p-6 rounded-lg shadow-lg border w-full max-w-6xl">
        <h2 className="text-3xl font-semibold text-green-700 mb-6 text-center">Existing Lessons</h2>
        {lessons.length === 0 ? (
          <p className="text-gray-500 text-center">No lessons available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white shadow-lg rounded-lg">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Course ID</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b hover:bg-gray-100">
                    <td className="p-3 text-gray-700">{lesson.id}</td>
                    <td className="p-3 font-semibold text-gray-800">{lesson.title}</td>
                    <td className="p-3 text-gray-700">{lesson.course}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => setEditLesson(lesson)}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-yellow-600 transition-all"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-red-600 transition-all"
                      >
                        <FaTrash /> Delete
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
  );
};

export default AdminLessons;
