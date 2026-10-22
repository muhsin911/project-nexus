/**
 * Application E2E Tests.
 * Validates that the core 3D scene and UI overlays mount and render correctly.
 */

import { test, expect } from '@playwright/test';

test('homepage has 3D canvas and UI overlays', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');

  // Verify the 3D Canvas is present (R3F renders a <canvas> element)
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // Verify the Connection Indicator is visible
  const connectionIndicator = page.getByText('Connecting...')
    .or(page.getByText('Connected'))
    .or(page.getByText('Disconnected'))
    .or(page.getByText('Connection Error'));
  await expect(connectionIndicator).toBeVisible();

  // Verify the Chat Panel is visible
  const chatPanel = page.getByRole('heading', { name: 'AI Assistant' });
  await expect(chatPanel).toBeVisible();

  // Verify the Agent Control Panel is visible
  const agentControl = page.getByRole('heading', { name: 'Agent Control' });
  await expect(agentControl).toBeVisible();
});

test('chat input accepts text and send button is enabled', async ({ page }) => {
  await page.goto('/');

  const input = page.getByPlaceholder('Type a message...');
  const sendButton = page.getByRole('button', { name: 'Send' });

  // Initially, send button should be disabled
  await expect(sendButton).toBeDisabled();

  // Type a message
  await input.click();
  await input.pressSequentially('Hello, Nexus!');

  await expect(input).toHaveValue('Hello, Nexus!');

  // Send button should now be enabled
  await expect(sendButton).toBeEnabled();
});