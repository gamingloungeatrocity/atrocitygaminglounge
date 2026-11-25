import crypto from "node:crypto";
import { env } from "../config/supabase.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { groupBookingRepository } from "../repositories/groupBooking.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { tournamentRepository } from "../repositories/tournament.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError, generateCode } from "../utils/errors.js";
import { normalizeIndianPhone } from "../utils/time.js";

const CASHFREE_API_VERSION_FALLBACK = "2023-08-01";

export function getCashfreeBaseUrl(environment = env.cashfreeEnv) {
  if (environment === "sandbox") return "https://sandbox.cashfree.com/pg";
  if (environment === "production") return "https://api.cashfree.com/pg";
  throw new ApiError(503, "CASHFREE_ENV_INVALID", "Set CASHFREE_ENV to either sandbox or production.");
}

function getCashfreeConfig() {
  const apiBaseUrl = getCashfreeBaseUrl();
  if (!env.cashfreeAppId || !env.cashfreeSecretKey) {
    throw new ApiError(
      503,
      "CASHFREE_NOT_CONFIGURED",
      "Set both Cashfree credentials for the selected environment on the backend.",
    );
  }
  return {
    environment: env.cashfreeEnv,
    apiBaseUrl,
    apiVersion: env.cashfreeApiVersion || CASHFREE_API_VERSION_FALLBACK,
    headers: {
      "x-client-id": env.cashfreeAppId,
      "x-client-secret": env.cashfreeSecretKey,
      "x-api-version": env.cashfreeApiVersion || CASHFREE_API_VERSION_FALLBACK,
      Accept: "application/json",
    },
  };
}

