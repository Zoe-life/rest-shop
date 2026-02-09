import React, { useEffect, useState } from 'react';
import { api } from '../../api/axios';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  recentOrders: Array<{
    _id: string;
    user: { email: string };
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        api.get('/products'),
        api.get('/orders'),
        api.get('/user/all'),
      ]);

      const orders = ordersRes.data.orders || [];
      setStats({
        totalProducts: productsRes.data.products?.length || 0,
        totalOrders: orders.length,
        totalUsers: usersRes.data.users?.length || 0,
        recentOrders: orders.slice(0, 5),
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      color: 'bg-blue-500',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'bg-green-500',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-navy-600 dark:text-white mb-2">
          Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of your store statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-navy-600 dark:text-white">
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={card.icon}
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-700">
          <h3 className="text-xl font-bold text-navy-600 dark:text-white">
            Recent Orders
          </h3>
        </div>
        <div className="p-6">
          {stats.recentOrders.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No orders yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-navy-700">
                    <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Order ID
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Customer
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Status
                    </th>
                    <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-gray-100 dark:border-navy-700"
                    >
                      <td className="py-3 text-sm text-navy-600 dark:text-gray-300">
                        {order._id.slice(-8)}
                      </td>
                      <td className="py-3 text-sm text-navy-600 dark:text-gray-300">
                        {order.user?.email || 'N/A'}
                      </td>
                      <td className="py-3 text-sm font-semibold text-navy-600 dark:text-white">
                        ${order.totalAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
