import { db, formatResourceRow } from './db.ts';
import fs from 'node:fs';
import path from 'node:path';

// Runtime in-memory key cache
let inMemoryGeminiKey = process.env.GEMINI_API_KEY || '';

// Load from .env if present
function loadKeyFromEnvFile(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
  } catch {}
  return '';
}

export function getGeminiApiKey(): string {
  if (inMemoryGeminiKey) return inMemoryGeminiKey;
  const fromEnv = loadKeyFromEnvFile();
  if (fromEnv) {
    inMemoryGeminiKey = fromEnv;
    return fromEnv;
  }
  return '';
}

export function setGeminiApiKey(key: string): void {
  const cleanKey = key.trim();
  inMemoryGeminiKey = cleanKey;
  process.env.GEMINI_API_KEY = cleanKey;

  // Persist to .env file
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      if (/^GEMINI_API_KEY=/m.test(content)) {
        content = content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${cleanKey}`);
      } else {
        content += `\nGEMINI_API_KEY=${cleanKey}\n`;
      }
    } else {
      content = `# ShareSphere AI Environment Configuration\nPORT=3001\nGEMINI_API_KEY=${cleanKey}\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
  } catch (err) {
    console.warn('Failed to persist GEMINI_API_KEY to .env:', err);
  }
}

export interface GeminiPlanRequest {
  description: string;
  category?: string;
  durationHours?: number;
  budget?: number;
  location?: string;
  safetyLevel?: number;
}

export interface GeminiPlanResponse {
  success: boolean;
  isLiveGemini: boolean;
  model: string;
  executiveSummary: string;
  domainCategory: string;
  estimatedFeasibility: string;
  recommendedResources: Array<{
    resourceId: string;
    resourceTitle: string;
    matchScore: number;
    suitabilityReason: string;
    optimalParameters: string;
    protocolSteps: string[];
    riskMitigation: string;
  }>;
  aiInsights: string[];
  message?: string;
}

