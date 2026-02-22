import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface Product {
  _id: string;
  name: string;
  price: number;
  productImage?: string;
  stock?: number;
  description?: string;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState(false);
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data.products || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      setAuthPrompt(true);
      return;
    }
    addItem({
      _id: product._id,
      name: product.name,
      price: product.price,
      productImage: product.productImage,
    });
    setNotification(`${product.name} added to cart!`);
    setTimeout(() => setNotification(null), 3000);
  };

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
      <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-8">Our Products</h1>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {notification}
        </div>
      )}

      {/* Auth Prompt Modal */}
      {authPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
            <svg className="w-14 h-14 text-saffron-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="text-xl font-bold text-navy-600 dark:text-white mb-2">Sign in to shop</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to be logged in to add items to your cart and place orders.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setAuthPrompt(false); navigate('/login'); }}
                className="py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-semibold transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthPrompt(false); navigate('/signup'); }}
                className="py-3 border-2 border-saffron-500 text-saffron-500 hover:bg-saffron-50 dark:hover:bg-saffron-500/10 rounded-lg font-semibold transition-colors"
              >
                Create Account
              </button>
              <button
                onClick={() => setAuthPrompt(false)}
                className="py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No products available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
            >
              {/* Product Image */}
              <div className="h-48 bg-gray-200 dark:bg-navy-700 flex items-center justify-center overflow-hidden">
                {product.productImage ? (
                  <img src={product.productImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Product Details */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-lg font-semibold text-navy-600 dark:text-white mb-1">{product.name}</h3>

                {product.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 flex-1">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto mb-3">
                  <span className="text-2xl font-bold text-saffron-500">${product.price.toFixed(2)}</span>
                  {product.stock !== undefined && (
                    <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock === 0}
                  className="w-full py-2 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-300 dark:disabled:bg-navy-600 disabled:cursor-not-allowed text-white disabled:text-gray-500 dark:disabled:text-gray-400 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  {product.stock === 0 ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {user ? 'Add to Cart' : 'Sign in to Buy'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
