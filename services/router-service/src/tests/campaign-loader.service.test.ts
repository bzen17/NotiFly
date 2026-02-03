import { loadCampaign } from '../services/campaign-loader.service';

describe('campaign-loader.service', () => {
  test('loads a campaign stub with given id', async () => {
    const id = 'camp-1';
    const res = await loadCampaign(id);
    expect(res).toBeDefined();
    expect(res._id).toBe(id);
  });
});
