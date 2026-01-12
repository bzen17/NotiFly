/*
  Unit test stubs for sendNotification handler.
  These are placeholders demonstrating how to test the handler logic.
  Install a test runner (jest or vitest) and a mocking library before running.
*/
import { sendNotification } from '../src/services/notification.service';
import * as dbModule from '../src/config/db';

describe('sendNotification handler', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('returns eventId and persists/publishes on valid input', async () => {
    const fakeCollection: any = {
      inserted: null,
      insertOne: async (doc: any) => {
        fakeCollection.inserted = doc;
        return { insertedId: doc._id };
      },
    };

    const fakeDb = {
      db: (_name: string) => ({ collection: () => fakeCollection }),
    };

    const published: any[] = [];
    const fakeRedis: any = {
      xAdd: async (_stream: string, _id: string, msg: any) =>
        published.push({ stream: _stream, id: _id, msg }),
    };

    // Mock getMongo/getRedis to return our fakes
    jest.spyOn(dbModule, 'getMongo').mockResolvedValue(fakeDb as any);
    jest.spyOn(dbModule, 'getRedis').mockResolvedValue(fakeRedis as any);

    // Mock crypto.randomUUID to deterministic id
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('test-event-id');

    const body = {
      tenantId: 't1',
      channel: 'email',
      recipients: ['a@b.com'],
      payload: { subject: 'hi' },
    };

    const result = await sendNotification(body);

    expect(result).toBeDefined();
    expect(result.eventId).toBe('test-event-id');
    expect(fakeCollection.inserted._id).toBe('test-event-id');
    expect(published.length).toBeGreaterThan(0);
  });

  test('throws validation error on invalid input', async () => {
    const badBody = { channel: 'email' }; // missing tenantId, recipients, payload
    await expect(sendNotification(badBody as any)).rejects.toMatchObject({
      message: 'validation_error',
    });
  });
});
function beforeEach(arg0: () => void) {
  throw new Error('Function not implemented.');
}

function expect(result: { eventId: string }) {
  throw new Error('Function not implemented.');
}
