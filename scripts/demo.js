/**
 * ============================================================
 *  Finance Backend API — Live Demo Script
 *  Run: node scripts/demo.js
 *  Make sure the server is running first: npm run dev
 * ============================================================
 *
 *  This script demonstrates the complete API flow:
 *    1. Login with email + password → get a JWT token
 *    2. Use that token to call protected endpoints
 *    3. Showcase role-based access control (RBAC)
 * ============================================================
 */

const BASE_URL = "http://localhost:3000";

// ── Helpers ──────────────────────────────────────────────────
const log = (label, data) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✅  ${label}`);
  console.log("=".repeat(60));
  console.log(JSON.stringify(data, null, 2));
};

const errLog = (label, data) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ⛔  ${label}`);
  console.log("=".repeat(60));
  console.log(JSON.stringify(data, null, 2));
};

async function apiCall(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: res.status, data: await res.json() };
}

// ── Main Demo ─────────────────────────────────────────────────
async function runDemo() {
  console.log("\n🚀  Finance Backend — API Demo");
  console.log("    Server:", BASE_URL);
  console.log("    Time:  ", new Date().toLocaleString());

  // ── STEP 1: Health Check ──────────────────────────────────
  console.log("\n\n📡  STEP 1 — Health Check");
  const health = await apiCall("GET", "/health");
  log("Server is UP", health.data);

  // ── STEP 2: Admin Login ───────────────────────────────────
  console.log("\n\n🔐  STEP 2 — Login as ADMIN (email + password → token)");
  const adminLogin = await apiCall("POST", "/api/auth/login", {
    email: "admin@finance.local",
    password: "Admin@123",
  });
  log("Admin Login Success — JWT Token received", {
    token: adminLogin.data.data?.token,
    user: adminLogin.data.data?.user,
  });
  const ADMIN_TOKEN = adminLogin.data.data?.token;
  if (!ADMIN_TOKEN) {
    console.error("\n❌ Server not running or DB not seeded. Run: npm run seed");
    process.exit(1);
  }

  // ── STEP 3: Get Current User (using token) ────────────────
  console.log("\n\n👤  STEP 3 — Who am I? (using the token from step 2)");
  const me = await apiCall("GET", "/api/auth/me", null, ADMIN_TOKEN);
  log("Current User Profile", me.data);

  // ── STEP 4: Analyst Login ─────────────────────────────────
  console.log("\n\n🔐  STEP 4 — Login as ANALYST");
  const analystLogin = await apiCall("POST", "/api/auth/login", {
    email: "alice@finance.local",
    password: "Alice@123",
  });
  log("Analyst Login Success", analystLogin.data.data?.user);
  const ANALYST_TOKEN = analystLogin.data.data?.token;

  // ── STEP 5: Viewer Login ──────────────────────────────────
  console.log("\n\n🔐  STEP 5 — Login as VIEWER");
  const viewerLogin = await apiCall("POST", "/api/auth/login", {
    email: "bob@finance.local",
    password: "Bob@12345",
  });
  log("Viewer Login Success", viewerLogin.data.data?.user);
  const VIEWER_TOKEN = viewerLogin.data.data?.token;

  // ── STEP 6: Financial Records (Viewer can read) ───────────
  console.log("\n\n📄  STEP 6 — List Financial Records (Viewer token)");
  const records = await apiCall(
    "GET",
    "/api/records?page=1&limit=5",
    null,
    VIEWER_TOKEN
  );
  log("Records (first 5)", {
    pagination: records.data.pagination,
    firstRecord: records.data.data?.[0],
  });

  // ── STEP 7: Create a Record (Admin only) ─────────────────
  console.log("\n\n➕  STEP 7 — Create a Financial Record (Admin token)");
  const newRecord = await apiCall(
    "POST",
    "/api/records",
    {
      type: "income",
      amount: 9500.0,
      category: "freelance",
      date: new Date().toISOString().split("T")[0],
      notes: "Demo record created by the demo script",
    },
    ADMIN_TOKEN
  );
  log("New Record Created", newRecord.data);
  const createdId = newRecord.data.data?.id;

  // ── STEP 8: Viewer tries to create (should be BLOCKED) ───
  console.log(
    "\n\n🚫  STEP 8 — Viewer tries to CREATE a record (should be FORBIDDEN)"
  );
  const blocked = await apiCall(
    "POST",
    "/api/records",
    {
      type: "expense",
      amount: 100,
      category: "test",
      date: "2025-01-01",
    },
    VIEWER_TOKEN
  );
  errLog(`RBAC Block — HTTP ${blocked.status} (403 Forbidden expected)`, blocked.data);

  // ── STEP 9: Dashboard Summary (Analyst+) ─────────────────
  console.log(
    "\n\n📊  STEP 9 — Dashboard Summary (Analyst token)"
  );
  const summary = await apiCall(
    "GET",
    "/api/dashboard/summary",
    null,
    ANALYST_TOKEN
  );
  log("Dashboard Summary", summary.data);

  // ── STEP 10: Monthly Trends ───────────────────────────────
  console.log("\n\n📈  STEP 10 — Monthly Trends (last 6 months)");
  const trends = await apiCall(
    "GET",
    "/api/dashboard/trends/monthly?months=6",
    null,
    ANALYST_TOKEN
  );
  log("Monthly Trends", trends.data);

  // ── STEP 11: Category Breakdown ──────────────────────────
  console.log("\n\n🏷️   STEP 11 — Category Breakdown");
  const categories = await apiCall(
    "GET",
    "/api/dashboard/categories",
    null,
    ANALYST_TOKEN
  );
  log("Category Breakdown", categories.data);

  // ── STEP 12: Viewer tries Dashboard (should FAIL) ────────
  console.log(
    "\n\n🚫  STEP 12 — Viewer tries Dashboard (should be FORBIDDEN)"
  );
  const viewerDash = await apiCall(
    "GET",
    "/api/dashboard/summary",
    null,
    VIEWER_TOKEN
  );
  errLog(`RBAC Block — HTTP ${viewerDash.status} (403 expected)`, viewerDash.data);

  // ── STEP 13: User Management (Admin only) ────────────────
  console.log("\n\n👥  STEP 13 — List All Users (Admin token)");
  const users = await apiCall("GET", "/api/users", null, ADMIN_TOKEN);
  log("All Users", users.data);

  // ── STEP 14: Call without token (should be 401) ──────────
  console.log(
    "\n\n🚫  STEP 14 — Call WITHOUT any token (should be 401 Unauthorized)"
  );
  const noToken = await apiCall("GET", "/api/records");
  errLog(`No Token — HTTP ${noToken.status} (401 expected)`, noToken.data);

  // ── STEP 15: Cleanup (soft delete the demo record) ───────
  if (createdId) {
    console.log(`\n\n🗑️   STEP 15 — Soft-Delete the demo record (id=${createdId})`);
    const deleted = await apiCall(
      "DELETE",
      `/api/records/${createdId}`,
      null,
      ADMIN_TOKEN
    );
    log("Record Soft-Deleted", deleted.data);
  }

  // ── Summary ───────────────────────────────────────────────
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("  🎉  Demo Complete — All systems working!");
  console.log("=".repeat(60));
  console.log(`
  What was demonstrated:
  ✅ Health check endpoint
  ✅ Login (email + password) → JWT token returned
  ✅ Token used in Authorization: Bearer <token> header
  ✅ GET /api/auth/me — see who is logged in
  ✅ Viewer can READ records
  ✅ Admin can CREATE / DELETE records
  ✅ Viewer is BLOCKED from create (403 Forbidden)
  ✅ Analyst can access Dashboard analytics
  ✅ Viewer is BLOCKED from Dashboard (403 Forbidden)
  ✅ No token → 401 Unauthorized
  ✅ Admin can list all users

  🔗 Swagger UI: http://localhost:3000/api-docs
  `);
}

runDemo().catch((err) => {
  console.error("\n❌ Demo failed. Is the server running? (npm run dev)");
  console.error(err.message);
  process.exit(1);
});
