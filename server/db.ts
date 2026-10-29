import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'sharesphere.db');
export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      department TEXT NOT NULL,
      avatar TEXT,
      safety_level INTEGER NOT NULL DEFAULT 1,
      certifications TEXT NOT NULL DEFAULT '[]',
      trust_score INTEGER NOT NULL DEFAULT 100,
      is_external INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_role TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      description TEXT NOT NULL,
      specifications TEXT NOT NULL,
      safety_level_required INTEGER NOT NULL DEFAULT 1,
      requires_certification TEXT NOT NULL,
      condition_score INTEGER NOT NULL DEFAULT 100,
      condition_status TEXT NOT NULL DEFAULT 'Pristine',
      status TEXT NOT NULL DEFAULT 'Available',
      image_url TEXT NOT NULL,
      hourly_rate_credits INTEGER NOT NULL DEFAULT 10,
      accessories TEXT NOT NULL DEFAULT '[]',
      maintenance_schedule TEXT NOT NULL,
      total_bookings_count INTEGER NOT NULL DEFAULT 0,
      approval_mode TEXT NOT NULL DEFAULT 'MODE_B_OWNER',
      allow_external_users INTEGER NOT NULL DEFAULT 1,
      max_duration_hours INTEGER NOT NULL DEFAULT 8,
      advance_booking_days INTEGER NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      resource_title TEXT NOT NULL,
      resource_category TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      seeker_id TEXT NOT NULL,
      seeker_name TEXT NOT NULL,
      seeker_email TEXT,
      seeker_institution_id TEXT NOT NULL,
      seeker_institution_name TEXT NOT NULL,
      seeker_department TEXT NOT NULL,
      is_external_seeker INTEGER NOT NULL DEFAULT 0,
      owner_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      purpose TEXT NOT NULL,
      course_code TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'routine',
      certified_agreement INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PENDING',
      approval_mode TEXT NOT NULL DEFAULT 'MODE_B_OWNER',
      owner_approval TEXT,
      institution_approval TEXT,
      info_request TEXT,
      waitlist_position INTEGER,
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT,
      check_in TEXT,
      return_checkout TEXT,
      timeline TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      resource_title TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      reporter_role TEXT NOT NULL,
      booking_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TEXT NOT NULL,
      resolution_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action_type TEXT NOT NULL,
      resource_id TEXT,
      resource_title TEXT,
      booking_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      actor_id TEXT,
      detail TEXT NOT NULL,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      link_page TEXT,
      booking_id TEXT
    );

    CREATE TABLE IF NOT EXISTS waiting_list (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      requested_start_date TEXT NOT NULL,
      requested_end_date TEXT NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'WAITING',
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS condition_reports (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      booking_id TEXT,
      report_type TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      condition_summary TEXT NOT NULL,
      checklist TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      signature TEXT,
      evidence_references TEXT NOT NULL DEFAULT '[]',
      submitted_by TEXT NOT NULL,
      reviewed_by TEXT,
      review_status TEXT NOT NULL DEFAULT 'SUBMITTED',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      maintenance_type TEXT NOT NULL,
      description TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      completed_at TEXT,
      performed_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resource_accessories (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PRESENT'
    );
  `);

  try {
    db.prepare(`
      UPDATE resources
      SET owner_id = 'usr_mgr_robert', owner_name = 'Dr. Robert Cho', owner_role = 'Bio-Innovation Facility Director'
      WHERE id IN ('res_formlabs_sla', 'res_olympus_microscope')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO resources (
        id, title, category, department, location, owner_id, owner_name, owner_role,
        institution_id, institution_name, description, specifications, safety_level_required,
        requires_certification, condition_score, condition_status, status, image_url,
        hourly_rate_credits, accessories, maintenance_schedule, total_bookings_count,
        approval_mode, allow_external_users, max_duration_hours, advance_booking_days
      ) VALUES
      (
        'res_spacesync_hall',
        'Alan Turing Multi-Media Seminar Hall & Collaboration Suite',
        'Classrooms & Spaces',
        'Computer Science',
        'Turing Complex, 2nd Floor, Room 204',
        'usr_owner_marcus',
        'Prof. Marcus Vance',
        'Facilities & Space Coordinator',
        'INST_COMP',
        'Turing Institute for Advanced Computing',
        'High-tech 60-seat bookable classroom, lecture space, and team presentation suite equipped with dual 4K laser projectors, directional ceiling microphone arrays, and modular student pod desks.',
        '{"Seating Capacity":"60 Students (Modular layout)","A/V System":"Dual 4K Laser Projectors + Crestron Control","Audio":"Ceiling Beamforming Mic Array + Wireless Podium"}',
        1,
        'Standard Classroom Access Protocol',
        98,
        'Pristine',
        'Available',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        20,
        '["Wireless Presenter Remote","HDMI/USB-C Wall Plates"]',
        'Monthly audio/visual loop inspection',
        18,
        'MODE_A_AUTO',
        1,
        8,
        14
      ),
      (
        'res_resourcebridge_hub',
        'Inter-Collegiate Nanofabrication & Cleanroom Suite',
        'Lab Equipment',
        'Materials Science',
        'Alliance Central Science Facility, Bay 01',
        'usr_owner_marcus',
        'Prof. Marcus Vance',
        'Alliance Consortium Director',
        'INST_EXTERNAL',
        'National Science Alliance (External)',
        'Shared multi-collegiate research facility connecting regional universities for sub-micron electron beam lithography, vacuum thin-film deposition, and surface metrology under unified safety oversight.',
        '{"Cleanroom Class":"ISO Class 5 (Class 100)","Lithography":"Direct-write electron beam (10nm resolution)"}',
        3,
        'Alliance Cleanroom Protocol Level 3',
        99,
        'Pristine',
        'Available',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        60,
        '["Gowning suit airlock pass","Wafer transport carrier box"]',
        'HEPA filter airflow laminar certification quarterly',
        52,
        'MODE_D_MULTI_STAGE',
        1,
        24,
        30
      )
    `).run();
  } catch {}
}

export function seedDatabase(force = false) {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    return;
  }

  // Clear tables if forcing reset
  if (force) {
    db.exec(`
      DELETE FROM resource_accessories;
      DELETE FROM maintenance_records;
      DELETE FROM condition_reports;
      DELETE FROM waiting_list;
      DELETE FROM notifications;
      DELETE FROM audit_logs;
      DELETE FROM incidents;
      DELETE FROM bookings;
      DELETE FROM resources;
      DELETE FROM users;
      DELETE FROM institutions;
    `);
  }

  // 1. Seed Institutions
  const insertInst = db.prepare(`
    INSERT INTO institutions (id, name, code, description) VALUES (?, ?, ?, ?)
  `);

  insertInst.run('INST_ENG', 'College of Engineering & Applied Sciences', 'COE', 'Premier engineering school with microelectronics, robotics, and nanofabrication facilities.');
  insertInst.run('INST_MED', 'School of Medicine & Bio-Innovations', 'SOM', 'Advanced clinical bioengineering, microscopy, and biocompatible additive manufacturing suites.');
  insertInst.run('INST_COMP', 'Turing Institute for Advanced Computing', 'TIAC', 'Supercomputing datacenter housing massive accelerated AI clusters and quantum simulation nodes.');
  insertInst.run('INST_EXTERNAL', 'National Science Alliance (External)', 'NSA', 'External research organization affiliated for cross-institutional research access.');


  // 2. Seed Users (with secure bcrypt hash for 'Password@123')
  const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, title, institution_id, institution_name, department, avatar, safety_level, certifications, trust_score, is_external)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seeker 1: Alex Rivera (Internal Engineering Seeker, Level 2)
  insertUser.run(
    'usr_seeker_alex',
    'Alex Rivera',
    'alex@institution.edu',
    defaultPasswordHash,
    'RESOURCE_SEEKER',
    'Graduate Researcher (Robotics)',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'Electrical & Computer Engineering',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    2,
    JSON.stringify(['High-Voltage Safety Level 2', 'Precision Instrumentation L1', 'Cleanroom Protocol A']),
    98,
    0
  );

  // Seeker 2: Samantha Chen (External Affiliate Seeker)
  insertUser.run(
    'usr_seeker_samantha',
    'Samantha Chen',
    'samantha@external.edu',
    defaultPasswordHash,
    'RESOURCE_SEEKER',
    'Senior Capstone Fellow',
    'INST_EXTERNAL',
    'National Science Alliance (External)',
    'Independent Signal Research',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    1,
    JSON.stringify(['Basic Lab Safety L1']),
    95,
    1
  );

  // Owner: Prof. Marcus Vance (Resource Custodian)
  insertUser.run(
    'usr_owner_marcus',
    'Prof. Marcus Vance',
    'marcus@institution.edu',
    defaultPasswordHash,
    'RESOURCE_OWNER',
    'Director, Microelectronics Lab',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'Electrical Engineering',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    3,
    JSON.stringify(['Master Lab Administrator', 'Hazmat & HV Instructor', 'ISO-17025 Lead Auditor']),
    100,
    0
  );

  // Institution Manager 1: Dean Sarah Jenkins (College of Engineering)
  insertUser.run(
    'usr_mgr_sarah',
    'Dean Sarah Jenkins',
    'dean.jenkins@institution.edu',
    defaultPasswordHash,
    'INSTITUTION_MANAGER',
    'Associate Dean of Research & Facilities',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'Dean of Engineering Office',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    3,
    JSON.stringify(['Institutional Facilities Overseer', 'Institutional Access Signoff']),
    100,
    0
  );

  // Institution Manager 2: Dr. Robert Cho (School of Medicine)
  insertUser.run(
    'usr_mgr_robert',
    'Dr. Robert Cho',
    'robert.cho@institution.edu',
    defaultPasswordHash,
    'INSTITUTION_MANAGER',
    'Bio-Innovation Facility Director',
    'INST_MED',
    'School of Medicine & Bio-Innovations',
    'Medical Research Operations',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    3,
    JSON.stringify(['Biosafety Level 3 Director', 'Clinical IRB Assurance']),
    100,
    0
  );

  // Admin: Dr. Elena Rostova
  insertUser.run(
    'usr_admin_elena',
    'Dr. Elena Rostova',
    'elena@institution.edu',
    defaultPasswordHash,
    'ADMIN',
    'Chief Compliance & Asset Assurance Officer',
    'INST_ENG',
    'Institutional Research & Safety Office',
    'Platform Administration',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    3,
    JSON.stringify(['Platform Master Administrator', 'Global Safety Auditor']),
    100,
    0
  );

  // 3. Seed Resources (Configured with Multi-Stage Policies & Institution Relationships)
  const insertResource = db.prepare(`
    INSERT INTO resources (
      id, title, category, department, location, owner_id, owner_name, owner_role,
      institution_id, institution_name, description, specifications, safety_level_required,
      requires_certification, condition_score, condition_status, status, image_url,
      hourly_rate_credits, accessories, maintenance_schedule, total_bookings_count,
      approval_mode, allow_external_users, max_duration_hours, advance_booking_days
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Resource 1: Digital Storage Oscilloscope (College of Engineering - Multi-Stage Approval: Owner + Dean approval!)
  insertResource.run(
    'res_oscilloscope_tek',
    'Digital Storage Oscilloscope',
    'Testing & Measurement',
    'Electrical Engineering',
    'Maxwell Science Center, Room 402B',
    'usr_owner_marcus',
    'Prof. Marcus Vance',
    'Director, Microelectronics Lab',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'Tektronix TBS2000B series 100 MHz, 2-Channel Digital Storage Oscilloscope featuring a 9-inch WVGA color display, 5M point record length, and 1 GS/s sampling rate. Perfect for analog/digital circuit characterization and waveform diagnostics.',
    JSON.stringify({
      'Bandwidth': '100 MHz (2 Analog Channels)',
      'Sample Rate': '1.0 GS/s per channel',
      'Record Length': '5M points per channel',
      'Display': '9-inch WVGA color TFT LCD (800x480)',
      'Calibration Expiry': 'December 15, 2026',
    }),
    2,
    'High-Voltage Safety Level 2',
    99,
    'Pristine',
    'Available',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    15,
    JSON.stringify([
      '2x TPP0100 100MHz 10x Passive Probes',
      'Standard 3-prong Grounded AC Power Cord',
      'Protective Front Travel Cover',
      'BNC-to-Alligator Diagnostic Clips',
    ]),
    'Quarterly NIST-traceable calibration; next due Dec 2026',
    42,
    'MODE_D_MULTI_STAGE', // Requires both Owner and Institution Dean approval!
    1, // External users allowed
    12,
    30
  );

  // Resource 2: NVIDIA DGX A100 (Turing Institute - Owner Approval only)
  insertResource.run(
    'res_nvidia_dgx',
    'NVIDIA DGX A100 AI Compute Node',
    'Computing & AI',
    'Computer Science',
    'Turing Datacenter, Rack C-04',
    'usr_owner_marcus',
    'Prof. Marcus Vance',
    'HPC Facility Lead',
    'INST_COMP',
    'Turing Institute for Advanced Computing',
    'Universal system for all AI infrastructure featuring 8x NVIDIA A100 Tensor Core GPUs with 640GB total GPU memory, dual AMD EPYC CPUs, and 2TB RAM.',
    JSON.stringify({
      'Compute Engine': '8x NVIDIA A100 80GB SXM4',
      'System Memory': '2.0 TB DDR4-3200',
      'Storage': '30 TB NVMe Gen4 High IOPS',
    }),
    1,
    'Institutional HPC Protocol L1',
    97,
    'Pristine',
    'Available',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    85,
    JSON.stringify(['SSH Key Access Gateway', 'CUDA 12.4 Container Template']),
    'Automated weekly driver diagnostics',
    89,
    'MODE_B_OWNER',
    1,
    48,
    14
  );

  // Resource 3: Formlabs Form 3+ SLA (School of Medicine - Institution Approval only, External Users Blocked!)
  insertResource.run(
    'res_formlabs_sla',
    'Formlabs Form 3+ SLA Precision 3D Printer',
    'Robotics & Prototyping',
    'Bioengineering',
    'Franklin Innovation Wing, Lab 108',
    'usr_mgr_robert',
    'Dr. Robert Cho',
    'Bio-Innovation Facility Director',
    'INST_MED',
    'School of Medicine & Bio-Innovations',
    'Industrial-grade Low Force Stereolithography 3D printer for medical microfluidics and biocompatible micro-structures. Strictly restricted to verified medical school affiliates.',
    JSON.stringify({
      'Laser Spot Size': '85 microns',
      'Layer Thickness': '25 - 300 microns',
      'Build Volume': '14.5 x 14.5 x 18.5 cm',
    }),
    2,
    'Resin Hazmat & UV Laser Safety',
    92,
    'Good',
    'In Use',
    'https://images.unsplash.com/photo-1631556097152-c39479bcffea?auto=format&fit=crop&w=800&q=80',
    25,
    JSON.stringify(['Form Wash ultrasonic bath', 'Form Cure UV chamber', 'Resin scraper kit']),
    'Tank optical inspection after every 5L resin',
    64,
    'MODE_C_INSTITUTION', // Institution Manager Dr. Robert Cho must approve
    0, // External users BLOCKED by policy!
    24,
    14
  );

  // Resource 4: Universal Robots UR5e Cobot (College of Engineering)
  insertResource.run(
    'res_ur5e_cobot',
    'Universal Robots UR5e Collaborative Arm',
    'Robotics & Prototyping',
    'Electrical & Computer Engineering',
    'Robotics Annex, Bay 03',
    'usr_owner_marcus',
    'Prof. Marcus Vance',
    'Robotics Lab Director',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    '6-axis collaborative robotic arm with 5 kg payload and 850 mm reach, equipped with Robotiq 2F-85 adaptive gripper.',
    JSON.stringify({
      'Payload': '5 kg (11 lbs)',
      'Reach Radius': '850 mm',
      'Repeatability': '±0.03 mm',
    }),
    2,
    'Cobot Kinetic Risk Assessment L2',
    95,
    'Pristine',
    'Available',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    40,
    JSON.stringify(['Teach Pendant with Polyscope 5.12', 'Safety E-stop pendant', 'Gripper fingertip calibration kit']),
    'Joint torque harmonic check every 250 operating hours',
    31,
    'MODE_D_MULTI_STAGE',
    1,
    12,
    21
  );

  // Resource 5: FLIR T865 Thermal Camera (Mode A: Automatic Approval)
  insertResource.run(
    'res_flir_thermal',
    'FLIR T865 High-Definition Thermal Camera',
    'Testing & Measurement',
    'Materials Science',
    'Materials Research Hall, Room 210',
    'usr_owner_marcus',
    'Prof. Marcus Vance',
    'Metrology Lab Lead',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'Professional handheld thermal imaging camera with 640 x 480 IR resolution and temperature range up to 2000°C. Configured for automated instant reservation.',
    JSON.stringify({
      'IR Detector': '640 x 480 uncooled microbolometer',
      'Thermal Sensitivity': '<30 mK at 30°C',
    }),
    1,
    'Precision Instrumentation L1',
    98,
    'Pristine',
    'Available',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    30,
    JSON.stringify(['2x Lithium-ion smart batteries', 'Rugged Pelican transport case']),
    'Blackbody temperature verification semi-annually',
    28,
    'MODE_A_AUTO', // Automatic approval!
    1,
    8,
    14
  );

  // Resource 6: Olympus BX53 Microscope (Maintenance status)
  insertResource.run(
    'res_olympus_microscope',
    'Olympus BX53 Upright Fluorescence Microscope',
    'Lab Equipment',
    'Bioengineering',
    'Bioscience Tower, Room 512',
    'usr_mgr_robert',
    'Dr. Robert Cho',
    'Bio-Innovation Facility Director',
    'INST_MED',
    'School of Medicine & Bio-Innovations',
    'Research-grade upright microscope with multi-band fluorescence LED illumination. Currently under stage recalibration.',
    JSON.stringify({
      'Objectives': 'UPlanSApo 10x, 20x, 40x, 100x Oil',
      'Camera': 'Hamamatsu sCMOS (20.4 MP)',
    }),
    2,
    'Biosafety Level 2 & Optical Radiation',
    89,
    'Fair',
    'Maintenance',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    50,
    JSON.stringify(['Objective oil kit', 'DIC prism slider set']),
    'Annual stage recalibration and optical realignment in progress',
    77,
    'MODE_C_INSTITUTION',
    0,
    10,
    14
  );

  // 4. Seed Existing Bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      id, resource_id, resource_title, resource_category, institution_id, institution_name,
      seeker_id, seeker_name, seeker_email, seeker_institution_id, seeker_institution_name,
      seeker_department, is_external_seeker, owner_id, start_date, end_date, purpose,
      course_code, priority, certified_agreement, status, approval_mode, owner_approval,
      institution_approval, info_request, waitlist_position, rejection_reason, created_at,
      approved_at, approved_by, check_in, return_checkout, timeline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Existing conflict booking on Oscilloscope (Nov 2, 10:00 to 14:00)
  insertBooking.run(
    'bkg_sample_overlap_01',
    'res_oscilloscope_tek',
    'Digital Storage Oscilloscope',
    'Testing & Measurement',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'usr_seeker_samantha',
    'Samantha Chen',
    'samantha@external.edu',
    'INST_EXTERNAL',
    'National Science Alliance (External)',
    'Independent Signal Research',
    1,
    'usr_owner_marcus',
    '2026-11-02T10:00',
    '2026-11-02T14:00',
    'Senior Design Capstone: High-speed SPI bus impedance matching and jitter measurement.',
    'EE-490',
    'routine',
    1,
    'APPROVED',
    'MODE_D_MULTI_STAGE',
    JSON.stringify({ status: 'APPROVED', decidedBy: 'Prof. Marcus Vance', decidedAt: '2026-10-25T11:30:00Z', notes: 'Safety verified' }),
    JSON.stringify({ status: 'APPROVED', decidedBy: 'Dean Sarah Jenkins', decidedAt: '2026-10-25T14:00:00Z', notes: 'External capstone verified' }),
    null,
    null,
    null,
    '2026-10-25T09:15:00Z',
    '2026-10-25T14:00:00Z',
    'Dean Sarah Jenkins',
    null,
    null,
    JSON.stringify([
      {
        id: 'tl_1',
        title: 'Booking Request Submitted',
        description: 'Multi-stage reservation requested for Nov 2, 2026 (10:00 - 14:00)',
        timestamp: '2026-10-25T09:15:00Z',
        actor: 'Samantha Chen',
        statusBadge: 'Submitted',
      },
      {
        id: 'tl_2',
        title: 'Stage 1 Approved: Resource Custodian',
        description: 'Approved by Prof. Marcus Vance.',
        timestamp: '2026-10-25T11:30:00Z',
        actor: 'Prof. Marcus Vance',
        statusBadge: 'Owner Approved',
      },
      {
        id: 'tl_3',
        title: 'Stage 2 Approved: College Dean / Institution Manager',
        description: 'Final institutional sign-off granted by Dean Sarah Jenkins.',
        timestamp: '2026-10-25T14:00:00Z',
        actor: 'Dean Sarah Jenkins',
        statusBadge: 'Approved',
      },
    ])
  );

  // Existing In-Use booking on Formlabs SLA
  insertBooking.run(
    'bkg_sample_sla_inuse',
    'res_formlabs_sla',
    'Formlabs Form 3+ SLA Precision 3D Printer',
    'Robotics & Prototyping',
    'INST_MED',
    'School of Medicine & Bio-Innovations',
    'usr_seeker_alex',
    'Alex Rivera',
    'alex@institution.edu',
    'INST_ENG',
    'College of Engineering & Applied Sciences',
    'Electrical & Computer Engineering',
    0,
    'usr_mgr_robert',
    '2026-10-27T08:00',
    '2026-10-29T18:00',
    'Micro-actuator housing print using Tough 2000 resin for soft robotic gripper project.',
    'ROB-801',
    'thesis',
    1,
    'CHECKED_OUT',
    'MODE_C_INSTITUTION',
    null,
    JSON.stringify({ status: 'APPROVED', decidedBy: 'Dr. Robert Cho', decidedAt: '2026-10-26T16:20:00Z', notes: 'Approved for bio-robotics thesis' }),
    null,
    null,
    null,
    '2026-10-26T14:00:00Z',
    '2026-10-26T16:20:00Z',
    'Dr. Robert Cho',
    JSON.stringify({
      timestamp: '2026-10-27T08:15:00Z',
      actor: 'Alex Rivera',
      condition: 'Pristine',
      rating: 5,
      checklist: { powerCord: true, probesOrCables: true, calibrationIntact: true, screenClean: true },
      notes: 'Resin tank optical window cleaned, build platform leveled without imperfections.',
      signature: 'Alex Rivera (Verified Digital Sign)',
    }),
    null,
    JSON.stringify([
      {
        id: 'tl_sla_1',
        title: 'Booking Requested',
        description: 'Thesis priority request submitted',
        timestamp: '2026-10-26T14:00:00Z',
        actor: 'Alex Rivera',
        statusBadge: 'Submitted',
      },
      {
        id: 'tl_sla_2',
        title: 'Institution Approved',
        description: 'Approved by Dr. Robert Cho for 54-hour continuous print run',
        timestamp: '2026-10-26T16:20:00Z',
        actor: 'Dr. Robert Cho',
        statusBadge: 'Approved',
      },
      {
        id: 'tl_sla_3',
        title: 'Equipment Checked Out / In Use',
        description: 'Initial condition recorded as Pristine (5/5). Build underway.',
        timestamp: '2026-10-27T08:15:00Z',
        actor: 'Alex Rivera',
        statusBadge: 'Checked In',
      },
    ])
  );

  // 5. Seed Incidents
  const insertIncident = db.prepare(`
    INSERT INTO incidents (id, resource_id, resource_title, reported_by, reporter_role, booking_id, title, description, severity, status, created_at, resolution_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIncident.run(
    'inc_sample_01',
    'res_olympus_microscope',
    'Olympus BX53 Upright Fluorescence Microscope',
    'Kavita Patel (Research Fellow)',
    'Researcher',
    null,
    'Piezo Z-drive calibration deviation in Cy5 channel',
    'During automated 3D z-stack acquisition, z-position drifted 4.2 microns over a 15-minute timecourse. Needs stepper motor backlash recalibration.',
    'Medium',
    'Investigating',
    '2026-10-24T16:45:00Z',
    'Scheduled vendor engineer arrival for optical stage recalibration.'
  );

  // 6. Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action_type, resource_id, resource_title, booking_id, actor_name, actor_role, actor_id, detail, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    'aud_seed_01',
    '2026-10-27T08:15:00Z',
    'CHECK_IN_COMPLETED',
    'res_formlabs_sla',
    'Formlabs Form 3+ SLA Precision 3D Printer',
    'bkg_sample_sla_inuse',
    'Alex Rivera',
    'RESOURCE_SEEKER',
    'usr_seeker_alex',
    'Physical check-in completed. Condition recorded as Pristine (5/5). 4/4 checklist items certified.',
    '0x8f4c718b2a59d99c31405e321bf4a24c568d7120aef1c29497e5ad42b6ff8c11'
  );

  insertAudit.run(
    'aud_seed_02',
    '2026-10-26T16:20:00Z',
    'INSTITUTION_APPROVED',
    'res_formlabs_sla',
    'Formlabs Form 3+ SLA Precision 3D Printer',
    'bkg_sample_sla_inuse',
    'Dr. Robert Cho',
    'INSTITUTION_MANAGER',
    'usr_mgr_robert',
    'Institution-level reservation approved after verifying student resin safety certification.',
    '0x3a9d21c45582f1b7829cd8a43924f7e8105c742918e9501a4e21dc30b1e4fa83'
  );

  insertAudit.run(
    'aud_seed_03',
    '2026-10-25T14:00:00Z',
    'BOOKING_APPROVED',
    'res_oscilloscope_tek',
    'Digital Storage Oscilloscope',
    'bkg_sample_overlap_01',
    'Dean Sarah Jenkins',
    'INSTITUTION_MANAGER',
    'usr_mgr_sarah',
    'Multi-stage approval finalized for Samantha Chen (Nov 2, 10:00-14:00).',
    '0x4e6b12a884f09d17326a5c128bf39c512d77a346129841fbc829375e214d023b'
  );

  // 7. Seed Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, timestamp, read, link_page, booking_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    'notif_seed_01',
    'usr_seeker_alex',
    'Check-In Confirmed',
    'Your check-in for Formlabs Form 3+ SLA 3D Printer has been recorded.',
    'success',
    '2026-10-27T08:15:00Z',
    0,
    'bookings',
    'bkg_sample_sla_inuse'
  );

  insertNotif.run(
    'notif_seed_02',
    'usr_owner_marcus',
    'Active Loan Reminder',
    'Alex Rivera is currently operating Formlabs Form 3+ SLA 3D Printer in Lab 108.',
    'info',
    '2026-10-27T08:16:00Z',
    1,
    'approvals',
    'bkg_sample_sla_inuse'
  );

  insertNotif.run(
    'notif_seed_03',
    'usr_mgr_sarah',
    'Institutional Asset Notice',
    'New semester lab allocations active under College of Engineering oversight.',
    'info',
    '2026-10-25T14:05:00Z',
    0,
    'approvals',
    null
  );

  // 6. Seed Accessories
  const insertAcc = db.prepare(`
    INSERT INTO resource_accessories (id, resource_id, name, description, quantity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAcc.run('acc_tek_01', 'res_oscilloscope_tek', '2x TPP0100 100MHz 10x Passive Probes', 'High-impedance oscilloscope probes with ground leads', 2, 'PRESENT');
  insertAcc.run('acc_tek_02', 'res_oscilloscope_tek', 'Standard 3-prong Grounded AC Power Cord', 'NEMA 5-15P to IEC 60320 C13 cord', 1, 'PRESENT');
  insertAcc.run('acc_tek_03', 'res_oscilloscope_tek', 'Protective Front Travel Cover', 'Rigid snap-on face cover', 1, 'PRESENT');
  insertAcc.run('acc_tek_04', 'res_oscilloscope_tek', 'BNC-to-Alligator Diagnostic Clips', 'Shielded coaxial test clips', 2, 'PRESENT');

  insertAcc.run('acc_sla_01', 'res_formlabs_sla', 'Form Wash Ultrasonic Bath', 'Automated IPA washing station', 1, 'PRESENT');
  insertAcc.run('acc_sla_02', 'res_formlabs_sla', 'Form Cure UV Chamber', '405nm post-curing unit with 80C heat cycle', 1, 'PRESENT');
  insertAcc.run('acc_sla_03', 'res_formlabs_sla', 'Resin Scraper and Flush Cutters Kit', 'Stainless finishing tools', 1, 'PRESENT');

  insertAcc.run('acc_ur5e_01', 'res_ur5e_cobot', 'Teach Pendant with Polyscope 5.12', '12-inch capacitive touch interface with 3-position enable switch', 1, 'PRESENT');
  insertAcc.run('acc_ur5e_02', 'res_ur5e_cobot', 'Safety E-stop Pendant', 'Hardware emergency stop module', 1, 'PRESENT');
  insertAcc.run('acc_ur5e_03', 'res_ur5e_cobot', 'Robotiq 2F-85 Parallel Gripper Kit', 'Adaptive electric servo gripper', 1, 'PRESENT');

  insertAcc.run('acc_flir_01', 'res_flir_thermal', '2x Lithium-ion Smart Batteries', 'Rechargeable field packs', 2, 'PRESENT');
  insertAcc.run('acc_flir_02', 'res_flir_thermal', 'Rugged Pelican Transport Case', 'IP67 foam-padded case', 1, 'PRESENT');

  // 7. Seed Maintenance Records
  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (id, resource_id, maintenance_type, description, scheduled_at, completed_at, performed_by, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMaint.run(
    'maint_microscope_active',
    'res_olympus_microscope',
    'CALIBRATION',
    'Annual stage recalibration and optical realignment in progress.',
    '2026-10-20T09:00:00Z',
    null,
    'Olympus Certified Bio-Metrology Service',
    'IN_PROGRESS',
    'Prior Scientific motorized XY stage stepper motor zeroing underway.',
    '2026-10-20T09:00:00Z'
  );

  insertMaint.run(
    'maint_tek_past',
    'res_oscilloscope_tek',
    'PREVENTATIVE',
    'Quarterly NIST-traceable calibration and frequency response test.',
    '2026-06-15T10:00:00Z',
    '2026-06-15T14:30:00Z',
    'Prof. Marcus Vance (Certified NIST Calibrator)',
    'COMPLETED',
    'Channel 1 & 2 verified within ±1.5% vertical accuracy tolerance. Certificate #NIST-8849-TEK.',
    '2026-06-15T08:00:00Z'
  );

  insertMaint.run(
    'maint_dgx_past',
    'res_nvidia_dgx',
    'PREVENTATIVE',
    'Liquid cooling reservoir flush and NVLink bus diagnostics.',
    '2026-09-01T08:00:00Z',
    '2026-09-01T12:00:00Z',
    'Turing Datacenter Systems Team',
    'COMPLETED',
    'All 8x A100 GPUs operating at <62C under full synthetic load.',
    '2026-08-25T10:00:00Z'
  );

  // 8. Seed Condition Reports
  const insertCond = db.prepare(`
    INSERT INTO condition_reports (id, resource_id, booking_id, report_type, rating, condition_summary, checklist, notes, signature, evidence_references, submitted_by, reviewed_by, review_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCond.run(
    'cr_seed_tek_initial',
    'res_oscilloscope_tek',
    'bkg_sample_overlap_01',
    'INSPECTION',
    5,
    'Pristine condition certified prior to semester checkout.',
    JSON.stringify({ powerCord: true, probesTested: true, calibrationSealIntact: true, screenClean: true }),
    'Instrument warranty tamper seals intact; all channels zeroed perfectly.',
    'Prof. Marcus Vance',
    JSON.stringify(['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80']),
    'Prof. Marcus Vance',
    'Prof. Marcus Vance',
    'VERIFIED',
    '2026-10-25T11:30:00Z'
  );

  insertCond.run(
    'cr_seed_sla_checkin',
    'res_formlabs_sla',
    'bkg_sample_sla_inuse',
    'CHECK_IN',
    5,
    'Pristine condition observed upon pickup. Build chamber cleaned.',
    JSON.stringify({ powerCord: true, resinTankInspected: true, buildPlatformZeroed: true, uvCoverClean: true }),
    'Resin tank optical window cleaned, build platform leveled and zeroed without imperfections.',
    'Alex Rivera (Verified Digital Sign)',
    JSON.stringify(['https://images.unsplash.com/photo-1631556097152-c39479bcffea?auto=format&fit=crop&w=800&q=80']),
    'Alex Rivera',
    'Prof. Marcus Vance',
    'VERIFIED',
    '2026-10-27T08:15:00Z'
  );

  // 9. Seed Waiting List Queue
  const insertWait = db.prepare(`
    INSERT INTO waiting_list (id, resource_id, user_id, requested_start_date, requested_end_date, purpose, status, position, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertWait.run(
    'wl_seed_sample_01',
    'res_oscilloscope_tek',
    'usr_seeker_samantha',
    '2026-11-02T10:00',
    '2026-11-02T14:00',
    'High-speed SPI bus jitter diagnostics queue',
    'WAITING',
    1,
    '2026-10-26T10:00:00Z'
  );
}

export function generateAuditHash(action: string, entityId: string, actor: string, timestamp: string): string {
  const content = `${action}:${entityId}:${actor}:${timestamp}`;
  return '0x' + crypto.createHash('sha256').update(content).digest('hex');
}

export function createAuditEntry(data: {
  actionType: string;
  resourceId?: string;
  resourceTitle?: string;
  bookingId?: string;
  actorName: string;
  actorRole: string;
  actorId?: string;
  detail: string;
  timestamp?: string;
}): string {
  const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = data.timestamp || new Date().toISOString();
  const hash = generateAuditHash(data.actionType, data.bookingId || data.resourceId || id, data.actorName, timestamp);

  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action_type, resource_id, resource_title, booking_id, actor_name, actor_role, actor_id, detail, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    timestamp,
    data.actionType,
    data.resourceId || null,
    data.resourceTitle || null,
    data.bookingId || null,
    data.actorName,
    data.actorRole,
    data.actorId || null,
    data.detail,
    hash
  );

  return id;
}

export function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'alert';
  linkPage?: string;
  bookingId?: string;
}): string {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const notifType = data.type || 'info';

  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, timestamp, read, link_page, booking_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.userId,
    data.title,
    data.message,
    notifType,
    timestamp,
    0,
    data.linkPage || null,
    data.bookingId || null
  );

  return id;
}

export function formatResourceRow(row: Record<string, any>) {
  let specs = {};
  let accessories: string[] = [];

  try {
    specs = typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications || {};
  } catch {
    specs = {};
  }

  try {
    accessories = typeof row.accessories === 'string' ? JSON.parse(row.accessories) : row.accessories || [];
  } catch {
    accessories = [];
  }

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    department: row.department,
    location: row.location,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerRole: row.owner_role,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    description: row.description,
    specifications: specs,
    safetyLevelRequired: Number(row.safety_level_required),
    requiresCertification: row.requires_certification,
    conditionScore: Number(row.condition_score),
    conditionStatus: row.condition_status,
    status: row.status,
    imageUrl: row.image_url,
    hourlyRateCredits: Number(row.hourly_rate_credits),
    accessories,
    maintenanceSchedule: row.maintenance_schedule,
    totalBookingsCount: Number(row.total_bookings_count),
    approvalMode: row.approval_mode,
    allowExternalUsers: Boolean(row.allow_external_users),
    maxDurationHours: Number(row.max_duration_hours),
    advanceBookingDays: Number(row.advance_booking_days),
    platform:
      row.platform ||
      (row.id === 'res_spacesync_hall' || row.category === 'Classrooms & Spaces'
        ? 'SpaceSync'
        : row.id === 'res_resourcebridge_hub' || row.institution_id === 'INST_EXTERNAL'
        ? 'ResourceBridge'
        : row.id === 'res_nvidia_dgx' || row.id === 'res_flir_thermal' || row.category === 'Computing & AI'
        ? 'EquipX'
        : row.id === 'res_oscilloscope_tek' || row.id === 'res_formlabs_sla' || row.id === 'res_ur5e_cobot' || row.category === 'Testing & Measurement' || row.category === 'Robotics & Prototyping'
        ? 'ToolConnect'
        : 'LabShare'),
  };
}

export function formatBookingRow(row: Record<string, any>) {
  let ownerApproval = null;
  let institutionApproval = null;
  let infoRequest = null;
  let checkIn = null;
  let returnCheckOut = null;
  let timeline = [];

  try {
    if (row.owner_approval) ownerApproval = JSON.parse(row.owner_approval);
  } catch {}

  try {
    if (row.institution_approval) institutionApproval = JSON.parse(row.institution_approval);
  } catch {}

  try {
    if (row.info_request) infoRequest = JSON.parse(row.info_request);
  } catch {}

  try {
    if (row.check_in) checkIn = JSON.parse(row.check_in);
  } catch {}

  try {
    if (row.return_checkout) returnCheckOut = JSON.parse(row.return_checkout);
  } catch {}

  try {
    if (row.timeline) timeline = JSON.parse(row.timeline);
  } catch {}

  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceTitle: row.resource_title,
    resourceCategory: row.resource_category,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    seekerId: row.seeker_id,
    seekerName: row.seeker_name,
    seekerEmail: row.seeker_email,
    seekerInstitutionId: row.seeker_institution_id,
    seekerInstitutionName: row.seeker_institution_name,
    seekerDepartment: row.seeker_department,
    isExternalSeeker: Boolean(row.is_external_seeker),
    ownerId: row.owner_id,
    startDate: row.start_date,
    endDate: row.end_date,
    purpose: row.purpose,
    courseCode: row.course_code,
    priority: row.priority,
    certifiedAgreement: Boolean(row.certified_agreement),
    status: row.status,
    approvalMode: row.approval_mode,
    ownerApproval,
    institutionApproval,
    infoRequest,
    waitlistPosition: row.waitlist_position !== null ? Number(row.waitlist_position) : undefined,
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    checkIn: checkIn || undefined,
    returnCheckOut: returnCheckOut || undefined,
    timeline: timeline || [],
  };
}

export function formatIncidentRow(row: Record<string, any>) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceTitle: row.resource_title,
    reportedBy: row.reported_by,
    reporterRole: row.reporter_role,
    bookingId: row.booking_id || undefined,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
    resolutionNotes: row.resolution_notes || undefined,
  };
}

