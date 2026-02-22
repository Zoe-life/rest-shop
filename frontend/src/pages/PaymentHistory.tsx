import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

interface Payment {
  _id: string;
  orderId: { _id: string; status: string; totalAmount?: number } | null;
  paymentMethod: string;
  status: string;
  amount: number;
  currency: string;
  transactionId?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/payments/history')
      .then((res) => setPayments(res.data.payments || []))
      .catch((err: any) => setError(err.response?.data?.message || 'Failed to load payment history'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-8">Payment History</h1>

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No payment history yet.</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-medium transition-colors"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div key={p._id} className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                  <p className="font-semibold text-navy-600 dark:text-white capitalize mt-1">
                    {p.paymentMethod.replace('_', ' ')}
                  </p>
                  {p.transactionId && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                      Ref: {p.transactionId}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                  <span className="text-xl font-bold text-saffron-500">
                    {p.currency} {p.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
