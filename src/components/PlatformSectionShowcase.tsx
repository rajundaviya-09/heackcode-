import React from 'react';
import { useApp } from '../context/AppContext';
import type { PlatformSection } from '../types';
import {
  ArrowRight,
  FlaskConical,
  Wrench,
  Building,
  Laptop,
  Network,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export interface PlatformItem {
  id: PlatformSection;
  title: string;
  emoji: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  sampleItems: string[];
  statsBadge: string;
}

export const PLATFORMS_DATA: PlatformItem[] = [
  {
    id: 'LabShare',
    title: 'LabShare',
    emoji: '🧪',
    icon: <FlaskConical size={24} color="#F2E8DC" />,
    tagline: 'A platform for students to book unused college laboratories and equipment.',
    description: 'Enables students and researchers to find and reserve idle university wet benches, biosafety suites, optical microscopy stations, and diagnostic instrumentation during available open-access windows.',
    sampleItems: ['Upright Fluorescence Microscopes', 'Clinical Centrifuges', 'Spectrophotometer Suites'],
    statsBadge: 'Available College Labs',
  },
  {
    id: 'ToolConnect',
    title: 'ToolConnect',
    emoji: '🔧',
    icon: <Wrench size={24} color="#F2E8DC" />,
    tagline: 'A platform for sharing expensive tools and technical equipment.',
    description: 'Shared engineering hub for high-precision diagnostic tools, digital storage oscilloscopes, industrial SLA 3D printers, and robotic manipulator arms across departments.',
    sampleItems: ['Digital Storage Oscilloscopes', 'Universal Robots UR5e Cobots', 'Formlabs Form 3+ SLA Printers'],
    statsBadge: 'Precision Tools & Kits',
  },
  {
    id: 'SpaceSync',
    title: 'SpaceSync',
    emoji: '🏢',
    icon: <Building size={24} color="#F2E8DC" />,
    tagline: 'A platform for booking unused classrooms, meeting rooms, and study spaces.',
    description: 'Instant reservation portal for vacant campus lecture halls, multimedia seminar suites, group thesis pods, and quiet collaborative study spaces to maximize facility utilization.',
    sampleItems: ['Multimedia Seminar Halls', 'Interactive Pod Classrooms', 'Thesis Defense Suites'],
    statsBadge: 'Bookable Learning Spaces',
  },
  {
    id: 'EquipX',
    title: 'EquipX',
    emoji: '💻',
    icon: <Laptop size={24} color="#F2E8DC" />,
    tagline: 'A platform for sharing computers, cameras, and other electronic devices.',
    description: 'High-speed checkout of distributed GPU compute clusters, thermal imaging hardware, studio 4K production cameras, and digital signal measurement devices.',
    sampleItems: ['NVIDIA DGX A100 AI Nodes', 'FLIR High-Def Thermal Cameras', 'High-Speed Logic Analyzers'],
    statsBadge: 'Electronic Computing Assets',
  },
  {
    id: 'ResourceBridge',
    title: 'ResourceBridge',
    emoji: '🤝',
    icon: <Network size={24} color="#F2E8DC" />,
    tagline: 'A platform connecting multiple colleges to share laboratories and specialised equipment.',
    description: 'Unified cross-institutional scientific mesh empowering students and faculty from affiliated colleges to access multi-campus cleanrooms, supercomputing arrays, and specialized centers.',
    sampleItems: ['Nanofabrication Cleanrooms', 'Supercomputing Simulation Cores', 'Cross-College Bio-Arrays'],
    statsBadge: 'Inter-College Shared Mesh',
  },
];

interface PlatformSectionShowcaseProps {
  compact?: boolean;
}

export const PlatformSectionShowcase: React.FC<PlatformSectionShowcaseProps> = ({ compact = false }) => {
  const { setCurrentPage, setSelectedPlatform, selectedPlatform } = useApp();

  const handleSelect = (platformId: PlatformSection) => {
    setSelectedPlatform(platformId);
    setCurrentPage('discovery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section
      style={{
        margin: compact ? '20px 0' : '48px 0',
      }}
      id="unified-platform-sections"
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: compact ? '20px' : '36px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 14px',
            borderRadius: 'var(--radius-full)',
            background: '#F2E8DC',
            border: '1px solid rgba(48, 21, 30, 0.2)',
            color: '#30151E',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          <Sparkles size={14} color="#30151E" />
          <span>Unified Sharing Ecosystem</span>
        </div>

        <h2
          style={{
            fontSize: compact ? '22px' : '32px',
            fontWeight: 800,
            color: '#30151E',
            letterSpacing: '-0.02em',
            margin: '0 0 10px',
          }}
        >
          Specialized Sharing Platforms
        </h2>
        <p
          style={{
            fontSize: compact ? '13px' : '15px',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Everything in one mesh: book unused labs, expensive tools, meeting spaces, electronic hardware, or cross-college facilities with verified custody.
        </p>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '20px',
        }}
        id="platforms-cards-grid"
      >
        {PLATFORMS_DATA.map((plat) => {
          const isCurrentActive = selectedPlatform === plat.id;

          return (
            <div
              key={plat.id}
              className="glass-card"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                border: isCurrentActive
                  ? '2px solid #30151E'
                  : '1.5px solid rgba(48, 21, 30, 0.18)',
                background: isCurrentActive ? '#FAF7F2' : '#FFFFFF',
                boxShadow: isCurrentActive
                  ? '0 12px 30px rgba(48, 21, 30, 0.16)'
                  : '0 4px 16px rgba(48, 21, 30, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
              }}
              id={`platform-card-${plat.id}`}
            >
              {/* Top Bar with Icon & Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#30151E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(48, 21, 30, 0.2)',
                  }}
                >
                  {plat.icon}
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-full)',
                    background: '#F2E8DC',
                    color: '#30151E',
                    border: '1px solid rgba(48, 21, 30, 0.2)',
                  }}
                >
                  {plat.statsBadge}
                </span>
              </div>

              {/* Title & Emoji */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#30151E', margin: 0 }}>
                  {plat.title}
                </h3>
                <span style={{ fontSize: '20px' }}>{plat.emoji}</span>
              </div>

              {/* Exact Tagline from User Request */}
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#5C3240',
                  lineHeight: 1.45,
                  marginBottom: '10px',
                }}
              >
                {plat.tagline}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                  marginBottom: '16px',
                  flex: 1,
                }}
              >
                {plat.description}
              </p>

              {/* Sample Items List */}
              <div
                style={{
                  background: 'rgba(48, 21, 30, 0.04)',
                  border: '1px solid rgba(48, 21, 30, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#85616E', marginBottom: '6px' }}>
                  Managed Resources:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {plat.sampleItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        color: '#30151E',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} color="#15803d" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleSelect(plat.id)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '38px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: 'auto',
                }}
                id={`explore-btn-${plat.id}`}
              >
                <span>Explore {plat.title}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

