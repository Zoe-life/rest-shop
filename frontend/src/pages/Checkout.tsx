import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

type PaymentMethod = 'card' | 'stripe' | 'paypal' | 'mpesa';

interface PaymentFormState {
  method: PaymentMethod;
  // card fields
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardName: string;
  // mpesa
  mpesaPhone: string;
  // paypal / stripe – handled client-side by redirect in a real integration
}

const methodLabels: Record<PaymentMethod, string> = {
  card: 'Credit / Debit Card',
  stripe: 'Stripe',
  paypal: 'PayPal',
  mpesa: 'M-Pesa',
};

const methodIcons: Record<PaymentMethod, React.ReactNode> = {
  card: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  stripe: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  ),
  paypal: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
    </svg>
  ),
  mpesa: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

const Checkout: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<PaymentFormState>({
    method: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
    mpesaPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  if (items.length === 0 && !success) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">Your cart is empty.</p>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-medium transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create all orders concurrently
      const orderResults = await Promise.all(
        items.map((item) =>
          api.post('/orders', { productId: item._id, quantity: item.quantity })
            .then((res) => res.data.order?._id || res.data._id as string | undefined)
        )
      );

      // Initiate payments concurrently for all successfully created orders
      const paymentData: Record<string, string> = {};
      if (form.method === 'mpesa') {
        paymentData.phoneNumber = form.mpesaPhone;
      } else if (form.method === 'card' || form.method === 'stripe') {
        paymentData.cardNumber = form.cardNumber;
        paymentData.cardExpiry = form.cardExpiry;
        paymentData.cardCvc = form.cardCvc;
        paymentData.cardName = form.cardName;
      }

      const validOrderIds = orderResults.filter(Boolean) as string[];
      await Promise.all(
        validOrderIds.map((orderId) =>
          api.post('/payments/initiate', {
            orderId,
            paymentMethod: form.method,
            paymentData,
          })
        )
      );

      clearCart();
      setSuccess(true);
    } catch (err: any) {
      const message =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Payment failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-white dark:bg-navy-800 rounded-xl shadow-lg p-10">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-navy-600 dark:text-white mb-3">Order Placed!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your order has been placed and payment initiated successfully.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="px-6 py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-medium transition-colors"
            >
              View My Orders
            </button>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-3 border border-gray-300 dark:border-navy-600 text-navy-600 dark:text-white hover:bg-gray-50 dark:hover:bg-navy-700 rounded-lg font-medium transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Order Summary */}
        <div>
          <h2 className="text-xl font-semibold text-navy-600 dark:text-white mb-4">Order Summary</h2>
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-6 space-y-4">
            {items.map((item) => (
              <div key={item._id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-navy-700 last:border-0">
                <div>
                  <p className="font-medium text-navy-600 dark:text-white">{item.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                </div>
                <span className="font-semibold text-saffron-500">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold text-navy-600 dark:text-white">Total</span>
              <span className="text-2xl font-extrabold text-saffron-500">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div>
          <h2 className="text-xl font-semibold text-navy-600 dark:text-white mb-4">Payment</h2>

          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-6 space-y-6">
            {/* Payment method selector */}
            <div>
              <p className="text-sm font-medium text-navy-600 dark:text-gray-300 mb-3">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(methodLabels) as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, method })}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors font-medium text-sm ${
                      form.method === method
                        ? 'border-saffron-500 bg-saffron-50 dark:bg-saffron-500/10 text-saffron-600 dark:text-saffron-400'
                        : 'border-gray-200 dark:border-navy-600 text-gray-700 dark:text-gray-300 hover:border-saffron-300'
                    }`}
                  >
                    {methodIcons[method]}
                    {methodLabels[method]}
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific fields */}
            {(form.method === 'card' || form.method === 'stripe') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    name="cardName"
                    value={form.cardName}
                    onChange={handleChange}
                    required
                    placeholder="Name on card"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">Card Number</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={form.cardNumber}
                    onChange={handleChange}
                    required
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      name="cardExpiry"
                      value={form.cardExpiry}
                      onChange={handleChange}
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">CVC</label>
                    <input
                      type="text"
                      name="cardCvc"
                      value={form.cardCvc}
                      onChange={handleChange}
                      required
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {form.method === 'mpesa' && (
              <div>
                <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  name="mpesaPhone"
                  value={form.mpesaPhone}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 2547XXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You will receive an STK push to confirm payment.
                </p>
              </div>
            )}

            {form.method === 'paypal' && (
              <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                <p>You will be redirected to PayPal to complete your payment.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                `Pay $${totalPrice.toFixed(2)}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