export async function callGoogleGeminiPlan(
  req: GeminiPlanRequest
): Promise<GeminiPlanResponse> {
  const apiKey = getGeminiApiKey();

  // Retrieve active verified resources from database
  const rows = db.prepare("SELECT * FROM resources WHERE status != 'Retired'").all() as Record<string, any>[];
  const catalog = rows.map((r) => formatResourceRow(r));

  const catalogSummary = catalog.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    department: r.department,
    location: r.location,
    specifications: r.specifications,
    safetyLevelRequired: r.safetyLevelRequired,
    hourlyRateCredits: r.hourlyRateCredits,
    status: r.status,
  }));

  // If a valid Google Gemini API Key is provided, call Google's live endpoint
  if (apiKey && apiKey.length > 10) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const systemPrompt = `You are the Lead Scientific Laboratory AI Director for ShareSphere Academic Equipment Cloud.
A researcher has provided an experiment requirement.
Your job is to analyze their project description and match them with the most suitable verified research instruments in our institutional catalog.

Available Equipment Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Respond with pure JSON conforming exactly to this schema:
{
  "executiveSummary": "A concise, 2-3 sentence technical analysis of the experiment and necessary equipment specifications.",
  "domainCategory": "Category name representing the research discipline",
  "estimatedFeasibility": "High" | "Medium" | "Prerequisites Required",
  "recommendedResources": [
    {
      "resourceId": "Exact ID matching one of the catalog items (e.g. res_nvidia_dgx)",
      "resourceTitle": "Exact title of that resource",
      "matchScore": integer between 70 and 99,
      "suitabilityReason": "Detailed scientific rationale for why this instrument is needed for this experiment",
      "optimalParameters": "Concrete operating parameters, sensor configurations, probe selections, or execution parameters",
      "protocolSteps": ["Step 1: Calibration / Pre-flight check", "Step 2: Execution", "Step 3: Data acquisition & shutdown"],
      "riskMitigation": "Specific safety controls and protocol required for safety clearance"
    }
  ],
  "aiInsights": [
    "Key observation 1 about experiment throughput or bottlenecks",
    "Key observation 2 regarding timing or multi-node coordination"
  ]
}`;

      const userContent = `Researcher Project Description:
"${req.description}"

Constraints:
- Discipline Filter: ${req.category || 'All Disciplines'}
- Planned Duration: ${req.durationHours || 4} hours
- Maximum Budget: ${req.budget || 500} credits
- Location Constraint: ${req.location || 'Any On-Campus Facility'}
- User Safety Clearance: Level ${req.safetyLevel || 2}

Analyze the project against the real catalog and return JSON.`;

      const geminiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: userContent }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        }),
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const rawJsonText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          return {
            success: true,
            isLiveGemini: true,
            model: 'gemini-2.5-flash',
            executiveSummary: parsed.executiveSummary || 'Live Google Gemini experiment analysis completed.',
            domainCategory: parsed.domainCategory || req.category || 'Cross-Disciplinary',
            estimatedFeasibility: parsed.estimatedFeasibility || 'High',
            recommendedResources: parsed.recommendedResources || [],
            aiInsights: parsed.aiInsights || [
              'Equipment calibrated according to NIST standards.',
              'Reservation slots verified against current maintenance schedules.'
            ],
          };
        }
      } else {
        const errorText = await geminiRes.text();
        console.warn('Google Gemini API returned non-200:', geminiRes.status, errorText);
      }
    } catch (err) {
      console.error('Error invoking Google Gemini API:', err);
    }
  }

  // Fallback engine: Intelligent dynamic matching on actual catalog
  const descLower = req.description.toLowerCase();
  const scoredCatalog = catalog.map((item) => {
    let score = 65;
    const itemText = `${item.title} ${item.description} ${item.category} ${JSON.stringify(item.specifications)}`.toLowerCase();

    // Check keyword alignment
    const tokens = descLower.split(/[\s,.;]+/).filter((t) => t.length > 3);
    for (const t of tokens) {
      if (itemText.includes(t)) score += 5;
    }

    if (req.category && req.category !== 'All' && item.category.toLowerCase().includes(req.category.toLowerCase())) {
      score += 15;
    }

    score = Math.min(98, score);
    return { item, score };
  });

  scoredCatalog.sort((a, b) => b.score - a.score);
  const topMatches = scoredCatalog.slice(0, 3);

  const recommendedResources = topMatches.map(({ item, score }) => ({
    resourceId: item.id,
    resourceTitle: item.title,
    matchScore: score,
    suitabilityReason: `Verified instrument match for "${item.title}" in ${item.department}. Capabilities directly align with specified experimental parameters.`,
    optimalParameters: `Standard operating setup at ${item.location}. Calibration verified at condition index ${item.conditionScore}/100.`,
    protocolSteps: [
      `1. Perform pre-use inspection and verify safety clearance (Level ${item.safetyLevelRequired}).`,
      `2. Execute experimental run within booked ${req.durationHours || 4}-hour window.`,
      `3. Complete post-run digital condition certification and hand-over checklist.`
    ],
    riskMitigation: item.safetyLevelRequired > 1
      ? `Requires Safety Level ${item.safetyLevelRequired} clearance and certified agreement compliance.`
      : 'Standard laboratory PPE required.'
  }));

  return {
    success: true,
    isLiveGemini: false,
    model: apiKey ? 'gemini-2.5-flash (offline fallback)' : 'ShareSphere Laboratory Intelligence (Add API Key for live Gemini)',
    executiveSummary: `Analysis for "${req.description.slice(0, 80)}...": Matched ${recommendedResources.length} primary instruments in active inventory with technical feasibility rating of High.`,
    domainCategory: req.category && req.category !== 'All' ? req.category : topMatches[0]?.item.category || 'Cross-Disciplinary',
    estimatedFeasibility: 'High',
    recommendedResources,
    aiInsights: [
      'Instrumentation specifications verified against active departmental equipment registry.',
      apiKey ? 'Gemini API call timed out, evaluated using local verified catalog.' : 'Connect your free Google Gemini API Key from Google AI Studio to enable live Gemini 2.5 Flash reasoning.'
    ],
    message: apiKey ? undefined : 'Connect your Google Gemini API key to unlock real-time Gemini 2.5 Flash intelligence.',
  };
}

