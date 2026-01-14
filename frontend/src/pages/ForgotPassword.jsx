import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: Security Question
    const [email, setEmail] = useState("");
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await api.auth.getSecurityQuestion(email);
            setQuestion(response.data.question);
            setStep(2);
        } catch (err) {
            console.error("DEBUG: Failed to get security question", err);
            setError(err.response?.data?.error || "Account not found or security question not set.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await api.auth.verifySecurityAnswer(email, answer);
            const { uid, token } = response.data;
            // Redirect to the reset password page with the credentials
            navigate(`/reset-password/${uid}/${token}`);
        } catch (err) {
            console.error("DEBUG: Answer verification failed", err);
            setError(err.response?.data?.error || "Incorrect answer. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-md w-96 transform transition-all hover:scale-105">
                <h2 className="text-green-600 text-3xl font-extrabold text-center mb-6 tracking-tight">
                    {step === 1 ? "Forgot Password" : "Identity Check"}
                </h2>

                <p className="text-gray-600 text-center mb-6 text-sm">
                    {step === 1
                        ? "Enter your email address to find your account."
                        : "Answer your security question to continue."}
                </p>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-inner animate-shake text-sm">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleEmailSubmit} className="space-y-6">
                        <div className="group">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all outline-none text-gray-700 placeholder-gray-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-all active:scale-95 ${loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                }`}
                        >
                            {loading ? "Checking..." : "Continue"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleAnswerSubmit} className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Your Question:</p>
                            <p className="text-gray-700 font-medium">{question}</p>
                        </div>

                        <div className="group">
                            <input
                                type="text"
                                placeholder="Your answer"
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all outline-none text-gray-700 placeholder-gray-400"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-all active:scale-95 ${loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                }`}
                        >
                            {loading ? "Verifying..." : "Verify Identity"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 text-center mt-2"
                        >
                            Change Email
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center border-t pt-6">
                    <button
                        onClick={() => navigate("/login")}
                        className="text-green-600 font-bold hover:text-green-700 transition-colors flex items-center justify-center mx-auto text-sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
