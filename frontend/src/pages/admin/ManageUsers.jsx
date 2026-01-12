import React, { useEffect, useState } from "react";
import axios from "axios";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/admin/users/");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAction = async (userId, action) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/admin/users/${userId}/${action}/`);
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error(`Error performing ${action} on user ${userId}:`, error);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Manage Users</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-green-600 text-white">
            <th className="p-2 border">Username</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="text-center border">
              <td className="p-2 border">{user.username}</td>
              <td className="p-2 border">{user.email}</td>
              <td className="p-2 border">{user.role}</td>
              <td className="p-2 border space-x-2">
                <button onClick={() => handleAction(user.id, "approve")} className="bg-green-500 text-white px-2 py-1 rounded">Approve</button>
                <button onClick={() => handleAction(user.id, "suspend")} className="bg-yellow-500 text-white px-2 py-1 rounded">Suspend</button>
                <button onClick={() => handleAction(user.id, "remove")} className="bg-red-500 text-white px-2 py-1 rounded">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageUsers;
