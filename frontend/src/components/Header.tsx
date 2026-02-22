import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/products', label: 'Products' },
  { to: '/contact', label: 'Contact' },
];

const Header: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLinkClass = (path: string) =>
    `transition-colors font-medium ${
      isActive(path)
        ? 'text-saffron-500'
        : 'text-gray-700 dark:text-gray-300 hover:text-saffron-500 dark:hover:text-saffron-400'
    }`;

  return (
    <header className="bg-white dark:bg-navy-900 shadow-md transition-colors duration-300 relative z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" onClick={() => setMenuOpen(false)}>
            <div className="w-10 h-10 bg-saffron-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">RS</span>
            </div>
            <span className="text-2xl font-bold text-navy-600 dark:text-white">Rest Shop</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={navLinkClass(l.to)}>
                {l.label}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/orders" className={navLinkClass('/orders')}>My Orders</Link>
                <Link to="/payments/history" className={navLinkClass('/payments/history')}>Payments</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className={`${navLinkClass('/admin')} font-semibold`}>Admin</Link>
                )}
              </>
            )}
          </nav>

          {/* Right side: theme toggle + cart + auth (desktop) + hamburger (mobile) */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-saffron-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-navy-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Cart button */}
            <button
              onClick={() => { setMenuOpen(false); navigate('/checkout'); }}
              className="relative p-2 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 transition-colors"
              aria-label="Cart"
            >
              <svg className="w-5 h-5 text-navy-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-saffron-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Desktop auth buttons */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-2 text-navy-600 dark:text-white hover:text-saffron-500 dark:hover:text-saffron-400 transition-colors font-medium">
                    Login
                  </Link>
                  <Link to="/signup" className="px-4 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg transition-colors font-medium">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger button — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg className="w-5 h-5 text-navy-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-navy-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — only renders on small screens */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-4 py-4 space-y-3">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 ${navLinkClass(l.to)}`}
            >
              {l.label}
            </Link>
          ))}

          {user && (
            <>
              <Link to="/orders" onClick={() => setMenuOpen(false)} className={`block py-2 ${navLinkClass('/orders')}`}>
                My Orders
              </Link>
              <Link to="/payments/history" onClick={() => setMenuOpen(false)} className={`block py-2 ${navLinkClass('/payments/history')}`}>
                Payment History
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className={`block py-2 font-semibold ${navLinkClass('/admin')}`}>
                  Admin
                </Link>
              )}
            </>
          )}

          <div className="pt-3 border-t border-gray-200 dark:border-navy-700">
            {user ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center py-2 border border-saffron-500 text-saffron-500 hover:bg-saffron-50 dark:hover:bg-saffron-500/10 rounded-lg font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
