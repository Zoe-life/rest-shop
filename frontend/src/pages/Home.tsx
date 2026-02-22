import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';

interface Product {
  _id: string;
  name: string;
  price: number;
  productImage?: string;
  description?: string;
}

const Home: React.FC = () => {
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    api.get('/products')
      .then((res) => setFeatured((res.data.products || []).slice(0, 3)))
      .catch(() => {/* silently ignore on landing page */});
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-navy-600 to-navy-800 text-white py-24 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            Welcome to <span className="text-saffron-400">Rest Shop</span>
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Discover quality products at unbeatable prices. Shop with confidence and enjoy fast, reliable service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="px-8 py-4 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Shop Now
            </Link>
            <Link
              to="/about"
              className="px-8 py-4 border-2 border-white hover:bg-white hover:text-navy-600 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-saffron-500/20 rounded-full blur-2xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-navy-400/20 rounded-full blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-navy-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-navy-600 dark:text-white mb-12">
            Why Shop With Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-10 h-10 text-saffron-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ),
                title: 'Quality Products',
                desc: 'Every item is carefully curated to meet the highest quality standards.',
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-saffron-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Best Prices',
                desc: 'Competitive pricing with frequent deals and discounts for our customers.',
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-saffron-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Secure Payments',
                desc: 'Multiple secure payment options including card, M-Pesa, PayPal, and Stripe.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-8 text-center">
                <div className="flex justify-center mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold text-navy-600 dark:text-white mb-3">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="py-16 bg-white dark:bg-navy-800">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold text-navy-600 dark:text-white">Featured Products</h2>
              <Link to="/products" className="text-saffron-500 hover:text-saffron-600 font-medium flex items-center gap-1">
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p) => (
                <div key={p._id} className="bg-gray-50 dark:bg-navy-700 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="h-48 bg-gray-200 dark:bg-navy-600 flex items-center justify-center overflow-hidden">
                    {p.productImage ? (
                      <img src={p.productImage} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-navy-600 dark:text-white mb-1">{p.name}</h3>
                    {p.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-saffron-500">${p.price.toFixed(2)}</span>
                      <Link
                        to="/products"
                        className="px-4 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-saffron-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Shopping?</h2>
          <p className="text-white/90 mb-8 text-lg">
            Create an account today and enjoy a seamless shopping experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-saffron-600 hover:bg-gray-100 rounded-lg font-semibold text-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 border-2 border-white text-white hover:bg-white/10 rounded-lg font-semibold text-lg transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
