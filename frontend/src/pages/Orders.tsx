import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../api/axios';

interface OrderProduct {
  product: { _id: string; name: string; price: number };
  quantity: number;
  _id: string;
}

interface Order {
  _id: string;
  products: OrderProduct[];
  createdAt: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderTotal = (order: Order) => {
    if (order.totalAmount) return order.totalAmount;
    return order.products.reduce((total, item) => total + (item.product?.price || 0) * item.quantity, 0);
  };

  const handlePayNow = (order: Order) => {
    // Add all order products to cart then navigate to checkout
    order.products.forEach((item) => {
      if (item.product) {
        addItem(
          { _id: item.product._id, name: item.product.name, price: item.product.price },
          item.quantity,
        );
      }
    });
    navigate('/checkout');
  };

  const isPendingPayment = (order: Order) =>
    !order.paymentStatus || order.paymentStatus === 'pending' || order.paymentStatus === 'failed';

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
      <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">You haven't placed any orders yet.</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg transition-colors font-medium"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-gray-200 dark:border-navy-700 pb-4 gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-navy-600 dark:text-white">
                    Order #{order._id.slice(-8).toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {order.status && (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 capitalize">
                      {order.status}
                    </span>
                  )}
                  {order.paymentStatus && (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      order.paymentStatus === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {order.products.map((item) => (
                  <div key={item._id} className="flex justify-between items-center py-2">
                    <div className="flex-1">
                      <p className="text-navy-600 dark:text-white font-medium">{item.product?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-saffron-500 font-semibold">${((item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">${(item.product?.price || 0).toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-navy-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-navy-600 dark:text-white">Total:</span>
                  <span className="text-2xl font-bold text-saffron-500">${calculateOrderTotal(order).toFixed(2)}</span>
                </div>
                {isPendingPayment(order) && (
                  <button
                    onClick={() => handlePayNow(order)}
                    className="px-6 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
