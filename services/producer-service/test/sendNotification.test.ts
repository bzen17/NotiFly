/*
  Unit test stubs for sendNotification handler.
  These are placeholders demonstrating how to test the handler logic.
  Install a test runner (jest or vitest) and a mocking library before running.
*/
import { sendNotification } from '../src/handlers/sendNotification';

describe('sendNotification handler', () => {
  test('returns eventId and persists/publishes on valid input', async () => {
    const fakeCollection: any = {
      inserted: null,
      insertOne: async (doc: any) => {
        fakeCollection.inserted = doc;
        return { insertedId: doc._id };
      },
    };

    const fakeDb: any = {
      collection: (_name: string) => fakeCollection,
    };

    const published: any[] = [];
    const fakeRedis: any = {
      xAdd: async (_stream: string, _id: string, msg: any) =>
        published.push({ stream: _stream, id: _id, msg }),
    };

    const fakeGenUuid = async () => 'test-event-id';

    const body = {
      tenantId: 't1',
      channel: 'email',
      recipients: ['a@b.com'],
      payload: { subject: 'hi' },
    };

    const result = await sendNotification(body, {
      db: fakeDb,
      redis: fakeRedis,
      genUuid: fakeGenUuid,
    });

    expect(result).toBeDefined();
    expect(result.eventId).toBe('test-event-id');
    expect(fakeCollection.inserted._id).toBe('test-event-id');
    expect(published.length).toBeGreaterThan(0);
  });

  test('throws validation error on invalid input', async () => {
    const fakeDeps = { db: {}, redis: {}, genUuid: async () => 'x' };
    const badBody = { channel: 'email' }; // missing tenantId, recipients, payload
    await expect(sendNotification(badBody, fakeDeps as any)).rejects.toMatchObject({
      message: 'validation_error',
    });
  });
});
