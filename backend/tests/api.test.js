import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { env } from "../src/config/supabase.js";
import { createAuthenticateMiddleware } from "../src/middleware/authenticate.js";
import { requireRole, requireStaffPermission } from "../src/middleware/authorize.js";
import { createApp } from "../src/server.js";
import { availabilityService, intervalsOverlap, parsePgRangeMs } from "../src/services/availability.service.js";
import {
  cashfreeOrderMatchesPayment,
  matchesPaymentReference,
  paymentService,
  verifyCashfreeWebhookSignature,
} from "../src/services/payment.service.js";
import { pricingService } from "../src/services/pricing.service.js";
import { bookingRepository } from "../src/repositories/booking.repository.js";
import { consoleRepository } from "../src/repositories/console.repository.js";
import { groupBookingRepository } from "../src/repositories/groupBooking.repository.js";
import { paymentRepository } from "../src/repositories/payment.repository.js";
import { pricingRepository } from "../src/repositories/pricing.repository.js";
import { settingsRepository } from "../src/repositories/settings.repository.js";
import { tournamentRepository } from "../src/repositories/tournament.repository.js";
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
  it("preserves configured package durations below 30 minutes in availability results", async () => {
    const originals = {
      findAll: consoleRepository.findAll,
      findActiveReservationsInRange: consoleRepository.findActiveReservationsInRange,
      getSettings: settingsRepository.get,
    };
    consoleRepository.findAll = async () => [
      { id: "console-ps4", slug: "ps4", name: "PlayStation 4", console_type: "PS4", status: "available" },
    ];
    consoleRepository.findActiveReservationsInRange = async () => [];
    settingsRepository.get = async () => ({ opening_time: "10:00:00", closing_time: "11:00:00" });

    try {
      const result = await availabilityService.getAvailability({
        date: "2026-12-01",
        durationMinutes: 20,
      });
      assert.equal(result.durationMinutes, 20);
      assert.equal(result.slots[0].endTime, "10:20");
      assert.deepEqual(result.slots[0].consoles.ps4, { available: true, reason: "open" });
    } finally {
      consoleRepository.findAll = originals.findAll;
      consoleRepository.findActiveReservationsInRange = originals.findActiveReservationsInRange;
      settingsRepository.get = originals.getSettings;
    }
  });

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

  it("calculates individual console package totals from the configured per-player rate", async () => {
    const packages = [
      { id: "ps4-1h", category: "ps4", duration_minutes: 60, bonus_minutes: 0, price: 70, is_active: true, label: "1 Hour" },
      { id: "ps4pro-1h", category: "ps4pro", duration_minutes: 60, bonus_minutes: 0, price: 90, is_active: true, label: "1 Hour" },
    ];
    const originalFindById = pricingRepository.findById;
    pricingRepository.findById = async (id) => packages.find((entry) => entry.id === id) || null;

    try {
      for (const [players, total] of [[1, 70], [2, 140], [3, 210], [4, 280]]) {
        const resolved = await pricingService.resolveBookingPackage({
          pricingId: "ps4-1h",
          category: "ps4",
          durationMinutes: 60,
          players,
        });
        assert.equal(resolved.pricePerPlayer, 70);
        assert.equal(resolved.price, total);
      }

      const ps4Pro = await pricingService.resolveBookingPackage({
        pricingId: "ps4pro-1h",
        category: "ps4pro",
        durationMinutes: 60,
        players: 2,
      });
      assert.equal(ps4Pro.price, 180);
    } finally {
      pricingRepository.findById = originalFindById;
    }
  });

  it("keeps the whole-lounge package price flat regardless of group size", async () => {
    const originalFindByCategoryAndDuration = pricingRepository.findByCategoryAndDuration;
    pricingRepository.findByCategoryAndDuration = async (category, duration) =>
      category === "whole_lounge" && duration === 180
        ? { id: "whole-lounge", category, duration_minutes: 180, bonus_minutes: 0, price: 2500, label: "Whole Lounge" }
        : null;

    try {
      const resolved = await pricingService.calculatePrice({ category: "whole_lounge", durationMinutes: 180, players: 8 });
      assert.equal(resolved.price, 2500);
    } finally {
      pricingRepository.findByCategoryAndDuration = originalFindByCategoryAndDuration;
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

  it("binds a payment to its booking reference and normalized phone number", () => {
    const record = { booking_code: "BKG-123", customer_phone: "9025785087" };
    assert.equal(matchesPaymentReference(record, { reference: "BKG-123", customer_phone: "+91 90257 85087" }), true);
    assert.equal(matchesPaymentReference(record, { reference: "BKG-999", customer_phone: "9025785087" }), false);
    assert.equal(matchesPaymentReference(record, { reference: "BKG-123", customer_phone: "9025785000" }), false);
  });

  it("rejects Cashfree order amounts or currencies that differ from the saved payment", () => {
    assert.equal(cashfreeOrderMatchesPayment({ order_amount: 2500, order_currency: "INR" }, 2500), true);
    assert.equal(cashfreeOrderMatchesPayment({ order_amount: 2500.01, order_currency: "INR" }, 2500), false);
    assert.equal(cashfreeOrderMatchesPayment({ order_amount: 2500, order_currency: "USD" }, 2500), false);
    assert.equal(cashfreeOrderMatchesPayment({ order_currency: "INR" }, 2500), false);
  });
});

describe("Cashfree booking payment flows", () => {
  it("creates sandbox orders using the saved PS4, PS4 Pro, group, and tournament prices", async () => {
    const records = [
      {
        booking_type: "console",
        record_id: "10000000-0000-4000-8000-000000000001",
        reference: "BKG-PS4",
        amount: 70,
        record: { id: "10000000-0000-4000-8000-000000000001", booking_code: "BKG-PS4", customer_name: "Player", customer_phone: "9025785087", total_amount: 70, payment_status: "pending", booking_status: "confirmed" },
        link: "booking_id",
      },
      {
        booking_type: "console",
        record_id: "10000000-0000-4000-8000-000000000002",
        reference: "BKG-PS4PRO",
        amount: 180,
        record: { id: "10000000-0000-4000-8000-000000000002", booking_code: "BKG-PS4PRO", customer_name: "Player", customer_phone: "9025785087", total_amount: 180, payment_status: "pending", booking_status: "confirmed" },
        link: "booking_id",
      },
      {
        booking_type: "group",
        record_id: "20000000-0000-4000-8000-000000000001",
        reference: "WL-GROUP",
        amount: 2500,
        record: { id: "20000000-0000-4000-8000-000000000001", booking_code: "WL-GROUP", customer_name: "Player", customer_phone: "9025785087", total_amount: 2500, number_of_people: 24, payment_status: "pending", booking_status: "pending" },
        link: "group_booking_id",
      },
      {
        booking_type: "tournament",
        record_id: "30000000-0000-4000-8000-000000000001",
        reference: "TRN-REG",
        amount: 350,
        record: { id: "30000000-0000-4000-8000-000000000001", registration_code: "TRN-REG", participant_name: "Player", phone: "9025785087", payment_status: "pending", registration_status: "approved", tournaments: { entry_fee: 350 } },
        link: "tournament_registration_id",
      },
    ];
    const originals = {
      cashfreeAppId: env.cashfreeAppId,
      cashfreeSecretKey: env.cashfreeSecretKey,
      findBooking: bookingRepository.findById,
      findGroup: groupBookingRepository.findById,
      findRegistration: tournamentRepository.findRegistrationById,
      createPayment: paymentRepository.create,
      applyStatus: paymentRepository.applyCashfreeStatus,
      fetch: globalThis.fetch,
    };
    const paymentRows = [];
    const orderPayloads = [];

    env.cashfreeAppId = "test-app-id";
    env.cashfreeSecretKey = "test-secret";
    bookingRepository.findById = async (id) => records.find((r) => r.booking_type === "console" && r.record_id === id)?.record || null;
    groupBookingRepository.findById = async (id) => records.find((r) => r.booking_type === "group" && r.record_id === id)?.record || null;
    tournamentRepository.findRegistrationById = async (id) => records.find((r) => r.booking_type === "tournament" && r.record_id === id)?.record || null;
    paymentRepository.create = async (record) => {
      paymentRows.push(record);
      return { id: `payment-${paymentRows.length}`, ...record };
    };
    paymentRepository.applyCashfreeStatus = async ({ paymentId }) => ({ id: paymentId, payment_status: "pending" });
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url).startsWith("https://sandbox.cashfree.com/pg/orders"), true);
      const payload = JSON.parse(options.body);
      orderPayloads.push(payload);
      return {
        ok: true,
        json: async () => ({
          order_id: payload.order_id,
          cf_order_id: `cf-${payload.order_id}`,
          payment_session_id: "test-session",
          order_amount: payload.order_amount,
          order_currency: payload.order_currency,
        }),
      };
    };

    try {
      for (const testCase of records) {
        const order = await paymentService.createCashfreeOrder({
          booking_type: testCase.booking_type,
          record_id: testCase.record_id,
          reference: testCase.reference,
          customer_phone: "9025785087",
          amount: 0.01,
        });
        const createdPayment = paymentRows[paymentRows.length - 1];
        const payload = orderPayloads[orderPayloads.length - 1];
        assert.equal(Number(payload.order_amount), testCase.amount);
        assert.equal(createdPayment.amount, testCase.amount);
        assert.equal(createdPayment[testCase.link], testCase.record_id);
        assert.equal(order.environment, "sandbox");
      }
    } finally {
      env.cashfreeAppId = originals.cashfreeAppId;
      env.cashfreeSecretKey = originals.cashfreeSecretKey;
      bookingRepository.findById = originals.findBooking;
      groupBookingRepository.findById = originals.findGroup;
      tournamentRepository.findRegistrationById = originals.findRegistration;
      paymentRepository.create = originals.createPayment;
      paymentRepository.applyCashfreeStatus = originals.applyStatus;
      globalThis.fetch = originals.fetch;
    }
  });

  it("verifies paid orders server-side and updates the linked record for each booking type", async () => {
    const paymentCases = [
      {
        booking_type: "console",
        booking_id: "10000000-0000-4000-8000-000000000001",
        amount: 70,
        reference: "BKG-PS4",
        record: { booking_code: "BKG-PS4", customer_phone: "9025785087" },
      },
      {
        booking_type: "group",
        group_booking_id: "20000000-0000-4000-8000-000000000001",
        amount: 2500,
        reference: "WL-GROUP",
        record: { booking_code: "WL-GROUP", customer_phone: "9025785087" },
      },
      {
        booking_type: "tournament",
        tournament_registration_id: "30000000-0000-4000-8000-000000000001",
        amount: 350,
        reference: "TRN-REG",
        record: { registration_code: "TRN-REG", phone: "9025785087" },
      },
    ].map((item, index) => ({ ...item, id: `payment-${index + 1}`, cashfree_order_id: `cf-order-${index + 1}`, currency: "INR", payment_status: "pending" }));
    const originals = {
      cashfreeAppId: env.cashfreeAppId,
      cashfreeSecretKey: env.cashfreeSecretKey,
      findCashfreeOrder: paymentRepository.findByCashfreeOrderId,
      findBooking: bookingRepository.findById,
      findGroup: groupBookingRepository.findById,
      findRegistration: tournamentRepository.findRegistrationById,
      applyStatus: paymentRepository.applyCashfreeStatus,
      fetch: globalThis.fetch,
    };
    const appliedStatuses = [];

    env.cashfreeAppId = "test-app-id";
    env.cashfreeSecretKey = "test-secret";
    paymentRepository.findByCashfreeOrderId = async (id) => paymentCases.find((payment) => payment.cashfree_order_id === id) || null;
    bookingRepository.findById = async (id) => paymentCases.find((payment) => payment.booking_id === id)?.record || null;
    groupBookingRepository.findById = async (id) => paymentCases.find((payment) => payment.group_booking_id === id)?.record || null;
    tournamentRepository.findRegistrationById = async (id) => paymentCases.find((payment) => payment.tournament_registration_id === id)?.record || null;
    paymentRepository.applyCashfreeStatus = async ({ paymentId, paymentStatus }) => {
      appliedStatuses.push({ paymentId, paymentStatus });
      return { id: paymentId, payment_status: paymentStatus };
    };
    globalThis.fetch = async (url) => {
      const orderId = decodeURIComponent(String(url).split("/").pop());
      const payment = paymentCases.find((item) => item.cashfree_order_id === orderId);
      return {
        ok: true,
        json: async () => ({ order_amount: payment.amount, order_currency: "INR", order_status: "PAID" }),
      };
    };

    try {
      for (const payment of paymentCases) {
        const verified = await paymentService.verifyCashfreePayment({
          order_id: payment.cashfree_order_id,
          reference: payment.reference,
          customer_phone: "9025785087",
        });
        assert.equal(verified.payment_status, "paid");
      }
      assert.deepEqual(appliedStatuses, paymentCases.map(({ id }) => ({ paymentId: id, paymentStatus: "paid" })));
    } finally {
      env.cashfreeAppId = originals.cashfreeAppId;
      env.cashfreeSecretKey = originals.cashfreeSecretKey;
      paymentRepository.findByCashfreeOrderId = originals.findCashfreeOrder;
      bookingRepository.findById = originals.findBooking;
      groupBookingRepository.findById = originals.findGroup;
      tournamentRepository.findRegistrationById = originals.findRegistration;
      paymentRepository.applyCashfreeStatus = originals.applyStatus;
      globalThis.fetch = originals.fetch;
    }
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

  it("requires a booking reference and phone before a public Cashfree order can be created", async () => {
    const res = await fetch(`${baseUrl}/api/payments/cashfree/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_type: "console", record_id: "8a7a74f5-717c-4a14-9f81-8ecc258c2445" }),
    });
    const json = await res.json();
    assert.equal(res.status, 400);
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  it("rejects a Cashfree webhook without signature headers", async () => {
    const res = await fetch(`${baseUrl}/api/payments/cashfree/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" }),
    });
    assert.ok([400, 503].includes(res.status));
  });
});
