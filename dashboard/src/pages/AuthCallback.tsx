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
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        return;
      }

      const token = searchParams.get('token');

      if (token) {
        localStorage.setItem('token', token);
        await refreshUser();
        navigate('/dashboard');
        return;
      }

      setError('Authentication failed - no token received');
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-n2f-bg">
        <div className="max-w-md w-full p-6">
          <div className="flex items-center p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
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
    <div className="min-h-screen flex items-center justify-center bg-n2f-bg">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent mx-auto" />
        <p className="mt-4 text-n2f-text-secondary">Completing authentication...</p>
      </div>
    </div>
  );
}
