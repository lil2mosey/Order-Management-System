'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { ShoppingBag, Clock, CheckCircle, XCircle, Search, Calendar, Package, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

// Define interfaces based on your Firebase structure
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

interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  itemCount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionId?: string;
  mpesaReceipt?: string;
  createdAt: Date;
}

export default function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setLoadingOrders(true);
        console.log('Fetching orders for user:', user.uid);
        
        // Query orders where customerId matches the logged-in user
        const ordersQuery = query(
          collection(db, 'orders'), 
          where('customerId', '==', user.uid),
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

          // Create order item from your Firebase structure
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
            customerId: data.customerId || user.uid,
            customerName: data.customerName || user.name || 'Customer',
            items: [item],
            itemCount: data.quantity || 1,
            totalAmount: totalAmount,
            status: data.status || 'Pending',
            paymentStatus: data.payment || 'Unpaid',
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
            mpesaReceipt: data.mpesaReceipt,
            createdAt: createdAt
          } as Order;
        });
        
        setOrders(ordersData);
        setFilteredOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load your orders');
      } finally {
        setLoadingOrders(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => 
          item.productName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.paymentStatus.toLowerCase() === paymentFilter.toLowerCase()
      );
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, paymentFilter, orders]);

  // Helper function to format date
  const formatDate = (date: Date) => {
    if (!date) return 'Date not available';
    
    try {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentColor = (payment: string) => {
    const paymentLower = payment.toLowerCase();
    return paymentLower === 'paid' ? 'text-green-600' : 'text-red-600';
  };

  const getPaymentIcon = (payment: string) => {
    const paymentLower = payment.toLowerCase();
    return paymentLower === 'paid' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'completed':
      case 'done':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (loading || loadingOrders) {
    return <LoadingSpinner />;
  }

  // Calculate stats
  const totalSpent = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const pendingCount = filteredOrders.filter(o => 
    o.status.toLowerCase() === 'pending'
  ).length;
  const completedCount = filteredOrders.filter(o => 
    ['completed', 'done'].includes(o.status.toLowerCase())
  ).length;

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
                  <ShoppingBag className="h-6 w-6" style={{ color: '#F3F4F4' }} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: '#061E29' }}>My Orders</h1>
              </div>
              <p className="text-lg ml-14" style={{ color: '#1D546D' }}>View and track all your orders</p>
            </div>
            <Link 
              href="/customer/new-order" 
              className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all duration-200 hover:opacity-90 hover:scale-105 w-full sm:w-auto justify-center"
              style={{ backgroundColor: '#061E29', color: '#F3F4F4' }}
            >
              <ShoppingBag className="h-5 w-5" />
              New Order
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Total Orders</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: '#061E29' }}>{filteredOrders.length}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                <Package className="h-6 w-6" style={{ color: '#061E29' }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Pending</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: '#EAB308' }}>{pendingCount}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Completed</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: '#5F9598' }}>{completedCount}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                <CheckCircle className="h-6 w-6" style={{ color: '#5F9598' }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Total Spent</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: '#061E29' }}>KES {totalSpent.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#061E29' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>Search Orders</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: '#5F9598' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Order ID or Item..."
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: '#F3F4F4',
                    color: '#061E29',
                    backgroundColor: '#F3F4F4'
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: '#F3F4F4',
                  color: '#061E29',
                  backgroundColor: '#F3F4F4'
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: '#F3F4F4',
                  color: '#061E29',
                  backgroundColor: '#F3F4F4'
                }}
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || statusFilter !== 'all' || paymentFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#F3F4F4' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm" style={{ color: '#1D546D' }}>Active Filters:</span>
                {searchTerm && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ backgroundColor: '#061E29', color: '#F3F4F4' }}>
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ backgroundColor: '#1D546D', color: '#F3F4F4' }}>
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                {paymentFilter !== 'all' && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}>
                    Payment: {paymentFilter}
                    <button onClick={() => setPaymentFilter('all')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPaymentFilter('all');
                  }}
                  className="text-sm ml-2 font-medium hover:underline"
                  style={{ color: '#061E29' }}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border fade-in" style={{ borderColor: '#F3F4F4' }}>
          <div className="px-6 py-4" style={{ backgroundColor: '#061E29' }}>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F3F4F4' }}>
              <ShoppingBag className="h-5 w-5" />
              Your Orders ({filteredOrders.length})
            </h2>
          </div>
          
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                <Package className="h-16 w-16 mx-auto mb-4" style={{ color: '#1D546D', opacity: 0.5 }} />
                <p className="text-lg mb-2" style={{ color: '#061E29' }}>No orders found</p>
                <p className="mb-6" style={{ color: '#1D546D' }}>
                  {orders.length > 0 
                    ? 'No orders match your filters. Try adjusting your search criteria.'
                    : "You haven't placed any orders yet."}
                </p>
                {orders.length === 0 && (
                  <Link 
                    href="/customer/new-order" 
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90"
                    style={{ backgroundColor: '#061E29', color: '#F3F4F4' }}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Place Your First Order
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const mainItem = order.items && order.items[0] ? order.items[0] : {
                    productName: 'Unknown Item',
                    quantity: 1,
                    price: order.totalAmount
                  };
                  
                  return (
                    <div 
                      key={order.id} 
                      className="border-2 rounded-lg p-6 transition-all hover:shadow-md"
                      style={{ borderColor: '#F3F4F4' }}
                    >
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        {/* Left side - Order Info */}
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <h3 className="text-lg font-bold" style={{ color: '#061E29' }}>Order #{order.orderId}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 border w-fit ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm" style={{ color: '#1D546D' }}>Item</p>
                              <p className="font-medium" style={{ color: '#061E29' }}>{mainItem.productName}</p>
                            </div>
                            <div>
                              <p className="text-sm" style={{ color: '#1D546D' }}>Quantity</p>
                              <p className="font-medium" style={{ color: '#061E29' }}>{mainItem.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm" style={{ color: '#1D546D' }}>Unit Price</p>
                              <p className="font-medium" style={{ color: '#061E29' }}>KES {mainItem.price?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm" style={{ color: '#1D546D' }}>Total</p>
                              <p className="font-bold" style={{ color: '#5F9598' }}>KES {order.totalAmount?.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-sm" style={{ color: '#1D546D' }}>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(order.createdAt)}
                            </span>
                            {order.paymentMethod && (
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {order.paymentMethod}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side - Payment Status */}
                        <div className="lg:text-right border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto" style={{ borderColor: '#F3F4F4' }}>
                          <p className="text-sm mb-2" style={{ color: '#1D546D' }}>Payment Status</p>
                          <p className={`font-bold flex items-center lg:justify-end gap-1 text-lg ${getPaymentColor(order.paymentStatus)}`}>
                            {getPaymentIcon(order.paymentStatus)}
                            {order.paymentStatus}
                          </p>
                          {order.paymentStatus.toLowerCase() === 'unpaid' && (
                            <Link 
                              href={`/customer/payment/${order.id}`}
                              className="mt-3 w-full lg:w-auto px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 inline-block text-center"
                              style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
                            >
                              Pay Now
                            </Link>
                          )}
                          {order.mpesaReceipt && (
                            <p className="text-xs mt-2" style={{ color: '#1D546D' }}>
                              Receipt: {order.mpesaReceipt}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        {filteredOrders.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 border fade-in" style={{ borderColor: '#F3F4F4' }}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm">
              <span style={{ color: '#1D546D' }}>Showing {filteredOrders.length} of {orders.length} orders</span>
              <span className="font-bold" style={{ color: '#061E29' }}>
                Total: KES {filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
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