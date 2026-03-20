'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { InventoryItem } from '@/types';

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    item: '',
    quantity: 1,
    amount: 0
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderId = 'ORD' + Math.floor(100 + Math.random() * 900).toString();
      
      const order = {
        orderId,
        customerId: user?.uid,
        customerName: formData.customerName,
        item: formData.item,
        quantity: formData.quantity,
        status: 'Pending' as const,
        payment: 'Unpaid' as const,
        amount: formData.amount,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'orders'), order);
      
      toast.success('Order created successfully!');
      router.push('/dashboard/orders');
    } catch (error) {
      toast.error('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Create New Order</h1>
      
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base">
              Customer Name
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
              placeholder="Enter customer name (e.g., John Doe)"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base">
              Select Item
            </label>
            <select
              value={formData.item}
              onChange={(e) => setFormData({...formData, item: e.target.value})}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base"
              aria-label="Select an item from inventory"
              required
            >
              <option value="" className="text-gray-500 font-medium">-- Select an item from inventory --</option>
              {inventory.map(item => (
                <option key={item.id} value={item.name} className="text-gray-900 font-medium py-2">
                  {item.name} (Stock: {item.quantity} units)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base">
              Quantity
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
              placeholder="Enter quantity (minimum: 1)"
              min="1"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base">
              Amount (KES)
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
              placeholder="Enter amount in Kenyan Shillings (KES)"
              min="0"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-8"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Order...
              </span>
            ) : 'Create Order'}
          </button>
        </form>
      </div>

      {/* Preview Card */}
      {formData.item && formData.customerName && (
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Order Preview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-lg font-bold text-gray-900">{formData.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Item</p>
              <p className="text-lg font-bold text-gray-900">{formData.item}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Quantity</p>
              <p className="text-lg font-bold text-gray-900">{formData.quantity}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Amount</p>
              <p className="text-lg font-bold text-gray-900">KES {formData.amount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}