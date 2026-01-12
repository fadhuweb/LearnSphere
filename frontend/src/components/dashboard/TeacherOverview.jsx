import React from 'react';
import {
    FaChalkboardTeacher, FaUserGraduate, FaAward, FaClock,
    FaBookOpen, FaGraduationCap, FaBook, FaCalendarAlt, FaPlus
} from 'react-icons/fa';

const TeacherOverview = ({ stats, notifications }) => {
    const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
        <div className="glass-card p-6 border-b-4 border-b-green-500 hover-scale animate-fade-in">
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 shadow-inner`}>
                    <Icon className="text-green-600 text-2xl" />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</p>
                    <h3 className="text-3xl font-extrabold mt-0.5 text-gray-900">{value}</h3>
                    {subtitle && <p className="text-xs font-medium text-gray-500 mt-1">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="dashboard-grid">
                <StatCard
                    icon={FaChalkboardTeacher}
                    title="Courses"
                    value={stats.teachingCourses}
                    subtitle="Actively teaching"
                />
                <StatCard
                    icon={FaUserGraduate}
                    title="Students"
                    value={stats.totalStudents}
                    subtitle="Total enrollment"
                />
                <StatCard
                    icon={FaAward}
                    title="Avg Score"
                    value={`${stats.averageScore}%`}
                    subtitle="Performance index"
                />
                <StatCard
                    icon={FaClock}
                    title="Deadlines"
                    value={stats.upcomingDeadlines}
                    subtitle="Next 7 days"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm glass-card border-none">
                        <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                            Instructional Hub
                        </h3>
                        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-md active:scale-95">
                            <FaPlus /> New Course
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <QuickAction
                            icon={FaBookOpen}
                            title="Content Workshop"
                            desc="Draft new lessons, upload resources, and structure your curriculum."
                            href="/my-courses"
                            tag="Admin"
                            color="blue"
                        />
                        <QuickAction
                            icon={FaGraduationCap}
                            title="Grading Center"
                            desc="Review quiz attempts, track student progress, and analyze results."
                            href="/teacher-progress"
                            tag="Analytic"
                            color="purple"
                        />
                    </div>
                </div>

                {/* Intelligence Side Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                        Recent Insights
                    </h3>
                    <div className="glass-card p-5 space-y-4 border-none shadow-xl">
                        {notifications.length > 0 ? (
                            notifications.map((n, i) => (
                                <div key={n.id || i} className="group relative pl-4 border-l-2 border-gray-100 hover:border-green-500 transition-all py-2">
                                    <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-green-700 transition-colors">
                                        {n.message}
                                    </p>
                                    <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-tighter">
                                        {n.time}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 opacity-40">
                                <FaClock className="text-5xl mx-auto mb-4 text-gray-300" />
                                <p className="text-sm font-bold">No recent activities</p>
                            </div>
                        )}
                        <button className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-50 hover:text-green-600 transition-all">
                            View All Insights
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuickAction = ({ icon: Icon, title, desc, href, tag, color }) => (
    <a href={href} className="group glass-card p-6 bg-white hover:bg-green-50 transition-all duration-300 border-none shadow-md">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-gray-100 text-gray-600 group-hover:bg-${color}-100 group-hover:text-${color}-600 transition-colors`}>
                <Icon className="text-2xl" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-${color}-50 text-${color}-600`}>
                {tag}
            </span>
        </div>
        <h4 className="text-lg font-black text-gray-800 mb-2 truncate group-hover:text-green-800">{title}</h4>
        <p className="text-sm text-gray-500 font-medium leading-relaxed group-hover:text-gray-600">{desc}</p>
    </a>
);

export default TeacherOverview;
