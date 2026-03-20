'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ShoppingBag, Package, Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  status: string;
}

export default function CustomerNewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    item: '',
    quantity: 1,
    amount: 0,
    price: 0
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: doc.data().price || Math.floor(Math.random() * 5000) + 1000 // Default price if not set
      })) as InventoryItem[];
      setInventory(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleItemChange = (itemName: string) => {
    const item = inventory.find(i => i.name === itemName) || null;
    setSelectedItem(item);
    setFormData({
      ...formData,
      item: itemName,
      price: item?.price || 0,
      amount: (item?.price || 0) * formData.quantity
    });
  };

  const handleQuantityChange = (qty: number) => {
    setFormData({
      ...formData,
      quantity: qty,
      amount: (selectedItem?.price || 0) * qty
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderId = 'ORD' + Math.floor(100 + Math.random() * 900).toString();
      
      const order = {
        orderId,
        customerId: user?.uid,
        customerName: user?.name || 'Customer',
        item: formData.item,
        quantity: formData.quantity,
        status: 'Pending' as const,
        payment: 'Unpaid' as const,
        amount: formData.amount,
        price: selectedItem?.price || 0,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'orders'), order);
      
      toast.success('Order created successfully!');
      router.push('/customer/orders');
    } catch (error) {
      toast.error('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Back Button */}
        <Link 
          href="/customer/orders" 
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80"
          style={{ color: '#1D546D', backgroundColor: 'white' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        {/* Header */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
              <ShoppingBag className="h-6 w-6" style={{ color: '#F3F4F4' }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>Place New Order</h1>
          </div>
          <p className="text-lg ml-14" style={{ color: '#1D546D' }}>Fill in the details below to create your order</p>
        </div>
        
        {/* Order Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 border fade-in" style={{ borderColor: '#F3F4F4' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Selection */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#061E29' }}>
                <Package className="h-4 w-4" style={{ color: '#5F9598' }} />
                Select Item
              </label>
              <select
                value={formData.item}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: '#F3F4F4',
                  color: '#061E29',
                  backgroundColor: 'white'
                }}
                aria-label="Select an item"
                required
              >
                <option value="" className="text-gray-400">Choose an item</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.name} style={{ color: '#061E29' }}>
                    {item.name} - KES {item.price?.toLocaleString()} 
                    {item.quantity > 0 ? ` (Stock: ${item.quantity})` : ' (Out of Stock)'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Quantity Input */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#061E29' }}>
                <svg className="h-4 w-4" style={{ color: '#5F9598' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="flex-1 p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: '#F3F4F4',
                    color: '#061E29',
                    backgroundColor: 'white'
                  }}
                  min="1"
                  max={selectedItem?.quantity || 99}
                  placeholder="Enter quantity"
                  required
                />
                {selectedItem && (
                  <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F3F4F4', color: '#1D546D' }}>
                    Max: {selectedItem.quantity}
                  </div>
                )}
              </div>
              {selectedItem && selectedItem.quantity < 10 && (
                <p className="text-sm mt-2" style={{ color: '#dc2626' }}>
                  ⚠️ Low stock! Only {selectedItem.quantity} available
                </p>
              )}
            </div>
            
            {/* Price Summary */}
            {selectedItem && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ color: '#1D546D' }}>Unit Price:</span>
                  <span className="font-semibold" style={{ color: '#061E29' }}>
                    KES {selectedItem.price?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#1D546D' }}>Quantity:</span>
                  <span className="font-semibold" style={{ color: '#061E29' }}>
                    {formData.quantity}
                  </span>
                </div>
                <div className="border-t mt-2 pt-2" style={{ borderColor: 'white' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold" style={{ color: '#061E29' }}>Total:</span>
                    <span className="text-xl font-bold" style={{ color: '#5F9598' }}>
                      KES {formData.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Total Amount Display */}
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#061E29' }}>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#F3F4F4' }}>
                <Tag className="h-4 w-4" />
                Total Amount
              </label>
              <div className="text-4xl font-bold" style={{ color: '#F3F4F4' }}>
                KES {formData.amount.toLocaleString()}
              </div>
              {formData.price > 0 && (
                <p className="text-sm mt-2" style={{ color: '#F3F4F4', opacity: 0.8 }}>
                  Unit price: KES {formData.price.toLocaleString()}
                </p>
              )}
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedItem}
              className="w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              style={{ 
                backgroundColor: '#5F9598', 
                color: '#F3F4F4',
                opacity: loading || !selectedItem ? 0.5 : 1
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" style={{ color: '#F3F4F4' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Place Order'
              )}
            </button>
          </form>

          {/* Available Items Summary */}
          {inventory.length > 0 && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: '#F3F4F4' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#061E29' }}>
                <Package className="h-4 w-4" />
                Available Items ({inventory.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {inventory.slice(0, 4).map(item => (
                  <div 
                    key={item.id} 
                    className="p-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#F3F4F4' }}
                  >
                    <div className="font-medium" style={{ color: '#061E29' }}>{item.name}</div>
                    <div className="text-xs" style={{ color: '#1D546D' }}>
                      KES {item.price?.toLocaleString()} | Stock: {item.quantity}
                    </div>
                  </div>
                ))}
                {inventory.length > 4 && (
                  <div className="p-2 rounded-lg text-sm flex items-center justify-center" style={{ backgroundColor: '#F3F4F4', color: '#1D546D' }}>
                    +{inventory.length - 4} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}