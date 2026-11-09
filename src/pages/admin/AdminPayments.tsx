import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, type PaymentRecord } from "@/lib/api";
import { EmptyState, PanelLoader, StatusBadge } from "@/components/dashboard/StatusBadge";

export function AdminPayments() {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getPayments({
        status: statusFilter,
        method: methodFilter,
        booking_type: typeFilter,
      });
      setPayments(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, typeFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, payment_status: string) => {
    try {
      await api.admin.updatePaymentStatus(id, payment_status);
      toast.success(`Payment status updated to ${payment_status}.`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update payment status.");
    }
  };

  const paidSum = payments.filter((p) => p.payment_status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-coal p-4">
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field w-40 text-sm">
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="field w-40 text-sm">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="cashfree">Cashfree</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="field w-44 text-sm">
            <option value="">All Types</option>
            <option value="console">Console Booking</option>
            <option value="walkin">Walk-in</option>
            <option value="group">Whole Lounge</option>
            <option value="tournament">Tournament</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <p className="font-tech text-sm font-bold uppercase text-white/75">
            Filtered Paid Total:{" "}
            <span className="font-display text-lg text-emerald-400">
              <Rupee />
              {paidSum.toLocaleString("en-IN")}
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <PanelLoader label="Loading payments ledger..." />
      ) : payments.length === 0 ? (
        <EmptyState icon={<Wallet className="h-6 w-6" />} title="No Transactions Recorded" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-coal">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] font-tech text-xs uppercase tracking-[0.16em] text-white/50">
              <tr>
                <th className="px-4 py-3.5">Transaction ID</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Collected By</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <p className="font-display text-xs font-bold text-blood-300">{p.transaction_id}</p>
                    {p.cashfree_payment_id && <p className="text-[11px] text-white/45">CF: {p.cashfree_payment_id}</p>}
                    {p.cashfree_order_id && !p.cashfree_payment_id && <p className="text-[11px] text-white/45">{p.cashfree_order_id}</p>}
                  </td>
                  <td className="px-4 py-3.5 font-tech font-bold uppercase">{p.booking_type}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={p.payment_method} />
                  </td>
                  <td className="px-4 py-3.5 font-display font-bold">
                    <Rupee />
                    {Number(p.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/65">
                    {new Date(p.paid_at || p.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/70">{p.collected?.full_name || "Online"}</td>
                  <td className="px-4 py-3.5">
                    <select
                      aria-label={`Payment status for ${p.transaction_id}`}
                      value={p.payment_status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 font-tech text-xs font-bold uppercase text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
