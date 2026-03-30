'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MpesaPaymentModal from './components/mpesapaymentmodal';
import { 
  CreditCard, 
  Download, 
  Printer, 
  Search,
  Calendar,
  User,
  Hash,
  DollarSign,
  TrendingUp,
  Filter,
  X,
  Clock,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Package,
  ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

// Define the Order interface based on your actual data structure
export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  item: string;
  itemId?: string;
  quantity: number;
  amount: number;
  price?: number;
  payment: 'Paid' | 'Unpaid';
  status: string;
  createdAt: any;
  mpesaReceipt?: string;
  phoneNumber?: string;
}

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  
  // M-Pesa modal state
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  
  const { processPaymentAndDeductStock } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment === paymentFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(order => {
        const orderDate = formatDateObject(order.createdAt);
        if (!orderDate) return false;

        switch(dateFilter) {
          case 'today':
            return orderDate >= today;
          case 'week':
            return orderDate >= thisWeek;
          case 'month':
            return orderDate >= thisMonth;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof Order];
      let bValue: any = b[sortField as keyof Order];

      if (sortField === 'createdAt') {
        aValue = formatDateObject(a.createdAt)?.getTime() || 0;
        bValue = formatDateObject(b.createdAt)?.getTime() || 0;
      }

      if (sortField === 'amount') {
        aValue = a.amount || 0;
        bValue = b.amount || 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
    
    // Recalculate totals
    const paidTotal = filtered
      .filter(o => o.payment === 'Paid')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    setTotalRevenue(paidTotal);
    
    const unpaidTotal = filtered
      .filter(o => o.payment === 'Unpaid')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    setPendingRevenue(unpaidTotal);
    
  }, [searchTerm, paymentFilter, dateFilter, sortField, sortDirection, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders sorted by date
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      console.log('Orders found:', querySnapshot.size);
      
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId || 'N/A',
          customerId: data.customerId || '',
          customerName: data.customerName || 'Unknown',
          amount: data.amount || 0,
          price: data.price || 0,
          quantity: data.quantity || 1,
          item: data.item || 'Unknown Item',
          itemId: data.items?.[0]?.productId || data.itemId || '',
          payment: data.payment || 'Unpaid',
          status: data.status || 'Pending',
          createdAt: data.createdAt || new Date(),
          mpesaReceipt: data.mpesaReceipt || '',
          phoneNumber: data.phoneNumber || ''
        } as Order;
      });
      
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      
      const paidTotal = ordersData
        .filter(o => o.payment === 'Paid')
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      setTotalRevenue(paidTotal);
      
      const unpaidTotal = ordersData
        .filter(o => o.payment === 'Unpaid')
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      setPendingRevenue(unpaidTotal);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date from Firestore timestamp
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper function to get Date object from timestamp
  const formatDateObject = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate();
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      return new Date(timestamp);
    } catch (error) {
      return null;
    }
  };

  const handleInitiateMpesaPayment = (order: Order) => {
    setSelectedOrderForPayment(order);
    setIsMpesaModalOpen(true);
  };

  const handleMpesaSuccess = async (response: any) => {
    // Refresh the orders list
    await fetchOrders();
    
    toast.success(
      <div className="flex flex-col">
        <span className="font-bold">✓ Payment Successful!</span>
        <span className="text-sm">Stock has been deducted from inventory</span>
      </div>,
      { duration: 5000 }
    );
  };

  const handleMarkAsPaid = async (order: Order) => {
    if (!order.id) {
      toast.error('Invalid order ID');
      return;
    }

    setProcessingPayment(order.id);
    
    try {
      // First, update the order payment status in Firestore
      const orderRef = doc(db, 'orders', order.id);
      
      // Prepare update data - only include defined fields
      const updateData: any = {
        payment: 'Paid',
        updatedAt: new Date(),
        paymentMethod: 'cash',
        paymentDate: new Date()
      };
      
      // Only add mpesaReceipt if it exists
      if (order.mpesaReceipt) {
        updateData.mpesaReceipt = order.mpesaReceipt;
      }
      
      // Update the order
      await updateDoc(orderRef, updateData);
      
      // Now process stock deduction if we have item information
      if (order.itemId && order.quantity > 0) {
        try {
          await processPaymentAndDeductStock(
            {
              productId: order.itemId,
              productName: order.item,
              quantity: order.quantity,
              price: order.price || order.amount / order.quantity,
              amount: order.amount
            },
            'cash'
          );
        } catch (stockError: any) {
          console.error('Error deducting stock:', stockError);
          // Don't throw - order is already marked as paid
          toast.error('Order marked as paid but stock update failed: ' + (stockError.message || 'Unknown error'));
        }
      }
      
      toast.success('Order marked as paid successfully');
      
      // Refresh the orders list to show updated status
      await fetchOrders();
      
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order payment status');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handlePrintReceipt = (order: Order) => {
    setSelectedOrder(order);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - Order #${order.orderId}</title>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                padding: 40px; 
                background: #F3F4F4;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
              }
              .receipt { 
                max-width: 400px; 
                margin: 0 auto; 
                background: white;
                border: 2px solid #061E29; 
                padding: 30px;
                box-shadow: 0 4px 12px rgba(6, 30, 41, 0.1);
              }
              h1 { 
                text-align: center; 
                color: #061E29;
                font-size: 24px;
                margin-bottom: 20px;
                border-bottom: 2px solid #1D546D;
                padding-bottom: 10px;
              }
              .details { margin: 20px 0; }
              .row { 
                display: flex; 
                justify-content: space-between; 
                margin: 10px 0;
                padding: 5px 0;
                border-bottom: 1px dashed #F3F4F4;
              }
              .row strong { color: #1D546D; }
              .footer { 
                margin-top: 30px; 
                text-align: center; 
                color: #061E29;
                font-style: italic;
                border-top: 2px solid #5F9598;
                padding-top: 15px;
              }
              .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
              }
              .status-paid {
                background: #5F9598;
                color: white;
              }
              .status-unpaid {
                background: #F3F4F4;
                color: #1D546D;
              }
              .item-details {
                background: #F3F4F4;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <h1>${order.payment === 'Paid' ? 'PAYMENT RECEIPT' : 'ORDER INVOICE'}</h1>
              
              <div class="item-details">
                <div class="row">
                  <strong>Item:</strong> 
                  <span style="color: #061E29;">${order.item}</span>
                </div>
                <div class="row">
                  <strong>Quantity:</strong> 
                  <span style="color: #061E29;">${order.quantity}</span>
                </div>
                <div class="row">
                  <strong>Unit Price:</strong> 
                  <span style="color: #061E29;">KES ${order.price?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
              
              <div class="details">
                <div class="row">
                  <strong>Order ID:</strong> 
                  <span style="color: #061E29;">${order.orderId}</span>
                </div>
                <div class="row">
                  <strong>Customer:</strong> 
                  <span style="color: #061E29;">${order.customerName}</span>
                </div>
                <div class="row">
                  <strong>Total Amount:</strong> 
                  <span style="font-size: 20px; font-weight: bold; color: #5F9598;">KES ${order.amount.toLocaleString()}</span>
                </div>
                <div class="row">
                  <strong>Payment Status:</strong> 
                  <span class="status-badge ${order.payment === 'Paid' ? 'status-paid' : 'status-unpaid'}">
                    ${order.payment}
                  </span>
                </div>
                <div class="row">
                  <strong>Order Status:</strong> 
                  <span style="color: #061E29;">${order.status}</span>
                </div>
                <div class="row">
                  <strong>Date:</strong> 
                  <span style="color: #061E29;">${formatDate(order.createdAt)}</span>
                </div>
                ${order.mpesaReceipt ? `
                <div class="row">
                  <strong>M-PESA Receipt:</strong> 
                  <span style="color: #061E29;">${order.mpesaReceipt}</span>
                </div>
                ` : ''}
              </div>
              <div class="footer">
                <p>Thank you for your business!</p>
                <p style="font-size: 12px; margin-top: 10px;">This is a computer generated receipt</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Order ID', 'Customer', 'Item', 'Quantity', 'Amount (KES)', 'Payment Status', 'Order Status', 'Date', 'M-PESA Receipt'];
      const csvData = filteredOrders.map(o => [
        o.orderId,
        o.customerName,
        o.item,
        o.quantity,
        o.amount,
        o.payment,
        o.status,
        formatDate(o.createdAt),
        o.mpesaReceipt || ''
      ]);
      
      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export successful!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export data');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPaymentStatusColor = (payment: string) => {
    switch(payment) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Unpaid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPaymentFilter('all');
    setDateFilter('all');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Get unique values for filters
  const paymentStatuses = ['all', ...new Set(orders.map(o => o.payment))];

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* M-Pesa Modal */}
        <MpesaPaymentModal
          isOpen={isMpesaModalOpen}
          onClose={() => {
            setIsMpesaModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
          order={selectedOrderForPayment}
          onSuccess={handleMpesaSuccess}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 fade-in">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>Payment Management</h1>
            <p className="mt-1" style={{ color: '#1D546D' }}>Track and manage all order payments</p>
          </div>
          <div className="flex gap-3">
            <div className="px-6 py-3 rounded-lg shadow-lg" style={{ backgroundColor: '#1D546D' }}>
              <span className="text-sm font-medium block" style={{ color: '#F3F4F4' }}>Pending Revenue</span>
              <span className="text-2xl font-bold" style={{ color: '#F3F4F4' }}>KES {pendingRevenue.toLocaleString()}</span>
            </div>
            <div className="px-6 py-3 rounded-lg shadow-lg" style={{ backgroundColor: '#061E29' }}>
              <span className="text-sm font-medium block" style={{ color: '#F3F4F4' }}>Total Revenue</span>
              <span className="text-2xl font-bold" style={{ color: '#F3F4F4' }}>KES {totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Total Orders</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#061E29' }}>{orders.length}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                <Package className="h-6 w-6" style={{ color: '#061E29' }} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Paid Orders</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#5F9598' }}>
                  {orders.filter(o => o.payment === 'Paid').length}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                <CheckCircle className="h-6 w-6" style={{ color: '#5F9598' }} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Unpaid Orders</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#EAB308' }}>
                  {orders.filter(o => o.payment === 'Unpaid').length}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Avg Order Value</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#1D546D' }}>
                  KES {orders.length > 0 
                    ? Math.round(orders.reduce((sum, o) => sum + o.amount, 0) / orders.length).toLocaleString() 
                    : 0}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(29, 84, 109, 0.1)' }}>
                <TrendingUp className="h-6 w-6" style={{ color: '#1D546D' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 fade-in">
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
                  placeholder="Search by Order ID, Customer or Item..."
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: '#F3F4F4',
                    color: '#061E29',
                    backgroundColor: '#F3F4F4'
                  }}
                />
              </div>
            </div>

            {/* Payment Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>Payment Status</label>
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
                {paymentStatuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: '#F3F4F4',
                  color: '#061E29',
                  backgroundColor: '#F3F4F4'
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || paymentFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#F3F4F4' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium" style={{ color: '#1D546D' }}>Active Filters:</span>
                {searchTerm && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ backgroundColor: '#061E29', color: '#F3F4F4' }}>
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                {paymentFilter !== 'all' && (
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                    paymentFilter === 'Paid' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    Status: {paymentFilter}
                    <button onClick={() => setPaymentFilter('all')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                {dateFilter !== 'all' && (
                  <span className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}>
                    Date: {dateFilter}
                    <button onClick={() => setDateFilter('all')} className="ml-1 hover:opacity-80">×</button>
                  </span>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-sm ml-2 font-medium hover:underline flex items-center gap-1"
                  style={{ color: '#061E29' }}
                >
                  <X className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Orders/Payments Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border fade-in" style={{ borderColor: '#F3F4F4' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ backgroundColor: '#061E29' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80"
                      style={{ color: '#F3F4F4' }}
                      onClick={() => handleSort('orderId')}>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Order ID
                      {sortField === 'orderId' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80"
                      style={{ color: '#F3F4F4' }}
                      onClick={() => handleSort('customerName')}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer
                      {sortField === 'customerName' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#F3F4F4' }}>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Item
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#F3F4F4' }}>
                    Qty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80"
                      style={{ color: '#F3F4F4' }}
                      onClick={() => handleSort('amount')}>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Amount
                      {sortField === 'amount' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#F3F4F4' }}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#F3F4F4' }}>
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80"
                      style={{ color: '#F3F4F4' }}
                      onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                      {sortField === 'createdAt' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#F3F4F4' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-3" style={{ color: '#1D546D', opacity: 0.5 }} />
                      <p className="font-medium" style={{ color: '#061E29' }}>No orders found</p>
                      <p className="text-sm mt-1" style={{ color: '#1D546D' }}>
                        {orders.length > 0 
                          ? 'No orders match your filters' 
                          : 'No orders available'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                      } ${order.payment === 'Unpaid' ? 'bg-yellow-50/30' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium" style={{ color: '#061E29' }}>#{order.orderId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium" style={{ color: '#061E29' }}>{order.customerName}</div>
                          <div className="text-xs" style={{ color: '#1D546D' }}>{order.customerId?.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div style={{ color: '#061E29' }}>{order.item}</div>
                          {order.price && (
                            <div className="text-xs" style={{ color: '#1D546D' }}>@ KES {order.price}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: '#061E29' }}>{order.quantity}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold" style={{ color: '#5F9598' }}>KES {order.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(order.payment)}`}>
                          {order.payment}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          order.status === 'Completed' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#1D546D' }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {order.payment === 'Unpaid' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiateMpesaPayment(order);
                                }}
                                className="font-medium flex items-center gap-1 text-sm transition-all duration-200 hover:scale-105"
                                style={{ color: '#5F9598' }}
                                disabled={processingPayment === order.id}
                              >
                                <Smartphone className="h-4 w-4" />
                                M-PESA
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsPaid(order);
                                }}
                                className="font-medium flex items-center gap-1 text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ color: '#1D546D' }}
                                disabled={processingPayment === order.id}
                              >
                                {processingPayment === order.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Mark Paid
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(order);
                            }}
                            className="font-medium flex items-center gap-1 text-sm transition-all duration-200 hover:scale-105"
                            style={{ color: '#061E29' }}
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer with Export and Summary */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 fade-in">
          <div className="text-sm" style={{ color: '#1D546D' }}>
            Showing {filteredOrders.length} of {orders.length} orders
            {pendingRevenue > 0 && (
              <span className="ml-2 font-medium" style={{ color: '#EAB308' }}>
                (KES {pendingRevenue.toLocaleString()} pending)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border-2 rounded-lg transition-all duration-200 hover:opacity-80 font-medium flex items-center gap-2"
              style={{ borderColor: '#F3F4F4', color: '#1D546D' }}
            >
              <Filter className="h-4 w-4" />
              Reset Filters
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
              className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              style={{ backgroundColor: '#061E29', color: '#F3F4F4' }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}