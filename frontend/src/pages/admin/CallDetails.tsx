import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  Divider,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Phone, Clock, User, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { archivesAPI } from '../../services/archivesService';
import { displayPhoneOrSynthetic } from '../../utils/phoneDisplay';

function formatIssues(issues: unknown): string {
  if (issues == null) return '—';
  if (Array.isArray(issues)) {
    if (issues.length === 0) return '—';
    return issues
      .map((item) => {
        if (item && typeof item === 'object' && 'type' in item) {
          return String((item as { type: string }).type);
        }
        return String(item);
      })
      .join(', ');
  }
  return '—';
}

function formatSentimentLabel(s: string): string {
  const t = s.toLowerCase();
  if (t === 'good') return 'Good';
  if (t === 'neutral') return 'Neutral';
  if (t === 'critical' || t === 'bad') return 'Critical';
  return s.trim() ? s : '—';
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(Number(sec))) return '—';
  const s = Math.max(0, Math.floor(Number(sec)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

const CallDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Missing call id.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await archivesAPI.getById(id);
        if (!cancelled) setRow(res.data as Record<string, unknown>);
      } catch {
        if (!cancelled) setError('Could not load this archive entry.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', bgcolor: 'var(--bg)' }}>
        <CircularProgress sx={{ color: 'var(--accent)' }} />
      </Box>
    );
  }

  if (error || !row) {
    return (
      <Box sx={{ p: 4, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
        <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/archive')} sx={{ mb: 2, color: 'var(--text-main)' }}>
          Back to Archive
        </Button>
        <Typography color="var(--text-secondary)">{error ?? 'Not found.'}</Typography>
      </Box>
    );
  }

  const seed = String(row.interaction_id ?? row.id ?? id ?? '');
  const phone = displayPhoneOrSynthetic(seed, row.phone_number as string | undefined);
  const started = row.started_at ? new Date(String(row.started_at)) : null;
  const dateStr = started ? started.toISOString().split('T')[0] : '—';
  const timeStr = started
    ? started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  const perf = Math.round(Number(row.overall_performance ?? row.csat_score ?? row.sentiment_score ?? 0)) || 0;
  const status = String(row.status ?? '—');
  const rawType = String(row.type ?? '').toLowerCase();
  const typeLabel = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : '—';
  const summary = String(row.summary ?? '').trim();
  const agentName = String(row.agent_name ?? '—');
  const tags = Array.isArray(row.tags) ? (row.tags as unknown[]).map((t) => String(t)) : [];
  const sentiment = formatSentimentLabel(String(row.sentiment ?? ''));
  const durSec = (row.duration_seconds ?? row.resolution_time_seconds) as number | undefined;
  const durationStr = formatDuration(durSec);
  const recordingUrl = row.recording_url ? String(row.recording_url) : '';

  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completed':
        return 'var(--success)';
      case 'failed':
        return 'var(--danger)';
      default:
        return 'var(--accent)';
    }
  };

  const issueText = formatIssues(row.issues);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      <Button
        startIcon={<ArrowLeft size={20} />}
        onClick={() => navigate('/archive')}
        sx={{ mb: 4, color: 'var(--text-main)', fontWeight: 600, '&:hover': { bgcolor: 'rgba(84, 119, 146, 0.1)' } }}
      >
        Back to Archive
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={900} color="var(--text-main)">
          Call Details · {String(row.interaction_id ?? row.id ?? id)}
        </Typography>
        <Chip label={status} sx={{ bgcolor: getStatusColor(status), color: 'white', fontWeight: 600, px: 2 }} />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <User size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Agent</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--text-main)">{agentName}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <Clock size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Duration</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--text-main)">{durationStr}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <Phone size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Type</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--text-main)">{typeLabel}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <CheckCircle size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Performance</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--accent)">{perf}%</Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 300 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Customer
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Phone</Typography>
                <Typography variant="body1" fontWeight={500} color="var(--text-main)">{phone}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Sentiment</Typography>
                <Chip
                  label={sentiment}
                  size="small"
                  sx={{
                    bgcolor: sentiment === 'Good' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(84, 119, 146, 0.1)',
                    color: sentiment === 'Good' ? 'var(--success)' : 'var(--accent)',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Stack>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 300 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Call information
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Date &amp; time</Typography>
                <Typography variant="body1" fontWeight={500} color="var(--text-main)">
                  {dateStr} · {timeStr}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(84, 119, 146, 0.1)', color: 'var(--accent)', fontWeight: 500 }} />
                    ))
                  ) : (
                    <Typography variant="body2" color="var(--text-secondary)">—</Typography>
                  )}
                </Box>
              </Box>
              {recordingUrl ? (
                <Box>
                  <Typography variant="body2" color="var(--text-secondary)">Recording</Typography>
                  <Typography component="a" href={recordingUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
                    Open link
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 100%' }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Summary &amp; issues
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MessageSquare size={18} color="var(--accent)" />
                <Typography variant="subtitle2" color="var(--text-secondary)">Summary</Typography>
              </Box>
              <Typography variant="body1" color="var(--text-main)">{summary ? summary : '—'}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertTriangle size={18} color="var(--accent)" />
                <Typography variant="subtitle2" color="var(--text-secondary)">Issues</Typography>
              </Box>
              <Typography variant="body1" color="var(--text-main)">{issueText}</Typography>
            </Box>

            {row.transcript ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="subtitle2" color="var(--text-secondary)" sx={{ mb: 1 }}>Transcript</Typography>
                  <Typography variant="body2" color="var(--text-main)" sx={{ whiteSpace: 'pre-wrap' }}>
                    {String(row.transcript)}
                  </Typography>
                </Box>
              </>
            ) : null}
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default CallDetails;
