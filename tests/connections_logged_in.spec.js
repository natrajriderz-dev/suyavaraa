const { test, expect } = require('@playwright/test');

test.describe('Suyavaraa App Connections (Logged In)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase client for a logged-in user
    await page.addInitScript(() => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        profile_complete: true,
        onboarding_step: 'Complete',
        role: 'user'
      };

      const mockClient = {
        auth: {
          getSession: () => Promise.resolve({ data: { session: { user: mockUser } }, error: null }),
          getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
          onAuthStateChange: (cb) => {
            cb('SIGNED_IN', { user: mockUser });
            return { subscription: { unsubscribe: () => {} } };
          }
        },
        from: (table) => ({
          select: (cols) => ({
            eq: (col, val) => ({
              single: () => Promise.resolve({ data: mockProfile, error: null }),
              order: () => Promise.resolve({ data: [], error: null }),
              limit: () => Promise.resolve({ data: [], error: null })
            }),
            order: () => Promise.resolve({ data: [], error: null }),
            limit: () => Promise.resolve({ data: [], error: null })
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
          upsert: () => Promise.resolve({ data: null, error: null }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null })
          }),
          on: () => ({
            subscribe: () => ({})
          })
        }),
        channel: () => ({
          on: () => ({
            subscribe: () => ({})
          }),
          subscribe: () => ({})
        }),
        removeChannel: () => {}
      };

      window.supabase = mockClient;
    });

    await page.goto('http://localhost:8081');
    await page.waitForTimeout(5000); // Wait for session check and navigation
  });

  test('should show Main screen and navigation tabs', async ({ page }) => {
    // Since we mocked a completed profile, it should go to 'Main'
    // Let's check for some text on the Home screen
    // Home screen usually has "Discovery" or "Matches"
    const bodyText = await page.textContent('body');
    console.log('Main Page content snapshot:', bodyText.substring(0, 500));
    
    // Check for the navigation bar
    // In React Native Web, these might be divs with specific aria-labels or text
    const chatTab = page.locator('text=Chat');
    const discoveryTab = page.locator('text=Discovery');
    
    // Wait for the main screen to render
    await page.waitForSelector('text=Discovery', { timeout: 10000 });
    
    await expect(chatTab).toBeVisible();
    await expect(discoveryTab).toBeVisible();
  });
});
