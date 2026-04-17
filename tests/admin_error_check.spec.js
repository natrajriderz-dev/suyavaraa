const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard Error Check', () => {
  test('should load without JavaScript errors', async ({ page }) => {
    const errors = [];
    const consoleMessages = [];
    
    // Capture console errors
    page.on('console', msg => {
      consoleMessages.push(msg);
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out network errors related to Supabase CDN or fetch failures
        if (!text.includes('Failed to fetch') && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('net::')) {
          errors.push(`Console error: ${text}`);
        }
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      const message = error.message;
      // Filter out network-related errors
      if (!message.includes('Failed to fetch') && !message.includes('NetworkError')) {
        errors.push(`Page error: ${message}`);
      }
    });

    // Mock Supabase client to prevent real API calls and allow login
    await page.addInitScript(() => {
      // Create a mock Supabase client
      const mockClient = {
        auth: {
          signInWithPassword: (credentials) => Promise.resolve({ 
            data: { 
              user: { 
                id: 'admin-user-id', 
                email: credentials.email,
                aud: 'authenticated'
              }, 
              session: { 
                access_token: 'mock-token',
                refresh_token: 'mock-refresh',
                expires_at: Math.floor(Date.now() / 1000) + 3600
              }
            }, 
            error: null 
          }),
          signOut: () => Promise.resolve({ error: null }),
          getSession: () => Promise.resolve({ 
            data: { 
              session: { 
                user: { id: 'admin-user-id', email: 'admin@example.com' },
                access_token: 'mock-token',
                expires_at: Math.floor(Date.now() / 1000) + 3600
              } 
            }, 
            error: null 
          }),
          onAuthStateChange: (callback) => {
            // Return a subscription object
            return { 
              data: { 
                subscription: { 
                  unsubscribe: () => {} 
                } 
              } 
            };
          }
        },
        from: (table) => {
          // Return mock data for each table
          const mockData = {
            users: [{ 
              id: 'user1', 
              full_name: 'Test User', 
              email: 'test@example.com', 
              is_banned: false, 
              ban_reason: null,
              ban_expires_at: null,
              trust_score: 75,
              is_verified: true,
              created_at: new Date().toISOString()
            }],
            reports: [],
            user_feedback: [],
            user_blocks: [],
            deepfake_scans: [],
            content_auto_removals: [],
            verification_requests: [],
            admin_users: [{ user_id: 'admin-user-id', role: 'admin' }],
            admin_activity_log: []
          };

          const tableData = mockData[table] || [];
          
          return {
            select: (columns) => {
              if (columns === '*') {
                return {
                  eq: (col, val) => ({
                    single: () => Promise.resolve({ 
                      data: table === 'admin_users' ? { role: 'admin' } : null, 
                      error: null 
                    })
                  }),
                  order: (col, options) => ({
                    limit: (limit) => Promise.resolve({ 
                      data: tableData.slice(0, limit), 
                      error: null 
                    })
                  })
                };
              } else {
                // Handle specific column selection
                return {
                  eq: (col, val) => ({
                    single: () => Promise.resolve({ 
                      data: table === 'admin_users' ? { role: 'admin' } : null, 
                      error: null 
                    })
                  }),
                  order: (col, options) => ({
                    limit: (limit) => Promise.resolve({ 
                      data: tableData.slice(0, limit), 
                      error: null 
                    })
                  })
                };
              }
            },
            update: (data) => ({
              eq: (col, val) => Promise.resolve({ error: null })
            }),
            insert: (data) => Promise.resolve({ error: null })
          };
        }
      };

      // Override window.supabase.createClient
      const originalCreateClient = window.supabase?.createClient;
      window.supabase = {
        createClient: () => mockClient
      };

      // Set global variables
      window.__SUYAVARAA_SUPABASE_URL__ = 'https://mock.supabase.co';
      window.__SUYAVARAA_SUPABASE_ANON_KEY__ = 'mock-key';
    });

    // Navigate to admin page
    await page.goto('http://localhost:8081/admin.html');
    
    // Wait for React to render (increased timeout for slow CI)
    await page.waitForTimeout(3000);
    
    // Check for login form or dashboard
    const loginVisible = await page.locator('text=Admin Login').isVisible();
    const dashboardVisible = await page.locator('text=Suyavaraa Admin Safety Console').isVisible();
    
    // If login form is visible, attempt to login
    if (loginVisible && !dashboardVisible) {
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Wait a bit more for any potential errors
    await page.waitForTimeout(1000);
    
    // Log all console messages for debugging
    consoleMessages.forEach(msg => {
      console.log(`[Console ${msg.type()}]: ${msg.text()}`);
    });
    
    // Assert no errors
    expect(errors).toEqual([]);
  });
});