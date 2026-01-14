import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {  Calendar, Bell } from "lucide-react";
import Notifications from "./Notifications";

// ==================
// Helper Functions
// ==================

const getColor = (value: number) => {
  if (value < 40) return "text-red-600";
  if (value < 70) return "text-amber-500";
  return "text-teal-600";
};

const getResolutionTimeColor = (timeStr: string) => {
  if (!timeStr) return "text-teal-600";

  try {
    const parts = timeStr.split(":");
    const minutes = parseInt(parts[1]) || 0;

    if (minutes < 5) return "text-teal-600";
    if (minutes < 10) return "text-amber-500";
    return "text-red-600";
  } catch {
    return "text-teal-600";
  }
};

const formatResolutionTime = (timeStr: string): string => {
  if (!timeStr) return "00:00:00";
  if (timeStr.endsWith(":")) return timeStr + "00";

  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return `00:${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(
      2,
      "0"
    )}:${parts[2].padStart(2, "0")}`;
  }
  return timeStr;
};

// ==================
// KPI Card Component (موحد لكل الكروت)
// ==================

interface KpiCardProps {
  value: string;
  label: string;
  color: string;
}
;
function KpiCard({ value, label, color }: KpiCardProps) {
  return (
    <div className="...">
      <div
        className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold ${color} mb-6`}
      >
        {value}
      </div>
      <p className="text-xl text-gray-700 font-semibold">{label}</p>
    </div>
  );
}
// ==================
// Main Component
// ==================

const AnalyticsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const [chartData, setChartData] = useState<
    { time: string; interactions: number }[]
  >([]);

 

  const [metrics, setMetrics] = useState({
    fcr: 0,
    totalCalls: 0,
    resolutionTime: "00:00:00",
    supervisorPerformance: 0,
    csat: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // ──────────────────────────────────────────────
      //  الـ API
      // ──────────────────────────────────────────────

      // try {
      //   const peakRes = await fetch(`/api/analytics/peak?period=${selectedPeriod}`);
      //   if (peakRes.ok) {
      //     const data = await peakRes.json();
      //     setChartData(data);
      //   }
      // } catch {}

      // try {
      //   const metricsRes = await fetch(`/api/analytics/metrics?period=${selectedPeriod}`);
      //   if (metricsRes.ok) {
      //     const data = await metricsRes.json();
      //     setMetrics(data);
      //   }
      // } catch {}

      // try {
      //   const supRes = await fetch(`/api/supervisors`);
      //   if (supRes.ok) {
      //     const data = await supRes.json();
      //     setSupervisors(data);
      //   }
      // } catch {}

      // ──────────────────────────────────────────────
      // نهاية الـ API
      // ──────────────────────────────────────────────
      setTimeout(() => {
        setMetrics({
          fcr: 68,
          totalCalls: 3427,
          resolutionTime: "00:07:42", 
          supervisorPerformance: 62,
          csat: 84,
        });

        setChartData(
          ["8am", "10am", "12pm", "2pm", "4pm", "6pm"].map((time) => ({
            time,
            interactions: 60 + Math.floor(Math.random() * 100),
          }))
        );

        setIsLoading(false);
      }, 800);
    };

    loadData();
  }, [selectedPeriod, selectedType, selectedDate]);

  // const csatOffset = 408 - (metrics.csat / 100) * 408;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div
      className="bg-linear-to-br from-teal-50 to-cyan-50 min-h-screen p-4 sm:p-6 md:p-8 lg:p-12"
      dir="ltr"
    >
      {/* Topbar */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-md z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button className="text-teal-700">
              <div className="w-6 h-0.5 bg-teal-700 mb-1"></div>
              <div className="w-6 h-0.5 bg-teal-700 mb-1"></div>
              <div className="w-6 h-0.5 bg-teal-700"></div>
            </button>
            <h1 className="text-2xl font-semibold text-teal-800">Analytics</h1>
          </div>

          <div
            className="relative cursor-pointer"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <Bell className="w-8 h-8 text-teal-700 hover:text-teal-600 transition" />
            {/* لو عندك عدد إشعارات حقيقي ضيفه هنا */}
          </div>
        </div>
      </div>

      <div className="pt-20 p-4 sm:p-6 md:p-8 lg:p-12 mb-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-extralight text-transparent bg-clip-text bg-linear-to-r from-teal-700 to-teal-500 mb-4">
              Analytics Dashboard
            </h1>
            <p className="text-xl text-teal-700 font-medium">
              Real-time Customer Service Performance
            </p>
          </header>

          {/* Filters */}
          <div className="mb-12 bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-teal-100 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 items-center">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-6 py-4 rounded-2xl bg-white/90 border border-teal-200 shadow-sm text-teal-800 font-medium focus:outline-none focus:ring-4 focus:ring-teal-300"
            >
              {[
                "Today",
                "Yesterday",
                "Last 7 Days",
                "Last 30 Days",
                "This Month",
                "Last Month",
              ].map((opt) => (
                <option key={opt} value={opt.toLowerCase().replace(/\s+/g, "")}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="relative flex-1 lg:flex-initial min-w-55">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600 w-5 h-5 pointer-events-none " />

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 rounded-2xl
      border border-teal-200 bg-white/90
      focus:outline-none focus:ring-4 focus:ring-teal-300 text-teal-800
      [&::-webkit-calendar-picker-indicator]:opacity-0
      [&::-webkit-calendar-picker-indicator]:cursor-pointer
      hover:border-teal-300 transition-colors`}
                placeholder="Choose date..."
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-6 py-4 rounded-2xl bg-white/90 border border-teal-200 shadow-sm text-teal-800 font-medium focus:outline-none focus:ring-4 focus:ring-teal-300"
            >
              <option value="all">All Types</option>
              <option value="voice">Voice</option>
              <option value="chat">Chat</option>
            </select>
          </div>

          {/* Main KPIs */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 xl:gap-10 mb-12 lg:mb-16">
            <KpiCard
              value={`${metrics.fcr}%`}
              label="First Contact Resolution (FCR)"
              color={getColor(metrics.fcr)}
            />

            <KpiCard
              value={metrics.totalCalls.toLocaleString()}
              label="Total Calls"
              color="text-teal-600"
            />

            <KpiCard
              value={formatResolutionTime(metrics.resolutionTime)}
              label="Avg. Resolution Time"
              color={getResolutionTimeColor(metrics.resolutionTime)}
            />
          </div>

          {/* Secondary Row */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 xl:gap-26 mb-12 lg:mb-16">
            {/* 1. Peak Interaction Times Chart */}
            <div
              className="
    backdrop-blur-md bg-white/80 rounded-3xl 
    p-6 md:p-8 lg:p-10 xl:p-12 
    shadow-xl border border-teal-100 
    min-h-[380px] md:min-h-[420px] lg:min-h-[460px] xl:min-h-[500px] 
    min-w-[320px] lg:min-w-[380px] xl:min-w-[350px]
    max-w-[100%] lg:max-w-none
    flex flex-col justify-between
  "
            >
              <h2 className="text-xl md:text-2xl lg:text-2.5xl font-semibold text-teal-800 mb-6 text-center">
                Peak Interaction Times
              </h2>
              <div className="flex-1 min-h-70">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f7fa" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="interactions"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#0d9488" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Supervisor Performance () */}
            <div
              className="
    backdrop-blur-md bg-white/80 rounded-3xl 
    p-6 md:p-8 lg:p-10 xl:p-12 
    text-center shadow-xl border border-teal-100 
   min-h-[380px] md:min-h-[420px] lg:min-h-[460px] xl:min-h-[500px] 
    min-w-[320px] lg:min-w-[380px] xl:min-w-[350px]
    max-w-[100%] lg:max-w-none
    flex flex-col justify-center items-center
  "
            >
              <div
                className={`
        font-extrabold ${getColor(metrics.supervisorPerformance)}
        text-[clamp(3rem,8vw,5rem)] md:text-[clamp(4rem,9vw,6rem)] lg:text-[clamp(5rem,8vw,7rem)]
        mb-6
      `}
              >
                {metrics.supervisorPerformance}%
              </div>
              <p className="text-xl text-gray-700 font-semibold">
                Overall Supervisor Performance
              </p>
            </div>

            {/* 3. CSAT Gauge (direct card) */}
            <div
              className="
    backdrop-blur-md bg-white/80 rounded-3xl 
    p-6 md:p-8 lg:p-10 xl:p-12 
    shadow-xl border border-teal-100 
   min-h-[380px] md:min-h-[420px] lg:min-h-[460px] xl:min-h-[500px] 
    min-w-[320px] lg:min-w-[380px] xl:min-w-[350px]
    max-w-[100%] lg:max-w-none
    flex flex-col justify-center items-center
  "
            >
              <h2 className="text-xl md:text-2xl lg:text-2.5xl font-semibold text-teal-800 mb-6 text-center">
                Average Customer Satisfaction (CSAT)
              </h2>
              <div className="flex-1 flex items-center justify-center w-full">
                <div className="relative w-full max-w-[320px] aspect-4/3">
                  {/* <svg className="w-full h-full" viewBox="0 0 320 180">
                    <path
                      d="M 30 150 A 130 130 0 0 1 290 150"
                      stroke="#e0f2fe"
                      strokeWidth="32"
                      fill="none"
                    />
                    <path
                      d="M 30 150 A 130 130 0 0 1 290 150"
                      stroke={getColor(metrics.csat).replace("text-", "#")}
                      strokeWidth="32"
                      fill="none"
                      strokeDasharray="408"
                      strokeDashoffset={csatOffset}
                      strokeLinecap="round"
                    />
                  </svg> */}
                  <div className="absolute inset-0 flex items-center justify-center pb-10">
                    <span
                      className={`
              font-extrabold ${getColor(metrics.csat)}
              text-[clamp(3.5rem,8vw,5.5rem)] md:text-[clamp(4.5rem,9vw,6rem)] lg:text-[clamp(5rem,8vw,7rem)]
            `}
                    >
                      {metrics.csat}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Notifications
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};

export default AnalyticsPage;
