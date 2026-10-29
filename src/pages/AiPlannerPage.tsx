import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookingModal } from './BookingModal';
import { getEquipmentFallbackImage } from '../utils/imageFallback';
import type { Resource } from '../types';
import {
  Sparkles,
  MapPin,
  Layers,
  Sliders,
  X,
  Clock,
  Calendar,
  Coins,
  Compass,
  RotateCcw,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileText,
  Tag,
} from 'lucide-react';

const NARRATIVE_SNIPPETS = [
  '+ High-Res Optical',
  '+ NIST Calibrated',
  '+ Cleanroom ISO-5',
  '+ Low-Latency CUDA',
  '+ Sub-millimeter Tolerance',
  '+ Real-Time Telemetry',
];

interface MatchResult {
  resource: Resource;
  overallScore: number;
  capabilityMatch: {
    score: number;
    maxScore: number;
    matched: string[];
    missing: string[];
  };
  availabilityStatus: {
    isAvailable: boolean;
    score: number;
    maxScore: number;
    reason: string;
    windowStart: string | null;
    windowEnd: string | null;
  };
  eligibilityStatus: {
    isEligible: boolean;
    score: number;
    maxScore: number;
    reason: string;
    requiredSafetyLevel: number;
    userSafetyLevel: number;
  };
  budgetMatch: {
    isWithinBudget: boolean;
    score: number;
    maxScore: number;
    estimatedCost: number;
    hourlyRate: number;
    durationHours: number;
  };
  locationMatch: {
    score: number;
    maxScore: number;
    location: string;
    category: string;
  };
  reasonsForRecommendation: string[];
  isImmediatelyBookable: boolean;
}

