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
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!avatar) return;

        const formData = new FormData();
        formData.append('avatar', avatar);

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Don't set Content-Type manually - axios will set it with the correct boundary
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
            // Ideally update context here. 
            // Since we can't easily trigger context update without a reload function:
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Error updating profile:', error);
            console.error('Error response:', error.response?.data);
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

                        {avatar && (
                            <div className="mt-8">
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'Uploading...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
