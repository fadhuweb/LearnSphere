import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";

const ResetPassword = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            setError("Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await api.auth.passwordResetConfirm(uid, token, password);
            setMessage(response.data.message);
            toast.success("Password reset successful!");
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid or expired link. Please request a new one.");
            toast.error("Password reset failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-md w-96 transform transition-all hover:scale-105">
                <h2 className="text-green-600 text-3xl font-extrabold text-center mb-6 tracking-tight">Set New Password</h2>

                {message && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-inner animate-fade-in text-sm">
                        {message} Redirecting to login...
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-inner animate-shake text-sm">
                        {error}
                        <div className="mt-2">
                            <Link to="/forgot-password" size="sm" className="text-red-800 font-bold hover:underline">
                                Request a new link
                            </Link>
                        </div>
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                placeholder="Min 8 characters"
                                className={`w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all outline-none text-gray-700 placeholder-gray-400 ${password && (
                                    password.length < 8 ||
                                    !/[A-Z]/.test(password) ||
                                    !/[0-9]/.test(password) ||
                                    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
                                ) ? 'border-red-300' : ''
                                    }`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength="8"
                                required
                            />
                        </div>

                        {/* Password Complexity Checklist */}
                        {password && (
                            <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-md border border-gray-100">
                                <p className="font-semibold text-gray-600 mb-1">Requirements:</p>
                                <div className="flex items-center space-x-2">
                                    <span className={password.length >= 8 ? "text-green-600" : "text-gray-400"}>
                                        {password.length >= 8 ? "✔" : "○"} Min 8 characters
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                                        {/[A-Z]/.test(password) ? "✔" : "○"} At least one uppercase
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-400"}>
                                        {/[0-9]/.test(password) ? "✔" : "○"} At least one number
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-green-600" : "text-gray-400"}>
                                        {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "✔" : "○"} One special character
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Re-type password"
                                className={`w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all outline-none text-gray-700 placeholder-gray-400 ${confirmPassword && password !== confirmPassword ? 'border-red-300' : ''
                                    }`}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-all active:scale-95 ${loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-200"
                                }`}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center">
                    <Link to="/login" className="text-green-600 font-bold hover:text-green-700 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
