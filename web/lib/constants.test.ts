import { STATUS, ERRORS } from './constants';

describe('constants', () => {
  it('exports STATUS and ERRORS', () => {
    expect(STATUS.DELIVERED).toBe('delivered');
    expect(ERRORS.NOT_FOUND).toBe('not_found');
  });
});
