'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user || pathname === '/auth/login' || pathname === '/auth/signup') return null;

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <nav className="shadow-lg" style={{ backgroundColor: '#061E29' }}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo/Brand */}
          <Link 
            href={user.role === 'seller' ? '/dashboard' : '/customer'} 
            className="text-xl font-bold"
            style={{ color: '#F3F4F4' }}
          >
            OMS Dashboard
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {user.role === 'seller' ? (
              <>
                <Link href="/dashboard" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  Dashboard
                </Link>
                <Link href="/dashboard/orders" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  Orders
                </Link>
                <Link href="/dashboard/inventory" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  Inventory
                </Link>
                <Link href="/dashboard/messages" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  Messages
                </Link>
                <Link href="/dashboard/payments" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  Payments
                </Link>
              </>
            ) : (
              <>
                <Link href="/customer" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  Dashboard
                </Link>
                <Link href="/customer/orders" className="transition-colors duration-200 hover:text-[#5F9598]" style={{ color: '#F3F4F4' }}>
                  My Orders
                </Link>
              </>
            )}
            
            {/* User Info & Logout */}
            <div className="flex items-center gap-4 ml-4 pl-4 border-l" style={{ borderColor: '#1D546D' }}>
              <span className="text-sm" style={{ color: '#F3F4F4' }}>
                {user.name} 
                <span className="ml-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#1D546D', color: '#F3F4F4' }}>
                  {user.role}
                </span>
              </span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}