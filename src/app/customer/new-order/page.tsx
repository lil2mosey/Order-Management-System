'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ShoppingBag, Package, Tag, ArrowLeft, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '@/types';

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
    customerName: '',
    customerPhone: '',
    item: '',
    quantity: 1,
    amount: 0,
    price: 0
  });

  useEffect(() => {
    fetchInventory();
    // Pre-fill customer name from auth if available
    if (user?.name) {
      setFormData(prev => ({ ...prev, customerName: user.name || '' }));
    }
    // Pre-fill customer phone from auth if available
    if (user?.phone) {
      setFormData(prev => ({ ...prev, customerPhone: user.phone || '' }));
    }
  }, [user]);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: doc.data().price || Math.floor(Math.random() * 5000) + 1000
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
      price: item?.price || 0,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName || formData.customerName.trim() === '') {
      toast.error('Please enter customer name');
      return;
    }
    
    if (!formData.customerPhone || formData.customerPhone.trim() === '') {
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
    
    setLoading(true);

    try {
      const orderId = 'ORD' + Math.floor(10000000 + Math.random() * 90000000).toString();
      
      // Create OrderItem object
      const orderItem: OrderItem = {
        productId: selectedItem?.id || '',
        productName: formData.item,
        quantity: formData.quantity,
        price: selectedItem?.price || 0,
        subtotal: formData.amount,
      };
      
      // ✅ Create order object matching your types
      const order: Partial<Order> = {
        orderId,
        customerId: user?.uid || '',
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(), // This will be a string, not undefined
        items: [orderItem],
        itemCount: formData.quantity,
        subtotal: formData.amount,
        tax: 0,
        shipping: 0,
        totalAmount: formData.amount,
        status: 'Pending' as OrderStatus,
        paymentStatus: 'Unpaid' as PaymentStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // ✅ Remove any undefined values before sending to Firestore
      const cleanOrder = Object.fromEntries(
        Object.entries(order).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Saving order:', cleanOrder);
      
      await addDoc(collection(db, 'orders'), cleanOrder);
      
      toast.success('Order created successfully!');
      router.push('/customer/orders');
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
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-2xl">
        <Link 
          href="/customer/orders" 
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80"
          style={{ color: '#1D546D', backgroundColor: 'white' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
              <ShoppingBag className="h-6 w-6" style={{ color: '#F3F4F4' }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>Place New Order</h1>
          </div>
          <p className="text-lg ml-14" style={{ color: '#1D546D' }}>Fill in the details below to create your order</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 border fade-in" style={{ borderColor: '#F3F4F4' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Name */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#061E29' }}>
                <User className="h-4 w-4" style={{ color: '#5F9598' }} />
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter customer name"
                className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: '#F3F4F4',
                  color: '#061E29',
                  backgroundColor: 'white'
                }}
                required
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#061E29' }}>
                <Phone className="h-4 w-4" style={{ color: '#5F9598' }} />
                Customer Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                placeholder="Enter phone number (e.g., 0712345678)"
                className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: '#F3F4F4',
                  color: '#061E29',
                  backgroundColor: 'white'
                }}
                required
              />
            </div>
            
            {/* Item Selection */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#061E29' }}>
                <Package className="h-4 w-4" style={{ color: '#5F9598' }} />
                Select Item <span className="text-red-500">*</span>
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
                required
              >
                <option value="">Choose an item</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.name}>
                    {item.name} - KES {item.price?.toLocaleString()} 
                    {item.quantity > 0 ? ` (Stock: ${item.quantity})` : ' (Out of Stock)'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Quantity */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2" style={{ color: '#061E29' }}>
                <svg className="h-4 w-4" style={{ color: '#5F9598' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Quantity <span className="text-red-500">*</span>
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
                  required
                />
                {selectedItem && (
                  <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F3F4F4', color: '#1D546D' }}>
                    Max: {selectedItem.quantity}
                  </div>
                )}
              </div>
            </div>
            
            {/* Total Amount */}
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
            
            <button
              type="submit"
              disabled={loading || !selectedItem}
              className="w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ 
                backgroundColor: '#5F9598', 
                color: '#F3F4F4'
              }}
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
