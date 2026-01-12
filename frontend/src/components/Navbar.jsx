import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    FaHome, FaChartBar, FaBook, FaUsers, FaCog, FaSignOutAlt,
    FaUser, FaBars, FaTimes, FaGraduationCap, FaChalkboardTeacher,
    FaBookOpen, FaSearch, FaUserCircle, FaChevronDown
} from 'react-icons/fa';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setIsProfileDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    const NavLink = ({ to, children, icon: Icon, onClick }) => (
        <Link
            to={to}
            onClick={() => {
                setIsMobileMenuOpen(false);
                onClick && onClick();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-green-50 hover:text-white hover:bg-white/10 transition-all duration-300 font-bold text-sm"
        >
            {Icon && <Icon className="text-lg opacity-80" />}
            <span>{children}</span>
        </Link>
    );

    const getNavigationLinks = () => {
        if (!user) return null;
        const commonLinks = [{ to: '/dashboard', label: 'Overview', icon: FaChartBar }];
        const roleLinks = {
            admin: [
                { to: '/admin/manage-users', label: 'Users', icon: FaUsers },
                { to: '/admin/manage-courses', label: 'Courses', icon: FaBook }
            ],
            teacher: [
                { to: '/my-courses', label: 'My Studio', icon: FaChalkboardTeacher },
                { to: '/teacher-progress', label: 'Analytics', icon: FaChartBar }
            ],
            student: [
                { to: '/enrolled-courses', label: 'My Learning', icon: FaBookOpen },
                { to: '/browse-courses', label: 'Explore', icon: FaSearch }
            ]
        };
        return [...commonLinks, ...(roleLinks[user.role] || [])];
    };

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? 'h-16' : 'h-20'}`}>
            <div className={`glass-card border-x-none border-t-none rounded-none shadow-xl px-6 h-full flex justify-between items-center transition-all duration-500 ${scrolled ? 'bg-green-700/95' : 'bg-green-600/90'}`}>
                {/* Logo and Nav Content Container */}
                <div className="container mx-auto flex justify-between items-center w-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-white text-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <FaGraduationCap className="text-2xl" />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">LearnSphere</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {!user ? (
                            <>
                                <NavLink to="/" icon={FaHome}>Home</NavLink>
                                <NavLink to="/login" icon={FaUser}>Sign In</NavLink>
                                <Link
                                    to="/register"
                                    className="ml-4 px-6 py-2.5 bg-white text-green-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-50 transition-all duration-300 shadow-lg active:scale-95"
                                >
                                    Get Started
                                </Link>
                            </>
                        ) : (
                            <>
                                {getNavigationLinks()?.map((link) => (
                                    <NavLink key={link.to} to={link.to} icon={link.icon}>
                                        {link.label}
                                    </NavLink>
                                ))}

                                {/* Profile Dropdown */}
                                <div className="relative ml-4" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                        className="flex items-center gap-3 p-1 rounded-2xl hover:bg-white/10 transition-colors"
                                    >
                                        <div className="relative">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt="Avatar"
                                                    className="w-10 h-10 rounded-xl object-cover border-2 border-green-400 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-white text-green-700 flex items-center justify-center font-black text-xs">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-green-600 rounded-full"></div>
                                        </div>
                                        <FaChevronDown className={`text-[10px] text-green-200 transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isProfileDropdownOpen && (
                                        <div className="absolute right-0 mt-4 w-64 glass-card border-none bg-white rounded-[2rem] shadow-2xl py-4 animate-fade-in translate-y-0">
                                            <div className="px-6 py-4 border-b border-gray-50 mb-2">
                                                <p className="text-sm font-black text-gray-900">{user.username}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{user.role}</p>
                                            </div>
                                            <DropdownLink to="/profile" icon={FaUserCircle} label="My Profile" />
                                            <DropdownLink to="/dashboard" icon={FaCog} label="Management" />
                                            <div className="px-4 mt-4">
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center gap-3 w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                                                >
                                                    <FaSignOutAlt className="text-sm" />
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden text-green-100 p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="container mx-auto px-6">
                    <div className="mt-4 glass-card border-none bg-green-700/95 rounded-[2.5rem] p-6 shadow-2xl animate-fade-in">
                        {!user ? (
                            <div className="flex flex-col gap-3">
                                <NavLink to="/" icon={FaHome}>Home</NavLink>
                                <NavLink to="/login" icon={FaUser}>Sign In</NavLink>
                                <Link
                                    to="/register"
                                    className="w-full py-4 bg-white text-green-700 text-center rounded-2xl font-black uppercase tracking-widest text-xs mt-2"
                                >
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-[1.5rem] mb-4">
                                    {user.avatar ? (
                                        <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-green-400" alt="User" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-white text-green-600 flex items-center justify-center font-black">{user.username.charAt(0)}</div>
                                    )}
                                    <div>
                                        <p className="font-black text-white">{user.username}</p>
                                        <p className="text-[10px] font-black text-green-300 uppercase tracking-widest">{user.role}</p>
                                    </div>
                                </div>
                                {getNavigationLinks()?.map((link) => (
                                    <NavLink key={link.to} to={link.to} icon={link.icon}>
                                        {link.label}
                                    </NavLink>
                                ))}
                                <NavLink to="/profile" icon={FaUserCircle}>My Profile</NavLink>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full p-4 text-xs font-black uppercase tracking-widest text-red-200 bg-red-900/50 rounded-2xl mt-4"
                                >
                                    <FaSignOutAlt /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

const DropdownLink = ({ to, icon: Icon, label }) => (
    <Link
        to={to}
        className="flex items-center gap-3 px-6 py-3 text-sm font-bold text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
    >
        <Icon className="text-lg opacity-50" />
        <span>{label}</span>
    </Link>
);

export default Navbar;
