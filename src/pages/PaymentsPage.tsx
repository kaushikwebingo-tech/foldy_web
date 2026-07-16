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

export default function PaymentsPage() {
  const [planId, setPlanId]       = useState('');
  const [planType, setPlanType]   = useState('individual');
  const [amount, setAmount]       = useState('');
  const [orderId, setOrderId]     = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [signature, setSignature] = useState('');

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
        <strong>Mock testing:</strong> If RAZORPAY_KEY_SECRET is placeholder_secret, use order_id starting with
        <code className="mx-1 bg-blue-100 px-1 rounded">order_mock_</code>,
        payment_id starting with <code className="mx-1 bg-blue-100 px-1 rounded">pay_mock_</code> and
        signature = <code className="mx-1 bg-blue-100 px-1 rounded">mock_signature</code>.
      </div>

      <div className="space-y-4">
        {/* List active plans */}
        <ApiCard
          step={1}
          title="List Active Plans"
          method="GET"
          endpoint="/api/v1/payments/plans"
          description="Returns active catalog plans. A tier can have many plans — copy a plan _id to subscribe by planId below."
          onSubmit={() => paymentApi.listPlans()}
        />

        {/* Create order */}
        <ApiCard
          step={2}
          title="Create Payment Order"
          method="POST"
          endpoint="/api/v1/payments/create-order"
          description="Creates a Razorpay order for a plan upgrade. Prefer planId (a tier has many plans); planType is a fallback that picks the cheapest active plan. amount is a last-resort fallback."
          onSubmit={() => paymentApi.createOrder({
            planId: planId || undefined,
            planType: planId ? undefined : planType,
            amount: amount ? Number(amount) : undefined,
          })}
        >
          <Field label="Plan ID (preferred)" value={planId} onChange={setPlanId} placeholder="catalog plan _id" fullWidth />
          <SelectField label="Plan Type (fallback)" value={planType} onChange={setPlanType} options={PLAN_OPTIONS} />
          <Field label="Amount (₹, fallback)" value={amount} onChange={setAmount} placeholder="e.g. 999" type="number" />
        </ApiCard>

        {/* Verify payment */}
        <ApiCard
          step={3}
          title="Verify Payment & Upgrade Plan"
          method="POST"
          endpoint="/api/v1/payments/verify-payment"
          description="Verifies Razorpay signature and upgrades the user's subscription plan on success."
          onSubmit={() => paymentApi.verifyPayment({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
            ...(planId ? { planId } : { planType }),
          })}
        >
          <Field label="Razorpay Order ID" value={orderId} onChange={setOrderId} placeholder="order_mock_..." />
          <Field label="Razorpay Payment ID" value={paymentId} onChange={setPaymentId} placeholder="pay_mock_..." />
          <Field label="Signature" value={signature} onChange={setSignature} placeholder="mock_signature" fullWidth />
          <Field label="Plan ID (preferred)" value={planId} onChange={setPlanId} placeholder="catalog plan _id" fullWidth />
          <SelectField label="Plan Type (fallback)" value={planType} onChange={setPlanType} options={PLAN_OPTIONS} />
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
