import React from 'react';
import {
    FaUsers, FaExclamationCircle, FaBook, FaChartLine,
    FaUserCog, FaBookOpen, FaUserGraduate, FaCalendarAlt
} from 'react-icons/fa';

const AdminOverview = ({ stats, notifications }) => {
    const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
        <div className="glass-card p-6 hover-scale animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-bold mt-1 text-gray-900">{value}</h3>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-4 rounded-xl bg-${color}-100 bg-opacity-50`}>
                    <Icon className={`text-${color}-600 text-2xl`} />
                </div>
            </div>
        </div>
    );

    const ActionCard = ({ icon: Icon, title, description, href, gradient }) => (
        <a href={href} className={`glass-card p-5 hover-scale group relative overflow-hidden animate-fade-in`}>
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 bg-gradient-to-br ${gradient}`}></div>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-gray-50 group-hover:bg-green-50 transition-colors`}>
                    <Icon className="text-xl text-gray-600 group-hover:text-green-600" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 group-hover:text-green-700">{title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
                </div>
            </div>
        </a>
    );

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="dashboard-grid">
                <StatCard
                    icon={FaUsers}
                    title="Total Users"
                    value={stats.totalUsers}
                    subtitle={`${stats.activeUsers} active now`}
                    color="blue"
                />
                <StatCard
                    icon={FaExclamationCircle}
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    subtitle="Awaiting review"
                    color="yellow"
                />
                <StatCard
                    icon={FaBook}
                    title="Active Courses"
                    value={stats.activeCourses}
                    subtitle="Published content"
                    color="green"
                />
                <StatCard
                    icon={FaChartLine}
                    title="Recent Activity"
                    value={stats.recentActivity}
                    subtitle="Last 24 hours"
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Actions Area */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                        System Management
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ActionCard
                            icon={FaUserCog}
                            title="User Directory"
                            description="Manage permissions, roles, and account status for all system users."
                            href="/admin/manage-users"
                            gradient="from-blue-400 to-blue-600"
                        />
                        <ActionCard
                            icon={FaBookOpen}
                            title="Course Catalog"
                            description="Review, create, and audit course content across all departments."
                            href="/admin/manage-courses"
                            gradient="from-green-400 to-green-600"
                        />
                    </div>
                </div>

                {/* Side Notifications Area */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
                        System Pulse
                    </h3>
                    <div className="glass-card p-4 space-y-4">
                        {notifications.length > 0 ? (
                            notifications.map((n, i) => (
                                <div key={n.id || i} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border-l-4 border-green-500 bg-white shadow-sm">
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-800 font-medium">{n.message}</p>
                                        <p className="text-xs text-gray-400 mt-1 uppercase font-bold">{n.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-400 text-sm italic">No urgent alerts found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
