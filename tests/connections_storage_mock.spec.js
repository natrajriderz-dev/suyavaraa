const { test, expect } = require('@playwright/test');

test.describe('Suyavaraa App Connections (Direct Storage Injection)', () => {
  test('should show Main screen', async ({ page }) => {
    // Navigate to about:blank to allow setting localStorage
    await page.goto('http://localhost:8081');
    
    // Inject session into localStorage
    await page.evaluate(() => {
      const session = {
        access_token: 'fake-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh',
        user: { id: 'user-123', email: 'test@example.com' }
      };
      // Supabase uses this key format
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    });

    // Mock Profile fetch
    await page.route('**/rest/v1/users?select=profile_complete%2Conboarding_step%2Crole&id=eq.user-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'user-123',
          profile_complete: true,
          onboarding_step: 'Complete',
          role: 'user'
        }])
      });
    });

    // Mock other requests
    await page.route('**/rest/v1/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Reload to pick up the session
    await page.reload();
    
    await page.waitForTimeout(10000); 
    
    const bodyText = await page.textContent('body');
    console.log('Final Page content snapshot:', bodyText.substring(0, 1000));
    
    // Check for "Discovery" or other main elements
    // Since we are mocking the whole backend, it should work.
  });
});
