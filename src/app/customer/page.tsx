'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  MessageSquare, 
  Package,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

// Define Firebase data structure
interface FirebaseOrder {
  orderId?: string;
  customerId?: string;
  customerName?: string;
  item?: string;
  price?: number;
  quantity?: number;
  amount?: number;
  payment?: string;
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
  mpesaReceipt?: string;
  createdAt?: Timestamp | string;
  [key: string]: any;
}

export default function CustomerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
    unpaidAmount: 0,
    paidAmount: 0,
    averageOrderValue: 0
  });

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setStatsLoading(true);
        console.log('Fetching dashboard data for user:', user.uid);
        
        // Fetch orders
        const ordersData = await fetchOrders();
        
        // Fetch messages
        await fetchMessages();
        
        // Calculate all stats
        calculateStats(ordersData);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load your dashboard data');
      } finally {
        setStatsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Fetch orders function
  const fetchOrders = async () => {
    try {
      const ordersQuery = query(
        collection(db, 'orders'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      console.log('Orders found:', ordersSnapshot.size);
      
      const ordersData = ordersSnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseOrder;
        
        // Parse createdAt
        let createdAt: Date;
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }

        // Create order item from Firebase structure
        const item = {
          productId: data.itemId || '',
          productName: data.item || 'Unknown Item',
          quantity: data.quantity || 1,
          price: data.price || 0,
          subtotal: (data.price || 0) * (data.quantity || 1)
        };

        // Calculate totals
        const subtotal = item.subtotal;
        const totalAmount = data.amount || subtotal;

        return {
          id: doc.id,
          orderId: data.orderId || doc.id.slice(0, 8),
          customerId: data.customerId || user?.uid,
          customerName: data.customerName || user?.name || 'Customer',
          items: [item],
          itemCount: data.quantity || 1,
          subtotal: subtotal,
          tax: 0,
          shipping: 0,
          totalAmount: totalAmount,
          status: data.status || 'Pending',
          paymentStatus: data.payment || 'Unpaid',
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          mpesaReceipt: data.mpesaReceipt,
          createdAt: createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          notes: data.notes || ''
        } as Order;
      });
      
      setOrders(ordersData);
      setRecentOrders(ordersData.slice(0, 5));
      
      return ordersData;
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Fallback to query without orderBy if index error
      if ((error as any).code === 'failed-precondition') {
        console.log('Index missing, fetching without orderBy');
        const fallbackQuery = query(
          collection(db, 'orders'), 
          where('customerId', '==', user?.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const ordersData = fallbackSnapshot.docs.map(doc => {
          const data = doc.data() as FirebaseOrder;
          
          let createdAt: Date;
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          const item = {
            productId: data.itemId || '',
            productName: data.item || 'Unknown Item',
            quantity: data.quantity || 1,
            price: data.price || 0,
            subtotal: (data.price || 0) * (data.quantity || 1)
          };

          const totalAmount = data.amount || item.subtotal;

          return {
            id: doc.id,
            orderId: data.orderId || doc.id.slice(0, 8),
            customerId: data.customerId || user?.uid,
            customerName: data.customerName || user?.name || 'Customer',
            items: [item],
            itemCount: data.quantity || 1,
            subtotal: item.subtotal,
            tax: 0,
            shipping: 0,
            totalAmount: totalAmount,
            status: data.status || 'Pending',
            paymentStatus: data.payment || 'Unpaid',
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
            mpesaReceipt: data.mpesaReceipt,
            createdAt: createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            notes: data.notes || ''
          } as Order;
        });
        
        // Sort in memory
        ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setOrders(ordersData);
        setRecentOrders(ordersData.slice(0, 5));
        
        return ordersData;
      }
      throw error;
    }
  };

  // Fetch messages function
  const fetchMessages = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'messages'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      console.log('Messages found:', messagesSnapshot.size);
      
      const messagesData = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as Message[];
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to query without orderBy
      if ((error as any).code === 'failed-precondition') {
        const fallbackQuery = query(
          collection(db, 'messages'), 
          where('customerId', '==', user?.uid)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const messagesData = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        })) as Message[];
        
        // Sort in memory
        messagesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMessages(messagesData);
      }
    }
  };

  // Calculate all statistics
  const calculateStats = (ordersData: Order[]) => {
    const totalOrders = ordersData.length;
    
    // Status counts
    const pendingOrders = ordersData.filter(o => 
      o.status.toLowerCase() === 'pending'
    ).length;
    
    const processingOrders = ordersData.filter(o => 
      o.status.toLowerCase() === 'processing'
    ).length;
    
    const completedOrders = ordersData.filter(o => 
      ['completed', 'done'].includes(o.status.toLowerCase())
    ).length;
    
    const cancelledOrders = ordersData.filter(o => 
      o.status.toLowerCase() === 'cancelled'
    ).length;
    
    // Payment amounts
    const paidAmount = ordersData
      .filter(o => o.paymentStatus.toLowerCase() === 'paid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const unpaidAmount = ordersData
      .filter(o => o.paymentStatus.toLowerCase() === 'unpaid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const totalSpent = paidAmount; // Only count paid orders in total spent
    
    // Average order value
    const averageOrderValue = totalOrders > 0 
      ? Math.round(ordersData.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / totalOrders) 
      : 0;

    setStats({
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      totalSpent,
      unpaidAmount,
      paidAmount,
      averageOrderValue
    });
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      const messageData = {
        customerId: user?.uid,
        customerName: user?.name,
        customerEmail: user?.email,
        message: newMessage,
        status: 'Unreplied',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      toast.success('Message sent successfully');
      setNewMessage('');
      
      // Refresh messages
      await fetchMessages();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  if (loading || statsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
              <ShoppingBag className="h-6 w-6" style={{ color: '#F3F4F4' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>
                Welcome back, {user?.name || 'Customer'}!
              </h1>
              <p className="text-sm mt-1" style={{ color: '#1D546D' }}>
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <p className="text-lg ml-14" style={{ color: '#1D546D' }}>
            Here's what's happening with your account
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 fade-in">
          {/* Total Orders */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Total Orders</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#061E29' }}>{stats.totalOrders}</p>
                <p className="text-xs mt-1" style={{ color: '#5F9598' }}>
                  Avg: {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                <Package className="h-6 w-6" style={{ color: '#061E29' }} />
              </div>
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Total Spent</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#061E29' }}>{formatCurrency(stats.totalSpent)}</p>
                <p className="text-xs mt-1" style={{ color: '#5F9598' }}>
                  Paid: {formatCurrency(stats.paidAmount)}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#061E29' }} />
              </div>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Pending Payment</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#EAB308' }}>{formatCurrency(stats.unpaidAmount)}</p>
                <p className="text-xs mt-1" style={{ color: '#5F9598' }}>
                  {stats.pendingOrders} orders pending
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Completed</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#5F9598' }}>{stats.completedOrders}</p>
                <p className="text-xs mt-1" style={{ color: '#5F9598' }}>
                  {stats.totalOrders > 0 
                    ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
                    : 0}% success rate
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                <CheckCircle className="h-6 w-6" style={{ color: '#5F9598' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 fade-in">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium" style={{ color: '#1D546D' }}>Pending</p>
            <p className="text-xl font-bold" style={{ color: '#EAB308' }}>{stats.pendingOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium" style={{ color: '#1D546D' }}>Processing</p>
            <p className="text-xl font-bold" style={{ color: '#3B82F6' }}>{stats.processingOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium" style={{ color: '#1D546D' }}>Completed</p>
            <p className="text-xl font-bold" style={{ color: '#5F9598' }}>{stats.completedOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium" style={{ color: '#1D546D' }}>Cancelled</p>
            <p className="text-xl font-bold" style={{ color: '#EF4444' }}>{stats.cancelledOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-xs font-medium" style={{ color: '#1D546D' }}>Unpaid</p>
            <p className="text-xl font-bold" style={{ color: '#F97316' }}>{stats.unpaidAmount > 0 ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow fade-in">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#061E29' }}>
                  <ShoppingBag className="h-4 w-4" style={{ color: '#F3F4F4' }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: '#061E29' }}>Recent Orders</h2>
              </div>
              <Link 
                href="/customer/orders" 
                className="text-sm font-medium hover:underline flex items-center gap-1"
                style={{ color: '#5F9598' }}
              >
                View All <TrendingUp className="h-4 w-4" />
              </Link>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                <ShoppingBag className="h-12 w-12 mx-auto mb-3" style={{ color: '#1D546D', opacity: 0.5 }} />
                <p className="mb-3 font-medium" style={{ color: '#1D546D' }}>No orders yet</p>
                <p className="text-sm mb-4" style={{ color: '#5F9598' }}>Start shopping to see your orders here</p>
                <Link 
                  href="/customer/new-order" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Place your first order
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const mainItem = order.items && order.items[0] ? order.items[0] : {
                    productName: 'Unknown Item',
                    quantity: 1,
                    price: order.totalAmount
                  };
                  
                  return (
                    <div 
                      key={order.id} 
                      className="border rounded-lg p-4 transition-all hover:shadow-md hover:border-[#5F9598]"
                      style={{ borderColor: '#F3F4F4' }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold" style={{ color: '#061E29' }}>Order #{order.orderId}</p>
                            {order.paymentStatus === 'Unpaid' && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
                                Action Required
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p style={{ color: '#1D546D' }}>
                              <span className="font-medium">Item:</span> {mainItem.productName}
                            </p>
                            <p style={{ color: '#1D546D' }}>
                              <span className="font-medium">Qty:</span> {mainItem.quantity}
                            </p>
                            <p style={{ color: '#1D546D' }}>
                              <span className="font-medium">Price:</span> {formatCurrency(mainItem.price || 0)}
                            </p>
                            <p style={{ color: '#1D546D' }}>
                              <span className="font-medium">Total:</span> {formatCurrency(order.totalAmount || 0)}
                            </p>
                          </div>
                          <p className="text-xs mt-2" style={{ color: '#5F9598' }}>
                            {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 mb-2"
                            style={{ 
                              backgroundColor: order.status === 'Completed'
                                ? '#5F9598' 
                                : order.status === 'Pending' 
                                  ? '#EAB308' 
                                  : '#1D546D',
                              color: '#F3F4F4'
                            }}
                          >
                            {order.status === 'Pending' && <Clock className="h-3 w-3" />}
                            {order.status === 'Completed' && <CheckCircle className="h-3 w-3" />}
                            {order.status === 'Processing' && <Truck className="h-3 w-3" />}
                            {order.status}
                          </span>
                          <p 
                            className="text-sm font-bold flex items-center justify-end gap-1"
                            style={{ color: order.paymentStatus === 'Paid' ? '#5F9598' : '#dc2626' }}
                          >
                            {order.paymentStatus === 'Paid' 
                              ? <CheckCircle className="h-3 w-3" /> 
                              : <AlertCircle className="h-3 w-3" />
                            }
                            {order.paymentStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Messages Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow fade-in">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#061E29' }}>
                <MessageSquare className="h-4 w-4" style={{ color: '#F3F4F4' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#061E29' }}>Messages</h2>
              {messages.filter(m => m.status === 'Unreplied').length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                  {messages.filter(m => m.status === 'Unreplied').length} new
                </span>
              )}
            </div>
            
            <div className="mb-6">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-4 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
                style={{ 
                  borderColor: '#F3F4F4',
                  backgroundColor: '#F3F4F4',
                  color: '#061E29'
                }}
                rows={3}
                placeholder="Type your message to the seller..."
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="mt-3 px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
              >
                <MessageSquare className="h-4 w-4" />
                Send Message
              </button>
            </div>
            
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#1D546D' }}>
              <Clock className="h-4 w-4" />
              Recent Messages
            </h3>
            
            {messages.length === 0 ? (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                <MessageSquare className="h-8 w-8 mx-auto mb-2" style={{ color: '#1D546D', opacity: 0.5 }} />
                <p style={{ color: '#1D546D' }}>No messages yet</p>
                <p className="text-xs mt-1" style={{ color: '#5F9598' }}>Send a message above to get started</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {messages.slice(0, 3).map((msg) => (
                  <div 
                    key={msg.id} 
                    className="border-b pb-3 last:border-0 hover:bg-[#F3F4F4] p-2 rounded transition-colors"
                    style={{ borderColor: '#F3F4F4' }}
                  >
                    <p className="italic text-sm" style={{ color: '#061E29' }}>"{msg.message}"</p>
                    <div className="flex items-center justify-between mt-2">
                      <span 
                        className="text-xs font-semibold px-2 py-1 rounded flex items-center gap-1"
                        style={{ 
                          backgroundColor: msg.status === 'Unreplied' ? '#EAB308' : '#5F9598',
                          color: '#F3F4F4'
                        }}
                      >
                        {msg.status === 'Unreplied' ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {msg.status}
                      </span>
                      <span className="text-xs" style={{ color: '#1D546D' }}>
                        {msg.createdAt?.toLocaleDateString?.()}
                      </span>
                    </div>
                    {msg.reply && (
                      <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                        <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#061E29' }}>
                          <MessageSquare className="h-3 w-3" />
                          Reply:
                        </p>
                        <p className="text-xs" style={{ color: '#1D546D' }}>{msg.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {messages.length > 3 && (
                  <div className="text-center pt-2">
                    <Link 
                      href="/customer/messages" 
                      className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                      style={{ color: '#5F9598' }}
                    >
                      View all {messages.length} messages
                      <TrendingUp className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 fade-in">
          <Link href="/customer/shop">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#5F9598] hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                  <ShoppingBag className="h-6 w-6" style={{ color: '#5F9598' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#061E29' }}>Browse Shop</h3>
                  <p className="text-sm" style={{ color: '#1D546D' }}>Explore products</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/customer/orders">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#5F9598] hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(29, 84, 109, 0.1)' }}>
                  <Package className="h-6 w-6" style={{ color: '#1D546D' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#061E29' }}>Track Orders</h3>
                  <p className="text-sm" style={{ color: '#1D546D' }}>View order status</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/customer/new-order">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#5F9598] hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                  <ShoppingBag className="h-6 w-6" style={{ color: '#061E29' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#061E29' }}>New Order</h3>
                  <p className="text-sm" style={{ color: '#1D546D' }}>Place order</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/customer/payments">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#5F9598] hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                  <CreditCard className="h-6 w-6" style={{ color: '#5F9598' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#061E29' }}>Payments</h3>
                  <p className="text-sm" style={{ color: '#1D546D' }}>Manage payments</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Summary Footer */}
        {orders.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 border fade-in" style={{ borderColor: '#F3F4F4' }}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm">
              <span style={{ color: '#1D546D' }}>
                <span className="font-medium">{orders.length}</span> total orders • 
                <span className="font-medium ml-1">{stats.completedOrders}</span> completed •
                <span className="font-medium ml-1">{stats.pendingOrders}</span> pending
              </span>
              <span className="font-bold" style={{ color: '#061E29' }}>
                Lifetime value: {formatCurrency(stats.totalSpent)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F4;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1D546D;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5F9598;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}