import React, { useState, useEffect } from "react";
import { api } from "../api";
import { toast } from "react-toastify"; // Assuming you're using react-toastify for notifications

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState({
    users: false,
    courses: false,
    actions: false
  });

  useEffect(() => {
    loadUsers();
    loadCourses();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      const res = await api.user.fetchUsers();
      setUsers(res.data);
    } catch (error) {
      toast.error("Failed to fetch users: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(prev => ({ ...prev, courses: true }));
      const res = await api.course.fetchCourses();
      setCourses(res.data);
    } catch (error) {
      toast.error("Failed to fetch courses: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, courses: false }));
    }
  };

  const handleApproveUser = async (id) => {
    try {
      setLoading(prev => ({ ...prev, actions: true }));
      await api.user.approveUser(id);
      toast.success("User approved successfully");
      await loadUsers();
    } catch (error) {
      toast.error("Failed to approve user: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, actions: false }));
    }
  };

  const handleSuspendUser = async (id) => {
    try {
      setLoading(prev => ({ ...prev, actions: true }));
      await api.user.suspendUser(id);
      toast.success("User suspended successfully");
      await loadUsers();
    } catch (error) {
      toast.error("Failed to suspend user: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, actions: false }));
    }
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    
    try {
      setLoading(prev => ({ ...prev, actions: true }));
      await api.user.removeUser(id);
      toast.success("User removed successfully");
      await loadUsers();
    } catch (error) {
      toast.error("Failed to remove user: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, actions: false }));
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, actions: true }));
      await api.course.createCourse(newCourse);
      toast.success("Course created successfully");
      setNewCourse({ title: "", description: "" });
      await loadCourses();
    } catch (error) {
      toast.error("Failed to create course: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, actions: false }));
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    try {
      setLoading(prev => ({ ...prev, actions: true }));
      await api.course.deleteCourse(id);
      toast.success("Course deleted successfully");
      await loadCourses();
    } catch (error) {
      toast.error("Failed to delete course: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, actions: false }));
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-green-700 mb-6">Admin Dashboard</h1>

      {/* USER MANAGEMENT */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">User Management</h2>
        {loading.users ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center">No users found</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex justify-between p-2 border-b items-center">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-sm text-gray-600">{user.role}</p>
              </div>
              <div className="space-x-2">
                <button 
                  onClick={() => handleApproveUser(user.id)} 
                  disabled={loading.actions}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleSuspendUser(user.id)} 
                  disabled={loading.actions}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Suspend
                </button>
                <button 
                  onClick={() => handleRemoveUser(user.id)} 
                  disabled={loading.actions}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* COURSE MANAGEMENT */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">Course Management</h2>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="Course Title"
            className="p-2 border rounded w-1/3 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={newCourse.title}
            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Course Description"
            className="p-2 border rounded w-1/3 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
          />
          <button 
            onClick={handleCreateCourse} 
            disabled={loading.actions}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            Add Course
          </button>
        </div>

        {loading.courses ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-gray-500 text-center">No courses found</p>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="flex justify-between p-2 border-b items-center">
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-sm text-gray-600">{course.description}</p>
              </div>
              <div className="space-x-2">
                <button 
                  onClick={() => handleDeleteCourse(course.id)} 
                  disabled={loading.actions}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;