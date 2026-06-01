import React, { useState, useEffect, useRef } from "react";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    Phone, MessageCircle, Timer, Target, Activity, TrendingUp,
    TrendingDown, Zap, Shield, HeartPulse, Users, ArrowUpRight,
    ArrowDownRight, BarChart3, Smile, Frown, Meh, MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
    analyticsAPI,
    type SupervisorAnalyticsData,
    type AdminAnalyticsData,
    type AgentAnalyticsData,
} from "../services/analyticsService";

// ── Helpers ──

function mapUiPeriodToApi(period: string): "today" | "week" | "month" | "all_time" {
    switch (period) {
        case "today": case "yesterday": return "today";
        case "last7days": return "week";
        case "last30days": case "thismonth": case "lastmonth": return "month";
        default: return "all_time";
    }
}

function secondsToHms(sec: number): string {
    if (sec == null || Number.isNaN(sec) || sec <= 0) return "0s";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function fmt(n: number, d = 1): string {
    if (n == null || Number.isNaN(Number(n))) return "0";
    return Number(n).toFixed(d);
}

const getColor = (v: number) => v < 40 ? "var(--danger)" : v < 70 ? "var(--warning)" : "var(--success)";

const getSentimentColor = (shift: number) => {
    if (shift > 0.2) return "var(--success)";
    if (shift < -0.2) return "var(--danger)";
    return "var(--warning)";
};

const getSentimentLabel = (shift: number) => {
    if (shift > 0.3) return "Improving";
    if (shift > 0) return "Slightly Up";
    if (shift < -0.3) return "Declining";
    if (shift < 0) return "Slightly Down";
    return "Stable";
};

// ── KPI Card ──

interface KpiCardProps {
    value: string; label: string; color: string;
    icon: React.ReactNode; index: number;
    subtitle?: string; trend?: string; trendUp?: boolean;
}

function KpiCard({ value, label, color, icon, index, subtitle, trend, trendUp }: KpiCardProps) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ease-out"
            style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))',
                border: '1px solid var(--glass-border)',
                boxShadow: hovered ? '0 12px 32px rgba(33,52,72,0.12)' : '0 4px 12px rgba(33,52,72,0.06)',
                transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
                animationDelay: `${index * 80}ms`,
                animation: 'fadeSlideUp 0.5s ease-out forwards', opacity: 0,
            }}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text-main)' }}>{icon}</span>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                        style={{
                            color: trendUp ? 'var(--success)' : 'var(--danger)',
                            background: trendUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        }}>
                        {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trend}
                    </div>
                )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
                style={{ color, fontFamily: "'Inter', sans-serif" }}>{value}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 transition-transform duration-300 origin-left"
                style={{
                    background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))`,
                    transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
                }} />
        </div>
    );
}

// ── Section Card ──

function SectionCard({ title, children, delay = 0, className = "" }: {
    title: string; children: React.ReactNode; delay?: number; className?: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${className}`}
            style={{
                background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))',
                border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(33,52,72,0.06)',
                animationDelay: `${delay}ms`, animation: 'fadeSlideUp 0.5s ease-out forwards', opacity: 0,
            }}>
            <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-main)', fontFamily: "'Inter', sans-serif" }}>
                {title}
            </h2>
            {children}
        </div>
    );
}

// ── Agent Table ──

