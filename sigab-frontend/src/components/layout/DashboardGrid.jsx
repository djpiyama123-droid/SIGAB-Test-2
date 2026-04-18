import React from 'react';

export default function DashboardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-6 p-4 sm:p-6 3xl:p-8 5xl:p-12 max-w-[2400px] 5xl:max-w-[3600px] mx-auto overflow-x-hidden">
      {children}
    </div>
  );
}

export function GridItem({ children, span = 1, className = "" }) {
  const spans = {
    1: "col-span-1",
    2: "col-span-1 md:col-span-2",
    3: "col-span-1 md:col-span-2 xl:col-span-3",
    4: "col-span-1 md:col-span-2 xl:col-span-3 3xl:col-span-4",
  };

  return (
    <div className={`${spans[span] || spans[1]} ${className}`}>
      {children}
    </div>
  );
}
