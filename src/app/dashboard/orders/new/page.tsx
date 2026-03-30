'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Phone, User, Package, Hash, DollarSign, ShoppingBag, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  status: string;
  description?: string;
  category?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function NewOrderPage() {
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
  const [stockError, setStockError] = useState('');

  useEffect(() => {
    fetchInventory();
    // Pre-fill customer info from auth if available
    if (user?.displayName) {
      setFormData(prev => ({ ...prev, customerName: user.displayName || '' }));
    }
    if (user?.phoneNumber) {
      setFormData(prev => ({ ...prev, customerPhone: user.phoneNumber || '' }));
    }
  }, [user]);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      
      // Filter only active in-stock items
      const availableItems = items.filter(item => 
        item.quantity > 0 && item.status === 'active'
      );
      setInventory(availableItems);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    }
  };

  const handleItemChange = (itemName: string) => {
    const item = inventory.find(i => i.name === itemName) || null;
    setSelectedItem(item);
    setStockError('');
    
    // Validate stock
    if (item && formData.quantity > item.quantity) {
      setStockError(`Only ${item.quantity} items available in stock`);
    }
    
    setFormData(prev => ({
      ...prev,
      item: itemName,
      price: item?.price || 0,
      amount: (item?.price || 0) * prev.quantity
    }));
  };

  const handleQuantityChange = (qty: number) => {
    const newQty = Math.max(1, qty);
    setFormData(prev => ({
      ...prev,
      quantity: newQty,
      amount: (selectedItem?.price || 0) * newQty
    }));
    
    // Validate stock
    if (selectedItem && newQty > selectedItem.quantity) {
      setStockError(`Only ${selectedItem.quantity} items available in stock`);
    } else {
      setStockError('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateOrderId = () => {
    // Generate a random 8-digit number
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    return `ORD${randomNum}`;
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
    
    // Validate stock availability
    if (!selectedItem) {
      toast.error('Please select a valid item');
      return;
    }
    
    if (formData.quantity > selectedItem.quantity) {
      toast.error(`Insufficient stock. Only ${selectedItem.quantity} items available.`);
      return;
    }
    
    setLoading(true);

    try {
      const orderId = generateOrderId();
      const now = new Date();
      const firestoreTimestamp = Timestamp.fromDate(now);
      
      // Create OrderItem object
      const orderItem: OrderItem = {
        productId: selectedItem.id,
        productName: formData.item,
        quantity: formData.quantity,
        price: selectedItem.price || 0,
        subtotal: formData.amount,
      };
      
      // Create the complete order object matching your database structure exactly
      const orderData = {
        // Basic order info
        orderId: orderId,
        customerId: user?.uid || '',
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        
        // Items information
        items: [orderItem],
        itemCount: formData.quantity,
        
        // Financial details
        subtotal: formData.amount,
        tax: 0,
        shipping: 0,
        totalAmount: formData.amount,
        
        // Status fields
        status: 'Pending',
        payment: 'Unpaid',
        paymentStatus: 'Unpaid',
        
        // Timestamps
        createdAt: firestoreTimestamp,
        updatedAt: firestoreTimestamp,
        paymentDate: null,
        
        // Payment details (initially null)
        paymentMethod: null,
        mpesaReceipt: null,
        
        // Additional fields
        phoneNumber: formData.customerPhone.trim(),
        
        // Legacy fields for compatibility
        amount: formData.amount,
        price: selectedItem.price || 0,
        quantity: formData.quantity,
        item: formData.item
      };
      
      console.log('Creating order with complete data:', orderData);
      
      // Create the order in Firestore
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('Order created successfully with ID:', orderRef.id);
      
      // Update inventory stock
      const inventoryRef = doc(db, 'inventory', selectedItem.id);
      await updateDoc(inventoryRef, {
        quantity: increment(-formData.quantity),
        updatedAt: firestoreTimestamp
      });
      
      toast.success(`Order #${orderId} created successfully! Stock has been reserved.`);
      
      // Redirect to orders page
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 1500);
      
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-indigo-600">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
        </div>
        <p className="text-gray-600 ml-14">Fill in the details below to create a new order</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
              placeholder="Enter customer name (e.g., John Doe)"
              required
            />
          </div>
          
          {/* Customer Phone */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <Phone className="h-5 w-5 text-indigo-600" />
              Customer Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleInputChange}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base placeholder:text-gray-500"
              placeholder="Enter phone number (e.g., 0712345678)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Format: 07XXXXXXXX or 01XXXXXXXX</p>
          </div>
          
          {/* Select Item */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Select Item <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.item}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base"
              required
            >
              <option value="" className="text-gray-500">-- Select an item from inventory --</option>
              {inventory.map(item => (
                <option key={item.id} value={item.name} className="text-gray-900">
                  {item.name} - KES {item.price?.toLocaleString()} (Stock: {item.quantity} units)
                </option>
              ))}
            </select>
            {inventory.length === 0 && (
              <p className="text-sm mt-2 text-yellow-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                No items available in inventory. Please check back later.
              </p>
            )}
            {selectedItem && selectedItem.quantity < 10 && (
              <p className="text-sm mt-2 text-orange-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Low stock alert! Only {selectedItem.quantity} units remaining.
              </p>
            )}
          </div>
          
          {/* Quantity */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <Hash className="h-5 w-5 text-indigo-600" />
              Quantity <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="flex-1 p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-white text-gray-900 font-medium text-base"
                min="1"
                max={selectedItem?.quantity || 999}
                required
              />
              {selectedItem && (
                <div className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 font-medium">
                  Max: {selectedItem.quantity}
                </div>
              )}
            </div>
            {stockError && (
              <p className="text-sm mt-2 text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {stockError}
              </p>
            )}
          </div>
          
          {/* Total Amount */}
          <div>
            <label className="block text-gray-800 font-bold mb-2 text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Total Amount (KES)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-bold">KES</span>
              </div>
              <input
                type="text"
                value={formData.amount.toLocaleString()}
                readOnly
                className="w-full p-4 pl-20 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-bold text-lg"
              />
            </div>
            {selectedItem && (
              <div className="mt-2 p-3 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-800">
                  Unit Price: KES {selectedItem.price?.toLocaleString()} × {formData.quantity} = 
                  <span className="font-bold ml-1">KES {formData.amount.toLocaleString()}</span>
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  * Tax and shipping will be calculated at checkout
                </p>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedItem || !!stockError || inventory.length === 0}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-8"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Order...
              </span>
            ) : (
              'Create Order'
            )}
          </button>
        </form>
      </div>

      {/* Order Preview */}
      {formData.item && formData.customerName && formData.customerPhone && (
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
            Order Preview
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Customer Name</p>
              <p className="text-base font-bold text-gray-900">{formData.customerName}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Customer Phone</p>
              <p className="text-base font-bold text-gray-900">{formData.customerPhone}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Item</p>
              <p className="text-base font-bold text-gray-900">{formData.item}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Quantity</p>
              <p className="text-base font-bold text-gray-900">{formData.quantity} unit(s)</p>
            </div>
            <div className="bg-white rounded-lg p-3 col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Amount</p>
              <p className="text-2xl font-bold text-indigo-600">KES {formData.amount.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-200">
            <p className="text-xs text-gray-600 text-center">
              Order ID will be generated automatically • Payment will be collected upon delivery
            </p>
          </div>
        </div>
      )}
    </div>
  );
}