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
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-5 p-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <img 
                src={process.env.REACT_APP_LOGO_URL} 
                alt="MHP Fintech Logo" 
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              MIS Dashboard - Mhp fintech services Pvt ltd
            </p>
            <p className="text-xs text-slate-500 italic">Your Growth is our Vision</p>
          </div>
          
          <div className="space-y-3 pt-4">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 bg-blue-100 p-1.5 rounded-lg">
                <TrendingUp className="w-4 h-4 text-[#1e40af]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm mb-0.5">Track Performance</h3>
                <p className="text-xs text-slate-500">Monitor loan applications and agent performance in real-time</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 bg-cyan-100 p-1.5 rounded-lg">
                <BarChart3 className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm mb-0.5">Analytics Dashboard</h3>
                <p className="text-xs text-slate-500">Get insights with bank-wise, agent-wise, and monthly reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-600 font-medium text-xs">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-xs"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-600 font-medium text-xs">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-9 text-xs"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 bg-[#1e40af] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded-lg transition-all duration-200"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              Don't have access? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;