export function formatConditionReportRow(row: Record<string, any>) {
  let checklist: Record<string, any> = {};
  let evidenceReferences: string[] = [];
  try {
    if (row.checklist) checklist = JSON.parse(row.checklist);
  } catch {}
  try {
    if (row.evidence_references) evidenceReferences = JSON.parse(row.evidence_references);
  } catch {}

  return {
    id: row.id,
    resourceId: row.resource_id,
    bookingId: row.booking_id || undefined,
    reportType: row.report_type,
    rating: Number(row.rating),
    conditionSummary: row.condition_summary,
    checklist,
    notes: row.notes || undefined,
    signature: row.signature || undefined,
    evidenceReferences,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by || undefined,
    reviewStatus: row.review_status,
    createdAt: row.created_at,
  };
}

export function formatMaintenanceRow(row: Record<string, any>) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    maintenanceType: row.maintenance_type,
    description: row.description,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at || undefined,
    performedBy: row.performed_by,
    status: row.status,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function formatAccessoryRow(row: Record<string, any>) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    name: row.name,
    description: row.description || undefined,
    quantity: Number(row.quantity),
    status: row.status,
  };
}

export function formatWaitingListRow(row: Record<string, any>) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    userId: row.user_id,
    requestedStartDate: row.requested_start_date,
    requestedEndDate: row.requested_end_date,
    purpose: row.purpose,
    status: row.status,
    position: Number(row.position),
    createdAt: row.created_at,
  };
}

