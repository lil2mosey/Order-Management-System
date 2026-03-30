'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { 
  ShoppingBag, 
  Edit, 
  CheckCircle, 
  Clock, 
  User,
  Package,
  X,
  Phone
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Parse dates safely
        let createdAt: Date;
        let updatedAt: Date;
        
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }
        
        if (data.updatedAt?.toDate) {
          updatedAt = data.updatedAt.toDate();
        } else if (data.updatedAt) {
          updatedAt = new Date(data.updatedAt);
        } else {
          updatedAt = new Date();
        }
        
        return {
          id: doc.id,
          orderId: data.orderId || doc.id.slice(-8),
          customerId: data.customerId || '',
          customerName: data.customerName || 'Unknown',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
          items: data.items || [],
          itemCount: data.itemCount || data.quantity || 1,
          subtotal: data.subtotal || data.amount || 0,
          tax: data.tax || 0,
          shipping: data.shipping || 0,
          discount: data.discount,
          totalAmount: data.totalAmount || data.amount || 0,
          status: (data.status || 'Pending') as OrderStatus,
          paymentStatus: (data.paymentStatus || data.payment || 'Unpaid') as PaymentStatus,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          mpesaReceipt: data.mpesaReceipt,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          notes: data.notes || '',
          createdAt,
          updatedAt,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : undefined,
          cancelledAt: data.cancelledAt?.toDate ? data.cancelledAt.toDate() : undefined,
          refundedAt: data.refundedAt?.toDate ? data.refundedAt.toDate() : undefined,
        } as Order;
      });
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedOrder) return;
    
    try {
      const updateData: Partial<Order> = {};
      
      if (selectedOrder.status !== undefined && selectedOrder.status !== null) {
        updateData.status = selectedOrder.status;
      }
      
      if (selectedOrder.customerName !== undefined && selectedOrder.customerName !== null && selectedOrder.customerName !== '') {
        updateData.customerName = selectedOrder.customerName;
      }
      
      if (selectedOrder.customerPhone !== undefined && selectedOrder.customerPhone !== null && selectedOrder.customerPhone !== '') {
        updateData.customerPhone = selectedOrder.customerPhone;
      }
      
      if (selectedOrder.paymentStatus !== undefined && selectedOrder.paymentStatus !== null) {
        updateData.paymentStatus = selectedOrder.paymentStatus;
      }
      
      if (selectedOrder.totalAmount !== undefined && selectedOrder.totalAmount !== null && selectedOrder.totalAmount > 0) {
        updateData.totalAmount = selectedOrder.totalAmount;
      }
      
      updateData.updatedAt = new Date();
      
      // Remove undefined values
      const cleanUpdate = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      if (Object.keys(cleanUpdate).length === 0) {
        toast.error('No valid fields to update');
        return;
      }
      
      await updateDoc(doc(db, 'orders', selectedOrder.id), cleanUpdate);
      
      toast.success('Order updated successfully');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const handleQuickComplete = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Completed',
        updatedAt: new Date()
      });
      toast.success('Order marked as completed');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentColor = (payment: string) => {
    switch(payment?.toLowerCase()) {
      case 'paid':
        return 'text-green-600 font-bold';
      case 'unpaid':
        return 'text-red-600 font-bold';
      case 'refunded':
        return 'text-purple-600 font-bold';
      case 'partially paid':
        return 'text-orange-600 font-bold';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
                <ShoppingBag className="h-6 w-6" style={{ color: '#F3F4F4' }} />
              </div>
              <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>Order Management</h1>
            </div>
            <button 
              onClick={() => window.location.href = '/dashboard/orders/new'}
              className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
            >
              + New Order
            </button>
          </div>
          <p className="text-lg ml-14" style={{ color: '#1D546D' }}>
            Manage and track customer orders
          </p>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-3" style={{ color: '#1D546D', opacity: 0.5 }} />
              <p className="font-medium" style={{ color: '#061E29' }}>No orders found</p>
              <p className="text-sm mt-1" style={{ color: '#1D546D' }}>
                Click "New Order" to create your first order
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b" style={{ backgroundColor: '#F9FAFB', borderColor: '#F3F4F4' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Items
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#F3F4F4' }}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#061E29' }}>
                        {order.orderId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1D546D' }}>
                        {order.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1D546D' }}>
                        {order.customerPhone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1D546D' }}>
                        {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#5F9598' }}>
                        KES {order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getPaymentColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#1D546D' }}>
                        {order.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-1 rounded transition-colors hover:bg-gray-100"
                            style={{ color: '#5F9598' }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleQuickComplete(order)}
                              className="p-1 rounded transition-colors hover:bg-gray-100"
                              style={{ color: '#10B981' }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b" style={{ borderColor: '#F3F4F4' }}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#061E29' }}>Edit Order</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" style={{ color: '#1D546D' }} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: '#1D546D' }}>
                    <User className="h-4 w-4" />
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={selectedOrder.customerName || ''}
                    onChange={(e) => setSelectedOrder({...selectedOrder, customerName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#F3F4F4',
                      color: '#061E29',
                      backgroundColor: '#F3F4F4'
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: '#1D546D' }}>
                    <Phone className="h-4 w-4" />
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={selectedOrder.customerPhone || ''}
                    onChange={(e) => setSelectedOrder({...selectedOrder, customerPhone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#F3F4F4',
                      color: '#061E29',
                      backgroundColor: '#F3F4F4'
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                    Status
                  </label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => setSelectedOrder({...selectedOrder, status: e.target.value as OrderStatus})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#F3F4F4',
                      color: '#061E29',
                      backgroundColor: '#F3F4F4'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                    Payment Status
                  </label>
                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={(e) => setSelectedOrder({...selectedOrder, paymentStatus: e.target.value as PaymentStatus})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#F3F4F4',
                      color: '#061E29',
                      backgroundColor: '#F3F4F4'
                    }}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                    Total Amount (KES)
                  </label>
                  <input
                    type="number"
                    value={selectedOrder.totalAmount}
                    onChange={(e) => setSelectedOrder({...selectedOrder, totalAmount: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#F3F4F4',
                      color: '#061E29',
                      backgroundColor: '#F3F4F4'
                    }}
                  />
                </div>
              </div>
              
              <div className="p-6 border-t flex gap-3" style={{ borderColor: '#F3F4F4' }}>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-lg font-semibold transition-all duration-200 hover:opacity-90"
                  style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg font-semibold transition-all duration-200 hover:opacity-80"
                  style={{ backgroundColor: '#F3F4F4', color: '#1D546D' }}
                >
                  Cancel
                </button>
              </div>
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