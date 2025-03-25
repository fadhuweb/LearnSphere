import React from "react";

const Home = () => {
  return (
    <div className="text-center max-w-3xl mx-auto bg-white shadow-md p-8 rounded-lg">
      <h1 className="text-4xl font-bold text-green-700">Welcome to LearnSphere</h1>
      <p className="text-gray-600 mt-4">
        A modern e-learning platform designed for students and teachers to collaborate effectively.
      </p>
      <div className="mt-6">
        <a
          href="/register"
          className="bg-green-600 text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-green-700 transition"
        >
          Get Started
        </a>
      </div>
    </div>
  );
};

export default Home;
