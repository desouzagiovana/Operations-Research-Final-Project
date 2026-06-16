import React from 'react';

export const Badge: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex justify-center mb-8">
      <span className="text-[10px] font-bold tracking-widest uppercase text-[#df6a45] bg-[#F6EFE6] border border-[#e8dcc8] px-4 py-1.5 rounded-full shadow-sm">
        <span className="mr-1 text-[#df6a45]">•</span> {text}
      </span>
    </div>
  );
};

export const HomeBadge: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex justify-center mb-8">
      <span className="text-[10px] font-bold tracking-widest uppercase text-[#df6a45] border border-[#e8dcc8] px-4 py-1.5 rounded-full shadow-sm bg-transparent">
        <span className="mr-1 text-[#df6a45]">•</span> {text}
      </span>
    </div>
  );
};
