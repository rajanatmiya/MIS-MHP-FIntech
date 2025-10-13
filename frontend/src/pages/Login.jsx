import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, BarChart3 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      login(response.data.access_token, response.data.user);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6 p-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_loan-agent-hub/artifacts/i7e9c2jc_IMG_9156.jpeg" 
                alt="MHP Fintech Logo" 
                className="h-24 w-auto object-contain"
              />
            </div>
            <p className="text-lg text-slate-600 leading-relaxed">
              MIS Dashboard - Mhp fintech services Pvt ltd
            </p>
            <p className="text-sm text-slate-500 italic">Your Growth is our Vision</p>
          </div>
          
          <div className="space-y-4 pt-8">
            <div className="flex items-start space-x-3">
              <div className="mt-1 bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Track Performance</h3>
                <p className="text-sm text-slate-600">Monitor loan applications and agent performance in real-time</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 bg-cyan-100 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Analytics Dashboard</h3>
                <p className="text-sm text-slate-600">Get insights with bank-wise, agent-wise, and monthly reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-slate-200">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Welcome Back
            </h2>
            <p className="text-slate-600">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have access? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;