import React from 'react';

const AgentConfiguration: React.FC = () => {
  return (
    <div className="animate-fadeIn px-4">
      <h1 className="text-center text-5xl font-black text-[#1e293b] mb-12 tracking-tight">Agent Configuration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto pb-20">
        
        {/* الكروت الحالية */}
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-[#ccfbf1] rounded-[12px] p-8 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center">
            <h2 className="text-4xl font-black text-[#1e293b] mb-8">Agent {i}</h2>
            
            <div className="w-full text-left space-y-4 text-xl text-[#64748b] mb-10">
              <p><span className="font-bold text-[#1e293b]">performance:</span> {i === 1 ? '70%' : '90%'}</p>
              <p><span className="font-bold text-[#1e293b]">Total Calls:</span> {i === 1 ? '50' : '70'}</p>
              <p><span className="font-bold text-[#1e293b]">Tools:</span> we-db</p>
            </div>

            <div className="flex gap-4 w-full mt-auto">
              <button className="flex-1 border-2 border-[#ef4444] text-[#ef4444] py-3 rounded-xl font-bold hover:bg-[#ef4444] hover:text-white transition-all active:scale-95">
                Delete
              </button>
              <button className="flex-1 border-2 border-[#ccfbf1] text-[#0d9488] py-3 rounded-xl font-bold hover:bg-[#f0fdfa] transition-all active:scale-95">
                Edit
              </button>
            </div>
          </div>
        ))}

        {/* The (+) card */}
        <div className=" border-2 border-dashed border-[#14b8a6] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[380px] cursor-pointer hover:bg-[#f0fdfa] hover:border-[#14b8a6] group transition-all duration-300 shadow-sm hover:shadow-md">
          
          {/* الدائرة اللي حول(+) */}
          <div className="w-24 h-24 rounded-full border-4 border-[#64748b] flex items-center justify-center group-hover:border-[#14b8a6] group-hover:scale-110 transition-all duration-300">
            <i className="fa-solid fa-plus text-5xl text-[#64748b] group-hover:text-[#14b8a6]"></i>
          </div>
          
          <p className="mt-6 text-[#64748b] font-black text-2xl group-hover:text-[#14b8a6] transition-colors">
            Add New Agent
          </p>
          
        </div>

      </div>
    </div>
  );
};

export default AgentConfiguration;