import React from 'react';

// A lightweight SVG chart to avoid massive dependencies in this environment
interface SimpleChartProps {
  data: number[];
  labels: string[];
  color: string; // Hex color
  height?: number;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, labels, color, height = 100 }) => {
  if (data.length === 0) return null;

  const max = Math.max(...data) * 1.1; // Add 10% headroom
  const min = Math.min(...data) * 0.9;
  const range = max - min;
  const width = 100; // Percentage

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Gradient Defs */}
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path 
          d={`M0,100 L0,${100 - ((data[0] - min) / range) * 100} ${points.replace(/,/g, ' ')} L100,100 Z`} 
          fill={`url(#grad-${color})`} 
        />
        
        {/* Line */}
        <polyline 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          points={points} 
          vectorEffect="non-scaling-stroke"
        />

        {/* Dots for last point */}
        <circle 
          cx="100%" 
          cy={`${100 - ((data[data.length - 1] - min) / range) * 100}%`} 
          r="4" 
          fill={color} 
          className="animate-pulse"
        />
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
};

export default SimpleChart;