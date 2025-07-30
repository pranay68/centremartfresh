import React from 'react';
import Card from '../../components/ui/Card';

const StatsCard = ({ title, value, change, icon, color = 'primary' }) => {
  const colors = {
    primary: 'text-primary-600 bg-primary-100',
    success: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    danger: 'text-red-600 bg-red-100',
  };

  return (
    <Card hover>
      <Card.Content className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {change} from last month
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colors[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default StatsCard;