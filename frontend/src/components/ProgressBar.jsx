import React from 'react';

const ProgressBar = ({ percentage, height = "h-2", color = "bg-green-500", bgColor = "bg-gray-200" }) => {
    // Ensure percentage is between 0 and 100
    const safePercentage = Math.min(Math.max(percentage || 0, 0), 100);

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{safePercentage}%</span>
            </div>
            <div className={`w-full ${bgColor} rounded-full ${height}`}>
                <div
                    className={`${color} ${height} rounded-full transition-all duration-300 ease-in-out`}
                    style={{ width: `${safePercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default ProgressBar;
