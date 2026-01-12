import React, { useState, useEffect } from 'react';
import { FaClock } from 'react-icons/fa';

const QuizTimer = ({ initialTime, onTimeUp }) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 60) { // Last minute
      return 'text-red-600 animate-pulse';
    } else if (timeRemaining <= 300) { // Last 5 minutes
      return 'text-orange-500';
    }
    return 'text-green-600';
  };

  const getTimerBgColor = () => {
    if (timeRemaining <= 60) { // Last minute
      return 'bg-red-100 border-red-300';
    } else if (timeRemaining <= 300) { // Last 5 minutes
      return 'bg-orange-100 border-orange-300';
    }
    return 'bg-green-100 border-green-300';
  };

  return (
    <div className={`flex items-center gap-2 ${getTimerBgColor()} px-4 py-2 rounded-lg shadow-md border-2 transition-all duration-300`}>
      <FaClock className={`text-xl ${getTimerColor()}`} />
      <span className={`font-mono text-xl font-bold ${getTimerColor()}`}>
        {formatTime(timeRemaining)}
      </span>
      <span className="text-sm text-gray-600 ml-1">remaining</span>
    </div>
  );
};

export default QuizTimer;