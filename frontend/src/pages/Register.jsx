import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    role: "student"
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (userData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/register/", userData);
      const { message, user } = res.data;
      setSuccess(message);
      setError(null);
      
      // Show success message and redirect after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      // Show specific error messages from backend
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        // If backend returns specific field errors
        let errorMessage = "Registration failed. ";
        Object.entries(errorData).forEach(([field, messages]) => {
          errorMessage += `${field}: ${messages.join(', ')}; `;
        });
        setError(errorMessage);
      } else {
        setError("Registration failed. Please check your input and try again.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-green-600 text-3xl font-bold text-center mb-4">Register</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={userData.username}
            className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={userData.email}
            className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={userData.password}
            className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
            onChange={handleChange}
            required
          />
          <select
            name="role"
            value={userData.role}
            className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
            onChange={handleChange}
            required
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
