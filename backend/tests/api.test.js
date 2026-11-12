import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createAuthenticateMiddleware } from "../src/middleware/authenticate.js";
import { requireRole, requireStaffPermission } from "../src/middleware/authorize.js";
import { createApp } from "../src/server.js";
import { intervalsOverlap, parsePgRangeMs } from "../src/services/availability.service.js";
import { verifyCashfreeWebhookSignature } from "../src/services/payment.service.js";
import { pricingService } from "../src/services/pricing.service.js";
import { pricingRepository } from "../src/repositories/pricing.repository.js";
import { mapDatabaseError } from "../src/utils/errors.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("Backend Authentication & RBAC Middleware", () => {
  it("rejects requests without Bearer token with 401", async () => {
    const auth = createAuthenticateMiddleware({
      verifyToken: async () => ({ user: {}, profile: {}, settings: {} }),
    });
    let capturedErr = null;
    await auth({ headers: {} }, mockRes(), (err) => {
      capturedErr = err;
    });
    assert.equal(capturedErr?.statusCode, 401);
    assert.equal(capturedErr?.code, "AUTH_REQUIRED");
  });

  it("denies staff role from admin-only endpoints (403)", () => {
    const guard = requireRole("admin");
    let capturedErr = null;
    guard(
      { staffProfile: { id: "s1", role: "staff", is_active: true } },
      mockRes(),
      (err) => {
        capturedErr = err;
      },
    );
    assert.equal(capturedErr?.statusCode, 403);
    assert.equal(capturedErr?.code, "FORBIDDEN");
  });

  it("allows admin role to access staff-level operational endpoints", () => {
    const guard = requireRole("admin", "staff");
    let capturedErr = null;
    guard(
      { staffProfile: { id: "a1", role: "admin", is_active: true } },
      mockRes(),
      (err) => {
        capturedErr = err;
      },
    );
    assert.equal(capturedErr, undefined);
  });

  it("enforces admin-configurable staff permissions dynamically", () => {
    const permGuard = requireStaffPermission("staff_can_approve_group_bookings", "approve whole lounge bookings");

    // Staff denied when setting is false
    let err1 = null;
    permGuard(
      {
        staffProfile: { id: "s1", role: "staff", is_active: true },
        loungeSettings: { staff_can_approve_group_bookings: false },
      },
      mockRes(),
      (err) => {
        err1 = err;
      },
    );
    assert.equal(err1?.statusCode, 403);
    assert.equal(err1?.code, "PERMISSION_DISABLED");

    // Staff allowed when admin enables setting
    let err2 = null;
    permGuard(
      {
        staffProfile: { id: "s1", role: "staff", is_active: true },
        loungeSettings: { staff_can_approve_group_bookings: true },
      },
      mockRes(),
      (err) => {
        err2 = err;
      },
    );
    assert.equal(err2, undefined);

    // Admin always allowed regardless of staff toggle
    let err3 = null;
    permGuard(
      {
        staffProfile: { id: "a1", role: "admin", is_active: true },
        loungeSettings: { staff_can_approve_group_bookings: false },
      },
      mockRes(),
      (err) => {
        err3 = err;
      },
    );
    assert.equal(err3, undefined);
  });
});

describe("Booking Conflict Prevention & Range Math", () => {
  it("maps PostgreSQL 23P01 exclusion violation to HTTP 409 BOOKING_CONFLICT", () => {
    const mapped = mapDatabaseError({ code: "23P01", message: "conflicting key value violates exclusion constraint" });
    assert.equal(mapped?.statusCode, 409);
    assert.equal(mapped?.code, "BOOKING_CONFLICT");
  });

  it("maps PL/pgSQL maintenance / hours exception P0001 to HTTP 400", () => {
    const mapped = mapDatabaseError({ code: "P0001", message: "Console is currently unavailable (maintenance status)" });
    assert.equal(mapped?.statusCode, 400);
    assert.equal(mapped?.code, "BUSINESS_RULE_VIOLATION");
  });

  it("parses PostgreSQL tstzrange and accurately detects overlapping intervals", () => {
    const range = parsePgRangeMs('["2026-11-10 12:30:00+00","2026-11-10 13:30:00+00")');
    assert.ok(range);
    const exactAdjacentEnd = Date.parse("2026-11-10T12:30:00Z");
    const exactAdjacentStart = Date.parse("2026-11-10T11:30:00Z");
    assert.equal(intervalsOverlap(exactAdjacentStart, exactAdjacentEnd, range.start, range.end), false);

    const overlapStart = Date.parse("2026-11-10T13:00:00Z");
    const overlapEnd = Date.parse("2026-11-10T14:00:00Z");
    assert.equal(intervalsOverlap(overlapStart, overlapEnd, range.start, range.end), true);
  });
});

