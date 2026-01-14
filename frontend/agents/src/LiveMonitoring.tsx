import React, { useState } from 'react';
// استيراد الصفحات الأخرى من ملفاتها المنفصلة
import ChatMonitoring from './ChatMonitoring';
import AgentConfiguration from './AgentConfiguration';

// --- المكون الداخلي: Live Monitoring (الصفحة الأولى) ---
const LiveMonitoring: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState('Agent-1');

  const [agents] = useState([
    { id: 1, name: 'Agent-1', status: 'active', sentiment: 'good', performance: '80%', feed: 'the agent ask about name' },
    { id: 2, name: 'Agent-2', status: 'active', sentiment: 'good', performance: '85%', feed: 'greeting the customer' },
    { id: 3, name: 'Agent-3', status: 'active', sentiment: 'good', performance: '80%', feed: 'the agent ask about name' },
    { id: 4, name: 'Agent-4', status: 'active', sentiment: 'good', performance: '75%', feed: 'waiting...' },
    { id: 5, name: 'Agent-5', status: 'active', sentiment: 'good', performance: '90%', feed: 'explaining features' },
  ]);

  return (
    <div className="animate-fadeIn">
      {/*العنوان الرئيسي */}
      <h1 className="text-center text-5xl font-black text-[#1e293b] mb-12 tracking-tight">Voice Agent</h1>

      {/* شبكة الكروت - العرض 1240px */}
      <div className="flex flex-wrap justify-center gap-6 mb-8 ">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white border border-[#ccfbf1] rounded-[12px] p-6 shadow-md w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] hover:-translate-y-1 transition-all duration-300">
            <h2 className="text-center text-[#64748b] text-3xl font-bold mb-6">{agent.name}</h2>
            <div className="space-y-3 text-lg mb-5 text-[#1e293b]">
              <p><span className="font-bold text-[#6b7280]">Status:</span> <span className="text-[#10b981] font-semibold">{agent.status}</span></p>
              <p><span className="font-bold text-[#6b7280]">Sentiment:</span> {agent.sentiment}</p>
              <p><span className="font-bold text-[#6b7280]">Performance:</span> {agent.performance}</p>
              <p className="font-bold text-[#6b7280]">Feed:</p>
            </div>
            <div className="bg-[#f0fdfa] p-4 rounded-[12px] italic text-lg border border-[#ccfbf1] min-h-[80px] flex items-center">
              -{agent.feed}
            </div>
            <div className="flex gap-4 mt-6">
              <button className="flex-1 border-2 border-[#ccfbf1] py-2.5 rounded-[12px] font-semibold text-[#64748b] hover:bg-gray-50 transition-all text-base">whisper</button>
              <button className="flex-1 bg-[#0d9488] text-white py-2.5 rounded-[12px] font-semibold hover:bg-[#0b7a70] transition-all text-base">Take over</button>
            </div>
          </div>
        ))}
      </div>

      {/* بوكس التحكم السفلي (1240px) */}
      <div className="bg-white border border-[#ccfbf1] rounded-[12px] px-10 pt-8 pb-10 shadow-md mt-12 relative max-w-[1380px] mx-auto flex flex-col items-center">
        
        {/* اختيار العميل */}
        <div className="relative mb-10 w-full flex justify-center">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="text-[#0d9488] text-3xl font-black cursor-pointer flex items-center gap-4 hover:opacity-80 transition-all tracking-tighter"
          >
            {selectedAgentName} 
            <i className={`fa-solid fa-chevron-up text-2xl transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {/* القائمة المنسدلة */}
          {isDropdownOpen && (
            <div className="absolute bottom-full mb-4 w-72 bg-white border-2 border-[#ccfbf1] rounded-2xl shadow-[0_-15px_30px_-5px_rgba(13,148,136,0.15)] z-50 overflow-hidden animate-fadeIn left-1/2 -translate-x-1/2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentName(agent.name);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-center px-6 py-5 text-[#0d9488] font-black hover:bg-[#f0fdfa] transition-colors border-b-2 border-[#f0fdfa] last:border-0 text-3xl"
                >
                  {agent.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* سطر الإدخال والزر */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <input 
            type="text" 
            placeholder={`Enter command for ${selectedAgentName}...`} 
            className="flex-1 border-2 border-[#ccfbf1] bg-[#f0fdfa] rounded-[12px] px-6 py-4 text-xl focus:ring-4 focus:ring-[#14b8a6]/10 outline-none placeholder-[#94a3b8] transition-all font-medium" 
          />
          <button className="bg-[#0d9488] text-white px-12 py-4 rounded-[12px] text-xl font-black hover:bg-[#0b7a70] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-md">
            <i className="fa-solid fa-paper-plane text-sm"></i> inject
          </button>
        </div>
      </div>
    </div>
  );
};


// --- المكون الرئيسي (App) ---
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'live' | 'chat' | 'config'>('live');

  return (
    <div className="min-h-screen bg-[#f0fdfa] p-8 font-['Manrope','Cairo',sans-serif]">
      
      {/* Navbar للتنقل */}
      <nav className="max-w-[1400px] mx-auto flex flex-wrap gap-4 mb-16 justify-center">
        <button 
          onClick={() => setCurrentView('live')} 
          className={`px-10 py-3 rounded-xl font-bold transition-all duration-300 ${currentView === 'live' ? 'bg-[#0d9488] text-white shadow-xl scale-105' : 'bg-white text-[#64748b] border border-[#ccfbf1] hover:bg-white/80'}`}
        >
          Live Monitoring
        </button>
        <button 
          onClick={() => setCurrentView('chat')} 
          className={`px-10 py-3 rounded-xl font-bold transition-all duration-300 ${currentView === 'chat' ? 'bg-[#0d9488] text-white shadow-xl scale-105' : 'bg-white text-[#64748b] border border-[#ccfbf1] hover:bg-white/80'}`}
        >
          Chat Monitoring
        </button>
        <button 
          onClick={() => setCurrentView('config')} 
          className={`px-10 py-3 rounded-xl font-bold transition-all duration-300 ${currentView === 'config' ? 'bg-[#0d9488] text-white shadow-xl scale-105' : 'bg-white text-[#64748b] border border-[#ccfbf1] hover:bg-white/80'}`}
        >
          Configuration
        </button>
      </nav>

      {/* منطقة عرض الصفحات */}
      <main className="max-w-[1400px] mx-auto">
        {currentView === 'live' && <LiveMonitoring />}
        {currentView === 'chat' && <ChatMonitoring />}
        {currentView === 'config' && <AgentConfiguration />}
      </main>

    </div>
  );
};

export default App;