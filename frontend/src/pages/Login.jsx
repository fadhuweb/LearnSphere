import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const { login, loginError } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const success = await login(credentials);
      
      if (success) {
        // Get user role from localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        const role = user?.role || 'student';

        // For now, navigate to a general dashboard
        navigate('/dashboard');
        
        // Once you set up role-based routes, you can uncomment this:
        /*
        switch(role) {
          case 'teacher':
            navigate('/teacher/dashboard');
            break;
          case 'student':
            navigate('/student/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
        */
      } else {
        setError(loginError || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.detail || 'Login failed. Please try again.');
    }
  };

  // Update error message when loginError changes
  useEffect(() => {
    if (loginError) {
      setError(loginError);
    }
  }, [loginError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-green-600 text-3xl font-bold text-center mb-4">Login</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full p-3 border rounded-md focus:ring focus:ring-green-300"
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition"
          >
            Login
          </button>
        </form>
        <p className="text-center mt-4 text-gray-500">
          Don't have an account? <a href="/register" className="text-green-600 font-semibold hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
