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
import { Calendar, Bell } from "lucide-react";
// import Notifications from "./Notifications";

// Since Notifications component is missing in the file view, I'll create a mock one or remove it if not critical. 
// Assuming it's needed, I'll mock it inline or create a separate file if I see it.
// I will comment it out for now to ensure compilation and then can fix if needed.

const NotificationsMock = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', top: 60, right: 20, background: 'white', padding: 20, boxShadow: '0 0 10px rgba(0,0,0,0.1)', zIndex: 100 }}>
            <h3>Notifications</h3>
            <p>No new notifications</p>
            <button onClick={onClose}>Close</button>
        </div>
    )
}


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
    if (!timeStr) return "0s";

    // Handle "HH:MM:SS"
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    // Handle "MM:SS"
    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    return timeStr;
};

// ==================
// KPI Card Component
// ==================

interface KpiCardProps {
    value: string;
    label: string;
    color: string;
}

function KpiCard({ value, label, color }: KpiCardProps) {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-md border border-teal-50 flex flex-col items-center justify-center text-center h-full">
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

            // Simulate API call
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
                <div className="loader">Loading...</div>
            </div>
        );
    }

    return (
        <div
            className="bg-gradient-to-br from-teal-50 to-cyan-50 min-h-screen  w-full"
            dir="ltr"
        >


            <div className="pt-8 p-4 sm:p-6 md:p-8 lg:p-12 mb-16">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="text-center mb-10">
                        <h1 className="text-4xl md:text-5xl font-light text-teal-800 mb-2">
                            Analytics Dashboard
                        </h1>
                        <p className="text-lg text-teal-600 font-medium">
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
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`w-full px-4 py-3.5 rounded-2xl
      border border-teal-200 bg-white/90
      focus:outline-none focus:ring-4 focus:ring-teal-300 text-teal-800
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-26 mb-12 lg:mb-16">
                        {/* 1. Peak Interaction Times Chart */}
                        <div
                            className="
    backdrop-blur-md bg-white/80 rounded-3xl 
    p-6 md:p-8 lg:p-10 xl:p-12 
    shadow-xl border border-teal-100 
    min-h-[380px]
    flex flex-col justify-between
  "
                        >
                            <h2 className="text-xl md:text-2xl lg:text-2.5xl font-semibold text-teal-800 mb-6 text-center">
                                Peak Interaction Times
                            </h2>
                            <div className="flex-1" style={{ minHeight: '300px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height={300}>
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

                        {/* 2. Supervisor Performance */}
                        <div
                            className="
    backdrop-blur-md bg-white/80 rounded-3xl 
    p-6 md:p-8 lg:p-10 xl:p-12 
    text-center shadow-xl border border-teal-100 
    min-h-[380px]
    flex flex-col justify-center items-center
  "
                        >
                            <div
                                className={`
        font-extrabold ${getColor(metrics.supervisorPerformance)}
        text-6xl
        mb-6
      `}
                            >
                                {metrics.supervisorPerformance}%
                            </div>
                            <p className="text-xl text-gray-700 font-semibold">
                                Overall Supervisor Performance
                            </p>
                        </div>

                    </div>
                </div>
            </div>
            <NotificationsMock
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
            />
        </div>
    );
};

export default AnalyticsPage;
