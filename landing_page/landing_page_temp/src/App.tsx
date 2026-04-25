import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  MessageSquare,
  Mic,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  PlayCircle
} from 'lucide-react';

const App: React.FC = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
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

  return (
    <div className="min-h-screen bg-white text-[#213448] overflow-x-hidden font-sans">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-8 md:px-16 py-6 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-[#213448]" />
          <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#213448] to-blue-600">
            AgenticCare
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-6 py-2 rounded-full font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4 md:px-8 flex flex-col items-center text-center min-h-[90vh]">
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl flex flex-col items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-8 border border-blue-100"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            Next-Gen Customer Service
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6"
          >
            Elevate Support with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
              Autonomous AI Agents
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed"
          >
            Deploy intelligent voice and chat agents that resolve issues instantly, 
            learn continuously, and collaborate with your human team in real-time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button className="px-8 py-4 rounded-full bg-[#213448] text-white font-semibold text-lg flex items-center justify-center group hover:shadow-xl hover:-translate-y-1 transition-all">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 rounded-full border border-gray-200 font-semibold text-lg flex items-center justify-center group hover:bg-gray-50 transition-colors">
              <PlayCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform text-gray-600" />
              Watch Demo
            </button>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-20 w-full max-w-5xl perspective-[1000px] z-10 dashboard-preview-container">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="dashboard-preview"
          >
            <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-green-400"></span>
              </div>
              <div className="flex-1 text-center text-xs font-medium text-gray-400 mr-10">Supervisor Dashboard</div>
            </div>
            <div className="flex h-[400px] bg-white">
              <div className="w-48 border-r border-gray-100 bg-gray-50"></div>
              <div className="flex-1 p-8 flex flex-col gap-8">
                <div className="h-10 w-1/3 bg-gray-50 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-6 h-32 flex flex-col justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100"></div>
                        <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                      </div>
                      <div className="pulse-line"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 bg-gray-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Powerful capabilities. <br/> Zero complexity.</h2>
            <p className="text-xl text-gray-500">Everything you need to manage an AI-powered contact center.</p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeIn} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 bg-white flex justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-5xl flex flex-col md:flex-row justify-around items-center bg-white p-12 rounded-3xl border border-gray-100 shadow-lg gap-10 md:gap-0"
        >
          <div className="text-center">
            <h4 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#213448] to-gray-400 mb-2">85%</h4>
            <p className="text-lg text-gray-500 font-medium">First Contact Resolution</p>
          </div>
          <div className="hidden md:block w-px h-20 bg-gray-200"></div>
          <div className="text-center">
            <h4 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#213448] to-gray-400 mb-2">
              <Zap className="inline w-8 h-8 text-yellow-400 mb-2 mr-1" /> 
              2.5x
            </h4>
            <p className="text-lg text-gray-500 font-medium">Faster Handle Time</p>
          </div>
          <div className="hidden md:block w-px h-20 bg-gray-200"></div>
          <div className="text-center">
            <h4 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#213448] to-gray-400 mb-2">98%</h4>
            <p className="text-lg text-gray-500 font-medium">CSAT Score</p>
          </div>
        </motion.div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-4 bg-gray-50 text-center flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Ready to transform your customer service?</h2>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl">Join forward-thinking companies deploying AI agents today.</p>
        <button className="px-10 py-5 rounded-full bg-[#213448] text-white font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
          Get Started Now
        </button>
      </section>
      
      <footer className="py-8 text-center bg-white border-t border-gray-100 text-gray-400">
        <p>© 2026 AgenticCare. All rights reserved. Graduation Project POC.</p>
      </footer>
    </div>
  );
};

export default App;
