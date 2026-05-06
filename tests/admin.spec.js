const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase client to prevent real API calls
    await page.addInitScript(() => {
      // Mock Supabase client
      const mockClient = {
        auth: {
          signInWithPassword: () => Promise.resolve({ 
            data: { user: { id: 'admin-user-id', email: 'admin@example.com' } }, 
            error: null 
          }),
          signOut: () => Promise.resolve({ error: null }),
          getSession: () => Promise.resolve({ 
            data: { session: null }, 
            error: null 
          }),
          onAuthStateChange: (callback) => ({
            data: { subscription: { unsubscribe: () => {} } }
          })
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ 
                data: { role: 'admin' }, 
                error: null 
              })
            }),
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null })
            })
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null })
          }),
          insert: () => Promise.resolve({ error: null })
        })
      };

      // Override window.supabase
      window.supabase = {
        createClient: () => mockClient
      };

      // Set global variables that admin.html might use
      window.__SUYAVARAA_SUPABASE_URL__ = 'https://mock.supabase.co';
      window.__SUYAVARAA_SUPABASE_ANON_KEY__ = 'mock-key';
    });

    // Navigate to the admin page
    await page.goto('/admin.html');
  });

  test('should load login form', async ({ page }) => {
    // Wait for React to render
    await page.waitForTimeout(1000);
    
    // Check for login form elements
    await expect(page.locator('text=Admin Login')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    // Override the mock to simulate auth error
    await page.addInitScript(() => {
      window.supabase.createClient().auth.signInWithPassword = () => 
        Promise.resolve({ 
          data: null, 
          error: { message: 'Invalid login credentials' } 
        });
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Fill login form
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(500);
    
    // Check for error message (the error div has class with bg-red-50)
    const errorDiv = page.locator('.bg-red-50');
    await expect(errorDiv).toBeVisible();
  });

  test('should allow login and show dashboard', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // After successful login, the dashboard should appear
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Suyavaraa Admin Safety Console')).toBeVisible();
  });

  test('should render login screen consistently after reload', async ({ page }) => {
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Admin Login')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});