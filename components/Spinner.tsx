
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="w-8 h-8 border-4 border-slate-500 border-t-indigo-400 rounded-full animate-spin"></div>
    </div>
  );
};

export default Spinner;
