import React from 'react';
import {
    FaBookOpen, FaAward, FaChartLine, FaClock, FaCheckCircle,
    FaSearch, FaGraduationCap, FaCalendarAlt, FaPlayCircle
} from 'react-icons/fa';
import ProgressBar from '../ProgressBar';

const StudentOverview = ({ stats, notifications }) => {
    const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
        <div className="glass-card p-6 bg-white overflow-hidden group animate-fade-in border-none shadow-lg">
            <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`}></div>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
                    <h3 className="text-2xl font-black mt-1 text-gray-900">{value}</h3>
                    {subtitle && <p className="text-[10px] font-bold text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
                    <Icon className="text-xl" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Personalized Header Stat Grid */}
            <div className="dashboard-grid">
                <StatCard
                    icon={FaBookOpen}
                    title="Courses"
                    value={stats.enrolledCourses}
                    subtitle="Active learning"
                    color="blue"
                />
                <StatCard
                    icon={FaAward}
                    title="Completed"
                    value={stats.completedCourses}
                    subtitle="Certificates earned"
                    color="green"
                />
                <StatCard
                    icon={FaChartLine}
                    title="Progress"
                    value={`${stats.averageProgress}%`}
                    subtitle="Overall completion"
                    color="purple"
                />
                <StatCard
                    icon={FaCheckCircle}
                    title="Quizzes"
                    value={stats.quizzesPassed}
                    subtitle={`Out of ${stats.totalQuizzes} taken`}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Journey Progress Area */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card p-8 bg-gradient-to-r from-green-600 to-green-700 text-white border-none shadow-2xl relative overflow-hidden animate-fade-in">
                        <FaGraduationCap className="absolute -right-8 -bottom-8 text-[12rem] opacity-10 rotate-12" />
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-2">Continue Your Journey</h3>
                            <p className="text-green-100 mb-6 font-medium max-w-md">
                                You've completed {stats.averageProgress}% of your current learning path.
                                Keep pushing forward to unlock your next certificate!
                            </p>
                            <div className="bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-md border border-white border-opacity-20">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-sm font-black uppercase tracking-widest">Total Curriculum Progress</span>
                                    <span className="text-2xl font-black">{stats.averageProgress}%</span>
                                </div>
                                <ProgressBar
                                    percentage={stats.averageProgress}
                                    color="bg-white"
                                    height="h-3"
                                    className="shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ActionItem
                            icon={FaSearch}
                            title="Explore Courses"
                            desc="Browse our library of high-quality educational content."
                            href="/browse-courses"
                            action="Explore"
                            color="blue"
                        />
                        <ActionItem
                            icon={FaPlayCircle}
                            title="Resume Learning"
                            desc="Jump back into your last accessed course and pick up where you left off."
                            href="/enrolled-courses"
                            action="Continue"
                            color="green"
                        />
                    </div>
                </div>

                {/* Reminders Side Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                        Up Next
                    </h3>
                    <div className="glass-card p-5 space-y-4 border-none shadow-xl bg-white">
                        <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 mb-6">
                            <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Upcoming Deadline</p>
                            <p className="text-lg font-black text-gray-800">{stats.nextDeadline}</p>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Recent Updates</p>
                            {notifications.length > 0 ? (
                                notifications.map((n, i) => (
                                    <div key={n.id || i} className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer">
                                        <div className="p-2 rounded-lg bg-green-50 text-green-600">
                                            <FaCheckCircle />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 leading-snug">{n.message}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{n.time}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 opacity-40">
                                    <p className="text-sm font-bold italic">No new notifications</p>
                                </div>
                            )}
                        </div>
                        <button className="w-full py-3 mt-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:border-green-500 hover:text-green-600 transition-all">
                            View Notification History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActionItem = ({ icon: Icon, title, desc, href, action, color }) => (
    <a href={href} className="group glass-card p-6 border-none shadow-md hover:shadow-xl transition-all bg-white relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full opacity-5 bg-${color}-500 transition-transform group-hover:scale-[3]`}></div>
        <div className="relative z-10">
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 w-fit mb-4`}>
                <Icon className="text-xl" />
            </div>
            <h4 className="text-lg font-black text-gray-800 mb-2 truncate group-hover:text-green-800 transition-colors">{title}</h4>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4">{desc}</p>
            <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-${color}-600 group-hover:gap-4 transition-all`}>
                {action} <span>→</span>
            </div>
        </div>
    </a>
);

export default StudentOverview;
