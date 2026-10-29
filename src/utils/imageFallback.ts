// High-definition SVG laboratory fallback imagery (Self-contained, 100% offline resilient)

function createSvgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const FALLBACK_IMAGES = {
  oscilloscope: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#1C0D12"/>
      <rect x="40" y="40" width="720" height="420" rx="16" fill="#30151E" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.25"/>
      <!-- Screen bezel -->
      <rect x="70" y="70" width="460" height="340" rx="10" fill="#0D0609" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.3"/>
      <!-- Grid -->
      <defs>
        <pattern id="grid" width="46" height="34" patternUnits="userSpaceOnUse">
          <path d="M 46 0 L 0 0 0 34" fill="none" stroke="#F2E8DC" stroke-opacity="0.1" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="70" y="70" width="460" height="340" fill="url(#grid)"/>
      <!-- Waveforms -->
      <path d="M 70 240 Q 130 140 185 240 T 300 240 T 415 240 T 530 240" fill="none" stroke="#38bdf8" stroke-width="3"/>
      <path d="M 70 260 Q 110 320 160 260 T 260 260 T 360 260 T 460 260 T 530 260" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4 2"/>
      <!-- Controls -->
      <circle cx="610" cy="130" r="34" fill="#421E2A" stroke="#F2E8DC" stroke-width="2"/>
      <line x1="610" y1="130" x2="628" y2="114" stroke="#F2E8DC" stroke-width="3"/>
      <circle cx="690" cy="130" r="26" fill="#421E2A" stroke="#F2E8DC" stroke-width="2"/>
      <circle cx="610" cy="220" r="26" fill="#421E2A" stroke="#F2E8DC" stroke-width="2"/>
      <circle cx="690" cy="220" r="26" fill="#421E2A" stroke="#F2E8DC" stroke-width="2"/>
      <!-- Ports -->
      <circle cx="580" cy="350" r="14" fill="#0D0609" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="630" cy="350" r="14" fill="#0D0609" stroke="#fbbf24" stroke-width="3"/>
      <circle cx="680" cy="350" r="14" fill="#0D0609" stroke="#fb7185" stroke-width="3"/>
      <circle cx="730" cy="350" r="14" fill="#0D0609" stroke="#34d399" stroke-width="3"/>
      <!-- Label -->
      <text x="70" y="440" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" letter-spacing="1">TEKTRONIX 4-CH 100MHz OSCILLOSCOPE</text>
    </svg>
  `),

  compute: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#0F060A"/>
      <rect x="50" y="40" width="700" height="420" rx="14" fill="#240F16" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.2"/>
      <!-- Server blades -->
      <g stroke="#F2E8DC" stroke-opacity="0.15" stroke-width="1.5">
        <rect x="80" y="70" width="640" height="70" rx="6" fill="#170A0F"/>
        <rect x="80" y="155" width="640" height="70" rx="6" fill="#170A0F"/>
        <rect x="80" y="240" width="640" height="70" rx="6" fill="#170A0F"/>
        <rect x="80" y="325" width="640" height="70" rx="6" fill="#170A0F"/>
      </g>
      <!-- Drive bays & LEDs -->
      <g fill="#22c55e">
        <circle cx="110" cy="105" r="5"/><circle cx="130" cy="105" r="5"/><circle cx="150" cy="105" r="5"/>
        <circle cx="110" cy="190" r="5"/><circle cx="130" cy="190" r="5"/><circle cx="150" cy="190" r="5"/>
        <circle cx="110" cy="275" r="5"/><circle cx="130" cy="275" r="5"/><circle cx="150" cy="275" r="5"/>
        <circle cx="110" cy="360" r="5"/><circle cx="130" cy="360" r="5"/><circle cx="150" cy="360" r="5"/>
      </g>
      <g fill="#06b6d4">
        <circle cx="175" cy="105" r="4"/><circle cx="190" cy="105" r="4"/>
        <circle cx="175" cy="190" r="4"/><circle cx="190" cy="190" r="4"/>
        <circle cx="175" cy="275" r="4"/><circle cx="190" cy="275" r="4"/>
        <circle cx="175" cy="360" r="4"/><circle cx="190" cy="360" r="4"/>
      </g>
      <!-- Fan grilles -->
      <g stroke="#F2E8DC" stroke-opacity="0.25" stroke-width="2" fill="none">
        <circle cx="640" cy="105" r="22"/><circle cx="640" cy="105" r="14"/><circle cx="640" cy="105" r="6"/>
        <circle cx="640" cy="190" r="22"/><circle cx="640" cy="190" r="14"/><circle cx="640" cy="190" r="6"/>
        <circle cx="640" cy="275" r="22"/><circle cx="640" cy="275" r="14"/><circle cx="640" cy="275" r="6"/>
        <circle cx="640" cy="360" r="22"/><circle cx="640" cy="360" r="14"/><circle cx="640" cy="360" r="6"/>
      </g>
      <!-- Branding -->
      <text x="240" y="112" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="16" font-weight="900" letter-spacing="2">NVIDIA DGX A100 • 8x TENSOR GPUS</text>
      <text x="240" y="197" fill="#F2E8DC" opacity="0.8" font-family="system-ui, sans-serif" font-size="14">NODE 01: NVLINK 600 GB/s • 320GB SXM4</text>
      <text x="240" y="282" fill="#F2E8DC" opacity="0.8" font-family="system-ui, sans-serif" font-size="14">NODE 02: CUDA 12.4 INFRASTRUCTURE READY</text>
      <text x="240" y="367" fill="#F2E8DC" opacity="0.8" font-family="system-ui, sans-serif" font-size="14">DUAL AMD EPYC 7742 • 2TB ECC MEMORY</text>
    </svg>
  `),

  printer: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#1A0D13"/>
      <rect x="180" y="40" width="440" height="420" rx="16" fill="#30151E" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.3"/>
      <!-- Orange UV Cover -->
      <rect x="210" y="70" width="380" height="260" rx="10" fill="#f97316" fill-opacity="0.3" stroke="#f97316" stroke-width="2"/>
      <!-- Build Platform & Tank -->
      <rect x="290" y="110" width="220" height="24" rx="4" fill="#F2E8DC"/>
      <line x1="400" y1="70" x2="400" y2="110" stroke="#F2E8DC" stroke-width="4"/>
      <!-- Printed 3D lattice -->
      <polygon points="350,230 450,230 430,134 370,134" fill="#cbd5e1" stroke="#38bdf8" stroke-width="2" fill-opacity="0.8"/>
      <!-- Resin tank base -->
      <rect x="250" y="270" width="300" height="45" rx="6" fill="#0F060A" stroke="#f97316" stroke-width="1.5"/>
      <rect x="260" y="280" width="280" height="15" rx="3" fill="#ec4899" fill-opacity="0.5"/>
      <!-- Base controller -->
      <rect x="210" y="350" width="380" height="85" rx="8" fill="#1C0D12"/>
      <circle cx="530" cy="392" r="20" fill="#30151E" stroke="#F2E8DC" stroke-width="2"/>
      <text x="240" y="398" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="16" font-weight="800">FORMLABS FORM 3+ SLA</text>
    </svg>
  `),

  robot: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#14080D"/>
      <!-- Base pedestal -->
      <rect x="330" y="380" width="140" height="70" rx="8" fill="#30151E" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.3"/>
      <circle cx="400" cy="380" r="35" fill="#4A1E2D" stroke="#06b6d4" stroke-width="3"/>
      <!-- Joint 1 & Arm Segment 1 -->
      <line x1="400" y1="380" x2="310" y2="240" stroke="#06b6d4" stroke-width="28" stroke-linecap="round"/>
      <circle cx="310" cy="240" r="28" fill="#30151E" stroke="#F2E8DC" stroke-width="3"/>
      <!-- Joint 2 & Arm Segment 2 -->
      <line x1="310" y1="240" x2="490" y2="150" stroke="#06b6d4" stroke-width="22" stroke-linecap="round"/>
      <circle cx="490" cy="150" r="22" fill="#30151E" stroke="#F2E8DC" stroke-width="3"/>
      <!-- Wrist & Gripper -->
      <line x1="490" y1="150" x2="570" y2="190" stroke="#F2E8DC" stroke-width="14" stroke-linecap="round"/>
      <rect x="560" y="180" width="35" height="40" rx="4" fill="#30151E" stroke="#F2E8DC" stroke-width="2"/>
      <path d="M 595 185 L 630 175 L 630 190" fill="none" stroke="#F2E8DC" stroke-width="4"/>
      <path d="M 595 215 L 630 225 L 630 210" fill="none" stroke="#F2E8DC" stroke-width="4"/>
      <!-- Coordinate indicators -->
      <text x="60" y="100" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="22" font-weight="900">UNIVERSAL ROBOTS UR5e</text>
      <text x="60" y="130" fill="#06b6d4" font-family="system-ui, sans-serif" font-size="14" font-weight="700">6-AXIS COLLABORATIVE COBOT • 850mm REACH</text>
    </svg>
  `),

  microscope: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#170A0F"/>
      <!-- Base -->
      <rect x="240" y="410" width="320" height="50" rx="10" fill="#30151E" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.3"/>
      <!-- Limb / Arm -->
      <path d="M 490 410 L 490 180 Q 490 130 430 130 L 370 130" fill="none" stroke="#30151E" stroke-width="45" stroke-linecap="round"/>
      <!-- Stage -->
      <rect x="290" y="270" width="180" height="20" rx="4" fill="#0D0609" stroke="#F2E8DC" stroke-width="2"/>
      <line x1="380" y1="270" x2="380" y2="410" stroke="#F2E8DC" stroke-width="6"/>
      <!-- Objective revolver -->
      <circle cx="370" cy="210" r="26" fill="#421E2A" stroke="#F2E8DC" stroke-width="2"/>
      <rect x="360" y="236" width="20" height="30" fill="#F2E8DC"/>
      <!-- Eyepiece / Camera port -->
      <line x1="370" y1="130" x2="320" y2="70" stroke="#30151E" stroke-width="24" stroke-linecap="round"/>
      <circle cx="310" cy="60" r="18" fill="#06b6d4" stroke="#F2E8DC" stroke-width="2"/>
      <line x1="390" y1="130" x2="390" y2="60" stroke="#30151E" stroke-width="18"/>
      <rect x="375" y="40" width="30" height="25" rx="3" fill="#06b6d4"/>
      <!-- Spec Label -->
      <text x="60" y="440" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="16" font-weight="800">OLYMPUS BX53 FLUORESCENCE MICROSCOPE</text>
    </svg>
  `),

  thermal: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#13070C"/>
      <!-- Thermal heatmap display -->
      <rect x="60" y="60" width="460" height="380" rx="12" fill="#1A0D13" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.3"/>
      <defs>
        <radialGradient id="heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="35%" stop-color="#f59e0b"/>
          <stop offset="70%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#1e1b4b"/>
        </radialGradient>
      </defs>
      <circle cx="280" cy="250" r="140" fill="url(#heat)" filter="blur(8px)" opacity="0.85"/>
      <!-- Reticle crosshair -->
      <line x1="280" y1="150" x2="280" y2="350" stroke="#F2E8DC" stroke-width="1.5" stroke-dasharray="6 4"/>
      <line x1="180" y1="250" x2="380" y2="250" stroke="#F2E8DC" stroke-width="1.5" stroke-dasharray="6 4"/>
      <circle cx="280" cy="250" r="20" fill="none" stroke="#F2E8DC" stroke-width="2"/>
      <text x="310" y="240" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="20" font-weight="900">78.4°C</text>
      <!-- Camera Grip & Screen Body -->
      <rect x="550" y="100" width="180" height="300" rx="16" fill="#30151E" stroke="#F2E8DC" stroke-width="2"/>
      <circle cx="640" cy="200" r="45" fill="#0F060A" stroke="#06b6d4" stroke-width="4"/>
      <text x="565" y="340" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">FLIR T865 HD</text>
      <text x="565" y="365" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="12">640 x 480 IR</text>
    </svg>
  `),

  facility: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#14080D"/>
      <rect x="60" y="50" width="680" height="400" rx="14" fill="#30151E" stroke="#F2E8DC" stroke-width="2" stroke-opacity="0.3"/>
      <!-- Auditorium / Cleanroom perspective -->
      <polygon points="120,380 680,380 620,160 180,160" fill="#1D0B12" stroke="#F2E8DC" stroke-width="1.5" stroke-opacity="0.2"/>
      <!-- Dual Presentation Screens -->
      <rect x="220" y="100" width="160" height="90" rx="4" fill="#0D0609" stroke="#38bdf8" stroke-width="2"/>
      <rect x="420" y="100" width="160" height="90" rx="4" fill="#0D0609" stroke="#38bdf8" stroke-width="2"/>
      <!-- Seating Rows -->
      <path d="M 160 260 Q 400 310 640 260" stroke="#F2E8DC" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.4"/>
      <path d="M 140 310 Q 400 360 660 310" stroke="#F2E8DC" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.4"/>
      <path d="M 120 360 Q 400 410 680 360" stroke="#F2E8DC" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.4"/>
      <!-- Stage Podium -->
      <rect x="365" y="170" width="70" height="35" rx="3" fill="#F2E8DC"/>
      <text x="220" y="440" fill="#F2E8DC" font-family="system-ui, sans-serif" font-size="15" font-weight="800">ALAN TURING MULTI-MEDIA COLLABORATION SUITE</text>
    </svg>
  `),

  avatar: createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <rect width="100" height="100" fill="#30151E"/>
      <circle cx="50" cy="38" r="18" fill="#F2E8DC"/>
      <path d="M 20 84 Q 50 60 80 84" fill="#F2E8DC"/>
    </svg>
  `),
};

