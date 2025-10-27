import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-lg rounded-2xl p-4 sm:p-6 border border-base-200/50 ${className}`}>
      {children}
    </div>
  );
};

export default Card;