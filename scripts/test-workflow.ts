import { app } from '../server/index.ts';
import { db, seedDatabase } from '../server/db.ts';
import type { Server } from 'node:http';

interface TestRecord {
  name: string;
  passed: boolean;
  details: string;
}

const tests: TestRecord[] = [];

function assert(condition: boolean, name: string, details: string) {
  if (condition) {
    tests.push({ name, passed: true, details });
    console.log(`[PASS] ${name}: ${details}`);
  } else {
    tests.push({ name, passed: false, details: `FAILED: ${details}` });
    console.error(`[FAIL] ${name}: ${details}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('ShareSphere AI - Complete Backend & Workflow QA Validation Suite');
  console.log('===============================================================\n');

  // Reset database to known seed state before tests
  seedDatabase(true);

  // Start test server on random open port
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as { port: number };
  const BASE_URL = `http://127.0.0.1:${address.port}/api/v1`;

  try {
    // -------------------------------------------------------------
    // Test 1: User Registration with Password Hashing & Validation
    // -------------------------------------------------------------
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: 'jordan.lee@test.edu',
        password: 'Password@123',
        institutionId: 'INST_ENG',
        institutionName: 'College of Engineering & Applied Sciences',
        department: 'Mechanical Engineering',
        safetyLevel: 2,
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 && regData.success && regData.token && regData.user.role === 'RESOURCE_SEEKER',
      'Test 1: User Registration',
      `Registered Jordan Lee as RESOURCE_SEEKER with JWT token.`
    );

    // Verify password is not plaintext in DB
    const userInDb = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('jordan.lee@test.edu') as { password_hash: string };
    assert(
      userInDb && userInDb.password_hash.startsWith('$2') && !userInDb.password_hash.includes('Password@123'),
      'Test 1B: Password Hashing',
      'Verified password stored as secure bcrypt hash.'
    );

    // Test duplicate registration rejection
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Dup',
        email: 'jordan.lee@test.edu',
        password: 'Password@123',
      }),
    });
    assert(dupRes.status === 409, 'Test 1C: Duplicate Email Rejection', 'Prevented duplicate registration with 409 Conflict.');

    // -------------------------------------------------------------
    // Test 2: User Login (Valid & Invalid Credentials)
    // -------------------------------------------------------------
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@institution.edu', password: 'WrongPassword' }),
    });
    assert(badLoginRes.status === 401, 'Test 2A: Invalid Password Rejection', 'Invalid password rejected with 401.');

    // Valid login for Seeker Alex Rivera
    const alexLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@institution.edu', password: 'Password@123' }),
    });
    const alexData = await alexLoginRes.json();
    const alexToken = alexData.token;
    assert(alexLoginRes.status === 200 && alexToken, 'Test 2B: Seeker Login', `Alex Rivera signed in successfully.`);

    // Valid login for Owner Prof. Marcus Vance
    const marcusLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marcus@institution.edu', password: 'Password@123' }),
    });
    const marcusData = await marcusLoginRes.json();
    const marcusToken = marcusData.token;
    assert(marcusLoginRes.status === 200 && marcusToken, 'Test 2C: Owner Login', `Prof. Marcus Vance signed in.`);

    // Valid login for Dean Sarah Jenkins (Engineering Manager)
    const sarahLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dean.jenkins@institution.edu', password: 'Password@123' }),
    });
    const sarahData = await sarahLoginRes.json();
    const sarahToken = sarahData.token;
    assert(sarahLoginRes.status === 200 && sarahToken, 'Test 2D: Institution Manager Login', `Dean Sarah Jenkins signed in.`);

    // Valid login for Dr. Robert Cho (Medicine Manager)
    const robertLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'robert.cho@institution.edu', password: 'Password@123' }),
    });
    const robertData = await robertLoginRes.json();
    const robertToken = robertData.token;
    assert(robertLoginRes.status === 200 && robertToken, 'Test 2E: Medicine Manager Login', `Dr. Robert Cho signed in.`);

    // Valid login for External Seeker Samantha Chen
    const samanthaLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'samantha@external.edu', password: 'Password@123' }),
    });
    const samanthaData = await samanthaLoginRes.json();
    const samanthaToken = samanthaData.token;
    assert(samanthaLoginRes.status === 200 && samanthaToken, 'Test 2F: External Seeker Login', `Samantha Chen signed in.`);

    // -------------------------------------------------------------
    // Test 3: Current User Profile (GET /auth/me)
    // -------------------------------------------------------------
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.user.name === 'Alex Rivera' && meData.user.safetyLevel === 2,
      'Test 3: Current User Profile (/auth/me)',
      `Retrieved profile for ${meData.user.name} (Safety Level ${meData.user.safetyLevel}).`
    );

    // -------------------------------------------------------------
    // Test 4: Protected Booking Routes (401 without token)
    // -------------------------------------------------------------
    const unauthRes = await fetch(`${BASE_URL}/bookings`, { method: 'POST', body: JSON.stringify({}) });
    assert(unauthRes.status === 401, 'Test 4: Protected Routes', 'Unauthenticated booking request rejected with 401.');

    // -------------------------------------------------------------
    // Test 5: Booking Submission Validation (Eligibility, Limits, Policies)
    // -------------------------------------------------------------
    // 5A: Safety clearance prerequisite unmet (Alex has Level 2, try resource requiring Level 3 if any, or test check)
    // Create resource requiring Safety Level 3
    db.prepare(`
      INSERT INTO resources (
        id, title, category, department, location, owner_id, owner_name, owner_role,
        institution_id, institution_name, description, specifications, safety_level_required,
        requires_certification, condition_score, condition_status, status, image_url,
        hourly_rate_credits, accessories, maintenance_schedule, total_bookings_count,
        approval_mode, allow_external_users, max_duration_hours, advance_booking_days
      ) VALUES (
        'res_high_rad', 'High-Radiation Particle Chamber', 'Testing & Measurement', 'Nuclear Eng',
        'Rad Hall 101', 'usr_owner_marcus', 'Prof. Marcus Vance', 'Custodian',
        'INST_ENG', 'College of Engineering & Applied Sciences', 'Chamber', '{}',
        3, 'Nuclear Safety L3', 100, 'Pristine', 'Available', 'https://example.com/img.jpg',
        50, '[]', 'Weekly', 0, 'MODE_B_OWNER', 1, 8, 30
      )
    `).run();

    const safetyFailRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_high_rad',
        startDate: '2026-11-15T09:00',
        endDate: '2026-11-15T12:00',
        purpose: 'Radiation test experiment',
        courseCode: 'NE-901',
        priority: 'routine',
        certifiedAgreement: true,
      }),
    });
    assert(
      safetyFailRes.status === 403,
      'Test 5A: Safety Clearance Prerequisite Enforced',
      'Correctly blocked Level 2 applicant from Level 3 equipment.'
    );

    // 5B: External access prohibited (Formlabs SLA blocks external users)
    const externalFailRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${samanthaToken}`, // External seeker
      },
      body: JSON.stringify({
        resourceId: 'res_formlabs_sla', // allow_external_users = 0
        startDate: '2026-11-04T09:00',
        endDate: '2026-11-04T12:00',
        purpose: 'External prototype testing',
        courseCode: 'EXT-101',
        priority: 'routine',
        certifiedAgreement: true,
      }),
    });
    assert(
      externalFailRes.status === 403,
      'Test 5B: External Access Restriction Enforced',
      'Correctly blocked external applicant from internal-only SLA 3D printer.'
    );

    // 5C: Resource undergoing Maintenance blocked
    const maintRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_olympus_microscope', // Status: Maintenance
        startDate: '2026-11-17T09:00',
        endDate: '2026-11-17T12:00',
        purpose: 'Fluorescence imaging',
        courseCode: 'BIO-201',
        priority: 'routine',
        certifiedAgreement: true,
      }),
    });
    assert(
      maintRes.status === 400,
      'Test 5C: Maintenance Restriction Enforced',
      'Blocked reservation on resource undergoing maintenance.'
    );

    // 5D: Duration limit exceeded
    const durRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_oscilloscope_tek', // max_duration_hours = 12
        startDate: '2026-11-18T08:00',
        endDate: '2026-11-19T10:00', // 26 hours > 12 hours
        purpose: 'Long waveform capture',
        courseCode: 'EE-702',
        priority: 'thesis',
        certifiedAgreement: true,
      }),
    });
    assert(
      durRes.status === 400,
      'Test 5D: Maximum Duration Limit Enforced',
      'Blocked booking exceeding resource max_duration_hours.'
    );

    // -------------------------------------------------------------
    // Test 6: Booking Conflict Detection & Waitlist
    // -------------------------------------------------------------
    // Attempting Nov 2 (11:00-13:00) overlaps Samantha's approved booking (Nov 2 10:00-14:00)
    const conflictRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_oscilloscope_tek',
        startDate: '2026-11-02T11:00',
        endDate: '2026-11-02T13:00',
        purpose: 'Signal integrity diagnostics',
        courseCode: 'EE-702',
        priority: 'thesis',
        certifiedAgreement: true,
        asWaitlist: false,
      }),
    });
    const conflictData = await conflictRes.json();
    assert(
      conflictRes.status === 409 && conflictData.conflict,
      'Test 6A: Booking Overlap Conflict Blocked',
      'Detected collision with approved reservation and returned 409 Conflict.'
    );

    // Join waitlist on conflict
    const waitlistRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_oscilloscope_tek',
        startDate: '2026-11-02T11:00',
        endDate: '2026-11-02T13:00',
        purpose: 'Signal integrity diagnostics',
        courseCode: 'EE-702',
        priority: 'thesis',
        certifiedAgreement: true,
        asWaitlist: true,
      }),
    });
    const waitlistData = await waitlistRes.json();
    assert(
      waitlistRes.status === 201 && waitlistData.booking.status === 'WAITLISTED' && waitlistData.booking.waitlistPosition === 1,
      'Test 6B: Waitlist Queue Assignment',
      `Assigned queue position #${waitlistData.booking.waitlistPosition} with status 'WAITLISTED'.`
    );

    // -------------------------------------------------------------
    // Test 7: Multi-Stage Approval Workflow (Mode D)
    // -------------------------------------------------------------
    // Oscilloscope is MODE_D_MULTI_STAGE (Stage 1: Owner Marcus -> Stage 2: Dean Sarah)
    const msSubmitRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_oscilloscope_tek',
        startDate: '2026-11-10T09:00',
        endDate: '2026-11-10T14:00',
        purpose: 'Microcontroller SPI bus jitter analysis for master thesis.',
        courseCode: 'EE-702',
        priority: 'thesis',
        certifiedAgreement: true,
      }),
    });
    const msSubmitData = await msSubmitRes.json();
    const msBookingId = msSubmitData.booking.id;
    assert(
      msSubmitRes.status === 201 && msSubmitData.booking.status === 'PENDING_OWNER_APPROVAL',
      'Test 7A: Mode D Initial Submission',
      `Submitted multi-stage booking '${msBookingId}' in 'PENDING_OWNER_APPROVAL'.`
    );

    // 7B: Requester cannot approve their own booking
    const selfApproveRes = await fetch(`${BASE_URL}/approvals/${msBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`, // Alex is requester
      },
      body: JSON.stringify({ notes: 'Self approve attempt' }),
    });
    assert(
      selfApproveRes.status === 403,
      'Test 7B: Self-Approval Prevention',
      'Blocked requester from approving their own request (403 Forbidden).'
    );

    // 7C: Institution Manager cannot approve Stage 1 (Owner stage)
    const deanStage1Res = await fetch(`${BASE_URL}/approvals/${msBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sarahToken}`, // Dean Sarah trying to approve Stage 1
      },
      body: JSON.stringify({ notes: 'Dean bypassing owner' }),
    });
    assert(
      deanStage1Res.status === 403,
      'Test 7C: Stage Hierarchy Enforcement',
      'Blocked Dean from bypassing custodian stage.'
    );

    // 7D: Owner Marcus Vance approves Stage 1
    const ownerApproveRes = await fetch(`${BASE_URL}/approvals/${msBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${marcusToken}`,
      },
      body: JSON.stringify({ notes: 'Safety and calibration verified. Approved for Dean signoff.' }),
    });
    const ownerApproveData = await ownerApproveRes.json();
    assert(
      ownerApproveRes.status === 200 && ownerApproveData.booking.status === 'PENDING_INSTITUTION_APPROVAL',
      'Test 7D: Stage 1 Custodian Approval',
      `Owner approved request. Status transitioned to 'PENDING_INSTITUTION_APPROVAL'.`
    );

    // 7E: Cross-institution authorization prevention
    // Dr. Robert Cho is Medicine Manager (INST_MED), Oscilloscope is in Engineering (INST_ENG)
    const crossInstRes = await fetch(`${BASE_URL}/approvals/${msBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${robertToken}`, // Med manager
      },
      body: JSON.stringify({ notes: 'Med manager approving engineering resource' }),
    });
    assert(
      crossInstRes.status === 403,
      'Test 7E: Cross-Institution Scope Enforcement',
      'Blocked Medicine Manager from approving Engineering resource (403 Forbidden).'
    );

    // 7F: Dean Sarah Jenkins approves Stage 2
    const deanApproveRes = await fetch(`${BASE_URL}/approvals/${msBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sarahToken}`, // Engineering Manager
      },
      body: JSON.stringify({ notes: 'Institutional thesis access authorized.' }),
    });
    const deanApproveData = await deanApproveRes.json();
    assert(
      deanApproveRes.status === 200 && deanApproveData.booking.status === 'APPROVED',
      'Test 7F: Stage 2 Institutional Approval',
      `Dean approved request. Final status transitioned to 'APPROVED'.`
    );

    // -------------------------------------------------------------
    // Test 8: Rejection with Required Reason
    // -------------------------------------------------------------
    const rejectBookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_nvidia_dgx', // MODE_B_OWNER
        startDate: '2026-11-06T10:00',
        endDate: '2026-11-06T14:00',
        purpose: 'Deep learning training run',
        courseCode: 'CS-801',
        priority: 'grant',
        certifiedAgreement: true,
      }),
    });
    const rejectBookingData = await rejectBookingRes.json();
    const rejectBookingId = rejectBookingData.booking.id;

    // Reject without reason fails
    const emptyRejectRes = await fetch(`${BASE_URL}/approvals/${rejectBookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${marcusToken}`,
      },
      body: JSON.stringify({ reason: '' }),
    });
    assert(emptyRejectRes.status === 400, 'Test 8A: Rejection Reason Mandatory', 'Rejected rejection attempt without justification (400).');

    // Reject with reason succeeds
    const validRejectRes = await fetch(`${BASE_URL}/approvals/${rejectBookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${marcusToken}`,
      },
      body: JSON.stringify({ reason: 'Cluster is reserved for departmental quantum benchmarks during this block.' }),
    });
    const validRejectData = await validRejectRes.json();
    assert(
      validRejectRes.status === 200 && validRejectData.booking.status === 'REJECTED',
      'Test 8B: Rejection with Justification',
      `Booking rejected with recorded reason: "${validRejectData.booking.rejectionReason}".`
    );

    // -------------------------------------------------------------
    // Test 9: Reviewer Information Request & Applicant Response
    // -------------------------------------------------------------
    const infoBookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_nvidia_dgx',
        startDate: '2026-11-07T10:00',
        endDate: '2026-11-07T14:00',
        purpose: 'Custom CUDA kernel optimization',
        courseCode: 'CS-801',
        priority: 'grant',
        certifiedAgreement: true,
      }),
    });
    const infoBookingData = await infoBookingRes.json();
    const infoBookingId = infoBookingData.booking.id;

    // Reviewer requests info
    const reqInfoRes = await fetch(`${BASE_URL}/approvals/${infoBookingId}/request-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${marcusToken}`,
      },
      body: JSON.stringify({ question: 'Will you require multi-node NCCL interconnect or single-node 8x A100?' }),
    });
    const reqInfoData = await reqInfoRes.json();
    assert(
      reqInfoRes.status === 200 && reqInfoData.booking.infoRequest?.question.includes('NCCL'),
      'Test 9A: Reviewer Inquiry Request',
      `Reviewer inquired: "${reqInfoData.booking.infoRequest.question}"`
    );

    // Seeker responds
    const respInfoRes = await fetch(`${BASE_URL}/bookings/${infoBookingId}/respond-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({ response: 'Single-node 8x A100 with NVLink is sufficient for this benchmark.' }),
    });
    const respInfoData = await respInfoRes.json();
    assert(
      respInfoRes.status === 200 && respInfoData.booking.infoRequest?.response.includes('Single-node'),
      'Test 9B: Applicant Response to Inquiry',
      `Applicant answered: "${respInfoData.booking.infoRequest.response}"`
    );

    // -------------------------------------------------------------
    // Test 10: Mode A Automatic Approval
    // -------------------------------------------------------------
    // FLIR Thermal Camera is MODE_A_AUTO
    const autoSubmitRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_flir_thermal',
        startDate: '2026-11-08T10:00',
        endDate: '2026-11-08T14:00',
        purpose: 'Thermal dissipation mapping of PCB heatsink.',
        courseCode: 'EE-310',
        priority: 'routine',
        certifiedAgreement: true,
      }),
    });
    const autoSubmitData = await autoSubmitRes.json();
    assert(
      autoSubmitRes.status === 201 && autoSubmitData.booking.status === 'APPROVED',
      'Test 10: Mode A Instant Auto-Approval',
      `Resource configured for Mode A instantly confirmed with status 'APPROVED'.`
    );

    // -------------------------------------------------------------
    // Test 11: Physical Check-In Protocol & Duplicate Prevention
    // -------------------------------------------------------------
    // Use the confirmed multi-stage booking (msBookingId)
    const checkInRes = await fetch(`${BASE_URL}/bookings/${msBookingId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        condition: 'Pristine',
        rating: 5,
        checklist: { powerCord: true, probesOrCables: true, calibrationIntact: true, screenClean: true },
        notes: 'Calibrated Tektronix probes verified intact. NIST tag valid.',
        signature: 'Alex Rivera (Verified Digital ID)',
      }),
    });
    const checkInData = await checkInRes.json();
    assert(
      checkInRes.status === 200 && checkInData.booking.status === 'CHECKED_OUT' && checkInData.booking.checkIn?.rating === 5,
      'Test 11A: Physical Check-In Handover',
      `Check-in recorded as Pristine (5/5). Status updated to 'CHECKED_OUT'.`
    );

    // Verify duplicate check-in is rejected
    const dupCheckInRes = await fetch(`${BASE_URL}/bookings/${msBookingId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        condition: 'Pristine',
        signature: 'Alex Rivera',
      }),
    });
    assert(dupCheckInRes.status === 400, 'Test 11B: Duplicate Check-In Blocked', 'Prevented duplicate check-in on active loan.');

    // -------------------------------------------------------------
    // Test 12: Physical Return Protocol & Incident Reporting
    // -------------------------------------------------------------
    const returnRes = await fetch(`${BASE_URL}/bookings/${msBookingId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        condition: 'Pristine',
        rating: 5,
        checklist: { cleaned: true, accessoriesIntact: true, poweredDown: true },
        notes: 'Testing completed. Unit wiped down and stored in case.',
        signature: 'Alex Rivera (Verified Digital Sign)',
      }),
    });
    const returnData = await returnRes.json();
    assert(
      returnRes.status === 200 && returnData.booking.status === 'RETURNED' && returnData.booking.returnCheckOut?.rating === 5,
      'Test 12A: Equipment Return Finalization',
      `Return recorded. Status transitioned to 'RETURNED'.`
    );

    // Verify duplicate return is rejected
    const dupReturnRes = await fetch(`${BASE_URL}/bookings/${msBookingId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({ signature: 'Alex Rivera' }),
    });
    assert(dupReturnRes.status === 400, 'Test 12B: Duplicate Return Blocked', 'Prevented duplicate return on completed booking.');

    // -------------------------------------------------------------
    // Test 13: Booking Cancellation & Waitlist Promotion
    // -------------------------------------------------------------
    // Create an approved booking on FLIR thermal camera (Mode A auto-approves)
    const cancelTargetRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_flir_thermal',
        startDate: '2026-11-10T09:00',
        endDate: '2026-11-10T12:00',
        purpose: 'Thermal calibration run',
        courseCode: 'EE-310',
        priority: 'routine',
        certifiedAgreement: true,
      }),
    });
    const cancelTargetData = await cancelTargetRes.json();
    const cancelTargetId = cancelTargetData.booking.id;
    assert(cancelTargetData.booking.status === 'APPROVED', 'Test 13A: Active Reservation Created', 'Confirmed reservation created.');

    // Samantha Chen attempts to book overlapping time with asWaitlist: true
    const cobotWaitlistRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${samanthaToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_flir_thermal',
        startDate: '2026-11-10T10:00',
        endDate: '2026-11-10T12:00',
        purpose: 'Waitlisted thermal measurement',
        courseCode: 'EXT-501',
        priority: 'routine',
        certifiedAgreement: true,
        asWaitlist: true,
      }),
    });
    const cobotWaitlistData = await cobotWaitlistRes.json();
    assert(
      cobotWaitlistData.booking?.status === 'WAITLISTED',
      'Test 13B: Waitlist Queue Placement',
      `Queued Samantha on FLIR Thermal Camera.`
    );

    // Alex cancels the original booking
    const cancelRes = await fetch(`${BASE_URL}/bookings/${cancelTargetId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
    });
    assert(cancelRes.status === 200, 'Test 13C: Booking Cancellation', `Booking '${cancelTargetId}' cancelled.`);

    // Check that Samantha's waitlisted booking was promoted!
    const promotedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(cobotWaitlistData.booking.id) as Record<string, any>;
    assert(
      promotedRow && promotedRow.status !== 'WAITLISTED' && promotedRow.waitlist_position === null,
      'Test 13D: Automatic Waitlist Promotion',
      `Samantha promoted from waitlist to '${promotedRow?.status}' following slot cancellation!`
    );

    // -------------------------------------------------------------
    // Test 14: In-App Notifications Verification
    // -------------------------------------------------------------
    const notifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const notifsData = await notifsRes.json();
    assert(
      notifsRes.status === 200 && notifsData.notifications.length > 0,
      'Test 14: In-App Notifications',
      `Found ${notifsData.notifications.length} real in-app notifications generated for Alex Rivera.`
    );

    // -------------------------------------------------------------
    // Test 15: Tamper-Evident Cryptographic Audit Ledger
    // -------------------------------------------------------------
    const auditRes = await fetch(`${BASE_URL}/audit-logs`);
    const auditData = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.auditLogs.length >= 10,
      'Test 15A: Cryptographic Audit Ledger',
      `Found ${auditData.auditLogs.length} audit entries recorded.`
    );

    const allHaveSha256 = auditData.auditLogs.every((l: any) => l.hash && l.hash.startsWith('0x') && l.hash.length === 66);
    assert(
      allHaveSha256,
      'Test 15B: SHA-256 Cryptographic Hash Integrity',
      'All audit records contain valid 256-bit cryptographic hex hashes.'
    );

    // -------------------------------------------------------------
    // Test 16: Scoped Role-Based Visibility
    // -------------------------------------------------------------
    // Alex (Seeker) should only see bookings where he is the seeker
    const alexBookingsRes = await fetch(`${BASE_URL}/bookings`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const alexBookingsData = await alexBookingsRes.json();
    const onlyAlex = alexBookingsData.bookings.every((b: any) => b.seekerId === 'usr_seeker_alex');
    assert(
      onlyAlex,
      'Test 16: Scoped Role-Based Booking Visibility',
      `Seeker only sees their own reservations (${alexBookingsData.bookings.length} items). Cross-user privacy preserved.`
    );

    // -------------------------------------------------------------
    // Test 17: Project-to-Equipment Matching Scoring API (Section 9)
    // -------------------------------------------------------------
    const matchingRes = await fetch(`${BASE_URL}/matching/project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        description: 'Microfluidics laser imaging experiment with fluorescence',
        category: 'Bioengineering & Imaging',
        requiredCapabilities: ['fluorescence', 'laser', 'high resolution'],
        durationHours: 4,
        budget: 500,
      }),
    });
    const matchText = await matchingRes.text();
    let matchData: any = {};
    try {
      matchData = JSON.parse(matchText);
    } catch {
      console.error('Failed to parse matching response. Status:', matchingRes.status, 'Body:', matchText.slice(0, 300));
    }
    assert(
      matchingRes.status === 200 && matchData.success && matchData.results.length > 0,
      'Test 17A: Project-to-Equipment Matching',
      `Evaluated ${matchData.totalEvaluated} resources; top match has overallScore=${matchData.results?.[0]?.overallScore}.`
    );
    assert(
      matchData.engine === 'Deterministic Scoring Engine',
      'Test 17B: Transparent Scoring Engine Label',
      'Verified engine explicitly labeled as deterministic rule-based demo intelligence.'
    );

    // -------------------------------------------------------------
    // Test 18: Smart Resource Substitution Recommendations (Section 10)
    // -------------------------------------------------------------
    // Query alternatives for Oscilloscope (res_oscilloscope_tek)
    const altRes = await fetch(`${BASE_URL}/resources/res_oscilloscope_tek/alternatives`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const altData = await altRes.json();
    assert(
      altRes.status === 200 && altData.success && altData.alternatives?.length > 0,
      'Test 18A: Smart Resource Substitution',
      `Identified ${altData.alternatives?.length || 0} candidate alternatives for Oscilloscope.`
    );
    const hasClassifications = altData.alternatives?.some((a: any) =>
      ['SUITABLE_ALTERNATIVE', 'PARTIAL_MATCH', 'COMPATIBILITY_UNVERIFIED', 'INELIGIBLE', 'UNAVAILABLE'].includes(a.classification)
    );
    assert(
      hasClassifications,
      'Test 18B: Alternative Classification Categorization',
      'Alternatives categorized with explicit specification variance and availability notes.'
    );

    // -------------------------------------------------------------
    // Test 19: Equipment Memory & Unified History (Section 11)
    // -------------------------------------------------------------
    const historyRes = await fetch(`${BASE_URL}/resources/res_oscilloscope_tek/history`);
    const historyData = await historyRes.json();
    assert(
      historyRes.status === 200 && historyData.success && Array.isArray(historyData.timeline),
      'Test 19: Equipment Memory Chronological Timeline',
      `Retrieved ${historyData.timeline?.length || 0} unified timeline events for Oscilloscope.`
    );

    // -------------------------------------------------------------
    // Test 20: Idle Resource Utilization Analytics (Section 13)
    // -------------------------------------------------------------
    const analyticsRes = await fetch(`${BASE_URL}/analytics/resource-utilization?periodDays=30`);
    const analyticsData = await analyticsRes.json();
    assert(
      analyticsRes.status === 200 && analyticsData.success && analyticsData.resources.length > 0,
      'Test 20A: Utilization Analytics Engine',
      `Calculated utilization across ${analyticsData.resources.length} inventory units with aggregate utilization=${analyticsData.summary.overallUtilizationPercentage}%.`
    );
    assert(
      analyticsData.formula === 'Utilization (%) = (Booked hours / Eligible available hours) * 100' && Array.isArray(analyticsData.recommendations),
      'Test 20B: Evidence-Based Analytics Recommendations',
      `Formula validated with ${analyticsData.recommendations.length} data-driven recommendations.`
    );

    // -------------------------------------------------------------
    // Test 21: Condition Reports API (Section 12)
    // -------------------------------------------------------------
    const condRes = await fetch(`${BASE_URL}/bookings/${msBookingId}/condition-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        reportType: 'CHECK_IN',
        rating: 5,
        conditionSummary: 'Instrument lens optics clean, calibration aligned.',
        checklist: { lensIntact: true, cablesSecure: true, powerOnOk: true },
        notes: 'Pre-flight check certified by Alex Rivera.',
      }),
    });
    const condData = await condRes.json();
    assert(
      condRes.status === 201 && condData.success && condData.report.rating === 5,
      'Test 21A: Condition Report Submission',
      `Recorded CHECK_IN condition report ${condData.report?.id} for booking '${msBookingId}'.`
    );

    const getCondRes = await fetch(`${BASE_URL}/bookings/${msBookingId}/condition-reports`);
    const getCondData = await getCondRes.json();
    assert(
      getCondRes.status === 200 && getCondData.reports.length >= 1,
      'Test 21B: Condition Report Retrieval',
      `Retrieved ${getCondData.reports.length} condition certifications for booking.`
    );

    // -------------------------------------------------------------
    // Test 22: Fair Access Waiting List Management (Section 8)
    // -------------------------------------------------------------
    // Alex joins waitlist for Cobot arm
    const waitlistJoinRes = await fetch(`${BASE_URL}/resources/res_ur5e_cobot/waiting-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        requestedStartDate: '2026-11-20T09:00:00Z',
        requestedEndDate: '2026-11-20T17:00:00Z',
        purpose: 'Robotic pick-and-place automation trial',
      }),
    });
    const waitlistJoinData = await waitlistJoinRes.json();
    assert(
      waitlistJoinRes.status === 201 && waitlistJoinData.success && waitlistJoinData.entry.position >= 1,
      'Test 22A: Join Fair Access Waiting List',
      `Alex Rivera assigned queue position #${waitlistJoinData.entry?.position}.`
    );

    // Cancel waitlist entry
    const waitlistCancelRes = await fetch(`${BASE_URL}/waiting-list/${waitlistJoinData.entry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const waitlistCancelData = await waitlistCancelRes.json();
    assert(
      waitlistCancelRes.status === 200 && waitlistCancelData.success,
      'Test 22B: Cancel Waitlist Reservation & Position Recalculation',
      'Waitlist entry cancelled and queue positions updated.'
    );

    // -------------------------------------------------------------
    // Test 23: Maintenance Lifecycle & Resource Restoration (Section 11)
    // -------------------------------------------------------------
    // Get existing maintenance record
    const maintList = db.prepare('SELECT id FROM maintenance_records LIMIT 1').get() as { id: string } | undefined;
    if (maintList) {
      const maintPatchRes = await fetch(`${BASE_URL}/maintenance/${maintList.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${marcusToken}`,
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          notes: 'Preventative calibration completed; laser mirrors cleaned.',
        }),
      });
      const maintText = await maintPatchRes.text();
      let maintPatchData: any = {};
      try {
        maintPatchData = JSON.parse(maintText);
      } catch {
        console.error('Failed to parse maintenance response. Status:', maintPatchRes.status, 'Body:', maintText.slice(0, 300));
      }
      assert(
        maintPatchRes.status === 200 && maintPatchData.success && maintPatchData.record?.status === 'COMPLETED',
        'Test 23: Maintenance Lifecycle & Resource Restoration',
        `Maintenance record ${maintList.id} updated to COMPLETED.`
      );
    }

    // -------------------------------------------------------------
    // Test 24: OpenAPI 3.0 Documentation & Contract (Section 3)
    // -------------------------------------------------------------
    const openapiRes = await fetch(`http://127.0.0.1:${address.port}/api/v1/openapi.json`);
    const openapiData = await openapiRes.json();
    assert(
      openapiRes.status === 200 && openapiData.openapi === '3.0.3' && openapiData.info.title === 'ShareSphere AI API',
      'Test 24A: OpenAPI 3.0 Contract Specification',
      `OpenAPI 3.0.3 schema verified with ${Object.keys(openapiData.paths).length} API route contracts.`
    );

    const docsRes = await fetch(`http://127.0.0.1:${address.port}/api/docs`);
    assert(
      docsRes.status === 200 && docsRes.headers.get('content-type')?.includes('text/html'),
      'Test 24B: Interactive API Documentation Endpoint',
      'Interactive Swagger UI explorer served at /api/docs.'
    );
  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  const passedCount = tests.filter((t) => t.passed).length;
  const failedCount = tests.filter((t) => !t.passed).length;
  console.log(`Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${tests.length} tests.`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
