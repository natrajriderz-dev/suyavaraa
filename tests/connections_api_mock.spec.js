const { test, expect } = require('@playwright/test');

test.describe('Suyavaraa App Connections (Mocked API)', () => {
  test('should show Main screen and navigation tabs', async ({ page }) => {
    // Mock Auth Session
    await page.route('**/auth/v1/session**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh',
          user: { id: 'user-123', email: 'test@example.com' }
        })
      });
    });

    // Mock Profile fetch (with role and onboarding_step)
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

    // Mock Discovery profiles
    await page.route('**/rest/v1/user_profiles**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('http://localhost:8081');
    
    // Wait for the main screen to render
    // Discovery tab usually has text "Discovery"
    await page.waitForTimeout(10000); 
    
    const bodyText = await page.textContent('body');
    console.log('Main Page content snapshot:', bodyText.substring(0, 500));
    
    // Check for navigation tabs
    await expect(page.locator('text=Discovery')).toBeVisible();
    await expect(page.locator('text=Chat')).toBeVisible();
    await expect(page.locator('text=Profile')).toBeVisible();
  });
});
