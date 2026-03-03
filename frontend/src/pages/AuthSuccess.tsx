import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

const AuthSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Read the single-use exchange code passed as a query parameter.
        // The real JWT is never placed in the URL — the code is exchanged for
        // the JWT via a POST request, keeping the JWT out of browser history,
        // server logs, and Referer headers.
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        // Remove the code from the URL immediately to limit its exposure.
        window.history.replaceState({}, document.title, window.location.pathname);

        if (code) {
          try {
            // Exchange the short-lived code for the real JWT via a secure POST request.
            const response = await api.post('/auth/exchange', { code });
            const { token } = response.data;

            // Safely decode the token to get user info
            const payload = JSON.parse(atob(token.split('.')[1]));

            const user = {
              _id: payload.userId,
              email: payload.email,
              role: payload.role
            };

            // Update AuthContext state, localStorage, and axios headers
            loginWithToken(token, user);

            // Redirect to products page
            navigate('/products');
          } catch (exchangeError) {
            console.error('Failed to exchange code for token:', exchangeError);
            setError('Authentication failed. Please try again.');
          }
        } else {
          setError('No authentication code received');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');

        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate, loginWithToken]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-6 text-center">
              Authentication Failed
            </h1>
            <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-navy-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-6 text-center">
            Signing In...
          </h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-500"></div>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
            Please wait while we complete your authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccess;
