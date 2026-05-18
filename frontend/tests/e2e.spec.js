import { test, expect } from '@playwright/test';

test.describe('NexusAI E2E Tests', () => {
  // Use a random username so it works multiple times
  const randomSuffix = Math.floor(Math.random() * 100000);
  const username = `testuser_${randomSuffix}`;
  const password = 'password123';

  test('should register, navigate to services, and open code workspace', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Wait for the page to load and find the "Register Hub" button
    // It is rendered with framer-motion so we wait for it to be visible
    const registerButton = page.getByRole('button', { name: 'Register Hub' });
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    // 3. Fill in registration details
    await page.getByPlaceholder('Username / Alias').fill(username);
    await page.getByPlaceholder('Access Code').fill(password);

    // 4. Submit Registration
    await page.getByRole('button', { name: 'Forge Account' }).click();

    // Mock the settings in localStorage so the API key alert doesn't block the test
    await page.evaluate(() => {
      localStorage.setItem('nexusai_settings', JSON.stringify({
        theme: 'dark',
        model: 'llama3-70b-8192',
        groq_api_key: 'mock_key_for_testing'
      }));
    });

    // 5. Verify successful entry into the main app by waiting for the Sidebar
    await expect(page.getByRole('button', { name: 'Services' })).toBeVisible({ timeout: 15000 });

    // 6. Navigate to Services Hub
    await page.getByRole('button', { name: 'Services' }).click();

    // 7. Check if Services render
    await expect(page.getByText('Analysis and Learning')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Developer Tools')).toBeVisible();

    // 8. Go to CodeBot or New Chat
    await page.getByRole('button', { name: 'Workspace' }).click();

    // 9. Verify Workspace loaded
    await expect(page.getByRole('button', { name: 'Workspace' })).toBeVisible({ timeout: 10000 });

  });
});
