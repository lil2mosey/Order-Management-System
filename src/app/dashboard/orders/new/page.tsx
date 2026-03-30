'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { InventoryItem } from '@/types';
import { Phone, User, Package, Hash, DollarSign } from 'lucide-react';

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '', // ✅ Added customerPhone field
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
      toast.error('Failed to load inventory');
    }
  };

  const handleItemChange = (itemName: string) => {
    const item = inventory.find(i => i.name === itemName) || null;
    setSelectedItem(item);
    setFormData(prev => ({
      ...prev,
      item: itemName,
      amount: (item?.price || 0) * prev.quantity
    }));
  };

  const handleQuantityChange = (qty: number) => {
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      amount: (selectedItem?.price || 0) * qty
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Validate required fields
    if (!formData.customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    
    if (!formData.customerPhone.trim()) {
      toast.error('Please enter customer phone number');
      return;
    }
    
    if (!formData.item) {
      toast.error('Please select an item');
      return;
    }
    
    if (formData.quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    
    setLoading(true);

    try {
      // Generate unique order ID
      const orderId = 'ORD' + Math.floor(10000000 + Math.random() * 90000000).toString();
      
      // ✅ Create order object with all required fields
      const order = {
        orderId,
        customerId: user?.uid || null,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(), // ✅ Added customerPhone field
        item: formData.item,
        quantity: formData.quantity,
        status: 'Pending' as const,
        paymentStatus: 'Unpaid' as const, // ✅ Changed from 'payment' to 'paymentStatus'
        amount: formData.amount,
        price: selectedItem?.price || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'orders'), order);
      
      toast.success('Order created successfully!');
      router.push('/dashboard/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      if (error instanceof Error) {
        toast.error(`Error creating order: ${error.message}`);
      } else {
        toast.error('Error creating order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Create New Order</h1>
      
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
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
          
          {/* ✅ Customer Phone - NEW FIELD */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <Phone className="h-5 w-5 text-indigo-600" />
              Customer Phone Number
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
              placeholder="Enter phone number (e.g., 0712345678)"
              required
            />
          </div>
          
          {/* Select Item */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Select Item
            </label>
            <select
              value={formData.item}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base"
              aria-label="Select an item from inventory"
              required
            >
              <option value="" className="text-gray-500 font-medium">-- Select an item from inventory --</option>
              {inventory.map(item => (
                <option key={item.id} value={item.name} className="text-gray-900 font-medium py-2">
                  {item.name} - KES {item.price?.toLocaleString()} (Stock: {item.quantity} units)
                </option>
              ))}
            </select>
            {selectedItem && selectedItem.quantity < 10 && (
              <p className="text-sm mt-2 text-red-600">
                ⚠️ Low stock! Only {selectedItem.quantity} units available
              </p>
            )}
          </div>
          
          {/* Quantity */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <Hash className="h-5 w-5 text-indigo-600" />
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="flex-1 p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
                placeholder="Enter quantity (minimum: 1)"
                min="1"
                max={selectedItem?.quantity || 99}
                required
              />
              {selectedItem && (
                <div className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700">
                  Max: {selectedItem.quantity}
                </div>
              )}
            </div>
          </div>
          
          {/* Amount - Now auto-calculated */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Total Amount (KES)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg">KES</span>
              </div>
              <input
                type="number"
                value={formData.amount}
                readOnly
                className="w-full p-4 pl-16 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-bold text-lg"
                placeholder="Amount will be auto-calculated"
              />
            </div>
            {selectedItem && (
              <p className="text-sm mt-2 text-gray-600">
                Unit price: KES {selectedItem.price?.toLocaleString()} × {formData.quantity} = KES {formData.amount.toLocaleString()}
              </p>
            )}
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedItem}
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

      {/* Preview Card - Updated to show phone number */}
      {formData.item && formData.customerName && (
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Order Preview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Customer Name</p>
              <p className="text-lg font-bold text-gray-900">{formData.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Customer Phone</p>
              <p className="text-lg font-bold text-gray-900">{formData.customerPhone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Item</p>
              <p className="text-lg font-bold text-gray-900">{formData.item}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Quantity</p>
              <p className="text-lg font-bold text-gray-900">{formData.quantity}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-indigo-600">KES {formData.amount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}