export const FALLBACK_AVATAR = FALLBACK_IMAGES.avatar;

export function getEquipmentFallbackImage(titleOrCategory: string): string {
  const t = (titleOrCategory || '').toLowerCase();
  if (t.includes('oscilloscope') || t.includes('tektronix') || t.includes('testing')) {
    return FALLBACK_IMAGES.oscilloscope;
  }
  if (t.includes('dgx') || t.includes('gpu') || t.includes('compute') || t.includes('ai') || t.includes('nvidia')) {
    return FALLBACK_IMAGES.compute;
  }
  if (t.includes('3d') || t.includes('printer') || t.includes('formlabs') || t.includes('additive')) {
    return FALLBACK_IMAGES.printer;
  }
  if (t.includes('ur5e') || t.includes('cobot') || t.includes('robot') || t.includes('arm')) {
    return FALLBACK_IMAGES.robot;
  }
  if (t.includes('microscope') || t.includes('olympus') || t.includes('fluorescence') || t.includes('bioengineering')) {
    return FALLBACK_IMAGES.microscope;
  }
  if (t.includes('flir') || t.includes('thermal') || t.includes('camera') || t.includes('infrared')) {
    return FALLBACK_IMAGES.thermal;
  }
  return FALLBACK_IMAGES.facility;
}
