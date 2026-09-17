import { useState } from 'react';
import ApiCard from '@/components/ApiCard';
import { Field, SelectField } from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { paymentApi } from '@/api/paymentApi';
import { CreditCard } from 'lucide-react';

const PLAN_OPTIONS = [
  { label: 'Individual',  value: 'individual'  },
  { label: 'Business',    value: 'business'    },
  { label: 'Enterprise',  value: 'enterprise'  },
];

const PURPOSE_OPTIONS = [
  { label: 'Plan',    value: 'plan'    },
  { label: 'Credits', value: 'credits' },
];

export default function PaymentsPage() {
  const [purpose, setPurpose]     = useState('plan');
  const [planId, setPlanId]       = useState('');
  const [planType, setPlanType]   = useState('individual');
  const [packId, setPackId]       = useState('');
  const [orderId, setOrderId]     = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [signature, setSignature] = useState('');
  const [comparePlanId, setComparePlanId] = useState('');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Payments & Subscription"
        subtitle="Razorpay integration for plan upgrades. Use mock credentials for testing (see .env.example)."
        icon={<CreditCard size={18} />}
        badge="Auth Required"
        postmanSection="payments"
      />

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Mock testing:</strong> with the placeholder Razorpay keys, Create Order returns an
        <code className="mx-1 bg-blue-100 px-1 rounded">order_mock_…</code> id — verify with THAT id (a made-up one is
        404 PAYMENT_ORDER_NOT_FOUND), payment_id starting with <code className="mx-1 bg-blue-100 px-1 rounded">pay_mock_</code> and
        signature = <code className="mx-1 bg-blue-100 px-1 rounded">mock_signature</code>. Verify applies the order stored at
        create time exactly once; a second verify answers "already applied" and extends nothing.
      </div>

      <div className="space-y-4">
        {/* List active plans */}
        <ApiCard
          step={1}
          title="List Active Plans"
          method="GET"
          endpoint="/api/v1/payments/plans"
          description="Returns active catalog plans for your workspace. A tier can have many plans — copy a plan _id to subscribe by planId below. Each plan carries memberLimit (people incl. the owner, -1 = unlimited)."
          onSubmit={() => paymentApi.listPlans()}
        />

        {/* Create order */}
        <ApiCard
          step={2}
          title="Create Payment Order"
          method="POST"
          endpoint="/api/v1/payments/create-order"
          description="Stores the purchase and prices it from the catalog (no amount is sent — the server ignores it). Plan: planId preferred, planType falls back to the cheapest active plan. Credits: packId. A plan with fewer seats than are in use is refused before any money moves (409 MEMBER_DOWNGRADE_BLOCKED)."
          onSubmit={async () => {
            const res = await paymentApi.createOrder(
              purpose === 'credits'
                ? { purpose: 'credits', packId: packId.trim() }
                : { purpose: 'plan', ...(planId.trim() ? { planId: planId.trim() } : { planType }) },
            );
            const id = res.data?.data?.order?.id;
            if (typeof id === 'string') setOrderId(id);
            return res;
          }}
        >
          <SelectField label="Purpose" value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS} />
          <Field label="Pack ID (credits)" value={packId} onChange={setPackId} placeholder="credit pack _id" />
          <Field label="Plan ID (plan, preferred)" value={planId} onChange={setPlanId} placeholder="catalog plan _id" />
          <SelectField label="Plan Type (plan, fallback)" value={planType} onChange={setPlanType} options={PLAN_OPTIONS} />
        </ApiCard>

        {/* Verify payment */}
        <ApiCard
          step={3}
          title="Verify Payment & Apply"
          method="POST"
          endpoint="/api/v1/payments/verify-payment"
          description="Checks the signature, then applies the order stored at step 2 — never the body. Only the three razorpay_* fields are needed (the order id is filled from step 2). An optional planId is only COMPARED with the order: a different one → 422 PAYMENT_ORDER_MISMATCH. 409 PAYMENT_IN_PROGRESS / PAYMENT_NOT_APPLIED mean do not pay again."
          onSubmit={() => paymentApi.verifyPayment({
            razorpay_order_id: orderId.trim(),
            razorpay_payment_id: paymentId.trim(),
            razorpay_signature: signature.trim(),
            ...(comparePlanId.trim() ? { planId: comparePlanId.trim() } : {}),
          })}
        >
          <Field label="Razorpay Order ID" value={orderId} onChange={setOrderId} placeholder="order_mock_... (from step 2)" />
          <Field label="Razorpay Payment ID" value={paymentId} onChange={setPaymentId} placeholder="pay_mock_..." />
          <Field label="Signature" value={signature} onChange={setSignature} placeholder="mock_signature" />
          <Field label="Plan ID to compare (optional)" value={comparePlanId} onChange={setComparePlanId} placeholder="blank = not sent" />
        </ApiCard>

        {/* History */}
        <ApiCard
          step={4}
          title="Payment History"
          method="GET"
          endpoint="/api/v1/payments/history"
          description="Returns the logged-in user's onboarding subscription payment history."
          onSubmit={() => paymentApi.getHistory()}
        />
      </div>
    </div>
  );
}
