import { test, expect } from '@playwright/test';

test.describe('Kanban Bro - Docker Compose End-to-End Workflow', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `e2e_user_${timestamp}`,
    name: `E2E Tester ${timestamp}`,
  };
  const boardName = `E2E Board ${timestamp}`;
  const taskTitle = `E2E Automated Task ${timestamp}`;
  const taskDesc = 'Created by Playwright E2E test running against docker-compose';

  test('Full E2E lifecycle: Log in, create board, create task, move task, delete task', async ({ page }) => {
    // -------------------------------------------------------------
    // Step 1: Log in / Select or Create User Profile
    // -------------------------------------------------------------
    await test.step('1. Log in via user switcher', async () => {
      await page.goto('/');

      // Wait for page to initialize and verify branding is displayed
      await expect(page.getByText('KanbanBro')).toBeVisible();

      // Click user profile button in the top navbar
      const userPill = page.locator('button[title*="switch or create mock user profile"]');
      await expect(userPill).toBeVisible();
      await userPill.click();

      // Modal should appear
      await expect(page.getByText('Switch or Create Mock User')).toBeVisible();

      // Click "Create new user"
      const createNewUserBtn = page.getByRole('button', { name: 'Create new user' });
      await expect(createNewUserBtn).toBeVisible();
      await createNewUserBtn.click();

      // Fill in user details
      await page.locator('input[placeholder="e.g. sarah"]').fill(testUser.username);
      await page.locator('input[placeholder="e.g. Sarah Connor"]').fill(testUser.name);

      // Submit "Create & Login"
      await page.getByRole('button', { name: 'Create & Login' }).click();

      // Verify the user switcher modal closed
      await expect(page.getByText('Switch or Create Mock User')).not.toBeVisible();

      // Verify user pill updated to display the logged-in username
      await expect(userPill).toContainText(`@${testUser.username}`);

      // Verify dashboard welcome banner acknowledges the user
      await expect(page.locator('h1')).toContainText(`Welcome back, ${testUser.name}!`);
    });

    // -------------------------------------------------------------
    // Step 2: Create a Board
    // -------------------------------------------------------------
    await test.step('2. Create a new board', async () => {
      // Click "Create Board" button on the dashboard
      const createBoardBtn = page.getByRole('button', { name: 'Create Board', exact: true });
      await expect(createBoardBtn).toBeVisible();
      await createBoardBtn.click();

      // Wait for Create Board modal
      await expect(page.getByRole('heading', { name: 'Create New Board' })).toBeVisible();

      // Fill board title and description
      await page.locator('input[placeholder="e.g. Q4 Growth Sprint"]').fill(boardName);
      await page.locator('textarea[placeholder*="What is this board for"]').fill('Automated E2E testing board');

      // Submit creation
      await page.locator('form').getByRole('button', { name: 'Create Board', exact: true }).click();

      // Modal closes and user is redirected to the board view
      await expect(page.getByRole('heading', { name: 'Create New Board' })).not.toBeVisible();

      // Verify board view heading
      await expect(page.getByRole('heading', { level: 1, name: boardName })).toBeVisible();

      // Verify standard 3 columns exist
      await expect(page.getByRole('heading', { level: 3, name: 'To Do', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'In Progress', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'Done', exact: true })).toBeVisible();
    });

    // -------------------------------------------------------------
    // Step 3: Create a Task
    // -------------------------------------------------------------
    await test.step('3. Create a task in To Do column', async () => {
      // Click "Add Task" button on top right of board
      const addTaskBtn = page.getByRole('button', { name: 'Add Task', exact: true });
      await expect(addTaskBtn).toBeVisible();
      await addTaskBtn.click();

      // Modal opens
      const modal = page.locator('.fixed.z-50');
      await expect(modal.getByText('Create New Task')).toBeVisible();

      // Fill title, description
      await modal.locator('input[placeholder="What needs to be done?"]').fill(taskTitle);
      await modal.locator('textarea').fill(taskDesc);

      // Save task
      await modal.getByRole('button', { name: 'Create Task', exact: true }).click();

      // Modal closes
      await expect(modal).not.toBeVisible();

      // Task card is now rendered in To Do column
      const todoColumn = page.locator('div.min-w-\\[300px\\]').filter({
        has: page.getByRole('heading', { level: 3, name: 'To Do', exact: true }),
      });
      await expect(todoColumn.getByText(taskTitle)).toBeVisible();
    });

    // -------------------------------------------------------------
    // Step 4: Move a Task
    // -------------------------------------------------------------
    await test.step('4. Move task from To Do to In Progress', async () => {
      // Locate the task card container
      const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
      await expect(taskCard).toBeVisible();

      // Click the status dropdown menu button on the card
      const moveMenuBtn = taskCard.locator('button[title*="Change task status"]');
      await expect(moveMenuBtn).toBeVisible();
      await moveMenuBtn.click();

      // Click "In Progress" in the dropdown
      const inProgressOption = page.getByRole('button', { name: 'In Progress', exact: true });
      await expect(inProgressOption).toBeVisible();
      await inProgressOption.click();

      // Locate In Progress column container
      const inProgressColumn = page.locator('div.min-w-\\[300px\\]').filter({
        has: page.getByRole('heading', { level: 3, name: 'In Progress', exact: true }),
      });

      // Assert task is now present under In Progress
      await expect(inProgressColumn.getByText(taskTitle)).toBeVisible();

      // Assert task is no longer in To Do column
      const todoColumn = page.locator('div.min-w-\\[300px\\]').filter({
        has: page.getByRole('heading', { level: 3, name: 'To Do', exact: true }),
      });
      await expect(todoColumn.getByText(taskTitle)).not.toBeVisible();
    });

    // -------------------------------------------------------------
    // Step 5: Delete a Task
    // -------------------------------------------------------------
    await test.step('5. Delete the task', async () => {
      // Click on the task card to open task details modal
      await page.getByText(taskTitle).click();

      // Details modal is displayed
      const modal = page.locator('.fixed.z-50');
      await expect(modal.getByText('Task Details')).toBeVisible();

      // Handle the window.confirm confirmation dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain(taskTitle);
        await dialog.accept();
      });

      // Click Delete Task button
      const deleteBtn = modal.getByRole('button', { name: 'Delete Task', exact: true });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      // Modal should be closed
      await expect(modal).not.toBeVisible();

      // Task card should no longer be visible anywhere on the board
      await expect(page.getByText(taskTitle)).not.toBeVisible();
    });
  });
});
