import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../api';
import { FaCamera, FaUser, FaEnvelope, FaIdBadge } from 'react-icons/fa';

const Profile = () => {
    const { user, login } = useContext(AuthContext);

    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(user?.avatar || null);
    const [loading, setLoading] = useState(false);
    const [securityQuestion, setSecurityQuestion] = useState(user?.security_question || '');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [showSecurity, setShowSecurity] = useState(false);
    const fileInputRef = useRef(null);

    const securityQuestions = [
        "What was the name of your first school?",
        "What is your mother's maiden name?",
        "What was the name of your first pet?",
        "In what city were you born?",
        "What was your favorite food as a child?",
        "What is the name of your favorite book?",
        "What was the make and model of your first car?",
        "Where did you go on your first holiday?"
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        if (avatar) {
            formData.append('avatar', avatar);
        }

        // Add security question/answer if provided
        if (securityQuestion) formData.append('security_question', securityQuestion);
        if (securityAnswer) formData.append('security_answer', securityAnswer);

        if (!avatar && !securityQuestion && !securityAnswer) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.patch(
                `${API_URL}/auth/profile/`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            toast.success('Profile updated successfully!');
            setSecurityAnswer(''); // Clear answer field

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.error || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="p-8 text-center">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
                <div className="md:flex">
                    <div className="p-8 w-full">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-6">Profile Settings</div>

                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                                    {preview ? (
                                        <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl text-gray-400 font-bold">
                                            {user.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white shadow-md hover:bg-indigo-700 transition"
                                >
                                    <FaCamera />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                            <p className="mt-2 text-sm text-gray-500">Click camera icon to change avatar</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <FaUser className="text-gray-400 mr-3" />
                                <div>
                                    <p className="text-xs text-gray-500">Username</p>
                                    <p className="font-medium text-gray-800">{user.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <FaEnvelope className="text-gray-400 mr-3" />
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="font-medium text-gray-800">{user.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <FaIdBadge className="text-gray-400 mr-3" />
                                <div>
                                    <p className="text-xs text-gray-500">Role</p>
                                    <p className="font-medium text-gray-800 capitalise">{user.role}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-6">
                            {!showSecurity ? (
                                <button
                                    onClick={() => setShowSecurity(true)}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-between w-full"
                                >
                                    <span>Update Security Question</span>
                                    <span className="text-xs font-normal text-gray-400 italic">(Set during registration)</span>
                                </button>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900">Security Settings</h3>
                                        <button
                                            onClick={() => setShowSecurity(false)}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Security Question</label>
                                            <select
                                                value={securityQuestion}
                                                onChange={(e) => setSecurityQuestion(e.target.value)}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                                            >
                                                <option value="">Select a security question...</option>
                                                {securityQuestions.map((q, i) => (
                                                    <option key={i} value={q}>{q}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Security Answer</label>
                                            <input
                                                type="password"
                                                placeholder="Enter new answer"
                                                value={securityAnswer}
                                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-400">Leave answer blank if you only want to change the question.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (!avatar && !securityQuestion && !securityAnswer)}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading || (!avatar && !securityQuestion && !securityAnswer) ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Saving...' : 'Save All Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
