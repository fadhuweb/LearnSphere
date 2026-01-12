import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { FaEye, FaEyeSlash, FaLock, FaUser, FaChevronRight } from "react-icons/fa";

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const { login, loginError } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await login(credentials);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(loginError || 'Authentication failed. Please check your credentials.');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'System error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loginError) setError(loginError);
  }, [loginError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob [animation-delay:2s]"></div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="glass-card p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>

          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner text-3xl font-black">
              LS
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Secure Student & Teacher Access</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                <input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 transition-all shadow-sm"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 transition-all shadow-sm"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" size="sm" className="text-green-600 text-xs font-black uppercase tracking-widest hover:underline">
                Forgot Credentials?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-700 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In"} <FaChevronRight size={14} />
            </button>
          </form>

          <p className="text-center mt-10 text-sm font-bold text-gray-400">
            New to LearnSphere? <Link to="/register" className="text-green-600 hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
