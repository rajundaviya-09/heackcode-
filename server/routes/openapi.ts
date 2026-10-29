import { Router } from 'express';

const router = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShareSphere AI API',
    version: '1.0.0',
    description: 'Comprehensive, modular REST API for ShareSphere AI — resource sharing, multi-institution governance, authoritative booking lifecycle, deterministic project matching, smart alternatives, and condition audit trails.',
    contact: {
      name: 'ShareSphere AI Engineering Team',
      url: 'http://localhost:5173',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token obtained via /api/v1/auth/login',
      },
    },
    schemas: {
      Resource: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string' },
          department: { type: 'string' },
          location: { type: 'string' },
          ownerId: { type: 'string' },
          ownerName: { type: 'string' },
          institutionId: { type: 'string' },
          institutionName: { type: 'string' },
          description: { type: 'string' },
          specifications: { type: 'object' },
          safetyLevelRequired: { type: 'integer' },
          requiresCertification: { type: 'string' },
          conditionScore: { type: 'integer' },
          conditionStatus: { type: 'string' },
          status: { type: 'string', enum: ['Available', 'Reserved', 'In Use', 'Maintenance', 'Retired'] },
          hourlyRateCredits: { type: 'integer' },
          approvalMode: { type: 'string', enum: ['MODE_A_AUTO', 'MODE_B_OWNER', 'MODE_C_COLLEGE', 'MODE_D_DUAL'] },
          allowExternalUsers: { type: 'boolean' },
          advanceBookingDays: { type: 'integer' },
          maxDurationHours: { type: 'integer' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          resourceId: { type: 'string' },
          resourceTitle: { type: 'string' },
          seekerId: { type: 'string' },
          seekerName: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          purpose: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_OUT', 'RETURNED'] },
          approvalMode: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        summary: 'Authenticate user with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'priya.sharma@institution.edu' },
                  password: { type: 'string', example: 'Password@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful with JWT token and profile' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/api/v1/resources': {
      get: {
        summary: 'Search and filter active resources with pagination',
        tags: ['Resources'],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'List of paginated resources' },
        },
      },
    },
    '/api/v1/resources/{id}/availability': {
      get: {
        summary: 'Query live resource calendar availability and existing intervals',
        tags: ['Resources'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Resource calendar availability schedule' },
        },
      },
    },
    '/api/v1/resources/{id}/history': {
      get: {
        summary: 'Equipment memory: unified chronological timeline of bookings, check-ins, condition reports, and incidents',
        tags: ['Equipment Memory'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Unified equipment history timeline' },
        },
      },
    },
    '/api/v1/resources/{id}/alternatives': {
      get: {
        summary: 'Smart resource substitution recommendations when primary resource is unavailable',
        tags: ['Smart Substitution'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'startAt', in: 'query', schema: { type: 'string' } },
          { name: 'endAt', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Ranked alternative instruments with specification diffs' },
        },
      },
    },
    '/api/v1/bookings': {
      post: {
        summary: 'Submit a new authoritative reservation request with full server validations',
        security: [{ BearerAuth: [] }],
        tags: ['Bookings'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resourceId', 'startDate', 'endDate', 'purpose'],
                properties: {
                  resourceId: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  purpose: { type: 'string' },
                  courseCode: { type: 'string' },
                  priority: { type: 'string', enum: ['routine', 'high', 'urgent'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Booking created or auto-approved' },
          409: { description: 'Timeslot conflict with existing reservation' },
        },
      },
    },
    '/api/v1/matching/project': {
      post: {
        summary: 'Deterministic project-to-equipment matching scoring engine',
        tags: ['AI Intelligence'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['description'],
                properties: {
                  description: { type: 'string' },
                  category: { type: 'string' },
                  requiredCapabilities: { type: 'array', items: { type: 'string' } },
                  startAt: { type: 'string' },
                  durationHours: { type: 'number' },
                  budget: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Ranked match results with factor breakdown scores' },
        },
      },
    },
    '/api/v1/analytics/resource-utilization': {
      get: {
        summary: 'Idle resource utilization analytics, metrics, and evidence-based recommendations',
        tags: ['Analytics'],
        parameters: [
          { name: 'periodDays', in: 'query', schema: { type: 'integer', default: 30 } },
          { name: 'institutionId', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Resource utilization report' },
        },
      },
    },
    '/api/v1/bookings/{id}/condition-reports': {
      post: {
        summary: 'Submit tamper-evident check-in/return condition certification',
        security: [{ BearerAuth: [] }],
        tags: ['Condition Reports'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['conditionSummary'],
                properties: {
                  reportType: { type: 'string', enum: ['CHECK_IN', 'CHECK_OUT', 'INSPECTION'] },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  conditionSummary: { type: 'string' },
                  checklist: { type: 'object' },
                  notes: { type: 'string' },
                  signature: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Condition report recorded' },
        },
      },
    },
  },
};

// GET /api/v1/openapi.json
router.get('/openapi.json', (_req, res): void => {
  res.json(openApiSpec);
});

// GET /api/docs
// Interactive lightweight Swagger UI documentation interface
router.get('/docs', (_req, res): void => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ShareSphere AI — REST API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background-color: #0f172a; color: #f8fafc; font-family: sans-serif; }
    .topbar { display: none; }
    .swagger-ui .info .title { color: #38bdf8 !important; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