function getCashfreeReturnUrl(environment) {
  const returnUrl =
    env.cashfreeReturnUrl ||
    `${env.frontendUrl.replace(/\/+$/, "")}/?cf_order_id={order_id}`;
  let parsedUrl;
  try {
    parsedUrl = new URL(returnUrl.replace("{order_id}", "cashfree-order"));
  } catch {
    throw new ApiError(
      503,
      "CASHFREE_RETURN_URL_INVALID",
      "Set a valid absolute HTTP(S) CASHFREE_RETURN_URL or FRONTEND_URL.",
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isLocalHost =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";
  if (!["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new ApiError(
      503,
      "CASHFREE_RETURN_URL_INVALID",
      "Set a valid absolute HTTP(S) CASHFREE_RETURN_URL or FRONTEND_URL.",
    );
  }
  if (environment === "production" && (parsedUrl.protocol !== "https:" || isLocalHost)) {
    throw new ApiError(
      503,
      "CASHFREE_RETURN_URL_INVALID",
      "Production Cashfree requires a public HTTPS CASHFREE_RETURN_URL or FRONTEND_URL.",
    );
  }
  return returnUrl;
}

function sanitizeCashfreeText(value, maxLength = 240) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/((?:x-client-secret|client[_-]?secret|secret[_-]?key|authorization|access[_-]?token|token)\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .slice(0, maxLength);
}

async function logCashfreeApiFailure(response, config, endpoint, operation) {
  const responseText = await response.text();
  let payload = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  const errorCode = sanitizeCashfreeText(payload?.code || payload?.error_code || "");
  const errorType = sanitizeCashfreeText(payload?.type || "");
  const errorMessage = sanitizeCashfreeText(payload?.message || response.statusText || `HTTP ${response.status}`);
  const requestId = sanitizeCashfreeText(
    response.headers.get("x-request-id") ||
      response.headers.get("x-cf-request-id") ||
      response.headers.get("x-cashfree-request-id") ||
      payload?.cf_request_id ||
      payload?.request_id ||
      "",
    120,
  );
  const authenticationFailure =
    response.status === 401 ||
    response.status === 403 ||
    /authentication/i.test(errorType) ||
    /authentication failed/i.test(errorMessage);

  console.error("[cashfree_api_error]", {
    operation,
    environment: config.environment,
    endpoint,
    apiVersion: config.apiVersion,
    status: response.status,
    cashfreeErrorCode: errorCode || null,
    cashfreeErrorType: errorType || null,
    cashfreeErrorMessage: errorMessage || null,
    requestId: requestId || null,
  });

  return { authenticationFailure };
}

function cashfreeApiError(operation, authenticationFailure) {
  if (authenticationFailure) {
    return new ApiError(
      502,
      "CASHFREE_AUTHENTICATION_FAILED",
      `Cashfree authentication failed for the configured environment. ${operation} could not continue; your booking remains saved. Contact the lounge.`,
    );
  }
  return new ApiError(
    502,
    "CASHFREE_API_REQUEST_FAILED",
    `Cashfree could not complete ${operation}. Your booking remains saved; please retry later or contact the lounge.`,
  );
}

export function matchesPaymentReference(record, { reference, customer_phone }) {
  const recordReference = record.booking_code || record.registration_code;
  const recordPhone = normalizeIndianPhone(record.customer_phone || record.phone);
  const submittedPhone = normalizeIndianPhone(customer_phone);
  return Boolean(
    recordReference &&
    recordReference === String(reference || "").trim() &&
    recordPhone &&
    recordPhone === submittedPhone
  );
}

function assertPaymentOwner(record, input) {
  if (!matchesPaymentReference(record, input)) {
    throw new ApiError(404, "BOOKING_REFERENCE_MISMATCH", "Booking reference or phone number did not match.");
  }
}

function assertPayableRecord(bookingType, record) {
  if (record.payment_status === "paid") {
    throw new ApiError(400, "ALREADY_PAID", "This booking or registration is already paid.");
  }
  if (
    (bookingType === "console" && record.booking_status === "cancelled") ||
    (bookingType === "group" && ["rejected", "cancelled"].includes(record.booking_status)) ||
    (bookingType === "tournament" && ["rejected", "cancelled"].includes(record.registration_status))
  ) {
    throw new ApiError(400, "NOT_PAYABLE", "This booking or registration is no longer payable.");
  }
}

async function findLinkedRecord(payment) {
  if (payment.booking_id) return bookingRepository.findById(payment.booking_id);
  if (payment.group_booking_id) return groupBookingRepository.findById(payment.group_booking_id);
  if (payment.tournament_registration_id) {
    return tournamentRepository.findRegistrationById(payment.tournament_registration_id);
  }
  return null;
}

export function cashfreeOrderMatchesPayment(order, amountInr, currency = "INR") {
  const amount = Math.round(Number(order.order_amount) * 100);
  const expected = Math.round(Number(amountInr) * 100);
  return Number.isFinite(amount) && amount === expected && order.order_currency === currency;
}

function assertCashfreeAmount(order, payment) {
  if (!cashfreeOrderMatchesPayment(order, payment.amount, payment.currency)) {
    throw new ApiError(400, "PAYMENT_AMOUNT_MISMATCH", "Cashfree order amount or currency did not match the saved payment.");
  }
}

async function applyCashfreeStatus(payment, paymentStatus, metadata = {}, cashfreePaymentId = null) {
  return paymentRepository.applyCashfreeStatus({
    paymentId: payment.id,
    paymentStatus,
    cashfreePaymentId,
    paidAt: paymentStatus === "paid" ? new Date().toISOString() : null,
    metadata,
  });
}

async function reconcileCashfreeOrder(payment) {
  const config = getCashfreeConfig();
  const orderEndpoint = `${config.apiBaseUrl}/orders/${encodeURIComponent(payment.cashfree_order_id)}`;
  const cfRes = await fetch(orderEndpoint, {
    method: "GET",
    headers: config.headers,
  });
  if (!cfRes.ok) {
    const failure = await logCashfreeApiFailure(cfRes, config, `${config.apiBaseUrl}/orders/{order_id}`, "order verification");
    throw cashfreeApiError("payment verification", failure.authenticationFailure);
  }

  const orderData = await cfRes.json();
  assertCashfreeAmount(orderData, payment);
  const status = String(orderData.order_status || "").toUpperCase();
  if (status === "PAID") {
    return applyCashfreeStatus(
      payment,
      "paid",
      { cashfree_order_data: orderData },
      String(orderData.cf_payment_id || ""),
    );
  }

  if (["EXPIRED", "TERMINATED", "FAILED"].includes(status)) {
    return applyCashfreeStatus(payment, "failed", { cashfree_status: status });
  }

  if (status === "ACTIVE") {
    const paymentsEndpoint = `${config.apiBaseUrl}/orders/${encodeURIComponent(payment.cashfree_order_id)}/payments`;
    const paymentsResponse = await fetch(paymentsEndpoint, { method: "GET", headers: config.headers });
    if (paymentsResponse.ok) {
      const attempts = await paymentsResponse.json();
      const latestAttempt = Array.isArray(attempts) ? attempts[attempts.length - 1] : null;
      if (attempts.length > 0 && attempts.every((attempt) => attempt.payment_status === "FAILED")) {
        return applyCashfreeStatus(payment, "failed", { cashfree_payment_details: latestAttempt });
      }
    } else {
      await logCashfreeApiFailure(
        paymentsResponse,
        config,
        `${config.apiBaseUrl}/orders/{order_id}/payments`,
        "payment attempts lookup",
      );
    }
    return payment;
  }

  return applyCashfreeStatus(payment, "failed", { cashfree_status: status || "UNKNOWN" });
}

/**
 * Pure HMAC-SHA256 verification helper for Cashfree webhooks.
 * Cashfree hashes `timestamp + rawBody` with client secret and base64 encodes it.
 */
export function verifyCashfreeWebhookSignature({ timestamp, rawBody, signature, secret }) {
  if (!timestamp || !rawBody || !signature || !secret) return false;
  const payload = `${timestamp}${rawBody}`;
  const computed = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  const computedBuf = Buffer.from(computed, "utf8");
  const actualBuf = Buffer.from(String(signature), "utf8");
  if (computedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, actualBuf);
}

export const paymentService = {
  async list(filters) {
    return paymentRepository.findAll(filters);
  },

  /**
   * Creates a Cashfree payment order and session for frontend checkout.
   */
  async createCashfreeOrder({ booking_type, record_id, reference, customer_phone }) {
    const cashfreeConfig = getCashfreeConfig();

    let amountInr = 0;
    let customerName = "Gamer";
    let customerPhone = "9999999999";
    let customerEmail = "guest@atrocitygaming.example";
    let record;
    const linkColumns = {
      booking_id: null,
      group_booking_id: null,
      tournament_registration_id: null,
    };

    if (booking_type === "console") {
      record = await bookingRepository.findById(record_id);
      if (!record) throw new ApiError(404, "NOT_FOUND", "Booking not found.");
      amountInr = Number(record.total_amount);
      customerName = record.customer_name || customerName;
      customerPhone = record.customer_phone || customerPhone;
      linkColumns.booking_id = record.id;
    } else if (booking_type === "group") {
      record = await groupBookingRepository.findById(record_id);
      if (!record) throw new ApiError(404, "NOT_FOUND", "Whole lounge booking not found.");
      amountInr = Number(record.total_amount);
      customerName = record.customer_name || customerName;
      customerPhone = record.customer_phone || customerPhone;
      linkColumns.group_booking_id = record.id;
    } else if (booking_type === "tournament") {
      record = await tournamentRepository.findRegistrationById(record_id);
      if (!record) throw new ApiError(404, "NOT_FOUND", "Tournament registration not found.");
      amountInr = Number(record.tournaments?.entry_fee || 0);
      customerName = record.participant_name || customerName;
      customerPhone = record.phone || customerPhone;
      linkColumns.tournament_registration_id = record.id;
    } else {
      throw new ApiError(400, "INVALID_BOOKING_TYPE", "Unsupported booking type for online payment.");
    }

    assertPaymentOwner(record, { reference, customer_phone });
    assertPayableRecord(booking_type, record);

    if (amountInr <= 0) {
      throw new ApiError(400, "ZERO_AMOUNT", "No payment required for zero-fee registration.");
    }

    // Cashfree customer phone must be 10 digits
    const cleanPhone = String(customerPhone).replace(/\D/g, "").slice(-10);
    const validPhone = cleanPhone.length === 10 ? cleanPhone : "9999999999";

    // Cashfree order ID format (alphanumeric, underscore, hyphen; max 45 characters)
    const cfOrderId = `cf_${booking_type.slice(0, 3)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const customerId = `cust_${record_id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25)}`;
    const receipt = generateCode("CF");
    const returnUrl = getCashfreeReturnUrl(cashfreeConfig.environment);

    const payload = {
      order_id: cfOrderId,
      order_amount: Number(amountInr.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: customerId,
        customer_name: (customerName || "Gamer").slice(0, 50),
        customer_phone: validPhone,
        customer_email: customerEmail || "guest@atrocitygaming.example",
      },
      order_meta: {
        return_url: returnUrl,
        ...(env.cashfreeWebhookUrl ? { notify_url: env.cashfreeWebhookUrl } : {}),
      },
      order_note: `Atrocity Lounge ${booking_type} #${receipt}`,
    };

    const ordersEndpoint = `${cashfreeConfig.apiBaseUrl}/orders`;
    const cfRes = await fetch(ordersEndpoint, {
      method: "POST",
      headers: {
        ...cashfreeConfig.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!cfRes.ok) {
      const failure = await logCashfreeApiFailure(cfRes, cashfreeConfig, ordersEndpoint, "order creation");
      throw cashfreeApiError("payment order creation", failure.authenticationFailure);
    }

    const order = await cfRes.json();
    if (!order.order_id || !order.payment_session_id) {
      throw new ApiError(502, "CASHFREE_ORDER_FAILED", "Cashfree did not return a usable payment session.");
    }

    const payment = await paymentRepository.create({
      booking_type,
      ...linkColumns,
      transaction_id: receipt,
      cashfree_order_id: order.order_id,
      amount: amountInr,
      currency: "INR",
      payment_method: "cashfree",
      payment_status: "pending",
      metadata: {
        receipt,
        cf_order_id: order.cf_order_id,
        payment_session_id: order.payment_session_id,
      },
    });
    return {
      order_id: order.order_id,
      cf_order_id: String(order.cf_order_id || ""),
      payment_session_id: order.payment_session_id,
      amount: order.order_amount,
      currency: order.order_currency,
      payment_id: payment.id,
      environment: cashfreeConfig.environment,
    };
  },

  /**
   * Verifies Cashfree payment status server-to-server and marks the booking Paid.
   */
  async verifyCashfreePayment({ order_id, reference, customer_phone }) {
    getCashfreeConfig();

    const payment = await paymentRepository.findByCashfreeOrderId(order_id);
    if (!payment) {
      throw new ApiError(404, "PAYMENT_ORDER_NOT_FOUND", "Payment order record was not found.");
    }

    const record = await findLinkedRecord(payment);
    if (!record) throw new ApiError(404, "NOT_FOUND", "The linked booking or registration was not found.");
    assertPaymentOwner(record, { reference, customer_phone });
    if (payment.payment_status === "paid") return payment;
    return reconcileCashfreeOrder(payment);
  },

  /**
   * Processes verified Cashfree webhook events.
   */
  async handleCashfreeWebhookEvent(event) {
    const orderId = event?.data?.order?.order_id || event?.order?.order_id;
    if (!orderId) return null;

    const payment = await paymentRepository.findByCashfreeOrderId(orderId);
    if (!payment) return null;

    if (!["PAYMENT_SUCCESS_WEBHOOK", "PAYMENT_FAILED_WEBHOOK"].includes(event?.type)) return null;
    return reconcileCashfreeOrder(payment);
  },

  /**
   * Records offline Cash / UPI collection by an authenticated staff or admin member.
   */
  async recordOfflinePayment({ booking_type, record_id, payment_method, amount }, actor, ipAddress) {
    let targetAmount = amount;
    const links = { booking_id: null, group_booking_id: null, tournament_registration_id: null };

    if (booking_type === "console") {
      const b = await bookingRepository.findById(record_id);
      if (!b) throw new ApiError(404, "NOT_FOUND", "Booking not found.");
      targetAmount = targetAmount ?? Number(b.total_amount);
      links.booking_id = b.id;
      await bookingRepository.updatePaymentStatus(b.id, "paid");
    } else if (booking_type === "group") {
      const g = await groupBookingRepository.findById(record_id);
      if (!g) throw new ApiError(404, "NOT_FOUND", "Whole lounge booking not found.");
      targetAmount = targetAmount ?? Number(g.total_amount);
      links.group_booking_id = g.id;
      await groupBookingRepository.update(g.id, { payment_status: "paid" });
    } else if (booking_type === "tournament") {
      const regs = await tournamentRepository.findRegistrations("all", {});
      const reg = regs.find((r) => r.id === record_id);
      if (!reg) throw new ApiError(404, "NOT_FOUND", "Registration not found.");
      targetAmount = targetAmount ?? Number(reg.tournaments?.entry_fee || 0);
      links.tournament_registration_id = reg.id;
      await tournamentRepository.updateRegistration(reg.id, { payment_status: "paid" });
    } else {
      throw new ApiError(400, "INVALID_BOOKING_TYPE", "Unsupported booking type.");
    }

    const payment = await paymentRepository.create({
      booking_type,
      ...links,
      transaction_id: generateCode("PAY"),
      amount: targetAmount,
      currency: "INR",
      payment_method,
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      collected_by: actor.id,
    });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "RECORD_OFFLINE_PAYMENT",
      entityType: "payment",
      entityId: payment.id,
      details: { booking_type, record_id, payment_method, amount: targetAmount },
      ipAddress,
    });

    return payment;
  },

  async updateStatus(id, paymentStatus, actor, ipAddress) {
    const existing = await paymentRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Payment record not found.");
    const updated = await paymentRepository.update(id, { payment_status: paymentStatus });

    if (existing.booking_id) await bookingRepository.updatePaymentStatus(existing.booking_id, paymentStatus);
    if (existing.group_booking_id) await groupBookingRepository.update(existing.group_booking_id, { payment_status: paymentStatus });
    if (existing.tournament_registration_id) {
      await tournamentRepository.updateRegistration(existing.tournament_registration_id, { payment_status: paymentStatus });
    }

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_PAYMENT_STATUS",
      entityType: "payment",
      entityId: id,
      details: { from: existing.payment_status, to: paymentStatus },
      ipAddress,
    });

    return updated;
  },
};
