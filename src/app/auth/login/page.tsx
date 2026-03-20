'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'seller') {
        router.push('/dashboard');
      } else {
        router.push('/customer');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userCredential = await signIn(email, password);
      
      // Get user role and redirect
      if (userCredential?.user) {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const userData = userDoc.data();
        
        if (userData?.role === 'seller') {
          router.push('/dashboard');
        } else {
          router.push('/customer');
        }
      }
    } catch (error) {
      // Error is handled in auth context
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br px-4" 
      style={{ 
        background: `linear-gradient(135deg, #061E29 0%, #1D546D 50%, #5F9598 100%)` 
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: '#061E29' }}>
            Welcome Back
          </h1>
          <p className="font-medium" style={{ color: '#1D546D' }}>
            Sign in to continue your journey
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block font-bold mb-2 text-base" style={{ color: '#061E29' }}>
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
              disabled={loading}
            />
          </div>
          
          {/* Password Field */}
          <div>
            <label className="block font-bold mb-2 text-base" style={{ color: '#061E29' }}>
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
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition"
                style={{ color: '#1D546D' }}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-6 w-6" />
                ) : (
                  <EyeIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <Link 
              href="#" 
              className="text-sm font-medium hover:underline transition"
              style={{ color: '#5F9598' }}
            >
              Forgot password?
            </Link>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            style={{ backgroundColor: '#061E29' }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
        
        {/* Sign Up Link */}
        <p className="text-center mt-8 font-medium" style={{ color: '#1D546D' }}>
          Don't have an account?{' '}
          <Link 
            href="/auth/signup" 
            className="font-bold hover:underline transition"
            style={{ color: '#5F9598' }}
          >
            Create one
          </Link>
        </p>


      </div>
    </div>
  );
}