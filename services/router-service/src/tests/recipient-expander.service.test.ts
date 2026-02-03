import { expandRecipients } from '../services/recipient-expander.service';

describe('recipient-expander.service', () => {
  test('returns recipients array when present', () => {
    const event = { recipients: ['a@example.com', 'b@example.com'] };
    const res = expandRecipients(event);
    expect(res).toEqual(event.recipients);
  });

  test('returns empty array when no recipients', () => {
    const res = expandRecipients({});
    expect(res).toEqual([]);
  });
});
