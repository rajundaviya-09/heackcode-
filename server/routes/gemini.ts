import { Router } from 'express';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  callGoogleGeminiPlan,
  type GeminiPlanRequest,
} from '../gemini.ts';

const router = Router();

// GET /api/v1/gemini/status
router.get('/status', (_req, res): void => {
  const key = getGeminiApiKey();
  const configured = Boolean(key && key.length > 8);
  const maskedKey = configured
    ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
    : null;

  res.json({
    success: true,
    configured,
    maskedKey,
    model: 'gemini-2.5-flash',
    provider: 'Google Gemini API',
    studioUrl: 'https://aistudio.google.com/app/apikey',
  });
});

// POST /api/v1/gemini/key
router.post('/key', async (req, res): Promise<void> => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    res.status(400).json({
      success: false,
      error: 'INVALID_API_KEY',
      message: 'Please provide a valid Google Gemini API Key.',
    });
    return;
  }

  const cleanKey = apiKey.trim();

  // Validate the key by making a minimal test call to Google Gemini
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    const testRes = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello, respond with the word CONNECTED' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (!testRes.ok) {
      const errBody = await testRes.text();
      res.status(400).json({
        success: false,
        error: 'GEMINI_AUTH_FAILED',
        message: 'Google Gemini rejected this API Key. Please verify the key from Google AI Studio.',
        details: errBody.slice(0, 200),
      });
      return;
    }

    // Key is verified! Save it
    setGeminiApiKey(cleanKey);

    res.json({
      success: true,
      message: 'Google Gemini API Key successfully verified and connected!',
      model: 'gemini-2.5-flash',
    });
  } catch (err: any) {
    // If network error, still save if it looks like a valid Gemini key format (e.g. starts with AIzaSy)
    if (cleanKey.startsWith('AIzaSy') && cleanKey.length >= 35) {
      setGeminiApiKey(cleanKey);
      res.json({
        success: true,
        message: 'Google Gemini API Key saved (verified format).',
        model: 'gemini-2.5-flash',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'CONNECTION_FAILED',
        message: err.message || 'Failed to reach Google Gemini API server.',
      });
    }
  }
});

// POST /api/v1/gemini/plan
router.post('/plan', async (req, res): Promise<void> => {
  const { description, category, durationHours, budget, location, safetyLevel } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    res.status(400).json({
      success: false,
      error: 'MISSING_DESCRIPTION',
      message: 'Please provide a project description for the AI Equipment Planner.',
    });
    return;
  }

  try {
    const plan = await callGoogleGeminiPlan({
      description: description.trim(),
      category: category === 'All' ? undefined : category,
      durationHours: Number(durationHours) || 4,
      budget: budget ? Number(budget) : undefined,
      location: location?.trim() || undefined,
      safetyLevel: safetyLevel ? Number(safetyLevel) : 2,
    });

    res.json(plan);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'GEMINI_PLAN_FAILED',
      message: err.message || 'Failed to generate experiment plan.',
    });
  }
});

export default router;

