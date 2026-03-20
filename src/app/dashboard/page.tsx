'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  MessageCircle,
  PlusCircle,
  Package,
  Mail,
  CreditCard,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    lowStock: 0,
    totalRevenue: 0,
    unreadMessages: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'customer') {
      router.push('/customer');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        // Get orders
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = ordersSnapshot.docs.map(doc => doc.data());
        
        // Get inventory
        const inventoryQuery = query(collection(db, 'inventory'));
        const inventorySnapshot = await getDocs(inventoryQuery);
        const lowStockItems = inventorySnapshot.docs.filter(doc => doc.data().status === 'Low');
        
        // Get messages
        const messagesQuery = query(collection(db, 'messages'), where('status', '==', 'Unreplied'));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        // Get payments
        const paymentsQuery = query(collection(db, 'payments'));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const totalRevenue = paymentsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'Pending').length,
          completedOrders: orders.filter(o => o.status === 'Done').length,
          lowStock: lowStockItems.length,
          totalRevenue,
          unreadMessages: messagesSnapshot.size
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading || statsLoading) return <LoadingSpinner />;

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-blue-600',
      textColor: 'text-black',
      bgLight: 'bg-blue-50'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-yellow-600',
      textColor: 'text-black',
      bgLight: 'bg-yellow-50'
    },
    {
      title: 'Completed',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'bg-green-600',
      textColor: 'text-black',
      bgLight: 'bg-green-50'
    },
    {
      title: 'Low Stock',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'bg-red-600',
      textColor: 'text-black',
      bgLight: 'bg-red-50'
    },
    {
      title: 'Revenue',
      value: `KES ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-600',
      textColor: 'text-black',
      bgLight: 'bg-purple-50'
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: MessageCircle,
      color: 'bg-orange-600',
      textColor: 'text-black',
      bgLight: 'bg-orange-50'
    }
  ];

  const quickActions = [
    {
      title: 'New Order',
      href: '/dashboard/orders',
      icon: PlusCircle,
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700'
    },
    {
      title: 'Add Stock',
      href: '/dashboard/inventory',
      icon: Package,
      color: 'bg-green-600',
      hoverColor: 'hover:bg-green-700'
    },
    {
      title: 'View Messages',
      href: '/dashboard/messages',
      icon: Mail,
      color: 'bg-purple-600',
      hoverColor: 'hover:bg-purple-700'
    },
    {
      title: 'Payments',
      href: '/dashboard/payments',
      icon: CreditCard,
      color: 'bg-orange-600',
      hoverColor: 'hover:bg-orange-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Welcome back, {user?.name}! 👋</h1>
          <p className="text-black mt-1">Here's what's happening with your store today</p>
        </div>

        {/* Stats Grid - Smaller cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`${stat.bgLight} p-2 rounded-lg`}>
                  <stat.icon className="h-5 w-5 text-black" />
                </div>
                <span className="text-xs font-medium text-black uppercase tracking-wider">
                  {stat.title.split(' ')[0]}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-black">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-xs text-black mt-1">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                  <Activity className="h-5 w-5 text-black" />
                  Quick Actions
                </h2>
                <span className="text-xs text-black bg-gray-100 px-2 py-1 rounded-full">
                  {quickActions.length} available
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className={`${action.color} ${action.hoverColor} text-white rounded-lg p-4 transition-all transform hover:scale-105 text-center group`}
                  >
                    <action.icon className="h-6 w-6 mx-auto mb-2 text-white group-hover:animate-bounce" />
                    <span className="text-xs font-medium text-white block">{action.title}</span>
                  </Link>
                ))}
              </div>

              {/* Additional Stats Mini Cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-black">Average Order Value</p>
                  <p className="text-sm font-bold text-black">
                    KES {stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString() : 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-black">Completion Rate</p>
                  <p className="text-sm font-bold text-black">
                    {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity - 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
              <h2 className="text-lg font-semibold text-black flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-black" />
                Recent Activity
              </h2>
              
              {stats.totalOrders > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black">New orders today</span>
                    <span className="font-semibold text-black">0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black">Messages to reply</span>
                    <span className="font-semibold text-black">{stats.unreadMessages}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black">Low stock items</span>
                    <span className="font-semibold text-black">{stats.lowStock}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black">Pending payments</span>
                    <span className="font-semibold text-black">
                      {stats.pendingOrders}
                    </span>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-gray-200">
                    <Link 
                      href="/dashboard/orders" 
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-between group"
                    >
                      View all orders
                      <span className="group-hover:translate-x-1 transition-transform text-black">→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="h-10 w-10 text-black mx-auto mb-2" />
                  <p className="text-sm text-black">No recent activity</p>
                  <p className="text-xs text-black mt-1">Start by creating your first order</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Overview - Optional bottom section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Order Status Breakdown
            </h3>
              <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    data-width={stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0}
                  ></div>
                </div>
                <span className="text-xs text-black min-w-[60px]">
                  {stats.completedOrders} Done
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    data-width={stats.totalOrders > 0 ? (stats.pendingOrders / stats.totalOrders) * 100 : 0}
                  ></div>
                </div>
                <span className="text-xs text-black min-w-[60px]">
                  {stats.pendingOrders} Pending
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Inventory Status
            </h3>
              <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    data-width={stats.lowStock > 0 ? 100 : 0}
                  ></div>
                </div>
                <span className="text-xs text-black min-w-[60px]">
                  {stats.lowStock} Low Stock
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}