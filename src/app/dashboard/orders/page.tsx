'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { 
  ShoppingBag, 
  Edit, 
  CheckCircle, 
  Clock, 
  DollarSign,
  User,
  Package,
  X
} from 'lucide-react';

export default function OrdersPage() {
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
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
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
      const updateData: Partial<Order> = {
        status: selectedOrder.status,
        customerName: selectedOrder.customerName
      };
      
  
      
      await updateDoc(doc(db, 'orders', selectedOrder.id), updateData);
      
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
        status: 'Done'
      });
      toast.success('Order marked as completed');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentColor = (payment: string) => {
    switch(payment) {
      case 'Paid':
        return 'text-green-600 font-bold';
      case 'Unpaid':
        return 'text-red-600 font-bold';
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 fade-in">
          
          

       
          </div>

         

          
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
                      Item
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#1D546D' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={selectedOrder.customerName}
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                    Status
                  </label>
               
                    
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
    
  );
}