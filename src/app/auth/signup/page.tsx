'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { UserRole } from '@/types';
import { EyeIcon, EyeSlashIcon, UserIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password, name, role);
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br px-4 py-8" 
      style={{ 
        background: `linear-gradient(135deg, ${'#061E29'} 0%, ${'#1D546D'} 50%, ${'#5F9598'} 100%)` 
      }}
    >
      <div className="backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-96 border" 
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#F3F4F4'
        }}
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full mb-4" style={{ backgroundColor: '#061E29' }}>
            <svg className="h-8 w-8" style={{ color: '#F3F4F4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: '#061E29' }}>
            Create Account
          </h1>
          <p className="font-medium" style={{ color: '#1D546D' }}>
            Join our platform today
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Field */}
          <div>
            <label className="block font-bold mb-2 text-base flex items-center gap-2" style={{ color: '#061E29' }}>
              <UserIcon className="h-4 w-4" style={{ color: '#5F9598' }} />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 border-2 rounded-xl focus:outline-none focus:ring-2 transition font-medium text-base"
              style={{ 
                borderColor: '#F3F4F4',
                backgroundColor: '#F3F4F4',
                color: '#061E29'
              }}
              placeholder="John Doe"
              required
            />
          </div>
          
          {/* Email Field */}
          <div>
            <label className="block font-bold mb-2 text-base flex items-center gap-2" style={{ color: '#061E29' }}>
              <EnvelopeIcon className="h-4 w-4" style={{ color: '#5F9598' }} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 rounded-xl focus:outline-none focus:ring-2 transition font-medium text-base"
              style={{ 
                borderColor: '#F3F4F4',
                backgroundColor: '#F3F4F4',
                color: '#061E29'
              }}
              placeholder="your@email.com"
              required
            />
          </div>
          
          {/* Password Field */}
          <div>
            <label className="block font-bold mb-2 text-base flex items-center gap-2" style={{ color: '#061E29' }}>
              <LockClosedIcon className="h-4 w-4" style={{ color: '#5F9598' }} />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-2 rounded-xl focus:outline-none focus:ring-2 transition font-medium text-base pr-12"
                style={{ 
                  borderColor: '#F3F4F4',
                  backgroundColor: '#F3F4F4',
                  color: '#061E29'
                }}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition"
                style={{ color: '#1D546D' }}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-6 w-6" />
                ) : (
                  <EyeIcon className="h-6 w-6" />
                )}
              </button>
            </div>
            <p className="text-sm mt-2 font-medium" style={{ color: '#1D546D' }}>
              Minimum 6 characters
            </p>
          </div>
          
          {/* Role Selection */}
          <div>
            <label className="block font-bold mb-3 text-base" style={{ color: '#061E29' }}>
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-xl" style={{ backgroundColor: '#F3F4F4' }}>
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-3 px-4 rounded-lg font-bold text-base transition-all duration-200 ${
                  role === 'customer' 
                    ? 'shadow-md transform scale-105' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: role === 'customer' ? '#061E29' : 'transparent',
                  color: role === 'customer' ? '#F3F4F4' : '#1D546D'
                }}
              >
                🛍️ Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`py-3 px-4 rounded-lg font-bold text-base transition-all duration-200 ${
                  role === 'seller' 
                    ? 'shadow-md transform scale-105' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: role === 'seller' ? '#061E29' : 'transparent',
                  color: role === 'seller' ? '#F3F4F4' : '#1D546D'
                }}
              >
                🏪 Seller
              </button>
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-6"
            style={{ backgroundColor: '#061E29' }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Sign Up'}
          </button>
        </form>
        
        {/* Sign In Link */}
        <p className="text-center mt-8 font-medium" style={{ color: '#1D546D' }}>
          Already have an account?{' '}
          <Link 
            href="/auth/login" 
            className="font-bold hover:underline transition"
            style={{ color: '#5F9598' }}
          >
            Sign in
          </Link>
        </p>

        
      </div>
    </div>
  );
}