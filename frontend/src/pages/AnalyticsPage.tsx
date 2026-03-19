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
import { Phone, MessageCircle, Timer, Target, Activity, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { analyticsAPI } from "../services/analyticsService";

// ==================
// Helper Functions
// ==================

const getColor = (value: number) => {
    if (value < 40) return "var(--danger)";
    if (value < 70) return "var(--warning)";
    return "var(--success)";
};

const getResolutionTimeColor = (timeStr: string) => {
    if (!timeStr) return "var(--success)";
    try {
        const parts = timeStr.split(":");
        const minutes = parseInt(parts[1]) || 0;
        if (minutes < 5) return "var(--success)";
        if (minutes < 10) return "var(--warning)";
        return "var(--danger)";
    } catch {
        return "var(--warning)";
    }
};

const formatResolutionTime = (timeStr: string): string => {
    if (!timeStr) return "0s";
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }
    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }
    return timeStr;
};

// ==================
// Glassmorphism KPI Card Component
// ==================

interface KpiCardProps {
    value: string;
    label: string;
    color: string;
    icon: React.ReactNode;
    accentIcon: React.ReactNode;
    index: number;
    trend?: string;
}

function KpiCard({ value, label, color, icon, accentIcon, index, trend }: KpiCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ease-out"
            style={{
                background: 'var(--glass-bg)',
                backdropFilter: `blur(var(--glass-blur))`,
                WebkitBackdropFilter: `blur(var(--glass-blur))`,
                border: '1px solid var(--glass-border)',
                boxShadow: isHovered 
                    ? '0 12px 32px rgba(33, 52, 72, 0.12)' 
                    : '0 4px 12px rgba(33, 52, 72, 0.06)',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                animationDelay: `${index * 100}ms`,
                animation: 'fadeSlideUp 0.6s ease-out forwards',
                opacity: 0,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Clean background - no inner shadows or glows */}

            {/* Icon container with duo-tone */}
            <div className="flex justify-center mb-5">
                <div 
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                    style={{
                        background: isHovered 
                            ? 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))' 
                            : 'var(--bg-dark)',
                        boxShadow: isHovered 
                            ? '0 8px 24px hsl(var(--primary) / 0.15)' 
                            : '0 2px 8px rgba(0, 0, 0, 0.04)',
                        border: '1px solid var(--glass-border)',
                    }}
                >
                    {/* Background layer (lighter duo-tone) */}
                    <span 
                        className="absolute transition-all duration-300"
                        style={{ 
                            color: 'var(--text-muted)', 
                            opacity: 0.3,
                            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        }}
                    >
                        {icon}
                    </span>
                    {/* Foreground layer (flat, no shadow) */}
                    <span 
                        className="relative z-10 transition-all duration-300"
                        style={{ 
                            color: 'var(--text-main)',
                        }}
                    >
                        {accentIcon}
                    </span>
                </div>
            </div>

            {/* Value */}
            <div className="text-center mb-2">
                <p
                    className="text-3xl sm:text-4xl font-bold tracking-tight transition-all duration-300"
                    style={{ 
                        color,
                        fontFamily: "'Inter', sans-serif",
                        textShadow: isHovered ? `0 2px 12px ${color}40` : 'none',
                    }}
                >
                    {value}
                </p>
            </div>

            {/* Label */}
            <p 
                className="text-center text-sm font-medium tracking-wide"
                style={{ 
                    color: 'var(--text-secondary)',
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {label}
            </p>

            {/* Trend indicator */}
            {trend && (
                <div 
                    className="flex items-center justify-center gap-1 mt-3 text-xs font-medium"
                    style={{ color: 'var(--success)' }}
                >
                    <TrendingUp size={12} />
                    <span>{trend}</span>
                </div>
            )}

            {/* Bottom gradient bar */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-1 transition-transform duration-300 origin-left"
                style={{
                    background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))`,
                    transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
                }}
            />
        </div>
    );
}

// ==================
// Glassmorphism Chart Card
// ==================

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
    delay?: number;
}

function ChartCard({ title, children, delay = 0 }: ChartCardProps) {
    return (
        <div
            className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{
                background: 'var(--glass-bg)',
                backdropFilter: `blur(var(--glass-blur))`,
                WebkitBackdropFilter: `blur(var(--glass-blur))`,
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 12px rgba(33, 52, 72, 0.06)',
                animationDelay: `${delay}ms`,
                animation: 'fadeSlideUp 0.6s ease-out forwards',
                opacity: 0,
            }}
        >
            <h2 
                className="text-lg md:text-xl font-semibold mb-6 text-center"
                style={{ 
                    color: 'var(--text-main)',
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {title}
            </h2>
            {children}
            
            {/* Subtle corner accent */}
            <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-5"
                style={{
                    background: 'radial-gradient(circle at top right, hsl(var(--primary)), transparent 70%)',
                }}
            />
        </div>
    );
}

// ==================
// Main Component
// ==================

const AnalyticsPage: React.FC = () => {
    const { role, supervisorType, userId } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("today");
    const [selectedDate, setSelectedDate] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const isSupervisor = role === 'supervisor';
    const [selectedType, setSelectedType] = useState<string>(
        isSupervisor ? supervisorType : 'voice'
    );

    useEffect(() => {
        if (isSupervisor) {
            setSelectedType(supervisorType);
        }
    }, [isSupervisor, supervisorType]);

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

    useEffect(() => {
        setIsLoading(true);
        const fetchAnalytics = async () => {
            try {
                if (userId) {
                    const res = await analyticsAPI.getBySupervisor(userId);
                    const data = res.data;
                    setMetrics({
                        fcr: data.fcr ?? 0,
                        totalCalls: data.total_interactions ?? 0,
                        resolutionTime: data.avg_resolution_time ?? "00:00:00",
                        supervisorPerformance: data.performance ?? 0,
                        csat: data.csat ?? 0,
                    });
                    if (data.chart_data && Array.isArray(data.chart_data)) {
                        setChartData(data.chart_data);
                    } else {
                        setChartData(
                            ["8am", "10am", "12pm", "2pm", "4pm", "6pm"].map((time) => ({
                                time,
                                interactions: 0,
                            }))
                        );
                    }
                }
            } catch (err) {
                console.error('Failed to fetch analytics', err);
                // Show zeroed data on error
                setMetrics({ fcr: 0, totalCalls: 0, resolutionTime: "00:00:00", supervisorPerformance: 0, csat: 0 });
                setChartData(["8am", "10am", "12pm", "2pm", "4pm", "6pm"].map((time) => ({ time, interactions: 0 })));
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [selectedPeriod, selectedType, selectedDate, userId]);

    return (
        <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg)' }}>
            {/* CSS Keyframes */}
            <style>{`
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `}</style>

            <div className="pt-6 px-4 sm:px-6 md:px-8 lg:px-12 pb-16">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="text-center mb-8 md:mb-10">
                        <h1 
                            className="text-3xl md:text-4xl lg:text-5xl font-light mb-2"
                            style={{ 
                                color: 'var(--text-main)',
                                fontFamily: "'Inter', sans-serif",
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Analytics Dashboard
                        </h1>
                        <p 
                            className="text-base md:text-lg font-medium"
                            style={{ 
                                color: 'var(--text-secondary)',
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            Real-time Customer Service Performance
                        </p>
                    </header>

                    {/* Filters - Glassmorphism */}
                    <div 
                        className="mb-10 md:mb-12 rounded-2xl p-4 md:p-6"
                        style={{
                            background: 'var(--glass-bg)',
                            backdropFilter: `blur(var(--glass-blur))`,
                            WebkitBackdropFilter: `blur(var(--glass-blur))`,
                            border: '0.5px solid var(--glass-border)',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <div 
                            className="grid gap-4"
                            style={{
                                gridTemplateColumns: isSupervisor 
                                    ? 'repeat(auto-fit, minmax(200px, 1fr))' 
                                    : 'repeat(auto-fit, minmax(180px, 1fr))',
                            }}
                        >
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="w-full px-4 py-3 md:py-3.5 rounded-xl border font-medium focus:outline-none focus:ring-2 transition-all duration-200"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-main)',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '0.9rem',
                                }}
                            >
                                {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month"].map((opt) => (
                                    <option key={opt} value={opt.toLowerCase().replace(/\s+/g, "")}>
                                        {opt}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-4 py-3 md:py-3.5 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-main)',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '0.9rem',
                                }}
                            />

                            {!isSupervisor && (
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-4 py-3 md:py-3.5 rounded-xl border font-medium focus:outline-none focus:ring-2 transition-all duration-200"
                                    style={{
                                        backgroundColor: 'var(--surface)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--text-main)',
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <option value="voice">Voice</option>
                                    <option value="chat">Chat</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 md:py-32">
                            <div className="relative w-14 h-14 mb-5">
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        border: '3px solid var(--border)',
                                        borderTopColor: 'var(--text-main)',
                                        animation: 'spin 0.8s linear infinite',
                                    }} 
                                />
                                <div 
                                    className="absolute inset-2 rounded-full"
                                    style={{
                                        border: '2px solid transparent',
                                        borderTopColor: 'var(--text-secondary)',
                                        animation: 'spin 1.2s linear infinite reverse',
                                    }} 
                                />
                            </div>
                            <p 
                                className="text-base font-medium"
                                style={{ 
                                    color: 'var(--text-secondary)',
                                    fontFamily: "'Inter', sans-serif",
                                }}
                            >
                                Loading analytics...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards Grid - Responsive */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                                <KpiCard
                                    value={`${metrics.fcr}%`}
                                    label="First Contact Resolution"
                                    color={getColor(metrics.fcr)}
                                    icon={<Target size={28} strokeWidth={1.2} />}
                                    accentIcon={<Target size={24} strokeWidth={2.2} />}
                                    index={0}
                                    trend="+4.2% vs last week"
                                />
                                <KpiCard
                                    value={metrics.totalCalls.toLocaleString()}
                                    label={selectedType === 'voice' ? 'Total Calls' : 'Total Chats'}
                                    color="var(--text-main)"
                                    icon={selectedType === 'voice' ? <Phone size={28} strokeWidth={1.2} /> : <MessageCircle size={28} strokeWidth={1.2} />}
                                    accentIcon={selectedType === 'voice' ? <Phone size={24} strokeWidth={2.2} /> : <MessageCircle size={24} strokeWidth={2.2} />}
                                    index={1}
                                    trend="+12% vs yesterday"
                                />
                                <KpiCard
                                    value={formatResolutionTime(metrics.resolutionTime)}
                                    label="Avg. Resolution Time"
                                    color={getResolutionTimeColor(metrics.resolutionTime)}
                                    icon={<Timer size={28} strokeWidth={1.2} />}
                                    accentIcon={<Timer size={24} strokeWidth={2.2} />}
                                    index={2}
                                    trend="-8% improvement"
                                />
                            </div>

                            {/* Charts Row - Responsive */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                                {/* Peak Interaction Times Chart */}
                                <ChartCard title="Peak Interaction Times" delay={400}>
                                    <div style={{ minHeight: 260 }}>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                                <XAxis 
                                                    dataKey="time" 
                                                    stroke="var(--text-secondary)"
                                                    tick={{ fontSize: 12, fontFamily: "'Inter', sans-serif" }}
                                                />
                                                <YAxis 
                                                    stroke="var(--text-secondary)"
                                                    tick={{ fontSize: 12, fontFamily: "'Inter', sans-serif" }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'var(--surface)',
                                                        border: '0.5px solid var(--border)',
                                                        color: 'var(--text-main)',
                                                        borderRadius: 'var(--radius-md)',
                                                        fontFamily: "'Inter', sans-serif",
                                                        boxShadow: 'var(--shadow-lg)',
                                                    }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="interactions"
                                                    stroke="var(--text-main)"
                                                    strokeWidth={2.5}
                                                    dot={{ r: 4, fill: "var(--text-main)", strokeWidth: 0 }}
                                                    activeDot={{ r: 6, fill: "var(--text-main)", stroke: "var(--bg)", strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                {/* Supervisor Performance */}
                                <ChartCard title="Overall Supervisor Performance" delay={500}>
                                    <div className="flex flex-col items-center justify-center py-6">
                                        {/* Icon - flat, no shadow */}
                                        <div 
                                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                                            style={{
                                                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))',
                                            }}
                                        >
                                            <span style={{ color: 'var(--text-muted)', opacity: 0.3, position: 'absolute' }}>
                                                <Activity size={28} strokeWidth={1.2} />
                                            </span>
                                            <span style={{ color: 'var(--text-main)', position: 'relative' }}>
                                                <Activity size={24} strokeWidth={2.2} />
                                            </span>
                                        </div>

                                        {/* Large performance value */}
                                        <div
                                            className="font-bold text-5xl md:text-6xl mb-4 transition-all duration-300"
                                            style={{ 
                                                color: getColor(metrics.supervisorPerformance),
                                                fontFamily: "'Inter', sans-serif",
                                                letterSpacing: '-0.02em',
                                            }}
                                        >
                                            {metrics.supervisorPerformance}%
                                        </div>

                                        {/* Trend */}
                                        <div 
                                            className="flex items-center gap-1.5 text-sm font-medium"
                                            style={{ color: 'var(--success)' }}
                                        >
                                            <Zap size={14} />
                                            <span>+5.3% this month</span>
                                        </div>
                                    </div>
                                </ChartCard>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;