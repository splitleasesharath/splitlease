module.exports = {
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: undefined,
  reporter: 'list',
  use: {
    trace: 'off',
    headless: true,
  },
};
