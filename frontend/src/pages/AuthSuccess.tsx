import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

const AuthSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the token from the backend (it's stored in an HTTP-only cookie)
        const response = await api.get('/auth/token', {
          withCredentials: true // Important: include cookies in the request
        });

        const { token } = response.data;

        if (token) {
          // Decode the token to get user info (simple base64 decode of JWT payload)
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          const user = {
            _id: payload.userId,
            email: payload.email,
            role: payload.role
          };

          // Store token and user in localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // Set the token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Clear the cookie by calling logout endpoint
          await api.get('/auth/logout', { withCredentials: true });

          // Redirect to products page
          navigate('/products');
        } else {
          setError('No authentication token received');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.response?.data?.message || 'Authentication failed');
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

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
