import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Read the JWT token passed as a query parameter by the backend redirect.
        // This avoids cross-domain cookie issues: the backend may be on a different
        // origin (Render) from the Cloudflare Worker proxy the frontend talks to.
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        // Remove the token from the URL immediately to avoid it lingering in
        // browser history or being leaked via the Referer header.
        window.history.replaceState({}, document.title, window.location.pathname);

        if (token) {
          // Safely decode the token to get user info
          try {
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
          } catch (decodeError) {
            console.error('Failed to decode token:', decodeError);
            setError('Invalid token format received');
          }
        } else {
          setError('No authentication token received');
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
