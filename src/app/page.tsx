'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push(user.role === 'seller' ? '/dashboard' : '/customer');
      } else {
        router.push('/auth/login');
      }
    }
  }, [user, loading, router]);

  return <LoadingSpinner />;
}