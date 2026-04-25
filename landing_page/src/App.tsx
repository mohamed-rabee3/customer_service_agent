import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Bot,
  MessageSquare,
  Mic,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  PlayCircle,
  Server,
  Lock,
  Cpu,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

// Typewriter Component
const TypewriterText = ({ text, delay = 0, onComplete }: { text: string, delay?: number, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let i = 0;
    const typingDelay = setTimeout(() => {
      const intervalId = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i === text.length) {
          clearInterval(intervalId);
          if (onCompleteRef.current) setTimeout(onCompleteRef.current, 500);
        }
      }, 50);
      return () => clearInterval(intervalId);
    }, delay * 1000);
    return () => clearTimeout(typingDelay);
  }, [text, delay]);

  return <span>{displayedText}</span>;
};

// Dashboard Mockup Component
const DashboardMockup = () => {
  const [audioLevels, setAudioLevels] = useState([20, 40, 30, 50, 20]);
  const [chatMessages, setChatMessages] = useState<number[]>([1]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Simulate Voice Audio Wave
    const waveInterval = setInterval(() => {
      setAudioLevels(Array.from({ length: 5 }, () => Math.floor(Math.random() * 80) + 10));
    }, 200);

    // Simulate Chat Messages arriving
    const chatInterval = setInterval(() => {
      setChatMessages(prev => {
        if (prev.length >= 3) return [1];
        return [...prev, 1];
      });
    }, 2500);

    // Simulate Supervisor Alert Toast
    const toastInterval = setInterval(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }, 6000);

    return () => { clearInterval(waveInterval); clearInterval(chatInterval); clearInterval(toastInterval); };
  }, []);

  return (
    <div className="dashboard-preview relative w-full h-[450px]">
      {/* Mac Window Controls */}
      <div className="h-10 bg-gray-50/90 backdrop-blur-md border-b border-gray-200 flex items-center px-4 gap-4 z-20 relative">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></span>
          <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></span>
          <span className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></span>
        </div>
        <div className="flex-1 text-center text-xs font-semibold tracking-widest text-gray-400 mr-10 uppercase">Live Operations</div>
      </div>

      <div className="flex h-[410px] bg-white/80 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <div className="w-48 border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-3 relative z-10">
          <motion.div initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ duration: 1, delay: 0.2 }} className="h-4 bg-blue-100 rounded-md mb-4"></motion.div>
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className={`h-8 rounded-lg flex items-center px-3 ${i === 1 ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-100'}`}
            >
              <div className={`h-2.5 rounded-full ${i === 1 ? 'w-full bg-blue-400' : 'w-3/4 bg-gray-300'}`}></div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 relative bg-gray-50/30">
          {/* Header Area */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="h-6 w-48 bg-slate-800 rounded-md mb-2"></motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="h-3 w-32 bg-slate-300 rounded-md"></motion.div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.05, 1], boxShadow: ["0px 0px 0px rgba(59,130,246,0)", "0px 0px 15px rgba(59,130,246,0.5)", "0px 0px 0px rgba(59,130,246,0)"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="h-8 bg-white text-blue-600 rounded-full flex items-center gap-2 text-xs font-bold px-4 border border-blue-200 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Websocket Active
            </motion.div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-3 gap-6">

            {/* Card 1: Live Voice Agent */}
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
              className="bg-white border border-gray-200 rounded-xl p-5 h-48 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Mic className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 mb-1">Voice Agent 01</div>
                    <div className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">Active Call</div>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-center h-16 gap-1.5 mt-4">
                {audioLevels.map((level, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ height: `${level}%` }}
                    transition={{ type: "tween", duration: 0.2 }}
                    className="w-2 bg-blue-500 rounded-t-sm opacity-80"
                  />
                ))}
              </div>
            </motion.div>

            {/* Card 2: Live Chat Agent */}
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}
              className="bg-white border border-gray-200 rounded-xl p-5 h-48 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 mb-1">Chat Support 03</div>
                    <div className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">Typing...</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <AnimatePresence>
                  {chatMessages.map((_, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: idx % 2 === 0 ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`h-5 rounded-md ${idx % 2 === 0 ? 'bg-gray-100 w-3/4 self-start' : 'bg-emerald-50 w-2/3 self-end'}`}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Card 3: Metrics / Analysis */}
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}
              className="bg-white border border-gray-200 rounded-xl p-5 h-48 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 mb-1">Live Sentiment</div>
                    <div className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">Analyzing</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>Positive</span> <span>85%</span></div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div animate={{ width: ["70%", "85%", "80%"] }} transition={{ repeat: Infinity, duration: 4 }} className="h-full bg-emerald-400" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>Resolution Rate</span> <span>92%</span></div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div animate={{ width: ["90%", "95%", "92%"] }} transition={{ repeat: Infinity, duration: 5 }} className="h-full bg-blue-400" />
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Floating Action Toast Alert */}
          <AnimatePresence>
            {showToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-6 right-6 bg-white border border-orange-200 shadow-xl rounded-lg p-4 w-64 z-30"
              >
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Approval Required</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Voice Agent 01 is requesting permission to process a refund.</p>
                    <div className="flex gap-2 mt-2">
                      <button className="text-[10px] font-bold bg-slate-800 text-white px-3 py-1 rounded">Approve</button>
                      <button className="text-[10px] font-bold bg-gray-100 text-slate-600 px-3 py-1 rounded">Deny</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [typingLine, setTypingLine] = useState(1);
  const [heroTypingDone, setHeroTypingDone] = useState(false);

  // Global Scroll Tracking for Parallax
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 300], [0, -100]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: dashScroll } = useScroll({
    target: dashboardRef,
    offset: ["start end", "center center"]
  });
  const dashScale = useTransform(dashScroll, [0, 1], [0.8, 1]);
  const dashOpacity = useTransform(dashScroll, [0, 1], [0, 1]);
  const dashY = useTransform(dashScroll, [0, 1], [100, 0]);

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const features = [
    {
      icon: <Mic className="w-8 h-8 text-blue-500" />,
      title: "Voice Agents",
      description: "Human-like voice interactions powered by Gemini 2.5 Flash and Whisper v3 for seamless customer support."
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-emerald-500" />,
      title: "Chat Agents",
      description: "Intelligent text-based support with instant response times and deep context understanding."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
      title: "Real-time Analytics",
      description: "Live sentiment tracking, CSAT scoring, and comprehensive dashboard for supervisors."
    },
    {
      icon: <Shield className="w-8 h-8 text-orange-500" />,
      title: "Secure Tool Access",
      description: "Granular permission system allowing agents to perform actions securely under supervisor watch."
    }
  ];

  const roles = [
    {
      title: "Administrators",
      icon: <Server className="w-6 h-6 text-blue-500" />,
      features: [
        "Full system control and configuration",
        "Monitor all supervisors and performance",
        "System-wide analytics dashboard",
        "Supervisor management interface"
      ]
    },
    {
      title: "Voice Supervisors",
      icon: <Mic className="w-6 h-6 text-emerald-500" />,
      features: [
        "Create and manage up to 3 voice agents",
        "Monitor active calls in real-time",
        "Inject instructions via whisper mode",
        "Approve or deny tool usage permissions"
      ]
    },
    {
      title: "Chat Supervisors",
      icon: <MessageSquare className="w-6 h-6 text-purple-500" />,
      features: [
        "Manage up to 3 specialized chat agents",
        "Private agent coaching during live chats",
        "Review interaction archives and tags",
        "Edit agent system instructions and tools"
      ]
    }
  ];

  const stack = [
    { name: "FastAPI", desc: "High-performance backend framework" },
    { name: "Supabase", desc: "PostgreSQL & JWT Authentication" },
    { name: "LiveKit", desc: "WebRTC Real-time Communication" },
    { name: "Gemini 2.5 Flash", desc: "Core Agent LLM & Voice TTS" },
    { name: "Whisper v3 Large", desc: "Highly accurate STT via Groq" },
    { name: "React + Vite", desc: "Progressive Web App Frontend" }
  ];

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does the agent whisper functionality work?",
      a: "Supervisors can intervene during a live interaction. For voice calls, the agent automatically excuses the customer and pauses. The supervisor types instructions, injects them to the agent, and the agent resumes the conversation seamlessly."
    },
    {
      q: "What is First Contact Resolution (FCR)?",
      a: "FCR measures the percentage of issues resolved during the initial contact. Our AI tracks issue tags, and if a customer returns with the same issue within 3 days, the original FCR success is automatically decremented to ensure accuracy."
    },
    {
      q: "How are Customer Satisfaction (CSAT) scores calculated?",
      a: "CSAT is calculated entirely by our AI models. A lightweight model provides continuous real-time sentiment analysis during the interaction, and a more comprehensive LLM calculates the final post-interaction score based on the complete summary."
    },
    {
      q: "How does the agent tool permission system work?",
      a: "Agents can be equipped with MCP tools. Informational tools auto-execute, while sensitive tools require explicit supervisor approval via the dashboard. Requests timeout after 6 minutes to ensure system safety."
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafcff] text-[#0f172a] overflow-x-hidden font-sans selection:bg-blue-200 selection:text-blue-900">
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-8 md:px-16 py-6 border-b border-gray-200/60 backdrop-blur-md bg-white/40"
      >
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#0f172a] to-blue-600">
            AgenticCare
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-6 py-2 rounded-full font-semibold border border-gray-300 text-[#0f172a] hover:bg-gray-100 transition-colors shadow-sm">
            Login
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4 md:px-8 flex flex-col items-center text-center min-h-[100vh] justify-center overflow-hidden">

        {/* Background Reveal */}
        <AnimatePresence>
          {heroTypingDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="absolute inset-0 z-0 pointer-events-none mesh-bg"
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-70 mix-blend-multiply"></div>
              <div className="glow-orb orb-1"></div>
              <div className="glow-orb orb-2"></div>
              <div className="glow-orb orb-3"></div>

              {/* Floating Glass Shapes */}
              <motion.div
                animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="glass-shape glass-circle top-[20%] left-[10%]"
              ></motion.div>
              <motion.div
                animate={{ y: [0, 40, 0], rotate: [0, -15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="glass-shape glass-card top-[60%] left-[5%] rotate-12 hidden lg:block"
              ></motion.div>
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="glass-shape glass-pill top-[30%] right-[12%] -rotate-12"
              ></motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative z-10 max-w-4xl flex flex-col items-center">
          {/* Main Title - Typed Out with Inline Cursor */}
          <div className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 flex flex-col items-center justify-center">
            {/* Line 1 */}
            <div className="h-[1.2em] flex items-center justify-center">
              <span className="text-[#0f172a]">
                <TypewriterText text="Elevate Support with" delay={0.5} onComplete={() => setTypingLine(2)} />
              </span>
              {typingLine === 1 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-1.5 md:w-2 h-[0.85em] bg-blue-600 ml-2"
                />
              )}
            </div>

            {/* Line 2 */}
            <div className="h-[1.2em] flex items-center justify-center mt-2">
              <span className="text-gradient-wave">
                {typingLine >= 2 && (
                  <TypewriterText text="Autonomous AI Agents." delay={0} onComplete={() => { setTypingLine(3); setHeroTypingDone(true); }} />
                )}
              </span>
              {typingLine === 2 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-1.5 md:w-2 h-[0.85em] bg-pink-500 ml-2"
                />
              )}
            </div>
          </div>

          <AnimatePresence>
            {heroTypingDone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold mb-8 backdrop-blur-md shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  Proof of Concept Live
                </div>

                <p className="text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-gray-200 shadow-sm font-medium">
                  Deploy intelligent voice and chat agents that resolve issues instantly,
                  learn continuously, and collaborate with your human supervisors in real-time.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-20">
                  <button className="px-8 py-4 rounded-full bg-[#0f172a] hover:bg-[#1a2939] text-white font-semibold text-lg flex items-center justify-center group shadow-md transition-all">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="px-8 py-4 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 hover:bg-white font-semibold text-lg flex items-center justify-center group shadow-sm transition-all">
                    <PlayCircle className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Floating Chat Widget */}
        <AnimatePresence>
          {heroTypingDone && (
            <motion.div
              style={{ opacity: heroOpacity, y: heroY }}
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute bottom-32 right-8 lg:right-20 z-20 hidden md:flex flex-col items-end"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-gray-100 mb-4 max-w-[250px] text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-500">AI Agent</span>
                </div>
                <p className="text-sm text-[#0f172a] font-medium leading-relaxed">
                  Hello! I've analyzed your account. I can process your refund immediately. Shall I proceed?
                </p>
              </motion.div>
              <div className="w-14 h-14 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Dashboard Preview Section */}
      <section ref={dashboardRef} className="relative px-4 pb-32 pt-20 border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white min-h-[80vh] flex items-center">
        <motion.div
          style={{ opacity: dashOpacity, scale: dashScale, y: dashY }}
          className="w-full max-w-5xl mx-auto perspective-[1000px] z-10 dashboard-preview-container relative"
        >
          <div className="absolute inset-0 bg-blue-500/10 filter blur-[100px] -z-10 rounded-full"></div>
          <DashboardMockup />
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section className="py-32 px-4 relative z-10 border-t border-gray-100 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none z-0"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Powerful capabilities. <br /> Zero complexity.</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">A modern architecture built for scalability, providing everything you need to manage an AI-powered contact center.</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeIn} className="bg-white backdrop-blur-sm p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-transparent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#0f172a]">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Roles & Management Section */}
      <section className="py-32 px-4 relative bg-gray-50 border-t border-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-emerald-50/50 -z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0"></div>
        <div className="absolute left-0 top-1/4 bg-blue-100/40 filter blur-[150px] -z-10 w-[800px] h-[800px] rounded-full transform -translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <motion.h2
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight"
              >
                Comprehensive Role Management
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg text-gray-500 mb-8"
              >
                AgenticCare is built with hierarchical access control, ensuring data privacy and operational security. Administrators oversee the platform, while supervisors directly manage their specialized AI teams.
              </motion.p>

              <div className="space-y-6">
                {roles.map((role, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15, duration: 0.5 }}
                    key={idx}
                    className="flex gap-4 p-5 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-all"
                  >
                    <div className="mt-1">{role.icon}</div>
                    <div>
                      <h4 className="text-xl font-bold mb-3 text-[#0f172a]">{role.title}</h4>
                      <ul className="space-y-2">
                        {role.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center text-gray-600 text-sm">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-gradient-to-br from-[#0f172a] to-[#0f172a] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-transparent"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>

                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-blue-400" />
                  Security & Architecture
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stack.map((item, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors">
                      <h5 className="font-semibold text-blue-300 mb-1">{item.name}</h5>
                      <p className="text-sm text-gray-300">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-3 text-emerald-400 font-semibold mb-2">
                    <Cpu className="w-5 h-5" />
                    Real-time Intelligence
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Powered by LiveKit WebRTC and Server-Sent Events (SSE), enabling instant transcription,
                    sub-second response times, and live dashboard metrics updating every 5 seconds.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-4 relative border-y border-gray-100 bg-[#fafcff] flex justify-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-blue-50/50 filter blur-[100px] z-0 pointer-events-none rounded-full"></div>
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Intelligent AI Analytics</h2>
            <p className="text-gray-500">Every interaction is summarized, tagged, and scored automatically.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row justify-around items-center bg-gray-50 backdrop-blur-lg p-12 rounded-3xl border border-gray-100 shadow-xl gap-10 md:gap-0"
          >
            <div className="text-center px-4">
              <h4 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#213448] to-gray-400 mb-2">85%</h4>
              <p className="text-lg text-[#213448] font-bold mb-1">First Contact Resolution</p>
              <p className="text-sm text-gray-500">Tracked with 3-day follow-ups</p>
            </div>
            <div className="hidden md:block w-px h-24 bg-gray-200"></div>
            <div className="text-center px-4">
              <h4 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#213448] to-gray-400 mb-2">
                <Zap className="inline w-8 h-8 text-yellow-500 mb-2 mr-1" />
                2.5x
              </h4>
              <p className="text-lg text-[#213448] font-bold mb-1">Faster Handle Time</p>
              <p className="text-sm text-gray-500">Continuous context processing</p>
            </div>
            <div className="hidden md:block w-px h-24 bg-gray-200"></div>
            <div className="text-center px-4">
              <h4 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#213448] to-gray-400 mb-2">98%</h4>
              <p className="text-lg text-[#213448] font-bold mb-1">CSAT Score</p>
              <p className="text-sm text-gray-500">Real-time sentiment analysis</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-4 relative bg-white border-b border-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/80 pointer-events-none z-0"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold mb-4">Platform Capabilities</h2>
            <p className="text-xl text-gray-500">Deep dive into the AgenticCare architecture</p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                key={index}
                className="border border-gray-200 rounded-2xl overflow-hidden bg-white backdrop-blur-sm"
              >
                <button
                  className="w-full flex justify-between items-center p-6 hover:bg-gray-50 transition-colors text-left font-semibold text-lg text-[#213448]"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                >
                  {faq.q}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-gray-600 border-t border-gray-100 leading-relaxed bg-gray-50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-40 px-4 text-center flex flex-col items-center relative overflow-hidden border-t border-gray-100">
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500 rounded-full filter blur-[200px] opacity-10"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-30 mix-blend-multiply"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative z-10"
        >
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-[#213448] drop-shadow-sm">Ready to transform your support?</h2>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">Join forward-thinking companies deploying AI agents today.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button className="px-10 py-5 rounded-full bg-[#213448] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
              Go to Dashboard
            </button>
            <button className="px-10 py-5 rounded-full border border-gray-300 text-[#213448] font-bold text-lg hover:bg-gray-50 transition-colors backdrop-blur-md">
              Read Documentation
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="py-8 px-8 flex flex-col md:flex-row justify-between items-center bg-gray-100 border-t border-gray-200 text-gray-500 text-sm">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Bot className="w-5 h-5 text-gray-500" />
          <span className="font-bold tracking-tight text-[#213448]">AgenticCare</span>
        </div>
        <p>© 2026 AgenticCare. Graduation Project Proof of Concept. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <span className="hover:text-[#213448] cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-[#213448] cursor-pointer transition-colors">Terms of Service</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
