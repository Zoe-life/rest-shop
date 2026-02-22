import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy-600 text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-4">About Rest Shop</h1>
          <p className="text-gray-200 text-lg max-w-2xl mx-auto">
            A modern e-commerce platform built to connect quality products with people who value them.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-white dark:bg-navy-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-navy-600 dark:text-white mb-6">Our Story</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Rest Shop was founded with a simple mission: make quality products accessible to everyone.
              We believe shopping online should be easy, secure, and enjoyable — from browsing to checkout.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              We offer a curated selection of products, backed by secure payments through Stripe, PayPal,
              M-Pesa, and card payments, ensuring you can shop in the way that suits you best.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Our team is dedicated to continuously improving the shopping experience and making sure
              every order is fulfilled with care and speed.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-50 dark:bg-navy-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-navy-600 dark:text-white mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Transparency', desc: 'Honest pricing with no hidden fees.' },
              { title: 'Security', desc: 'Your data and payments are always protected.' },
              { title: 'Quality', desc: 'Every product meets our rigorous standards.' },
              { title: 'Service', desc: 'Support that puts you first, every time.' },
            ].map((v) => (
              <div key={v.title} className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-6 text-center">
                <h3 className="text-lg font-semibold text-saffron-500 mb-2">{v.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white dark:bg-navy-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-navy-600 dark:text-white mb-4">Start Shopping Today</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of happy customers and experience the Rest Shop difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products" className="px-8 py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-semibold transition-colors">
              Browse Products
            </Link>
            <Link to="/contact" className="px-8 py-3 border-2 border-navy-600 dark:border-white text-navy-600 dark:text-white hover:bg-navy-600 hover:text-white dark:hover:bg-white dark:hover:text-navy-600 rounded-lg font-semibold transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
