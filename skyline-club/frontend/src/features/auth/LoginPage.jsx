import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both email/username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Login failed. Please check credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] py-8 px-4">
      <Card className="max-w-md w-full border-slate-700/80">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-brand-600/30 mb-3">
            S
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your Skyline Club member account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger-950/80 border border-danger-700 text-danger-200 text-sm">
                {error}
              </div>
            )}
            <Input
              label="Username or Email"
              type="text"
              placeholder="student@skyline.edu"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="ml-1 text-brand-400 font-semibold hover:underline">
            Register here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
