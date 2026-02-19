import React from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface OAuthButtonsProps {
  mode?: 'login' | 'signup';
}

const OAuthButtons: React.FC<OAuthButtonsProps> = ({ mode = 'login' }) => {
  const handleOAuthLogin = (provider: 'google' | 'microsoft') => {
    // Redirect to the OAuth provider's authentication endpoint
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-navy-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-navy-800 text-gray-500 dark:text-gray-400">
            Or {mode === 'login' ? 'login' : 'sign up'} with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-navy-600 rounded-lg shadow-sm bg-white dark:bg-navy-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Microsoft OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthLogin('microsoft')}
          className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-navy-600 rounded-lg shadow-sm bg-white dark:bg-navy-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
            <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
          Continue with Microsoft
        </button>
      </div>
    </div>
  );
};

export default OAuthButtons;
