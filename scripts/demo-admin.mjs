import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = "/opt/cursor/artifacts";
const BASE = "http://127.0.0.1:3000";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Вход в админку" }).waitFor({ timeout: 15000 });
  await page.locator('input[type="password"]').waitFor({ timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, "admin-login.png"), fullPage: true });

  await page.locator('input').nth(0).fill("admin");
  await page.locator('input[type="password"]').fill("ChangeMe-Admin!2026");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.getByRole("heading", { name: "Обзор" }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "admin-dashboard.png"), fullPage: true });

  await page.locator('nav a[href="/admin/accounts"]').click();
  await page.waitForURL("**/admin/accounts");
  await page.getByRole("heading", { name: "Аккаунты" }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "admin-accounts.png"), fullPage: true });

  await page.getByRole("link", { name: "alice@example.com" }).click();
  await page.waitForURL("**/admin/accounts/**");
  await page.getByText("Подключения к 1С").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "admin-account-detail.png"), fullPage: true });

  await page.getByRole("button", { name: "Показать" }).click();
  await page.getByRole("button", { name: "Скрыть" }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "admin-password-revealed.png"), fullPage: true });

  await page.locator('nav a[href="/admin/logs"]').click();
  await page.waitForURL("**/admin/logs");
  await page.getByRole("heading", { name: "Логи подключений" }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "admin-logs.png"), fullPage: true });

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    const dest = path.join(OUT, "admin-panel-demo.webm");
    fs.renameSync(videoPath, dest);
    console.log("video", dest);
  }

  console.log("screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
