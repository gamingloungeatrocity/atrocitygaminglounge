import crypto from "node:crypto";
import { env } from "../config/supabase.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { groupBookingRepository } from "../repositories/groupBooking.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { tournamentRepository } from "../repositories/tournament.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError, generateCode } from "../utils/errors.js";

function getCashfreeBaseUrl() {
  return env.cashfreeEnv === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
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
  async createCashfreeOrder({ booking_type, record_id }) {
    if (!env.cashfreeAppId || !env.cashfreeSecretKey) {
      throw new ApiError(
        503,
        "CASHFREE_NOT_CONFIGURED",
        "Online Cashfree payments are not configured yet on the server. Please book and pay at the lounge.",
      );
    }

    let amountInr = 0;
    let customerName = "Gamer";
    let customerPhone = "9999999999";
    let customerEmail = "guest@atrocitygaming.example";
    const linkColumns = {
      booking_id: null,
      group_booking_id: null,
      tournament_registration_id: null,
    };

    if (booking_type === "console") {
      const b = await bookingRepository.findById(record_id);
      if (!b) throw new ApiError(404, "NOT_FOUND", "Booking not found.");
      if (b.payment_status === "paid") throw new ApiError(400, "ALREADY_PAID", "Booking is already paid.");
      amountInr = Number(b.total_amount);
      customerName = b.customer_name || customerName;
      customerPhone = b.customer_phone || customerPhone;
      customerEmail = b.customer_email || customerEmail;
      linkColumns.booking_id = b.id;
    } else if (booking_type === "group") {
      const g = await groupBookingRepository.findById(record_id);
      if (!g) throw new ApiError(404, "NOT_FOUND", "Whole lounge booking not found.");
      if (g.payment_status === "paid") throw new ApiError(400, "ALREADY_PAID", "Whole lounge booking is already paid.");
      amountInr = Number(g.total_amount);
      customerName = g.contact_name || customerName;
      customerPhone = g.contact_phone || customerPhone;
      customerEmail = g.contact_email || customerEmail;
      linkColumns.group_booking_id = g.id;
    } else if (booking_type === "tournament") {
      const regs = await tournamentRepository.findRegistrations("all", {});
      const reg = regs.find((r) => r.id === record_id);
      if (!reg) throw new ApiError(404, "NOT_FOUND", "Tournament registration not found.");
      amountInr = Number(reg.tournaments?.entry_fee || 0);
      customerName = reg.participant_name || customerName;
      customerPhone = reg.phone || customerPhone;
      linkColumns.tournament_registration_id = reg.id;
    } else {
      throw new ApiError(400, "INVALID_BOOKING_TYPE", "Unsupported booking type for online payment.");
    }

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

    const baseUrl = getCashfreeBaseUrl();
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
        return_url: `${env.frontendUrl}/?cf_order_id={order_id}`,
        notify_url: `${env.frontendUrl.replace(/:\d+$/, ":5000")}/api/payments/cashfree/webhook`,
      },
      order_note: `Atrocity Lounge ${booking_type} #${receipt}`,
    };

    const cfRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": env.cashfreeAppId,
        "x-client-secret": env.cashfreeSecretKey,
        "x-api-version": env.cashfreeApiVersion || "2023-08-01",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!cfRes.ok) {
      const text = await cfRes.text();
      throw new ApiError(502, "CASHFREE_ORDER_FAILED", `Failed to initialize Cashfree order: ${text}`);
    }

    const order = await cfRes.json();

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
      environment: env.cashfreeEnv,
    };
  },

  /**
   * Verifies Cashfree payment status server-to-server and marks the booking Paid.
   */
  async verifyCashfreePayment({ order_id }) {
    if (!env.cashfreeAppId || !env.cashfreeSecretKey) {
      throw new ApiError(503, "CASHFREE_NOT_CONFIGURED", "Cashfree credentials are not configured on server.");
    }

    const payment = await paymentRepository.findByCashfreeOrderId(order_id);
    if (!payment) {
      throw new ApiError(404, "PAYMENT_ORDER_NOT_FOUND", "Payment order record was not found.");
    }

    if (payment.payment_status === "paid") {
      return payment;
    }

    const baseUrl = getCashfreeBaseUrl();
    const headers = {
      "x-client-id": env.cashfreeAppId,
      "x-client-secret": env.cashfreeSecretKey,
      "x-api-version": env.cashfreeApiVersion || "2023-08-01",
      Accept: "application/json",
    };

    const cfRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(order_id)}`, {
      method: "GET",
      headers,
    });

    if (!cfRes.ok) {
      const text = await cfRes.text();
      throw new ApiError(502, "CASHFREE_VERIFICATION_FAILED", `Could not verify order with Cashfree: ${text}`);
    }

    const orderData = await cfRes.json();

    if (orderData.order_status === "PAID") {
      let cfPaymentId = String(orderData.cf_order_id || "");
      let paymentDetails = null;

      try {
        const pRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(order_id)}/payments`, {
          method: "GET",
          headers,
        });
        if (pRes.ok) {
          const paymentsList = await pRes.json();
          if (Array.isArray(paymentsList)) {
            const successPayment = paymentsList.find((p) => p.payment_status === "SUCCESS") || paymentsList[0];
            if (successPayment) {
              cfPaymentId = String(successPayment.cf_payment_id || cfPaymentId);
              paymentDetails = successPayment;
            }
          }
        }
      } catch {
        // Best effort payment detail lookup; order_status PAID is authoritative
      }

      const paidAt = new Date().toISOString();
      const updatedPayment = await paymentRepository.update(payment.id, {
        cashfree_payment_id: cfPaymentId,
        payment_status: "paid",
        paid_at: paidAt,
        metadata: {
          ...payment.metadata,
          cashfree_order_data: orderData,
          cashfree_payment_details: paymentDetails,
        },
      });

      if (payment.booking_id) {
        await bookingRepository.updatePaymentStatus(payment.booking_id, "paid");
      } else if (payment.group_booking_id) {
        await groupBookingRepository.update(payment.group_booking_id, { payment_status: "paid" });
      } else if (payment.tournament_registration_id) {
        await tournamentRepository.updateRegistration(payment.tournament_registration_id, { payment_status: "paid" });
      }

      return updatedPayment;
    }

    if (orderData.order_status === "ACTIVE") {
      throw new ApiError(400, "PAYMENT_PENDING", "Payment has not been completed yet. Please finish the payment.");
    }

    await paymentRepository.update(payment.id, {
      payment_status: "failed",
      metadata: { ...payment.metadata, cashfree_status: orderData.order_status },
    });
    throw new ApiError(400, "PAYMENT_FAILED", `Cashfree payment failed with status: ${orderData.order_status}`);
  },

  /**
   * Processes verified Cashfree webhook events.
   */
  async handleCashfreeWebhookEvent(event) {
    const orderId = event?.data?.order?.order_id || event?.order?.order_id;
    if (!orderId) return null;

    const payment = await paymentRepository.findByCashfreeOrderId(orderId);
    if (!payment) return null;

    if (event?.type === "PAYMENT_SUCCESS_WEBHOOK" || event?.data?.order?.order_status === "PAID") {
      const cfPaymentId = String(event?.data?.payment?.cf_payment_id || event?.data?.order?.cf_order_id || "");
      const paidAt = new Date().toISOString();
      const updated = await paymentRepository.update(payment.id, {
        cashfree_payment_id: cfPaymentId,
        payment_status: "paid",
        paid_at: paidAt,
        metadata: { ...payment.metadata, webhook_data: event },
      });

      if (payment.booking_id) {
        await bookingRepository.updatePaymentStatus(payment.booking_id, "paid");
      } else if (payment.group_booking_id) {
        await groupBookingRepository.update(payment.group_booking_id, { payment_status: "paid" });
      } else if (payment.tournament_registration_id) {
        await tournamentRepository.updateRegistration(payment.tournament_registration_id, { payment_status: "paid" });
      }
      return updated;
    }

    if (event?.type === "PAYMENT_FAILED_WEBHOOK") {
      return paymentRepository.update(payment.id, {
        payment_status: "failed",
        metadata: { ...payment.metadata, webhook_data: event },
      });
    }

    return null;
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
