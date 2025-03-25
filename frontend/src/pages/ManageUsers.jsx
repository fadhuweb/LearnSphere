import React, { useState, useEffect } from "react";
import { api } from "../api";
import { toast } from "react-toastify"; // Add this if you want toast notifications

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.admin.fetchUsers();
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users", error);
      toast.error("Failed to load users"); // Optional: add toast notification
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action, userId) => {
    try {
      setLoading(true);
      let updatedUser = null;

      switch (action) {
        case "approve":
          await api.admin.approveUser(userId);
          toast.success("User approved successfully");
          break;

        case "suspend":
          await api.admin.suspendUser(userId);
          updatedUser = { ...users.find((u) => u.id === userId), is_suspended: true };
          toast.success("User suspended successfully");
          break;

        case "reactivate":
          await api.admin.reactivateUser(userId);
          updatedUser = { ...users.find((u) => u.id === userId), is_suspended: false };
          toast.success("User reactivated successfully");
          break;

        case "remove":
          await api.admin.removeUser(userId);
          setUsers(users.filter((user) => user.id !== userId));
          toast.success("User removed successfully");
          return;

        default:
          console.error("Unknown action:", action);
          return;
      }

      if (updatedUser) {
        setUsers(users.map((user) => (user.id === userId ? updatedUser : user)));
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error.response?.data || error.message);
      toast.error(`Failed to ${action} user`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-green-700 mb-8">User Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-lg border w-full max-w-4xl">
        <h2 className="text-2xl font-semibold text-green-600 mb-4 text-center">Manage Users</h2>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white shadow-lg rounded-lg">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Username</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-100">
                    <td className="p-3 text-gray-700">{user.id}</td>
                    <td className="p-3 font-semibold text-gray-800">{user.username}</td>
                    <td className="p-3 text-gray-700">{user.role}</td>
                    <td className="p-3 font-semibold">
                      <span 
                        className={`px-2 py-1 rounded-full text-sm ${
                          user.is_suspended 
                            ? "bg-red-100 text-red-700" 
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {user.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleUserAction("approve", user.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Approve
                      </button>

                      {user.is_suspended ? (
                        <button
                          onClick={() => handleUserAction("reactivate", user.id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                          disabled={loading}
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction("suspend", user.id)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors disabled:opacity-50"
                          disabled={loading}
                        >
                          Suspend
                        </button>
                      )}

                      <button
                        onClick={() => handleUserAction("remove", user.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Remove
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

export default ManageUsers;