import React from 'react';
import Card from '../common/Card';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, className = '' }) => {
  return (
    <Card className={`h-[400px] flex flex-col ${className}`}>
      <h3 className="text-xl font-semibold text-primary mb-4">{title}</h3>
      <div className="flex-grow w-full h-full">
        {children}
      </div>
    </Card>
  );
};

export default ChartCard;