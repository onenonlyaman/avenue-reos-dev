import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseURL}/api/v1/system/status`);
    if (!res.ok) {
      process.env.TEST_API_OFFLINE = "true";
    }
  } catch {
    process.env.TEST_API_OFFLINE = "true";
  }
}

export default globalSetup;
