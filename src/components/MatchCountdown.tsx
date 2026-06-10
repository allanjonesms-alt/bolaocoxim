import { useState, useEffect } from 'react';

interface MatchCountdownProps {
  matchDate: string;
  isOpen: boolean;
}

export default function MatchCountdown({ matchDate, isOpen }: MatchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    isUnderThreeHours: boolean;
    isOver: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    isUnderThreeHours: false,
    isOver: true,
  });

  useEffect(() => {
    function calculateTime() {
      const matchTime = new Date(matchDate).getTime();
      const deadline = matchTime - 30 * 60 * 1000; // 30 minutes before match
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0 || !isOpen) {
        setTimeLeft(prev => ({ ...prev, isOver: true }));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const isUnderThreeHours = diff < 3 * 60 * 60 * 1000; // less than 3 hours

      setTimeLeft({
        days,
        hours,
        minutes,
        isUnderThreeHours,
        isOver: false,
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000); // update every second for accuracy

    return () => clearInterval(interval);
  }, [matchDate, isOpen]);

  if (timeLeft.isOver || !isOpen) {
    return (
      <span className="text-[10px] text-rose-500 font-bold mt-0.5">
        Apostas encerradas
      </span>
    );
  }

  const { days, hours, minutes, isUnderThreeHours } = timeLeft;

  // Format countdown text politely
  const formattedCountdown = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;

  return (
    <span 
      id={`countdown-${matchDate}`}
      className={`text-[10px] font-bold mt-0.5 transition-colors duration-300 ${
        isUnderThreeHours 
          ? 'text-red-600 animate-pulse' 
          : 'text-slate-400'
      }`}
    >
      Encerra em: {formattedCountdown}
    </span>
  );
}
