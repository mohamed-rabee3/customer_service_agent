import React, { useRef } from 'react';
import { Plus } from 'lucide-react';

interface AddAgentCardProps {
    index: number;
    onClick: () => void;
}

const AddAgentCard: React.FC<AddAgentCardProps> = ({ index, onClick }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            className="voice-agent-card group"
            style={{
                animationDelay: `${index * 150}ms`,
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 320,
                cursor: 'pointer',
            }}
        >
            <div className="agent-icon-ring mb-4" style={{ borderStyle: 'dashed' }}>
                <Plus size={28} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
                Add New Agent
            </h3>
            <div className="card-glow-bar" />
        </div>
    );
};

export default AddAgentCard;
