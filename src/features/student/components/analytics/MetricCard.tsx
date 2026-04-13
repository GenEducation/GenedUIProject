import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  description?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  description
}) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#1a3a2a]/5 shadow-sm hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1a3a2a]/70 group-hover:text-[#059669] transition-colors">
          {label}
        </p>
        {icon && (
          <div className="text-[#1a3a2a]/60 group-hover:text-[#059669] group-hover:scale-110 transition-all duration-300">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-bold text-[#1a3a2a]">{value}</h3>
        {subValue && (
          <span className="text-sm font-semibold text-[#1a3a2a]/60">{subValue}</span>
        )}
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-[#059669]' : 'text-red-500'}`}>
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}
          </div>
        )}
      </div>
      
      {description && (
        <p className="mt-4 text-sm leading-relaxed text-[#1a3a2a]/80 font-medium">
          {description}
        </p>
      )}
    </div>
  );
};
