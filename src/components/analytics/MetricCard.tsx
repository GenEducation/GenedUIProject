import React from "react";
import { TrendingUp, TrendingDown, Flag } from "lucide-react";

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
  valueColor?: string;
  status?: string;
  progress?: number; // 0 to 100
  showProgress?: boolean;
  isSegmented?: boolean;
  segments?: { color: string; width: number }[];
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  description,
  valueColor,
  status,
  progress = 0,
  showProgress = false,
  isSegmented = false,
  segments = []
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
      
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-4xl font-bold transition-colors duration-300" style={{ color: valueColor || "#1a3a2a" }}>{value}</h3>
        {subValue && (
          <span className="text-sm font-semibold text-[#1a3a2a]/60">{subValue}</span>
        )}
        {status && (
          <span 
            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: valueColor || "#3B82F6" }}
          >
            {status}
          </span>
        )}
      </div>

      {showProgress && (
        <div className="flex flex-col gap-1 mb-6">
          {/* Flag Indicator Above */}
          <div className="relative w-full h-5">
              <div 
                className="absolute bottom-0 flex flex-col items-start transition-all duration-1000 ease-out"
                style={{ left: `${Math.min(99, Math.max(0, progress))}%` }}
              >
                <Flag size={14} fill={valueColor || "#1a3a2a"} style={{ color: valueColor || "#1a3a2a" }} />
              </div>
          </div>

          <div className="relative h-2 w-full rounded-full bg-[#1a3a2a]/5 overflow-hidden flex">
            {isSegmented ? (
              <>
                {segments.map((seg, idx) => (
                  <div 
                    key={idx} 
                    className="h-full"
                    style={{ 
                      width: `${seg.width}%`, 
                      backgroundColor: seg.color,
                    }}
                  />
                ))}
              </>
            ) : (
              <div 
                className="h-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: valueColor || "#3B82F6"
                }}
              />
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
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
