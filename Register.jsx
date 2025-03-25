import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/register/", userData);
      setSuccess(`User registered as ${res.data.role}`);
      setError(null);
    } catch (error) {
      // Better error message handling
      const errorMessage = error.response?.data?.username?.[0] || 
                          error.response?.data?.email?.[0] ||
                          error.response?.data?.password?.[0] ||
                          error.response?.data?.error ||
                          "Registration failed.";
      setError(errorMessage);
    }
  };

  return (
    <div>
      {/* Render your form here */}
    </div>
  );
};

export default Register; 