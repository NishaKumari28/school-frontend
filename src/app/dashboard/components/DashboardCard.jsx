'use client';
import { memo } from "react";

const colorClasses = {
  blue: "bg-blue-100 text-blue-900",
  purple: "bg-purple-100 text-purple-900",
  green: "bg-green-100 text-green-900",
  orange: "bg-orange-100 text-orange-900",
  red: "bg-red-100 text-red-900",
  slate: "bg-black-100 text-slate-900"
};

function DashboardCard({ title, icon, value, color = "slate", className = "", onClick }) {
  const iconBgClass = colorClasses[color] || colorClasses.slate;
  
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:scale-[1.02] rounded-xl p-6 h-32 md:h-40 flex flex-col items-center justify-center transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Title */}
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
        {title}
      </h3>
      
      {/* Icon */}
      <div className={`p-3 ${iconBgClass} rounded-xl mb-2 shadow-sm`}>
        <span className="text-xl">{icon}</span>
      </div>
      
      {/* Value - Green number below icon, centered */}
      <p className="text-2xl font-bold text-green-600">
        {value}
      </p>
    </div>
  );
}

export default memo(DashboardCard);