describe("Fixed Booking Package Validation", () => {
  it("uses the configured 1-hour, 3-hour, and 5-hour package values and rejects a tampered duration", async () => {
    const packages = [
      { id: "package-1h", category: "ps4", duration_minutes: 60, bonus_minutes: 0, price: 70, is_active: true, label: "1 Hour" },
      { id: "package-3h", category: "ps4", duration_minutes: 180, bonus_minutes: 15, price: 200, is_active: true, label: "3 Hours Package" },
      { id: "package-5h", category: "ps4", duration_minutes: 300, bonus_minutes: 30, price: 350, is_active: true, label: "5 Hours Day Pass" },
    ];
    const originalFindById = pricingRepository.findById;
    pricingRepository.findById = async (id) => packages.find((entry) => entry.id === id) || null;

    try {
      for (const selected of packages) {
        const resolved = await pricingService.resolveBookingPackage({
          pricingId: selected.id,
          category: selected.category,
          durationMinutes: selected.duration_minutes,
        });
        assert.equal(resolved.durationMinutes, selected.duration_minutes);
        assert.equal(resolved.price, selected.price);
        assert.equal(resolved.bonusMinutes, selected.bonus_minutes);
      }

      await assert.rejects(
        pricingService.resolveBookingPackage({ pricingId: "package-1h", category: "ps4", durationMinutes: 180 }),
        (error) => error.code === "PACKAGE_DURATION_MISMATCH",
      );
    } finally {
      pricingRepository.findById = originalFindById;
    }
  });
});

describe("Cashfree Webhook Signature Verification", () => {
  it("accepts valid Base64 HMAC-SHA256 signatures and rejects tampered webhook payloads", () => {
    const secret = "test_cashfree_secret_key_12345";
    const timestamp = "1731174600";
    const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id: "cf_order_99" } } });
    const validSig = crypto.createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("base64");

    assert.equal(verifyCashfreeWebhookSignature({ timestamp, rawBody, signature: validSig, secret }), true);
    assert.equal(verifyCashfreeWebhookSignature({ timestamp, rawBody: rawBody + "tampered", signature: validSig, secret }), false);
    assert.equal(verifyCashfreeWebhookSignature({ timestamp: "1731174999", rawBody, signature: validSig, secret }), false);
    assert.equal(verifyCashfreeWebhookSignature({ timestamp, rawBody, signature: "", secret }), false);
  });
});

describe("Express REST API Security Integration", () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("returns healthy status on GET /api/health", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
  });

  it("blocks unauthenticated access to protected Admin, Staff, Bookings & Payments endpoints", async () => {
    const endpoints = [
      ["GET", "/api/admin/dashboard"],
      ["GET", "/api/staff/dashboard"],
      ["GET", "/api/bookings"],
      ["GET", "/api/group-bookings"],
      ["GET", "/api/walkins"],
      ["GET", "/api/admin/staff"],
      ["GET", "/api/admin/payments"],
      ["PUT", "/api/admin/pricing"],
    ];

    for (const [method, path] of endpoints) {
      const res = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(res.status, 401, `${method} ${path} should require auth`);
    }
  });

  it("validates public booking payloads cleanly before hitting DB", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_name: "A", customer_phone: "123" }),
    });
    const json = await res.json();
    assert.equal(res.status, 400);
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });
});
