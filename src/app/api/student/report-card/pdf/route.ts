import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

// Run on Node runtime (puppeteer requires it)
export const runtime = "nodejs";
// Allow long generation time
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let browser = null;

  try {
    const body = await req.json();
    const { token, userProfile, role } = body as {
      token: string;
      userProfile: Record<string, unknown>;
      role: string;
    };

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 400 });
    }

    // Build the URL to the report card with a print flag
    const origin = req.nextUrl.origin;
    const reportUrl = `${origin}/student/report-card?print=1`;

    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();

    // A4 viewport at 96 DPI: 794 × 1123 px
    await page.setViewport({ width: 1140, height: 1600, deviceScaleFactor: 2 });

    // Inject auth tokens into localStorage BEFORE navigation so the report
    // page can authenticate with the backend exactly like the user's browser does.
    await page.evaluateOnNewDocument(
      (authToken, profile, userRole) => {
        try {
          localStorage.setItem("gened_auth_token", authToken);
          localStorage.setItem("gened_user_profile", JSON.stringify(profile));
          if (userRole) localStorage.setItem("gened_user_role", userRole);
        } catch (e) {
          console.error("[pdf-route] localStorage seed failed", e);
        }
      },
      token,
      userProfile ?? {},
      role ?? "student",
    );

    // Navigate and wait for the network to settle (initial assets + data fetches)
    await page.goto(reportUrl, {
      waitUntil: "networkidle0",
      timeout: 45000,
    });

    // Wait for the report to signal that all data has loaded.
    // StudentReportCard sets data-ready="true" on .report-root only after
    // isLoading flips to false (all API calls complete). This is much more
    // reliable than a fixed timeout or waiting for .report-root alone
    // (which renders during the loading spinner phase too).
    await page.waitForSelector(".report-root[data-ready='true']", { timeout: 30000 });

    // Wait for any custom fonts to finish loading and a final layout settle
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 600));

    // Generate PDF using Chromium's native paginator
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    await browser.close();
    browser = null;

    // Return as downloadable PDF
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Report_Card.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/student/report-card/pdf] failed:", err);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 },
    );
  }
}
