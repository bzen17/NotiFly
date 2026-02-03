import request from 'supertest';

// Tests load app after setting module mocks. Use resetModules to ensure clean mocks per test.
describe('Producer Service - Campaigns controllers', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  test('POST /v1/campaigns - success returns 202 and campaignId', async () => {
    jest.resetModules();
    // Mock auth middleware to attach a user
    jest.doMock('../middlewares/auth.middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 'user-1', role: 'admin' };
        return next();
      },
      requireRole: () => (req: any, res: any, next: any) => next(),
    }));

    const createCampaignMock = jest.fn().mockResolvedValue({ campaignId: 'camp-123' });
    jest.doMock('../services/campaign.command.service', () => ({
      createCampaign: createCampaignMock,
    }));

    const app = (await import('../app')).default;
    const resp = await request(app).post('/v1/campaigns').send({ name: 'Hello' });
    expect(resp.status).toBe(202);
    expect(resp.body).toEqual({ campaignId: 'camp-123' });
    expect(createCampaignMock).toHaveBeenCalledWith({ name: 'Hello' });
  });

  test('POST /v1/campaigns - validation failure returns 400', async () => {
    jest.resetModules();
    jest.doMock('../middlewares/auth.middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 'user-1', role: 'admin' };
        return next();
      },
      requireRole: () => (req: any, res: any, next: any) => next(),
    }));

    const err: any = new Error('validation_error');
    const { ERRORS } = require('../constants');
    err.message = ERRORS.VALIDATION_ERROR;
    err.details = { field: 'name' };
    jest.doMock('../services/campaign.command.service', () => ({
      createCampaign: jest.fn().mockRejectedValue(err),
    }));

    const app = (await import('../app')).default;
    const resp = await request(app).post('/v1/campaigns').send({});
    expect(resp.status).toBe(400);
    expect(resp.body).toHaveProperty('error', 'validation_error');
    expect(resp.body).toHaveProperty('details');
  });

  test('POST /v1/campaigns - internal error returns 500', async () => {
    jest.resetModules();
    jest.doMock('../middlewares/auth.middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 'user-1', role: 'admin' };
        return next();
      },
      requireRole: () => (req: any, res: any, next: any) => next(),
    }));

    jest.doMock('../services/campaign.command.service', () => ({
      createCampaign: jest.fn().mockRejectedValue(new Error('boom')),
    }));

    const app = (await import('../app')).default;
    const resp = await request(app).post('/v1/campaigns').send({ name: 'x' });
    expect(resp.status).toBe(500);
    expect(resp.body).toHaveProperty('error');
  });

  test('GET /v1/campaigns - passes tenant filter to service when user is tenant', async () => {
    jest.resetModules();
    // auth middleware sets a tenant user
    jest.doMock('../middlewares/auth.middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 'tenant-1', role: 'tenant', tenantId: 'tenant-1' };
        return next();
      },
      requireRole: () => (req: any, res: any, next: any) => next(),
    }));

    const listCampaignsMock = jest.fn().mockResolvedValue({ page: 1, limit: 20, items: [] });
    jest.doMock('../services/campaign.query.service', () => ({ listCampaigns: listCampaignsMock }));

    const app = (await import('../app')).default;
    const resp = await request(app).get('/v1/campaigns');
    expect(resp.status).toBe(200);
    expect(listCampaignsMock).toHaveBeenCalled();
    const calledWith = listCampaignsMock.mock.calls[0][0];
    expect(calledWith.filter).toMatchObject({ tenantId: 'tenant-1' });
  });

  test('GET /v1/campaigns/:campaignId - 404 when not found', async () => {
    jest.resetModules();
    jest.doMock('../middlewares/auth.middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 'user-1', role: 'admin' };
        return next();
      },
      requireRole: () => (req: any, res: any, next: any) => next(),
    }));

    jest.doMock('../services/campaign.query.service', () => ({
      getCampaign: jest.fn().mockResolvedValue(null),
    }));

    const app = (await import('../app')).default;
    const resp = await request(app).get('/v1/campaigns/not-exists');
    expect(resp.status).toBe(404);
    expect(resp.body).toHaveProperty('error');
  });
});
