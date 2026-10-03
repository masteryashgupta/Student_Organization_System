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
      if (respData?.details) {
        setErrors(respData.details);
      } else {
        const msg = respData?.message || 'Registration failed. Please try again.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-8 px-4">
      <Card className="max-w-lg w-full bg-white border-border shadow-odoo-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand flex items-center justify-center font-bold text-white text-xl shadow-sm mb-3">
            S
          </div>
          <CardTitle className="text-2xl text-ink">Join Skyline Club</CardTitle>
          <CardDescription className="text-ink-muted">
            Create your account to join events, purchase merch, and access member dues
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              className="w-full mt-3"
              isLoading={loading}
            >
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="ml-1 text-accent font-semibold hover:underline">
            Sign in here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
