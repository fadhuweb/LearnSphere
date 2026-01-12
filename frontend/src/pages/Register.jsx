import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaUserGraduate, FaChevronRight, FaCheckCircle, FaCircle } from "react-icons/fa";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(userData.password)) {
      setError("Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/register/", userData);
      const { message } = res.data;
      setSuccess(message || "Account created successfully!");
      setError(null);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        let errorMessage = "";
        Object.entries(errorData).forEach(([field, messages]) => {
          errorMessage += `${field}: ${messages.join(', ')}. `;
        });
        setError(errorMessage);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({ met, label }) => (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? <FaCheckCircle /> : <FaCircle className="opacity-20" />}
      {label}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob [animation-delay:2s]"></div>

      <div className="w-full max-w-lg animate-fade-in relative z-10">
        <div className="glass-card p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>

          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Create Account</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Join the LearnSphere Global Community</p>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium animate-shake">{error}</div>}
          {success && <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl text-sm font-medium animate-fade-in">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    name="username"
                    placeholder="learner2024"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 transition-all shadow-sm"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 transition-all shadow-sm"
                    onChange={handleChange}
                    required
                  />
                </div>
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

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap gap-x-6 gap-y-2">
                <PasswordRequirement met={userData.password.length >= 8} label="8+ Chars" />
                <PasswordRequirement met={/[A-Z]/.test(userData.password)} label="Uppercase" />
                <PasswordRequirement met={/[0-9]/.test(userData.password)} label="Number" />
                <PasswordRequirement met={/[!@#$%^&*(),.?":{}|<>]/.test(userData.password)} label="Special" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Account Role</label>
              <div className="relative group">
                <FaUserGraduate className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                <select
                  name="role"
                  value={userData.role}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 outline-none rounded-2xl font-bold text-gray-700 transition-all shadow-sm appearance-none cursor-pointer"
                  onChange={handleChange}
                  required
                >
                  <option value="student">Student Account</option>
                  <option value="teacher">Instructor Account</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-700 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? "Registering..." : "Create Account"} <FaChevronRight size={14} />
            </button>
          </form>

          <p className="text-center mt-10 text-sm font-bold text-gray-400">
            Already a member? <Link to="/login" className="text-green-600 hover:underline">Log In Instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