export const AiPlannerPage: React.FC = () => {
  const { resources, currentUser, isAuthenticated, setAuthModalOpen, setSelectedResourceId, setCurrentPage } = useApp();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [customCapabilityInput, setCustomCapabilityInput] = useState('');
  const [startAt, setStartAt] = useState<string>('2026-11-12T09:00');
  const [durationHours, setDurationHours] = useState<number>(4);
  const [budget, setBudget] = useState<number>(400);
  const [location, setLocation] = useState<string>('');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<MatchResult[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [bookingResource, setBookingResource] = useState<Resource | null>(null);

  // Google Gemini API State
  const [geminiStatus, setGeminiStatus] = useState<{ configured: boolean; maskedKey: string | null }>({ configured: false, maskedKey: null });
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [geminiKeySaving, setGeminiKeySaving] = useState(false);
  const [geminiKeyError, setGeminiKeyError] = useState('');
  const [geminiKeySuccess, setGeminiKeySuccess] = useState('');
  const [geminiPlan, setGeminiPlan] = useState<any | null>(null);

  React.useEffect(() => {
    fetch('/api/v1/gemini/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setGeminiStatus({ configured: d.configured, maskedKey: d.maskedKey });
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKeyInput.trim()) return;
    setGeminiKeySaving(true);
    setGeminiKeyError('');
    setGeminiKeySuccess('');

    try {
      const res = await fetch('/api/v1/gemini/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeminiKeySuccess('Google Gemini API connected successfully!');
        setGeminiStatus({
          configured: true,
          maskedKey: `${geminiApiKeyInput.trim().substring(0, 4)}...${geminiApiKeyInput.trim().slice(-4)}`,
        });
        setTimeout(() => {
          setGeminiModalOpen(false);
          setGeminiKeySuccess('');
        }, 1500);
      } else {
        setGeminiKeyError(data.message || 'Verification failed. Please check your key.');
      }
    } catch (err: any) {
      setGeminiKeyError(err.message || 'Failed to connect to backend server.');
    } finally {
      setGeminiKeySaving(false);
    }
  };

  const capabilitySuggestions = [
    'fluorescence',
    'laser',
    'high resolution',
    '100 MHz',
    'CUDA',
    '8x A100',
    'Tensor Core',
    'UV laser',
    'biocompatible',
    '6-axis',
    'thermal imaging',
    'infrared',
    'NIST calibration',
    'oscilloscope',
  ];

  const handleToggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleAddCustomCapability = () => {
    const trimmed = customCapabilityInput.trim().toLowerCase();
    if (trimmed && !selectedCapabilities.includes(trimmed)) {
      setSelectedCapabilities((prev) => [...prev, trimmed]);
      setCustomCapabilityInput('');
    }
  };

  const handleResetForm = () => {
    setDescription('');
    setCategory('All');
    setSelectedCapabilities([]);
    setDurationHours(4);
    setBudget(300);
    setLocation('');
    setMatchResults(null);
  };

  const setTargetDatePreset = (daysAhead: number, hour: number = 9) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setStartAt(`${year}-${month}-${day}T${hours}:${mins}`);
  };

  const handleRunMatching = async () => {
    if (!description.trim()) {
      return;
    }
    setIsAnalyzing(true);
    try {
      // 1. Call Google Gemini Plan API
      const geminiPromise = fetch('/api/v1/gemini/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          category: category === 'All' ? undefined : category,
          durationHours,
          budget,
          location: location.trim() || undefined,
          safetyLevel: currentUser.safetyLevel,
        }),
      });

      // 2. Call Matching API
      const matchPromise = fetch('/api/v1/matching/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          category: category === 'All' ? undefined : category,
          requiredCapabilities: selectedCapabilities,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          durationHours,
          budget,
          location: location.trim() || undefined,
          safetyLevel: currentUser.safetyLevel,
        }),
      });

      const [geminiRes, matchRes] = await Promise.all([geminiPromise, matchPromise]);

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        setGeminiPlan(geminiData);
      }

      if (matchRes.ok) {
        const data = await matchRes.json();
        setMatchResults(data.results || []);
      } else {
        fallbackDeterministicMatching();
      }
    } catch {
      fallbackDeterministicMatching();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Client-side fallback if backend API is temporarily offline
  const fallbackDeterministicMatching = () => {
    const results: MatchResult[] = resources.map((r) => {
      const specString = Object.entries(r.specifications || {})
        .map(([k, v]) => `${k} ${v}`)
        .join(' ')
        .toLowerCase();
      const corpus = `${r.title} ${r.description} ${r.category} ${specString} ${(r.accessories || []).join(' ')}`.toLowerCase();

      let matchedCaps: string[] = [];
      let missingCaps: string[] = [];

      selectedCapabilities.forEach((c) => {
        if (corpus.includes(c.toLowerCase())) {
          matchedCaps.push(c);
        } else {
          missingCaps.push(c);
        }
      });

      const capScore = selectedCapabilities.length > 0
        ? Math.round((matchedCaps.length / selectedCapabilities.length) * 40)
        : 40;

      const isAvail = r.status === 'Available';
      const availScore = isAvail ? 25 : r.status === 'Maintenance' ? 0 : 10;

      const isElig = currentUser.safetyLevel >= r.safetyLevelRequired;
      const eligScore = isElig ? 15 : 0;

      const totalCost = r.hourlyRateCredits * durationHours;
      const budgetOk = totalCost <= budget;
      const budgetScore = budgetOk ? 10 : Math.max(0, Math.round((budget / totalCost) * 10));

      const isCatMatch =
        category === 'All' ||
        r.category === category ||
        (category.includes('Classroom') && (r.category === 'Classrooms & Spaces' || r.id.includes('space') || r.title.includes('Hall'))) ||
        (category.includes('Cleanroom') && (r.title.includes('Nanofabrication') || r.id.includes('bridge'))) ||
        (category.includes('Additive') && (r.title.includes('3D') || r.title.includes('Printer'))) ||
        (category.includes('Thermal') && (r.title.includes('Thermal') || r.department === 'Materials Science')) ||
        (category.includes('Optical') && (r.title.includes('Microscope') || r.department === 'Bioengineering')) ||
        (category.includes('Bioengineering') && r.department === 'Bioengineering') ||
        (category.includes('Computing') && (r.category === 'Computing & AI' || r.title.includes('DGX') || r.title.includes('Compute'))) ||
        (category.includes('Robotics') && (r.category === 'Robotics & Prototyping' || r.title.includes('UR5e') || r.title.includes('Cobot'))) ||
        (category.includes('Audio') && (r.category === 'Classrooms & Spaces' || r.title.includes('Multi-Media') || r.title.includes('Camera')));

      const catScore = isCatMatch ? 5 : 0;
      const locScore = !location || r.location.toLowerCase().includes(location.toLowerCase()) ? 5 : 0;

      const total = capScore + availScore + eligScore + budgetScore + catScore + locScore;

      return {
        resource: r,
        overallScore: total,
        capabilityMatch: { score: capScore, maxScore: 40, matched: matchedCaps, missing: missingCaps },
        availabilityStatus: {
          isAvailable: isAvail,
          score: availScore,
          maxScore: 25,
          reason: isAvail ? 'Available in inventory' : `Status: ${r.status}`,
          windowStart: startAt,
          windowEnd: null,
        },
        eligibilityStatus: {
          isEligible: isElig,
          score: eligScore,
          maxScore: 15,
          reason: isElig ? 'Safety clearance met' : `Requires Level ${r.safetyLevelRequired}`,
          requiredSafetyLevel: r.safetyLevelRequired,
          userSafetyLevel: currentUser.safetyLevel,
        },
        budgetMatch: {
          isWithinBudget: budgetOk,
          score: budgetScore,
          maxScore: 10,
          estimatedCost: totalCost,
          hourlyRate: r.hourlyRateCredits,
          durationHours,
        },
        locationMatch: { score: catScore + locScore, maxScore: 10, location: r.location, category: r.category },
        reasonsForRecommendation: [
          `${matchedCaps.length}/${selectedCapabilities.length} capabilities matched`,
          budgetOk ? `Within budget (${totalCost} cr)` : `Exceeds budget (${totalCost} cr)`,
          isAvail ? 'Slot currently available' : 'Currently engaged',
        ],
        isImmediatelyBookable: total >= 65 && isAvail && isElig,
      };
    });

    results.sort((a, b) => b.overallScore - a.overallScore);
    setMatchResults(results);
  };

  const handleToggleCompare = (res: MatchResult) => {
    setSelectedForComparison((prev) => {
      const exists = prev.some((p) => p.resource.id === res.resource.id);
      if (exists) {
        return prev.filter((p) => p.resource.id !== res.resource.id);
      }
      if (prev.length >= 3) {
        return [prev[1], prev[2], res];
      }
      return [...prev, res];
    });
  };

  return (
    <div className="page-wrapper" id="ai-planner-view">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-in-use">
              <Sparkles size={13} color="#F2E8DC" />
              AI Equipment Matching
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Powered by Google Gemini 2.5 Flash
            </span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#30151E', letterSpacing: '-0.025em' }}>
            Project-to-Equipment AI Planner
          </h1>
        </div>

        {/* Gemini API Key Configuration Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setGeminiModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: geminiStatus.configured ? 'rgba(16, 185, 129, 0.12)' : 'rgba(48, 21, 30, 0.08)',
              borderColor: geminiStatus.configured ? 'rgba(16, 185, 129, 0.4)' : 'rgba(48, 21, 30, 0.25)',
              color: geminiStatus.configured ? '#047857' : '#30151E',
            }}
            id="gemini-status-btn"
          >
            <Sparkles size={14} color={geminiStatus.configured ? '#047857' : '#30151E'} />
            <span>
              {geminiStatus.configured
                ? `Gemini Connected (${geminiStatus.maskedKey || 'Active'})`
                : 'Connect Google Gemini API'}
            </span>
          </button>
        </div>
      </div>



      {/* Input Formulation Card */}
      <div
        className="glass-card"
        style={{
          padding: '32px',
          marginBottom: '36px',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-md), var(--shadow-glow)',
          position: 'relative',
        }}
      >
        {/* Luminous Top Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #30151E, #8C3A5A, #F2E8DC, #30151E)',
          }}
        />

        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(48, 21, 30, 0.8), rgba(82, 36, 52, 0.6))',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 18px rgba(48, 21, 30, 0.4)',
                flexShrink: 0,
              }}
            >
              <Sliders size={22} color="var(--cyan-primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Project Requirements Formulation
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(242, 232, 220, 0.12)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  AI Matrix v2.4
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Specify research objectives, temporal windows, and resource criteria for automatic inventory optimization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            className="btn btn-ghost btn-sm"
            style={{ gap: '6px', color: 'var(--text-secondary)' }}
            title="Reset all form fields to default"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '22px', marginBottom: '24px' }}>
          {/* Project Description */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)' }}>
                <FileText size={15} color="var(--burgundy-primary)" />
                Project Narrative & Objective
              </label>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {description.length} characters
              </span>
            </div>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you plan to build, test, synthesize, or measure in detail..."
              style={{
                width: '100%',
                resize: 'vertical',
                minHeight: '85px',
                fontSize: '13.5px',
                lineHeight: 1.6,
              }}
              id="ai-planner-desc-input"
            />
            {/* Suggested narrative keyword chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Append keywords:
              </span>
              {NARRATIVE_SNIPPETS.map((snippet) => (
                <button
                  key={snippet}
                  type="button"
                  onClick={() => {
                    const textToAdd = snippet.replace('+ ', '');
                    if (!description.includes(textToAdd)) {
                      setDescription((prev) => `${prev.trim()} ${textToAdd}.`);
                    }
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: 'var(--ivory-primary)',
                    border: '1px solid rgba(48, 21, 30, 0.22)',
                    color: 'var(--burgundy-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--burgundy-primary)';
                    e.currentTarget.style.color = 'var(--ivory-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--ivory-primary)';
                    e.currentTarget.style.color = 'var(--burgundy-primary)';
                  }}
                >
                  {snippet}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)', marginBottom: '8px' }}>
              <Compass size={15} color="var(--burgundy-primary)" />
              Domain Category
            </label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%' }}
              id="ai-planner-category-select"
            >
              <option value="All">All Categories (Cross-Disciplinary)</option>
              <option value="Testing & Measurement">Testing & Measurement</option>
              <option value="Computing & AI">Computing & High-Performance AI</option>
              <option value="Robotics & Prototyping">Robotics & Autonomous Systems</option>
              <option value="Lab Equipment">Lab Equipment & Analytical Tools</option>
              <option value="Bioengineering & Imaging">Bioengineering & Molecular Imaging</option>
              <option value="Classrooms & Spaces">Classrooms, Meeting Rooms & Seminar Spaces</option>
              <option value="Cleanroom & Nanofabrication">Cleanroom & Nanofabrication Suites</option>
              <option value="Additive Manufacturing & 3D Printing">Additive Manufacturing & Precision 3D Printing</option>
              <option value="Thermal & Materials Analysis">Thermal & Materials Characterization</option>
              <option value="Optical & Fluorescence Microscopy">Optical & Fluorescence Microscopy</option>
              <option value="Audio/Visual & Media Production">Audio/Visual & Media Collaboration</option>
            </select>
          </div>

          {/* Preferred Date */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)' }}>
                <Calendar size={15} color="var(--burgundy-primary)" />
                Target Window Start
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTargetDatePreset(1)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--ivory-primary)',
                    border: '1px solid rgba(48, 21, 30, 0.22)',
                    color: 'var(--burgundy-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDatePreset(7)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--ivory-primary)',
                    border: '1px solid rgba(48, 21, 30, 0.22)',
                    color: 'var(--burgundy-primary)',
                    cursor: 'pointer',
                  }}
                >
                  +7 Days
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              className="form-input"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              style={{ width: '100%' }}
              id="ai-planner-date-input"
            />
          </div>

          {/* Duration Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)' }}>
                <Clock size={15} color="var(--burgundy-primary)" />
                Required Duration
              </label>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--ivory-primary)',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  background: 'var(--burgundy-primary)',
                  border: '1px solid var(--burgundy-primary)',
                }}
              >
                {durationHours} Hours
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              value={durationHours}
              onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
              style={{ width: '100%', marginBottom: '8px' }}
              id="ai-planner-duration-slider"
            />
            {/* Quick hour selector chips */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
              {[1, 2, 4, 8, 12, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDurationHours(h)}
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 0',
                    textAlign: 'center',
                    borderRadius: '4px',
                    background: durationHours === h ? 'var(--burgundy-primary)' : 'var(--ivory-primary)',
                    border: `1px solid ${durationHours === h ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.2)'}`,
                    color: durationHours === h ? 'var(--ivory-primary)' : 'var(--burgundy-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)' }}>
                <Coins size={15} color="var(--burgundy-primary)" />
                Project Budget
              </label>
              <div style={{ display: 'flex', gap: '5px' }}>
                {[200, 400, 800, 1500].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: budget === b ? 'var(--burgundy-primary)' : 'var(--ivory-primary)',
                      border: `1px solid ${budget === b ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.2)'}`,
                      color: budget === b ? 'var(--ivory-primary)' : 'var(--burgundy-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="form-input"
                min={10}
                max={5000}
                step={25}
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value, 10) || 100)}
                style={{ width: '100%', paddingRight: '75px' }}
                id="ai-planner-budget-input"
              />
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--burgundy-primary)',
                  pointerEvents: 'none',
                }}
              >
                Credits
              </span>
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--burgundy-primary)' }}>
                <MapPin size={15} color="var(--burgundy-primary)" />
                Preferred Campus / Facility
              </label>
              {location && (
                <button
                  type="button"
                  onClick={() => setLocation('')}
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Maxwell, Turing, Franklin..."
              style={{ width: '100%', marginBottom: '8px' }}
              id="ai-planner-location-input"
            />
            {/* Quick campus presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['Maxwell', 'Turing', 'Franklin', 'Curie'].map((camp) => (
                <button
                  key={camp}
                  type="button"
                  onClick={() => setLocation(camp)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: '4px',
                    background: location === camp ? 'var(--burgundy-primary)' : 'var(--ivory-primary)',
                    border: `1px solid ${location === camp ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.2)'}`,
                    color: location === camp ? 'var(--ivory-primary)' : 'var(--burgundy-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {camp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Required Capabilities Tag Selector */}
        <div
          style={{
            marginBottom: '28px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--border-medium)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: 'var(--burgundy-primary)' }}>
              <Tag size={15} color="var(--burgundy-primary)" />
              Required Technical Capabilities (Multi-select)
            </label>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: selectedCapabilities.length > 0 ? 'var(--ivory-primary)' : 'var(--text-muted)',
                background: selectedCapabilities.length > 0 ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.08)',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: `1px solid ${selectedCapabilities.length > 0 ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.15)'}`,
              }}
            >
              {selectedCapabilities.length} Selected
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {capabilitySuggestions.map((cap) => {
              const isSelected = selectedCapabilities.includes(cap);
              return (
                <button
                  key={cap}
                  type="button"
                  onClick={() => handleToggleCapability(cap)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: `1.5px solid ${isSelected ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.2)'}`,
                    background: isSelected
                      ? 'var(--burgundy-primary)'
                      : '#FFFFFF',
                    color: isSelected ? 'var(--ivory-primary)' : 'var(--burgundy-primary)',
                    boxShadow: isSelected ? '0 2px 8px rgba(48, 21, 30, 0.25)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--burgundy-primary)';
                      e.currentTarget.style.background = 'var(--ivory-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(48, 21, 30, 0.2)';
                      e.currentTarget.style.background = '#FFFFFF';
                    }
                  }}
                >
                  {isSelected ? <Check size={13} strokeWidth={2.5} /> : <Plus size={12} style={{ opacity: 0.6 }} />}
                  {cap}
                </button>
              );
            })}
          </div>

          {/* Custom capability input */}
          <div style={{ display: 'flex', gap: '8px', maxWidth: '440px' }}>
            <input
              type="text"
              className="form-input input-sm"
              value={customCapabilityInput}
              onChange={(e) => setCustomCapabilityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCapability())}
              placeholder="Add specific parameter or protocol (e.g. cryo, 40Gbps)..."
              style={{ flex: 1 }}
              id="ai-planner-custom-cap-input"
            />
            <button
              type="button"
              onClick={handleAddCustomCapability}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
              id="ai-planner-add-cap-btn"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>

        {/* Action Button & Trust Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleRunMatching}
              disabled={isAnalyzing}
              className="btn btn-primary btn-lg"
              style={{
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #5A1E31 0%, #30151E 100%)',
                color: '#F2E8DC',
                border: '1px solid rgba(242, 232, 220, 0.3)',
                boxShadow: '0 6px 24px rgba(48, 21, 30, 0.5), 0 0 15px rgba(242, 232, 220, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                cursor: isAnalyzing ? 'wait' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              id="ai-planner-run-btn"
            >
              <Sparkles size={19} className={isAnalyzing ? 'animate-spin' : ''} />
              {isAnalyzing ? 'Scanning 14+ Certified Instruments...' : 'Generate Equipment Optimization Plan'}
              {!isAnalyzing && <ArrowRight size={17} />}
            </button>

            {selectedForComparison.length > 0 && (
              <button
                onClick={() => setComparisonModalOpen(true)}
                className="btn btn-secondary btn-lg"
                id="ai-planner-compare-trigger-btn"
              >
                <Layers size={17} color="var(--cyan-primary)" />
                Compare Selected ({selectedForComparison.length}/3)
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} color="#34d399" />
            <span>Deterministic 5-Factor Weighted Engine (No Black Box)</span>
          </div>
        </div>
      </div>

      {/* Results View */}
      {matchResults && (
        <div id="ai-planner-results-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#30151E' }}>
                Recommended Equipment Roster ({matchResults.length} Evaluated)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Sorted by overall suitability score across capability match, clearance, schedule, and cost.
              </p>
            </div>
          </div>

          {/* Google Gemini AI Experiment Intelligence Plan Card */}
          {geminiPlan && (
            <div
              className="glass-card"
              style={{
                padding: '24px',
                marginBottom: '26px',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid rgba(48, 21, 30, 0.25)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF7F2 100%)',
                boxShadow: '0 8px 30px rgba(48, 21, 30, 0.08)',
                position: 'relative',
              }}
              id="gemini-ai-plan-card"
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#30151E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(48, 21, 30, 0.25)',
                    }}
                  >
                    <Sparkles size={20} color="#F2E8DC" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', margin: 0 }}>
                      Google Gemini AI Experiment & Protocol Plan
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Intelligence Engine: <strong>{geminiPlan.model}</strong> • {geminiPlan.isLiveGemini ? '✨ Live Google AI Analysis' : 'Institutional Laboratory Model'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: '#30151E',
                      color: '#F2E8DC',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Domain: {geminiPlan.domainCategory}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#065f46',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Feasibility: {geminiPlan.estimatedFeasibility}
                  </span>
                </div>
              </div>

              {/* Recommended Equipment Highlights with Protocols */}
              {geminiPlan.recommendedResources && geminiPlan.recommendedResources.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#30151E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                    Recommended Equipment & Protocol Breakdown:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {geminiPlan.recommendedResources.map((rec: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid rgba(48, 21, 30, 0.15)',
                          padding: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#30151E' }}>
                            {rec.resourceTitle}
                          </h4>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              background: '#30151E',
                              color: '#F2E8DC',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            {rec.matchScore}% Match
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#664a54', marginBottom: '8px', lineHeight: 1.5 }}>
                          {rec.suitabilityReason}
                        </p>
                        {rec.optimalParameters && (
                          <div style={{ fontSize: '11.5px', color: '#30151E', background: '#FAF7F2', padding: '6px 8px', borderRadius: '6px', marginBottom: '8px' }}>
                            <strong>Optimal Parameters:</strong> {rec.optimalParameters}
                          </div>
                        )}
                        {rec.protocolSteps && rec.protocolSteps.length > 0 && (
                          <div style={{ fontSize: '11.5px', color: '#4b353d' }}>
                            <strong>Execution Protocol:</strong>
                            <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                              {rec.protocolSteps.map((step: string, sIdx: number) => (
                                <li key={sIdx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {rec.riskMitigation && (
                          <div style={{ fontSize: '11px', color: '#854d0e', marginTop: '6px' }}>
                            🛡️ <strong>Safety:</strong> {rec.riskMitigation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {matchResults.map((item, idx) => {
              const res = item.resource;
              const isCompared = selectedForComparison.some((p) => p.resource.id === res.id);

              return (
                <div
                  key={res.id}
                  className="glass-card"
                  style={{
                    padding: '24px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 260px) 1fr auto',
                    gap: '24px',
                    alignItems: 'start',
                    border: idx === 0 ? '1.5px solid rgba(48, 21, 30, 0.35)' : undefined,
                    background: idx === 0 ? 'rgba(48, 21, 30, 0.02)' : undefined,
                  }}
                >
                  {/* Left: Image & Quick Stats */}
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <img
                      src={res.imageUrl}
                      alt={res.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getEquipmentFallbackImage(res.title);
                      }}
                      style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: '#30151E',
                        border: '1px solid rgba(242, 232, 220, 0.3)',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#F2E8DC',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      {res.category}
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: '#30151E',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#F2E8DC',
                      }}
                    >
                      {res.hourlyRateCredits} credits/hr
                    </div>
                  </div>

                  {/* Middle: Title, Breakdown Bars, Badges */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E' }}>
                        {res.title}
                      </h3>
                      {idx === 0 && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(28, 107, 70, 0.12)',
                            color: '#15803d',
                            border: '1px solid rgba(22, 101, 52, 0.28)',
                          }}
                        >
                          ★ Top Recommendation
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#30151E" />
                        {res.location}
                      </span>
                      <span>•</span>
                      <span>{res.institutionName}</span>
                    </div>

                    {/* Progress Bar for Overall Score */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#30151E' }}>Overall Compatibility Score</span>
                        <span style={{ fontWeight: 800, color: item.overallScore >= 70 ? '#15803d' : item.overallScore >= 50 ? '#b45309' : '#be123c' }}>
                          {item.overallScore} / 100
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(48, 21, 30, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${item.overallScore}%`,
                            background: item.overallScore >= 70 ? 'linear-gradient(90deg, #15803d, #30151E)' : item.overallScore >= 50 ? 'linear-gradient(90deg, #b45309, #30151E)' : '#be123c',
                            borderRadius: '4px',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Factor Breakdown Chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(48, 21, 30, 0.04)', border: '1px solid rgba(48, 21, 30, 0.08)', fontSize: '11.5px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Capabilities</div>
                        <div style={{ fontWeight: 700, color: '#30151E' }}>{item.capabilityMatch.score}/40 pts</div>
                      </div>
                      <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(48, 21, 30, 0.04)', border: '1px solid rgba(48, 21, 30, 0.08)', fontSize: '11.5px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Interval Slot</div>
                        <div style={{ fontWeight: 700, color: item.availabilityStatus.isAvailable ? '#15803d' : '#be123c' }}>
                          {item.availabilityStatus.isAvailable ? 'Available (25/25)' : 'Unavailable (0/25)'}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(48, 21, 30, 0.04)', border: '1px solid rgba(48, 21, 30, 0.08)', fontSize: '11.5px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Safety Clearance</div>
                        <div style={{ fontWeight: 700, color: item.eligibilityStatus.isEligible ? '#15803d' : '#be123c' }}>
                          {item.eligibilityStatus.isEligible ? 'Authorized (15/15)' : 'Deficient (0/15)'}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(48, 21, 30, 0.04)', border: '1px solid rgba(48, 21, 30, 0.08)', fontSize: '11.5px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Est. Cost ({durationHours}h)</div>
                        <div style={{ fontWeight: 700, color: item.budgetMatch.isWithinBudget ? '#34d399' : '#fb7185' }}>
                          {item.budgetMatch.estimatedCost} cr ({item.budgetMatch.score}/10)
                        </div>
                      </div>
                    </div>

                    {/* Matched vs Missing Capabilities */}
                    <div style={{ fontSize: '12px' }}>
                      {item.capabilityMatch.matched.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>Satisfied:</span>
                          {item.capabilityMatch.matched.map((m) => (
                            <span key={m} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                              ✓ {m}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.capabilityMatch.missing.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#fb7185', fontWeight: 600 }}>Missing:</span>
                          {item.capabilityMatch.missing.map((m) => (
                            <span key={m} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185' }}>
                              ✗ {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                    <button
                      onClick={() => {
                        setSelectedResourceId(res.id);
                        setCurrentPage('details');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%' }}
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setAuthModalOpen(true);
                        } else {
                          setBookingResource(res);
                        }
                      }}
                      disabled={!item.isImmediatelyBookable && !item.availabilityStatus.isAvailable}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                    >
                      {item.availabilityStatus.isAvailable ? 'Book This Slot' : 'Join Waitlist'}
                    </button>

                    <button
                      onClick={() => handleToggleCompare(item)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        width: '100%',
                        borderColor: isCompared ? 'var(--cyan-primary)' : undefined,
                        color: isCompared ? 'var(--cyan-primary)' : undefined,
                      }}
                    >
                      {isCompared ? '✓ Selected to Compare' : '+ Compare'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonModalOpen && selectedForComparison.length > 0 && (
        <div className="modal-overlay" onClick={() => setComparisonModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '900px', width: '95%' }}
            id="ai-planner-comparison-modal"
          >
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F2E8DC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#F2E8DC" />
                Side-by-Side Equipment Comparison
              </h2>
              <button
                onClick={() => setComparisonModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#F2E8DC', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)' }}>Parameter</th>
                    {selectedForComparison.map((c) => (
                      <th key={c.resource.id} style={{ textAlign: 'left', padding: '12px', color: 'var(--cyan-primary)' }}>
                        {c.resource.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Score</td>
                    {selectedForComparison.map((c) => (
                      <td key={c.resource.id} style={{ padding: '12px', fontWeight: 800 }}>
                        {c.overallScore} / 100
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Category</td>
                    {selectedForComparison.map((c) => (
                      <td key={c.resource.id} style={{ padding: '12px' }}>{c.resource.category}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Hourly Tariff</td>
                    {selectedForComparison.map((c) => (
                      <td key={c.resource.id} style={{ padding: '12px' }}>{c.resource.hourlyRateCredits} credits/hr</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Safety Level</td>
                    {selectedForComparison.map((c) => (
                      <td key={c.resource.id} style={{ padding: '12px' }}>Level {c.resource.safetyLevelRequired}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Institution</td>
                    {selectedForComparison.map((c) => (
                      <td key={c.resource.id} style={{ padding: '12px' }}>{c.resource.institutionName}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Approval Workflow</td>
                    {selectedForComparison.map((c) => (
                      <td key={c.resource.id} style={{ padding: '12px' }}>{c.resource.approvalMode}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setComparisonModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Gemini API Connection Modal */}
      {geminiModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(48, 21, 30, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setGeminiModalOpen(false)}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid rgba(48, 21, 30, 0.25)',
              boxShadow: '0 20px 50px rgba(48, 21, 30, 0.35)',
              padding: '24px',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setGeminiModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: '#30151E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(48, 21, 30, 0.25)',
                }}
              >
                <Sparkles size={20} color="#F2E8DC" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#30151E', margin: 0 }}>
                  Connect Google Gemini API
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Model: Google Gemini 2.5 Flash
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              Connect your Google Gemini API key to enable live, real-time scientific experiment analysis, equipment parameter synthesis, and intelligent lab protocols.
            </p>

            <div
              style={{
                padding: '12px',
                background: '#FAF7F2',
                borderRadius: '8px',
                border: '1px solid rgba(48, 21, 30, 0.12)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#664a54' }}>
                Don't have an API key? You can get a free key from Google AI Studio.
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#30151E',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                Get API Key <ArrowRight size={13} />
              </a>
            </div>

            {geminiKeyError && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: '6px', fontSize: '12px', color: '#991b1b', marginBottom: '14px' }}>
                {geminiKeyError}
              </div>
            )}

            {geminiKeySuccess && (
              <div style={{ padding: '8px 12px', background: '#d1fae5', border: '1px solid #34d399', borderRadius: '6px', fontSize: '12px', color: '#065f46', marginBottom: '14px' }}>
                {geminiKeySuccess}
              </div>
            )}

            <form onSubmit={handleSaveGeminiKey} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  className="form-input"
                  style={{ height: '38px', fontSize: '13px' }}
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  id="gemini-api-key-input"
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {geminiStatus.configured
                    ? `Current Key: ${geminiStatus.maskedKey} (Enter a new key to update)`
                    : 'Your key is verified and stored securely in your local environment.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setGeminiModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ height: '38px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={geminiKeySaving}
                  className="btn btn-primary"
                  style={{ height: '38px', fontSize: '13px', minWidth: '130px' }}
                  id="save-gemini-key-btn"
                >
                  {geminiKeySaving ? 'Verifying...' : 'Verify & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal if triggered from Planner */}
      {bookingResource && (
        <BookingModal resource={bookingResource} onClose={() => setBookingResource(null)} />
      )}
    </div>
  );
};
export default AiPlannerPage;