function AgentTable({ agents }: { agents: AgentAnalyticsData[] }) {
    if (!agents.length) return <p style={{ color: 'var(--text-muted)' }}>No agents found.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {["Agent", "Type", "Interactions", "AHT", "FCR %", "CSAT", "Sentiment Δ", "Containment %", "Score"].map(h => (
                            <th key={h} className="text-left py-3 px-2 font-medium text-xs uppercase tracking-wider"
                                style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {agents.map((a, i) => (
                        <tr key={a.agent_id} className="transition-colors hover:bg-black/5"
                            style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td className="py-3 px-2 font-medium" style={{ color: 'var(--text-main)' }}>{a.agent_name}</td>
                            <td className="py-3 px-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        background: a.agent_type === 'voice' ? 'rgba(99,102,241,0.1)' : 'rgba(34,197,94,0.1)',
                                        color: a.agent_type === 'voice' ? 'rgb(99,102,241)' : 'rgb(34,197,94)',
                                    }}>
                                    {a.agent_type === 'voice' ? <Phone size={10} /> : <MessageCircle size={10} />}
                                    {a.agent_type}
                                </span>
                            </td>
                            <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{a.total_interactions}</td>
                            <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{secondsToHms(a.avg_handle_time)}</td>
                            <td className="py-3 px-2"><span style={{ color: getColor(a.fcr_percentage) }}>{fmt(a.fcr_percentage)}%</span></td>
                            <td className="py-3 px-2"><span style={{ color: getColor(a.avg_csat) }}>{fmt(a.avg_csat)}</span></td>
                            <td className="py-3 px-2">
                                <span className="flex items-center gap-1" style={{ color: getSentimentColor(a.sentiment_shift) }}>
                                    {a.sentiment_shift > 0 ? <TrendingUp size={12} /> : a.sentiment_shift < 0 ? <TrendingDown size={12} /> : <Meh size={12} />}
                                    {a.sentiment_shift > 0 ? '+' : ''}{fmt(a.sentiment_shift, 2)}
                                </span>
                            </td>
                            <td className="py-3 px-2"><span style={{ color: getColor(a.containment_rate) }}>{fmt(a.containment_rate)}%</span></td>
                            <td className="py-3 px-2"><span className="font-semibold" style={{ color: getColor(a.performance_score) }}>{fmt(a.performance_score, 0)}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Main Component ──

const AnalyticsPage: React.FC = () => {
    const { role, supervisorType, userId } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("today");
    const [isLoading, setIsLoading] = useState(true);
    const isSupervisor = role === 'supervisor';
    const cacheRef = useRef<Map<string, { ts: number; payload: { metrics: {
        fcr: number; totalCalls: number; aht: number; csat: number;
        performance: number; sentimentShift: number; containment: number;
        escalationTime: number; coachingFreq: number;
        chatResponseTime: number; chatResolution: number;
        voiceCount: number; chatCount: number;
        agents: AgentAnalyticsData[];
    }; peakHours: { hour: string; interactions: number }[] } }>>(new Map());

    // Unified metrics state
    const [metrics, setMetrics] = useState<{
        fcr: number; totalCalls: number; aht: number; csat: number;
        performance: number; sentimentShift: number; containment: number;
        escalationTime: number; coachingFreq: number;
        chatResponseTime: number; chatResolution: number;
        voiceCount: number; chatCount: number;
        agents: AgentAnalyticsData[];
    }>({
        fcr: 0, totalCalls: 0, aht: 0, csat: 0, performance: 0,
        sentimentShift: 0, containment: 0, escalationTime: 0, coachingFreq: 0,
        chatResponseTime: 0, chatResolution: 0, voiceCount: 0, chatCount: 0,
        agents: [],
    });
    const [peakHours, setPeakHours] = useState<{ hour: string; interactions: number }[]>([]);

    useEffect(() => {
        setIsLoading(true);
        const fetchAnalytics = async () => {
            try {
                if (!userId) return;
                const apiPeriod = mapUiPeriodToApi(selectedPeriod);
                const cacheKey = `${role}:${userId}:${apiPeriod}`;
                const cached = cacheRef.current.get(cacheKey);
                if (cached && Date.now() - cached.ts < 30000) {
                    setMetrics(cached.payload.metrics);
                    setPeakHours(cached.payload.peakHours);
                    return;
                }

                if (role === "admin") {
                    // Single backend call replaces N+1 loop
                    const res = await analyticsAPI.getAdminOverview(apiPeriod);
                    const d = res.data;
                    const next = {
                        fcr: Number(d.avg_fcr ?? 0) || 0,
                        totalCalls: Number(d.total_interactions ?? 0) || 0,
                        aht: Number(d.avg_handle_time ?? 0) || 0,
                        csat: Number(d.overall_csat ?? 0) || 0,
                        performance: Number(d.performance_score ?? 0) || 0,
                        sentimentShift: Number(d.avg_sentiment_shift ?? 0) || 0,
                        containment: Number(d.containment_rate ?? 0) || 0,
                        escalationTime: Number(d.avg_escalation_resolution_time ?? 0) || 0,
                        coachingFreq: Number(d.coaching_frequency ?? 0) || 0,
                        chatResponseTime: Number(d.chat_avg_response_time ?? 0) || 0,
                        chatResolution: Number(d.chat_resolution_rate ?? 0) || 0,
                        voiceCount: Number(d.total_voice_interactions ?? 0) || 0,
                        chatCount: Number(d.total_chat_interactions ?? 0) || 0,
                        agents: [],
                    };
                    const nextPeak = Array.isArray(d.peak_interaction_hours)
                        ? d.peak_interaction_hours.map((p) => ({
                            hour: String(p.hour ?? ""),
                            interactions: Number(p.interactions ?? 0) || 0,
                        }))
                        : [];
                    setMetrics(next);
                    setPeakHours(nextPeak);
                    cacheRef.current.set(cacheKey, {
                        ts: Date.now(),
                        payload: { metrics: next, peakHours: nextPeak },
                    });
                    return;
                }

                // Supervisor view
                const res = await analyticsAPI.getBySupervisor(userId, apiPeriod);
                const d = res.data;
                const next = {
                    fcr: Number(d.fcr_percentage ?? 0) || 0,
                    totalCalls: Number(d.total_interactions ?? 0) || 0,
                    aht: Number(d.avg_handle_time ?? 0) || 0,
                    csat: Number(d.avg_csat ?? 0) || 0,
                    performance: Number(d.performance_score ?? 0) || 0,
                    sentimentShift: Number(d.avg_sentiment_shift ?? 0) || 0,
                    containment: Number(d.containment_rate ?? 0) || 0,
                    escalationTime: Number(d.avg_escalation_resolution_time ?? 0) || 0,
                    coachingFreq: Number(d.coaching_frequency ?? 0) || 0,
                    chatResponseTime: Number(d.chat_avg_response_time ?? 0) || 0,
                    chatResolution: Number(d.chat_resolution_rate ?? 0) || 0,
                    voiceCount: Number(d.total_voice_interactions ?? 0) || 0,
                    chatCount: Number(d.total_chat_interactions ?? 0) || 0,
                    agents: d.agents_breakdown ?? [],
                };
                setMetrics(next);
                setPeakHours([]);
                cacheRef.current.set(cacheKey, {
                    ts: Date.now(),
                    payload: { metrics: next, peakHours: [] },
                });
            } catch (err) {
                console.error("Failed to fetch analytics", err);
                setMetrics({
                    fcr: 0, totalCalls: 0, aht: 0, csat: 0, performance: 0,
                    sentimentShift: 0, containment: 0, escalationTime: 0,
                    coachingFreq: 0, chatResponseTime: 0, chatResolution: 0,
                    voiceCount: 0, chatCount: 0, agents: [],
                });
                setPeakHours([]);
            } finally {
                setIsLoading(false);
            }
        };
        const t = setTimeout(fetchAnalytics, 200);
        return () => clearTimeout(t);
    }, [selectedPeriod, userId, role]);

    // Chart data
    const channelData = [
        { name: "Voice", value: metrics.voiceCount, fill: "hsl(var(--primary))" },
        { name: "Chat", value: metrics.chatCount, fill: "hsl(var(--accent))" },
    ];

    const sentimentData = [
        { label: "Sentiment Shift", value: metrics.sentimentShift },
    ];

    const peakData = peakHours;

    return (
        <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg)' }}>
            <style>{`
                @keyframes fadeSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="pt-6 px-4 sm:px-6 md:px-8 lg:px-12 pb-16">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-light mb-2"
                            style={{ color: 'var(--text-main)', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
                            Analytics Dashboard
                        </h1>
                        <p className="text-base md:text-lg font-medium"
                            style={{ color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                            {role === 'admin' ? 'System-Wide Performance Overview' : 'Team Performance Metrics'}
                        </p>
                    </header>

                    {/* Period Filter */}
                    <div className="mb-10 rounded-2xl p-4 md:p-5" style={{
                        background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))',
                        border: '0.5px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)',
                    }}>
                        <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                            className="w-full max-w-xs px-4 py-3 rounded-xl border font-medium focus:outline-none focus:ring-2 transition-all"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)',
                                color: 'var(--text-main)', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem' }}>
                            {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month"].map(opt => (
                                <option key={opt} value={opt.toLowerCase().replace(/\s+/g, "")}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="relative w-14 h-14 mb-5">
                                <div className="absolute inset-0 rounded-full"
                                    style={{ border: '3px solid var(--border)', borderTopColor: 'var(--text-main)',
                                        animation: 'spin 0.8s linear infinite' }} />
                            </div>
                            <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Primary KPI Grid ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                                <KpiCard value={`${fmt(metrics.fcr)}%`} label="First Contact Resolution"
                                    color={getColor(metrics.fcr)} icon={<Target size={20} strokeWidth={2} />} index={0} />
                                <KpiCard value={metrics.totalCalls.toLocaleString()} label="Total Interactions"
                                    color="var(--text-main)" icon={<Activity size={20} strokeWidth={2} />} index={1}
                                    subtitle={`${metrics.voiceCount} voice · ${metrics.chatCount} chat`} />
                                <KpiCard value={secondsToHms(metrics.aht)} label="Avg Handle Time"
                                    color={metrics.aht < 300 ? 'var(--success)' : metrics.aht < 600 ? 'var(--warning)' : 'var(--danger)'}
                                    icon={<Timer size={20} strokeWidth={2} />} index={2} />
                                <KpiCard value={`${fmt(metrics.csat)}%`} label="Customer Satisfaction"
                                    color={getColor(metrics.csat)} icon={<HeartPulse size={20} strokeWidth={2} />} index={3} />
                            </div>

                            {/* ── Secondary KPI Grid ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                                <KpiCard value={`${metrics.sentimentShift > 0 ? '+' : ''}${fmt(metrics.sentimentShift, 2)}`}
                                    label="Sentiment Shift" color={getSentimentColor(metrics.sentimentShift)}
                                    icon={metrics.sentimentShift >= 0 ? <Smile size={20} /> : <Frown size={20} />}
                                    index={4} subtitle={getSentimentLabel(metrics.sentimentShift)} />
                                <KpiCard value={`${fmt(metrics.containment)}%`} label="Containment Rate"
                                    color={getColor(metrics.containment)} icon={<Shield size={20} strokeWidth={2} />} index={5}
                                    subtitle="No escalation needed" />
                                <KpiCard value={secondsToHms(metrics.chatResponseTime)} label="Chat Response Time"
                                    color={metrics.chatResponseTime < 30 ? 'var(--success)' : metrics.chatResponseTime < 60 ? 'var(--warning)' : 'var(--danger)'}
                                    icon={<MessageSquare size={20} strokeWidth={2} />} index={6}
                                    subtitle="All channels" />
                                <KpiCard value={`${fmt(metrics.chatResolution)}%`} label="Chat Resolution Rate"
                                    color={getColor(metrics.chatResolution)} icon={<MessageCircle size={20} strokeWidth={2} />} index={7} />
                                <KpiCard value={fmt(metrics.coachingFreq, 1)} label="Coaching per Agent"
                                    color="var(--text-main)" icon={<Users size={20} strokeWidth={2} />} index={8}
                                    subtitle="Whisper interventions" />
                            </div>

                            {/* ── Charts Row ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Channel Distribution */}
                                <SectionCard title="Channel Distribution" delay={500}>
                                    <div className="flex items-center justify-center" style={{ minHeight: 220 }}>
                                        {(metrics.voiceCount + metrics.chatCount) > 0 ? (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <PieChart>
                                                    <Pie data={channelData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                                        paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                        {channelData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{
                                                        backgroundColor: 'var(--surface)', border: '0.5px solid var(--border)',
                                                        borderRadius: 'var(--radius-md)', fontFamily: "'Inter', sans-serif",
                                                    }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No interactions yet</p>
                                        )}
                                    </div>
                                </SectionCard>

                                {/* Performance Overview */}
                                <SectionCard title="Performance Overview" delay={600}>
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--primary)/0.05))' }}>
                                            <Activity size={24} style={{ color: 'var(--text-main)' }} />
                                        </div>
                                        <div className="font-bold text-5xl md:text-6xl mb-3 transition-all"
                                            style={{ color: getColor(metrics.performance), fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
                                            {fmt(metrics.performance, 0)}%
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            {role === 'admin' ? 'System Performance' : 'Supervisor Performance'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <span>Escalation Avg: {secondsToHms(metrics.escalationTime)}</span>
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>

                            {/* ── Agent Comparison Table (Supervisor only) ── */}
                            {isSupervisor && metrics.agents.length > 0 && (
                                <SectionCard title="Agent Performance Breakdown" delay={700}>
                                    <AgentTable agents={metrics.agents} />
                                </SectionCard>
                            )}

                            {/* ── Peak Interaction Time (Admin only) ── */}
                            {role === "admin" && (
                                <div className="mt-6">
                                    <SectionCard title="Peak Interaction Time" delay={750}>
                                        {peakData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <LineChart data={peakData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                                    <XAxis dataKey="hour" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                                                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'var(--surface)',
                                                            border: '0.5px solid var(--border)',
                                                            borderRadius: 'var(--radius-md)',
                                                            fontFamily: "'Inter', sans-serif",
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="interactions"
                                                        stroke="hsl(var(--primary))"
                                                        strokeWidth={2}
                                                        dot={{ r: 2 }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No peak-time data available</p>
                                        )}
                                    </SectionCard>
                                </div>
                            )}

                            {/* ── Agent Bar Chart (Supervisor only) ── */}
                            {isSupervisor && metrics.agents.length > 1 && (
                                <div className="mt-6">
                                    <SectionCard title="Agent Comparison" delay={800}>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={metrics.agents.map(a => ({
                                                name: a.agent_name.length > 12 ? a.agent_name.slice(0, 12) + '…' : a.agent_name,
                                                FCR: Number(a.fcr_percentage.toFixed(1)),
                                                CSAT: Number(a.avg_csat.toFixed(1)),
                                                Score: Number(a.performance_score.toFixed(1)),
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                                                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                                                <Tooltip contentStyle={{
                                                    backgroundColor: 'var(--surface)', border: '0.5px solid var(--border)',
                                                    borderRadius: 'var(--radius-md)', fontFamily: "'Inter', sans-serif",
                                                }} />
                                                <Legend />
                                                <Bar dataKey="FCR" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="CSAT" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Score" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </SectionCard>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;