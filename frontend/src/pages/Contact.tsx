import React, { useState } from 'react';

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    // In a real app, this would call an API endpoint
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-white dark:bg-navy-800 rounded-xl shadow-lg p-10">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-navy-600 dark:text-white mb-3">Message Sent!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Thank you for reaching out. We'll get back to you within 24 hours.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
            className="mt-6 px-6 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-medium transition-colors"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy-600 text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-gray-200 text-lg max-w-xl mx-auto">
            Have a question or need help? We're here for you.
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50 dark:bg-navy-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-navy-600 dark:text-white mb-6">Get In Touch</h2>
              <div className="space-y-6">
                {[
                  {
                    icon: (
                      <svg className="w-6 h-6 text-saffron-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ),
                    label: 'Email',
                    value: 'support@restshop.com',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6 text-saffron-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    ),
                    label: 'Phone',
                    value: '+1 (800) REST-SHOP',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6 text-saffron-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ),
                    label: 'Address',
                    value: '123 Shop Street, Commerce City, 00100',
                  },
                ].map((info) => (
                  <div key={info.label} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-saffron-500/10 rounded-lg flex items-center justify-center">
                      {info.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{info.label}</p>
                      <p className="text-navy-600 dark:text-white font-medium">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <h3 className="text-lg font-semibold text-navy-600 dark:text-white mb-3">Business Hours</h3>
                <div className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                  <p>Monday – Friday: 9 AM – 6 PM</p>
                  <p>Saturday: 10 AM – 4 PM</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-600 dark:text-white mb-6">Send a Message</h2>

              {error && (
                <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                  >
                    <option value="">Select a subject</option>
                    <option value="order">Order Enquiry</option>
                    <option value="payment">Payment Issue</option>
                    <option value="product">Product Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="How can we help you?"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
