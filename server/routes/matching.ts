import { Router } from 'express';
import { db, formatResourceRow } from '../db.ts';
import { optionalAuth, type AuthenticatedRequest } from '../auth.ts';

const router = Router();

// POST /api/v1/matching/project
// Project-to-equipment matching API (Section 9)
// Deterministic rule-based evaluation of capabilities, availability, safety clearance, budget, and location.
router.post('/project', optionalAuth, (req: AuthenticatedRequest, res): void => {
  const {
    description,
    category,
    requiredCapabilities = [],
    startAt,
    durationHours = 4,
    budget,
    location,
    safetyLevel: reqSafetyLevel,
  } = req.body;

  if (!description || typeof description !== 'string') {
    res.status(400).json({
      success: false,
      error: 'INVALID_PROJECT_DESCRIPTION',
      message: 'A descriptive project requirement summary is required.',
    });
    return;
  }

  const duration = Math.max(1, Math.min(72, Number(durationHours) || 4));
  const user = req.user;
  const userSafety = user ? user.safetyLevel : (Number(reqSafetyLevel) || 1);
  const userInstitutionId = user?.institutionId;
  const reqCaps: string[] = Array.isArray(requiredCapabilities) ? requiredCapabilities : [];

  // Retrieve active inventory
  const rows = db.prepare("SELECT * FROM resources WHERE status != 'Retired'").all() as Record<string, any>[];

  let endAt: string | undefined;
  if (startAt) {
    const startTs = new Date(startAt).getTime();
    if (!isNaN(startTs)) {
      endAt = new Date(startTs + duration * 3600 * 1000).toISOString();
    }
  }

  const matches = rows.map((row) => {
    const resource = formatResourceRow(row);
    const reasons: string[] = [];
    const missingSpecs: string[] = [];
    const matchedSpecs: string[] = [];

    // 1. Evaluate recorded capabilities (Weight: 40 points)
    // Gather all searchable capability tokens from resource specs, title, description, and accessories
    const specEntries = Object.entries(resource.specifications || {});
    const searchableText = [
      resource.title,
      resource.description,
      resource.category,
      resource.department,
      ...specEntries.map(([k, v]) => `${k} ${v}`),
      ...(resource.accessories || []),
    ].join(' ').toLowerCase();

    let capabilityScore = 40;

    if (reqCaps.length > 0) {
      let matchedCount = 0;
      for (const cap of reqCaps) {
        const capLower = String(cap).trim().toLowerCase();
        if (capLower && searchableText.includes(capLower)) {
          matchedCount++;
          matchedSpecs.push(cap);
        } else {
          missingSpecs.push(cap);
        }
      }
      capabilityScore = Math.round((matchedCount / reqCaps.length) * 40);
      if (matchedCount === reqCaps.length) {
        reasons.push(`Verified full capability match (${matchedCount}/${reqCaps.length} required specifications satisfied).`);
      } else if (matchedCount > 0) {
        reasons.push(`Partial capability match (${matchedCount}/${reqCaps.length} satisfied; missing: ${missingSpecs.join(', ')}).`);
      } else {
        reasons.push(`No direct capability match found for project specifications.`);
      }
    } else {
      reasons.push(`General compatibility assumed; no specific capability constraints provided.`);
    }

    // 2. Interval Availability Evaluation (Weight: 25 points)
    let isAvailable = resource.status === 'Available';
    let availabilityScore = 25;
    let availabilityReason = 'Unit available in active catalog';

    if (resource.status === 'Maintenance' || resource.conditionStatus === 'Under Inspection') {
      isAvailable = false;
      availabilityScore = 0;
      availabilityReason = 'Unit is currently scheduled for or undergoing maintenance';
    } else if (startAt && endAt) {
      const conflict = db.prepare(`
        SELECT COUNT(*) as count FROM bookings
        WHERE resource_id = ?
          AND status IN ('APPROVED', 'CHECKED_OUT', 'in_use', 'approved')
          AND start_date < ? AND end_date > ?
      `).get(resource.id, endAt, startAt) as { count: number };

      if (conflict.count > 0) {
        isAvailable = false;
        availabilityScore = 0;
        availabilityReason = 'Requested timeslot conflicts with an approved reservation';
      } else {
        availabilityScore = 25;
        availabilityReason = `Confirmed available for ${duration}h window (${new Date(startAt).toLocaleDateString()})`;
      }
    } else if (resource.status !== 'Available') {
      isAvailable = false;
      availabilityScore = 5;
      availabilityReason = `Current unit state is ${resource.status}`;
    }
    reasons.push(availabilityReason);

    // 3. User Eligibility & Safety Clearance (Weight: 15 points)
    let isEligible = true;
    let eligibilityScore = 15;
    let eligibilityReason = 'User meets safety clearance and institutional access rules';

    if (userSafety < resource.safetyLevelRequired) {
      isEligible = false;
      eligibilityScore = 0;
      eligibilityReason = `Requires Safety Level ${resource.safetyLevelRequired} (Current clearance: Level ${userSafety})`;
    } else if (userInstitutionId && !resource.allowExternalUsers && userInstitutionId !== resource.institutionId) {
      isEligible = false;
      eligibilityScore = 5;
      eligibilityReason = `Institutional policy restricts access to ${resource.institutionName} researchers`;
    }
    reasons.push(eligibilityReason);

    // 4. Budget Feasibility (Weight: 10 points)
    const estimatedCost = resource.hourlyRateCredits * duration;
    let budgetScore = 10;
    let isWithinBudget = true;

    if (budget !== undefined && Number(budget) > 0) {
      const budgetNum = Number(budget);
      if (estimatedCost <= budgetNum) {
        budgetScore = 10;
        isWithinBudget = true;
        reasons.push(`Estimated cost (${estimatedCost} credits) is within project budget (${budgetNum} credits).`);
      } else {
        isWithinBudget = false;
        budgetScore = Math.max(0, Math.round((budgetNum / estimatedCost) * 10));
        reasons.push(`Estimated cost (${estimatedCost} credits) exceeds budget (${budgetNum} credits).`);
      }
    } else {
      reasons.push(`Project cost: ${estimatedCost} credits (${resource.hourlyRateCredits} credits/hr).`);
    }

    // 5. Location and Category Alignment (Weight: 10 points)
    let locationCategoryScore = 0;
    if (!category || category === 'All' || resource.category.toLowerCase() === String(category).toLowerCase()) {
      locationCategoryScore += 5;
    }
    if (!location || resource.location.toLowerCase().includes(String(location).toLowerCase())) {
      locationCategoryScore += 5;
    }

    const overallScore = Math.min(100, Math.max(0, capabilityScore + availabilityScore + eligibilityScore + budgetScore + locationCategoryScore));
    const isImmediatelyBookable = overallScore >= 60 && isAvailable && isEligible;

    return {
      resource,
      overallScore,
      capabilityMatch: {
        score: capabilityScore,
        maxScore: 40,
        matched: matchedSpecs,
        missing: missingSpecs,
      },
      availabilityStatus: {
        isAvailable,
        score: availabilityScore,
        maxScore: 25,
        reason: availabilityReason,
        windowStart: startAt || null,
        windowEnd: endAt || null,
      },
      eligibilityStatus: {
        isEligible,
        score: eligibilityScore,
        maxScore: 15,
        reason: eligibilityReason,
        requiredSafetyLevel: resource.safetyLevelRequired,
        userSafetyLevel: userSafety,
      },
      budgetMatch: {
        isWithinBudget,
        score: budgetScore,
        maxScore: 10,
        estimatedCost,
        hourlyRate: resource.hourlyRateCredits,
        durationHours: duration,
      },
      locationMatch: {
        score: locationCategoryScore,
        maxScore: 10,
        location: resource.location,
        category: resource.category,
      },
      reasonsForRecommendation: reasons,
      isImmediatelyBookable,
    };
  });

  // Sort descending by overall score
  matches.sort((a, b) => b.overallScore - a.overallScore);

  res.json({
    success: true,
    engine: 'Deterministic Scoring Engine',
    model: 'ShareSphere Rule-based Matcher v1.0',
    notice: 'Deterministic matching based on verified inventory parameters and explicit user project constraints. No speculative or unverified capabilities are assumed.',
    query: {
      description,
      category: category || 'All',
      requiredCapabilities: reqCaps,
      startAt: startAt || null,
      durationHours: duration,
      budget: budget || null,
      location: location || null,
    },
    totalEvaluated: rows.length,
    matchedCount: matches.length,
    results: matches,
  });
});

export default router;
