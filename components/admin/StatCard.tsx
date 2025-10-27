import React from 'react';
import Card from '../common/Card';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted truncate">{title}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-semibold text-primary">{value}</p>
      </div>
      {icon}
    </Card>
  );
};

export default StatCard;