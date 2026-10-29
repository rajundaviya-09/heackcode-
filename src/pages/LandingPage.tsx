import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Compass,
  ShieldCheck,
  Cpu,
  Clock,
  ArrowRight,
  Database,
  Lock,
  Sparkles,
} from 'lucide-react';
import heroImage from '../assets/hero.png';
import { getEquipmentFallbackImage } from '../utils/imageFallback';

export const LandingPage: React.FC = () => {
  const { setCurrentPage, resources, bookings, setSelectedResourceId } = useApp();

  const totalValue = '$3.85M';
  const availableCount = resources.filter((r) => r.status === 'Available').length;
  const activeBookingsCount = bookings.filter((b) => b.status === 'in_use' || b.status === 'approved').length;

  return (
    <div className="page-wrapper">
      {/* Hero Section */}
      <section
        style={{
          
          padding: '48px 0 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 54px)',
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: '900px',
            marginBottom: '20px',
            color: 'var(--text-primary)',
          }}
        >
          Share High-Value Scientific Assets with Cryptographic Trust
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            maxWidth: '720px',
            color: 'var(--text-secondary)',
            marginBottom: '36px',
            lineHeight: 1.6,
          }}
        >
          Eliminate lab instrument bottlenecks. Automated scheduling collision prevention, digital pre/post-use condition certification, and tamper-evident audit logs for institutional research teams.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setCurrentPage('discovery')}
            className="btn btn-primary btn-lg"
            id="hero-explore-catalog-btn"
          >
            <Compass size={18} />
            Explore Equipment Catalog
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => setCurrentPage('audit')}
            className="btn btn-secondary btn-lg"
            id="hero-view-audit-btn"
          >
            <ShieldCheck size={18} />
            Verify Audit Ledger
          </button>
        </div>

        {/* Hero Visual Laboratory Showcase Image */}
        <div
          style={{
            marginTop: '36px',
            width: '100%',
            maxWidth: '980px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid rgba(48, 21, 30, 0.2)',
            boxShadow: '0 16px 40px rgba(48, 21, 30, 0.12)',
            position: 'relative',
            background: '#FFFFFF',
          }}
          id="hero-image-banner"
        >
          <img
            src={heroImage}
            alt="Advanced Research Equipment & Laboratory Infrastructure"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getEquipmentFallbackImage('lab equipment');
            }}
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      </section>

      {/* Institutional Key Metrics Grid */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '56px',
        }}
      >
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Managed Asset Value
            </span>
            <Database size={20} color="var(--text-primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalValue}</div>
          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <span>↑ 6 Major Research Facilities</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Currently Available
            </span>
            <Cpu size={20} color="var(--text-primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {availableCount} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ {resources.length}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Ready for instant reservation
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active Sessions
            </span>
            <Clock size={20} color="var(--text-primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{activeBookingsCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Checked out with condition signatures
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Audit Verification
            </span>
            <Lock size={20} color="var(--text-primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>100%</div>
          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '6px', fontWeight: 600 }}>
            Zero unverified equipment transfers
          </div>
        </div>
      </section>

      {/* Featured Research Equipment Gallery */}
      <section style={{ marginBottom: '56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-in-use">
                <Sparkles size={13} color="#F2E8DC" />
                Verified Inventory
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>High-Value Hardware</span>
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#30151E', margin: 0 }}>
              Featured Laboratory Instruments
            </h2>
          </div>

          <button
            onClick={() => setCurrentPage('discovery')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>View Full Catalog</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '22px' }}>
          {resources.slice(0, 3).map((res) => (
            <div
              key={res.id}
              className="glass-card"
              onClick={() => {
                setSelectedResourceId(res.id);
                setCurrentPage('details');
              }}
              style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1.5px solid rgba(48, 21, 30, 0.16)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              id={`featured-card-${res.id}`}
            >
              <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                <img
                  src={res.imageUrl}
                  alt={res.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getEquipmentFallbackImage(res.title);
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#30151E',
                    color: '#F2E8DC',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {res.category}
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#30151E', margin: '0 0 6px 0' }}>
                  {res.title}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {res.department} • {res.location}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#30151E' }}>
                    {res.hourlyRateCredits} credits/hr
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#30151E', textDecoration: 'underline' }}>
                    View Specs →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
