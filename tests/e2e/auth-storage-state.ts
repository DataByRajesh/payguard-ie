import path from "node:path";

// Shared between auth.setup.ts (writes it) and playwright.config.ts (reads it as a project's
// storageState) -- kept in its own module so importing the path doesn't also import auth.setup.ts
// and execute its top-level `setup(...)` call outside of Playwright's test runner.
export const AUTH_FILE = path.resolve(__dirname, "../../playwright/.auth/user.json");
