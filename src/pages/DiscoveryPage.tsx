import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Resource, ResourceCategory, ResourceStatus } from '../types';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  CheckCircle,
  ArrowRight,
  X,
  LayoutGrid,
  ListFilter,
  Package,
  MessageSquare
} from 'lucide-react';
import { NeedRequestModal } from '../components/NeedRequestModal';
import { getEquipmentFallbackImage } from '../utils/imageFallback';

const CATEGORIES: ('All' | ResourceCategory)[] = [
  'All',
  'Testing & Measurement',
  'Computing & AI',
  'Robotics & Prototyping',
  'Lab Equipment',
  'Classrooms & Spaces',
  'Bioengineering & Imaging',
  'Cleanroom & Nanofabrication',
  'Additive Manufacturing & 3D Printing',
  'Thermal & Materials Analysis',
  'Optical & Fluorescence Microscopy',
];

const DEPARTMENTS = [
  'All Departments',
  'Electrical Engineering',
  'Electrical & Computer Engineering',
  'Computer Science',
  'Bioengineering',
  'Materials Science',
];

export const DiscoveryPage: React.FC = () => {
  const {
    resources,
    setSelectedResourceId,
    setCurrentPage,
    selectedPlatform,
    setSelectedPlatform,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ResourceCategory>('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState<'All' | ResourceStatus>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [needModalOpen, setNeedModalOpen] = useState(false);
  const [needModalResId, setNeedModalResId] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      // Platform check
      const matchesPlatform =
        selectedPlatform === 'All' ||
        resource.platform === selectedPlatform ||
        (selectedPlatform === 'SpaceSync' && (resource.category === 'Classrooms & Spaces' || resource.id.includes('space'))) ||
        (selectedPlatform === 'EquipX' && (resource.category === 'Computing & AI' || resource.title.toLowerCase().includes('camera') || resource.title.toLowerCase().includes('dgx'))) ||
        (selectedPlatform === 'ToolConnect' && (resource.category === 'Testing & Measurement' || resource.category === 'Robotics & Prototyping')) ||
        (selectedPlatform === 'ResourceBridge' && (resource.institutionId === 'INST_EXTERNAL' || resource.title.toLowerCase().includes('collegiate') || resource.title.toLowerCase().includes('alliance'))) ||
        (selectedPlatform === 'LabShare' && (resource.category === 'Lab Equipment' || resource.title.toLowerCase().includes('microscope')));

      // Search query check (title, description, tags, location)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        resource.title.toLowerCase().includes(q) ||
        resource.department.toLowerCase().includes(q) ||
        resource.location.toLowerCase().includes(q) ||
        resource.description.toLowerCase().includes(q) ||
        resource.category.toLowerCase().includes(q);

      // Category check
      const matchesCategory =
        selectedCategory === 'All' ||
        resource.category === selectedCategory ||
        (selectedCategory === 'Classrooms & Spaces' && (resource.category === 'Classrooms & Spaces' || resource.id.includes('space') || resource.title.includes('Hall'))) ||
        (selectedCategory === 'Cleanroom & Nanofabrication' && (resource.id.includes('bridge') || resource.title.includes('Nanofabrication'))) ||
        (selectedCategory === 'Additive Manufacturing & 3D Printing' && (resource.title.includes('3D') || resource.title.includes('Printer'))) ||
        (selectedCategory === 'Thermal & Materials Analysis' && (resource.title.includes('Thermal') || resource.department === 'Materials Science')) ||
        (selectedCategory === 'Optical & Fluorescence Microscopy' && (resource.title.includes('Microscope') || resource.department === 'Bioengineering')) ||
        (selectedCategory === 'Bioengineering & Imaging' && resource.department === 'Bioengineering');

      // Department check
      const matchesDept = selectedDepartment === 'All Departments' || resource.department === selectedDepartment;

      // Status check
      const matchesStatus = selectedStatus === 'All' || resource.status === selectedStatus;

      return matchesPlatform && matchesSearch && matchesCategory && matchesDept && matchesStatus;
    });
  }, [resources, selectedPlatform, searchQuery, selectedCategory, selectedDepartment, selectedStatus]);

  const handleSelectResource = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    setCurrentPage('details');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedDepartment('All Departments');
    setSelectedStatus('All');
  };

  const isFiltering =
    searchQuery !== '' ||
    selectedCategory !== 'All' ||
    selectedDepartment !== 'All Departments' ||
    selectedStatus !== 'All';

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-in-use">
              <span className="badge-dot" />
              Verified Lab Inventory
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {filteredResources.length} of {resources.length} instruments available
            </span>
            {currentUser && currentUser.name && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '13px', color: '#30151E', fontWeight: 700 }}>
                  Active Researcher: <strong style={{ color: '#30151E', textDecoration: 'underline decoration-amber-600' }}>{currentUser.name}</strong> ({currentUser.email})
                </span>
              </>
            )}
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, margin: 0, color: '#30151E' }}>
            Resource Discovery Catalog
          </h1>
        </div>

        {/* Need Man Request Button */}
        <button
          onClick={() => {
            setNeedModalResId(null);
            setNeedModalOpen(true);
          }}
          className="btn btn-primary"
          style={{
            padding: '10px 18px',
            fontSize: '13.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 4px 14px rgba(48, 21, 30, 0.25)',
          }}
          id="open-need-request-modal-btn"
        >
          <Package size={17} />
          <span>Need Equipment? Request an Item</span>
        </button>
      </div>

      {/* 5 Unified Platforms Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          marginBottom: '20px',
        }}
        id="discovery-platforms-nav-bar"
      >
        {[
          { id: 'All', label: 'All Platforms', emoji: '🌐' },
          { id: 'LabShare', label: 'LabShare', emoji: '🧪' },
          { id: 'ToolConnect', label: 'ToolConnect', emoji: '🔧' },
          { id: 'SpaceSync', label: 'SpaceSync', emoji: '🏢' },
          { id: 'EquipX', label: 'EquipX', emoji: '💻' },
          { id: 'ResourceBridge', label: 'ResourceBridge', emoji: '🤝' },
        ].map((plat) => {
          const isActive = selectedPlatform === plat.id;
          return (
            <button
              key={plat.id}
              type="button"
              onClick={() => setSelectedPlatform(plat.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                background: isActive ? '#30151E' : '#FFFFFF',
                color: isActive ? '#F2E8DC' : '#30151E',
                border: isActive
                  ? '1.5px solid #30151E'
                  : '1.5px solid rgba(48, 21, 30, 0.2)',
                boxShadow: isActive ? '0 4px 12px rgba(48, 21, 30, 0.2)' : 'none',
              }}
              id={`platform-tab-${plat.id}`}
            >
              <span>{plat.emoji}</span>
              <span>{plat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Platform Spotlight Banner */}
      {selectedPlatform !== 'All' && (() => {
        const platformDetails: Record<string, { title: string; emoji: string; desc: string }> = {
          LabShare: {
            title: 'LabShare',
            emoji: '🧪',
            desc: 'A platform for students to book unused college laboratories and equipment.',
          },
          ToolConnect: {
            title: 'ToolConnect',
            emoji: '🔧',
            desc: 'A platform for sharing expensive tools and technical equipment.',
          },
          SpaceSync: {
            title: 'SpaceSync',
            emoji: '🏢',
            desc: 'A platform for booking unused classrooms, meeting rooms, and study spaces.',
          },
          EquipX: {
            title: 'EquipX',
            emoji: '💻',
            desc: 'A platform for sharing computers, cameras, and other electronic devices.',
          },
          ResourceBridge: {
            title: 'ResourceBridge',
            emoji: '🤝',
            desc: 'A platform connecting multiple colleges to share laboratories and specialised equipment.',
          },
        };
        const current = platformDetails[selectedPlatform];
        if (!current) return null;
        return (
          <div
            style={{
              background: '#FAF7F2',
              border: '1.5px solid rgba(48, 21, 30, 0.16)',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(48, 21, 30, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '26px' }}>{current.emoji}</span>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#30151E' }}>
                  {current.title} Platform
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {current.desc}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: '#30151E',
                color: '#F2E8DC',
                whiteSpace: 'nowrap',
              }}
            >
              {filteredResources.length} {filteredResources.length === 1 ? 'Resource' : 'Resources'}
            </span>
          </div>
        );
      })()}

      {/* Search and Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Top Search Line */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              position: 'relative',
              flex: '1 1 320px',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '42px',
                paddingRight: searchQuery ? '36px' : '14px',
                height: '44px',
                fontSize: '14px',
              }}
              placeholder="Search instruments (e.g. Digital Storage Oscilloscope, 3D Printer, GPU)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="resource-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Department Select */}
          <div style={{ flex: '0 1 240px' }}>
            <select
              className="form-select"
              style={{ height: '44px' }}
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              id="department-filter-select"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Pill Select */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              className="form-select"
              style={{ height: '44px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              id="status-filter-select"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Reserved">Reserved</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 10px' }}
              aria-label="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 10px' }}
              aria-label="List View"
            >
              <ListFilter size={16} />
            </button>
          </div>

          {/* Clear Filters Button */}
          {isFiltering && (
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary btn-sm"
              style={{ height: '44px' }}
              id="clear-filters-btn"
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: isSelected ? 'var(--burgundy-primary)' : 'rgba(48, 21, 30, 0.18)',
                  background: isSelected ? 'var(--burgundy-primary)' : '#FFFFFF',
                  color: isSelected ? '#F2E8DC' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 2px 8px rgba(48, 21, 30, 0.2)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
                id={`cat-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Results Grid */}
      {filteredResources.length === 0 ? (
        /* Empty State */
        <div
          className="glass-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
          id="no-resources-found"
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fb7185',
            }}
          >
            <SlidersHorizontal size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              No Instruments Matched Your Query
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', fontSize: '13.5px' }}>
              We couldn't find any resources matching "{searchQuery}". Try broadening your filters or clearing search parameters.
            </p>
          </div>
          <button onClick={handleClearFilters} className="btn btn-primary btn-sm" id="empty-state-reset-btn">
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px',
          }}
          id="resources-grid-container"
        >
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onSelect={() => handleSelectResource(resource.id)}
              onRequestNeed={() => {
                setNeedModalResId(resource.id);
                setNeedModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        /* List Mode Table */
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>INSTRUMENT</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>CATEGORY</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>LOCATION</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>SAFETY CLEARANCE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((res) => (
                <tr
                  key={res.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }}
                  className="interactive-row"
                >
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={res.imageUrl}
                        alt={res.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getEquipmentFallbackImage(res.title);
                        }}
                        style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#30151E' }}>{res.title}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{res.department}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {res.category}
                  </td>
                  <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {res.location}
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <StatusBadge status={res.status} />
                  </td>
                  <td style={{ padding: '16px 18px', fontSize: '12px' }}>
                    <span style={{ color: '#30151E', fontWeight: 700 }}>Level {res.safetyLevelRequired}</span>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setNeedModalResId(res.id);
                          setNeedModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        id={`list-request-need-btn-${res.id}`}
                      >
                        Request Item
                      </button>
                      <button
                        onClick={() => handleSelectResource(res.id)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        id={`list-reserve-btn-${res.id}`}
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Equipment Need Request Modal */}
      {needModalOpen && (
        <NeedRequestModal
          initialResourceId={needModalResId}
          onClose={() => setNeedModalOpen(false)}
        />
      )}
    </div>
  );
};

interface ResourceCardProps {
  resource: Resource;
  onSelect: () => void;
  onRequestNeed?: () => void;
}

const getPlatformBadge = (r: Resource): { name: string; emoji: string } => {
  if (r.platform) {
    if (r.platform === 'LabShare') return { name: 'LabShare', emoji: '🧪' };
    if (r.platform === 'ToolConnect') return { name: 'ToolConnect', emoji: '🔧' };
    if (r.platform === 'SpaceSync') return { name: 'SpaceSync', emoji: '🏢' };
    if (r.platform === 'EquipX') return { name: 'EquipX', emoji: '💻' };
    if (r.platform === 'ResourceBridge') return { name: 'ResourceBridge', emoji: '🤝' };
  }
  if (r.category === 'Classrooms & Spaces' || r.id.includes('space')) return { name: 'SpaceSync', emoji: '🏢' };
  if (r.category === 'Computing & AI' || r.id.includes('flir') || r.id.includes('dgx')) return { name: 'EquipX', emoji: '💻' };
  if (r.category === 'Testing & Measurement' || r.category === 'Robotics & Prototyping') return { name: 'ToolConnect', emoji: '🔧' };
  if (r.institutionId === 'INST_EXTERNAL' || r.id.includes('bridge')) return { name: 'ResourceBridge', emoji: '🤝' };
  return { name: 'LabShare', emoji: '🧪' };
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onSelect, onRequestNeed }) => {
  return (
    <div
      className="glass-card interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
      onClick={onSelect}
      id={`resource-card-${resource.id}`}
    >
      {/* Card Image banner */}
      <div style={{ position: 'relative', height: '175px', width: '100%', overflow: 'hidden' }}>
        <img
          src={resource.imageUrl}
          alt={resource.title}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = getEquipmentFallbackImage(resource.title);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
          }}
          className="card-hover-img"
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(15, 22, 36, 0.95) 0%, transparent 60%)',
          }}
        />

        {/* Top Badges */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: '#30151E',
                color: '#F2E8DC',
                border: '1px solid rgba(242, 232, 220, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{getPlatformBadge(resource).emoji}</span>
              <span>{getPlatformBadge(resource).name}</span>
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {resource.category}
            </span>
          </div>
          <StatusBadge status={resource.status} />
        </div>

        {/* Condition score indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#15803d',
            background: 'rgba(28, 107, 70, 0.15)',
            border: '1px solid rgba(22, 101, 52, 0.3)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <CheckCircle size={12} />
          {resource.conditionScore}% Health
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
          {resource.department}
        </div>
        <h3
          style={{
            fontSize: '17px',
            fontWeight: 800,
            color: '#30151E',
            marginBottom: '8px',
            lineHeight: 1.35,
          }}
        >
          {resource.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '14px' }}>
          <MapPin size={14} color="#30151E" />
          <span>{resource.location}</span>
        </div>

        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.description}
        </p>

        {/* Specifications snippet */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '11.5px',
          }}
        >
          {Object.entries(resource.specifications).slice(0, 2).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Institutional & Clearance Tag (Matching Image 3) */}
        <div
          style={{
            fontSize: '11px',
            color: '#85616E',
            marginBottom: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div>
            <span>Institution: </span>
            <strong style={{ color: '#30151E' }}>{resource.institutionName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Clearance: <strong style={{ color: '#30151E' }}>Level {resource.safetyLevelRequired}</strong></span>
            <span>Rate: <strong style={{ color: '#30151E' }}>{resource.hourlyRateCredits} cr/hr</strong></span>
          </div>
        </div>

        {/* Custodian Banner */}
        <div
          style={{
            background: '#FAF7F2',
            border: '1px solid rgba(48, 21, 30, 0.12)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Custodian: </span>
            <strong style={{ color: '#30151E' }}>{resource.ownerName}</strong>
          </div>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 'var(--radius-full)',
              background: '#30151E',
              color: '#F2E8DC',
            }}
          >
            Possessor
          </span>
        </div>

        {/* Footer info & CTA */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestNeed?.();
            }}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: '11px',
              padding: '5px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderColor: 'rgba(48, 21, 30, 0.3)',
              color: '#30151E',
            }}
            id={`request-need-btn-${resource.id}`}
          >
            <MessageSquare size={12} color="#30151E" />
            <span>Request from Custodian</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '11px', padding: '5px 10px' }}
            id={`open-resource-btn-${resource.id}`}
          >
            Inspect
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const StatusBadge: React.FC<{ status: ResourceStatus }> = ({ status }) => {
  const map = {
    Available: 'badge-available',
    'In Use': 'badge-in-use',
    Reserved: 'badge-reserved',
    Maintenance: 'badge-maintenance',
  };

  return (
    <span className={`badge ${map[status] || 'badge-available'}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
};
