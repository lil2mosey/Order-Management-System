'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Smartphone, AlertCircle, CheckCircle, Loader, Package, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (response: any) => void;
}

export default function MpesaPaymentModal({ isOpen, onClose, order, onSuccess }: MpesaPaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
  const { processPaymentAndDeductStock } = useAuth();

  const validatePhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid Safaricom number (07XX or 01XX)
    if (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
      return '254' + cleaned;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = validatePhoneNumber(phoneNumber);
    if (!formattedPhone) {
      toast.error('Please enter a valid M-PESA phone number (e.g., 0712345678)');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Generate a transaction code
      const transactionCode = 'MPE' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
      
      // Process payment and deduct stock using AuthContext
      await processPaymentAndDeductStock(
        {
          productId: order.itemId,
          productName: order.item,
          quantity: order.quantity,
          price: order.price || order.amount / order.quantity,
          amount: order.amount,
          phoneNumber: formattedPhone
        },
        'mpesa',
        transactionCode
      );

      setStep('success');
      
      // Show success message
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">✓ Payment Successful!</span>
          <span className="text-sm">Stock has been deducted from inventory</span>
        </div>,
        { duration: 6000 }
      );
      
      // Wait a bit before closing
      setTimeout(() => {
        onSuccess({ 
          success: true, 
          transactionCode,
          message: 'Payment processed successfully' 
        });
        handleClose();
      }, 3000);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment. Please try again.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setPhoneNumber('');
    onClose();
  };

  const getAmount = () => {
    return order?.amount || 0;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all" style={{ backgroundColor: 'white' }}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6"
                    style={{ color: '#061E29' }}
                  >
                    M-PESA Payment
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="transition hover:opacity-70"
                    style={{ color: '#1D546D' }}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Order Summary */}
                {order && (
                  <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: '#F3F4F4', borderColor: '#F3F4F4' }}>
                    <h4 className="font-semibold mb-3" style={{ color: '#061E29' }}>Order Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2" style={{ color: '#1D546D' }}>
                          <Package className="h-4 w-4" />
                          <span className="text-sm">Order ID:</span>
                        </div>
                        <span className="font-medium" style={{ color: '#061E29' }}>#{order.orderId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: '#1D546D' }}>Customer:</span>
                        <span className="font-medium" style={{ color: '#061E29' }}>{order.customerName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: '#1D546D' }}>Item:</span>
                        <span className="font-medium" style={{ color: '#061E29' }}>{order.item} x{order.quantity}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: 'white' }}>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" style={{ color: '#5F9598' }} />
                          <span className="font-bold" style={{ color: '#061E29' }}>Total:</span>
                        </div>
                        <span className="text-xl font-bold" style={{ color: '#5F9598' }}>
                          KES {getAmount().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'input' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                        M-PESA Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: '#5F9598' }} />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g., 0712345678"
                          className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                          style={{ 
                            borderColor: '#F3F4F4',
                            color: '#061E29',
                            backgroundColor: '#F3F4F4'
                          }}
                          required
                        />
                      </div>
                      <p className="text-xs mt-2" style={{ color: '#1D546D' }}>
                        Enter the M-PESA registered phone number
                      </p>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#5F9598' }} />
                        <div className="text-sm" style={{ color: '#1D546D' }}>
                          <p className="font-medium mb-1" style={{ color: '#061E29' }}>What happens next?</p>
                          <p>An STK push prompt will be sent to your phone. Enter your M-PESA PIN to complete the payment. Stock will be automatically deducted upon success.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
                    >
                      <Smartphone className="h-5 w-5" />
                      {loading ? 'Processing...' : 'Pay with M-PESA'}
                    </button>
                  </form>
                )}

                {step === 'processing' && (
                  <div className="text-center py-8">
                    <Loader className="h-16 w-16 animate-spin mx-auto mb-4" style={{ color: '#5F9598' }} />
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#061E29' }}>Processing Payment</h3>
                    <p style={{ color: '#1D546D' }}>
                      Sending STK push to {phoneNumber}...
                    </p>
                    <p className="text-sm mt-4" style={{ color: '#1D546D', opacity: 0.7 }}>
                      Please wait while we process your payment
                    </p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: '#5F9598' }} />
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#061E29' }}>Payment Successful!</h3>
                    <p className="mb-4" style={{ color: '#1D546D' }}>
                      Your payment has been processed and stock has been updated
                    </p>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                      <p className="text-sm" style={{ color: '#061E29' }}>
                        <strong>Transaction completed successfully</strong>
                      </p>
                    </div>
                    <p className="text-sm mt-4" style={{ color: '#1D546D', opacity: 0.7 }}>
                      This window will close automatically...
                    </p>
                  </div>
                )}

                {/* Footer note */}
                <p className="text-xs text-center mt-4" style={{ color: '#1D546D', opacity: 0.7 }}>
                  Powered by Safaricom M-PESA
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}