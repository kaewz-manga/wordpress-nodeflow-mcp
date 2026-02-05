import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error from OAuth provider
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        return;
      }

      // Backend redirects here with token in URL params
      const token = searchParams.get('token');

      if (token) {
        // Save token and refresh user
        localStorage.setItem('token', token);
        await refreshUser();
        navigate('/dashboard');
        return;
      }

      // If no token, something went wrong
      setError('Authentication failed - no token received');
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Authentication Failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full btn btn-primary"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
