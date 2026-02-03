describe('email.consumer module surface', () => {
  test('exports runEmailConsumer and stopConsumer functions', async () => {
    const mod = await import('../consumers/email.consumer');
    expect(typeof mod.runEmailConsumer).toBe('function');
    expect(typeof mod.stopConsumer).toBe('function');
  });
});
