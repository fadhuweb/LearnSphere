import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

const Home = () => {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Dynamic Background Element */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-50 rounded-full blur-[100px] opacity-40"></div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-48 pb-64">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Badge */}
          <div className="animate-fade-in">
            <span className="px-5 py-2 rounded-full bg-gray-50 border border-gray-100 text-gray-500 text-xs font-black uppercase tracking-[0.2em] shadow-sm">
              Level up your logic
            </span>
          </div>

          {/* Main Title */}
          <div className="space-y-6 max-w-4xl animate-fade-in [animation-delay:200ms]">
            <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[0.9]">
              Learn <span className="text-green-600">Without</span> <br className="hidden md:block" /> Limits.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
              LearnSphere is the workspace for modern learners. <br className="hidden md:block" />
              Streamlined, secure, and built for speed.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-6 animate-fade-in [animation-delay:400ms]">
            <Link
              to="/register"
              className="group relative px-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-green-600 transition-all duration-500 shadow-2xl active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-3">
                Start Your Journey <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              to="/login"
              className="px-10 py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-black uppercase tracking-widest text-sm hover:border-green-600 hover:text-green-600 transition-all duration-300 active:scale-95 flex items-center gap-3"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
