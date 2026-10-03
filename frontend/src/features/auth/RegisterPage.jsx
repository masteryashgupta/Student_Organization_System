import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
    role: 'public',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid email is required';
    if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.password_confirm) errs.password_confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        ...formData,
        username: formData.email,
      });
      toast.success('Account created successfully!');
      // Auto login after register
      try {
        await login(formData.email, formData.password);
        navigate('/');
      } catch {
        navigate('/login');
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.details && typeof respData.details === 'object') {
        const fieldErrors = {};
        Object.entries(respData.details).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(fieldErrors);
        const firstErrorMsg = Object.values(fieldErrors)[0];
        toast.error(firstErrorMsg || respData?.message || 'Registration failed.');
      } else {
        const msg = respData?.message || respData?.detail || (!err.response ? 'Cannot connect to backend server. Please start Django on http://localhost:8000.' : 'Registration failed. Please try again.');
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-8 px-4">
      <Card className="max-w-lg w-full bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-2 sm:p-4">
        <CardHeader className="text-center pb-4 border-none">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-md mb-3">
            S
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white">Join Skyline Club</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
            Create your account to join events, purchase merch, and access member dues
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="student@skyline.edu"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="(555) 000-1234"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
            />
            <Select
              label="Initial Account Role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={[
                { value: 'public', label: 'Public Student / Guest' },
                { value: 'member', label: 'Student Member (Pending Dues)' },
                { value: 'volunteer', label: 'Volunteer' },
                { value: 'leader', label: 'Club Leader' },
              ]}
              helperText="You can activate full membership benefits after completing dues payment."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              <Input
                label="Confirm Password"
                name="password_confirm"
                type="password"
                placeholder="••••••••"
                value={formData.password_confirm}
                onChange={handleChange}
                error={errors.password_confirm}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3 bg-sky-600 hover:bg-sky-700 text-white font-bold"
              isLoading={loading}
            >
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-slate-500 dark:text-slate-400 border-none pt-2">
          Already have an account?{' '}
          <Link to="/login" className="ml-1 text-sky-600 dark:text-sky-400 font-semibold hover:underline">
            Sign in here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
