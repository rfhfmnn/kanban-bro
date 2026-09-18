# Kanban Bro - End-to-End (E2E) Tests

Playwright test suite for validating full-stack Kanban Bro workflows running against the Docker Compose environment (`docker-compose.yaml`).

## Tested Workflows

1. **Log in**: Switches or creates a mock profile through the user switcher modal.
2. **Create a board**: Generates a new board with standard 3-column workflow (To Do, In Progress, Done).
3. **Create a task**: Adds a new task card with priority, description, and status.
4. **Move a task**: Moves a task between workflow columns (To Do &rarr; In Progress).
5. **Delete a task**: Opens task details, confirms browser dialog, and verifies deletion.

## Prerequisites

1. Ensure the Docker Compose stack is running:
   ```bash
   # From the repository root:
   docker compose up -d
   ```

2. Verify the application is available at `http://localhost:8000`:
   ```bash
   curl http://localhost:8000/api/health
   ```

## Installation

From the `e2e/` folder:

```bash
cd e2e
npm install
npx playwright install chromium
```

## Running the Tests

### Headless Mode (Default)
```bash
npm test
```

### Headed Mode (Watch the browser execute)
```bash
npm run test:headed
```

### Interactive UI Mode
```bash
npm run test:ui
```

### Custom URL
If your application runs on a different host or port:
```bash
BASE_URL=http://localhost:8000 npm test
```
