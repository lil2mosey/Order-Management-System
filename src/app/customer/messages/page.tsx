'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { MessageSquare, Send, Clock, CheckCircle, ArrowLeft, User, Mail, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      try {
        setLoadingMessages(true);
        
        // Fetch user's messages
        const messagesQuery = query(
          collection(db, 'messages'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        console.log('Messages found:', messagesSnapshot.size);
        
        const messagesData = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          } as Message;
        });
        
        setMessages(messagesData);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    if (user) {
      fetchMessages();
    }
  }, [user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      const messageData = {
        customerId: user?.uid,
        customerName: user?.name,
        customerEmail: user?.email,
        message: newMessage,
        status: 'Unreplied',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      toast.success('Message sent successfully');
      setNewMessage('');
      
      // Refresh messages
      const messagesQuery = query(
        collection(db, 'messages'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as Message[];
      setMessages(messagesData);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  if (loading || loadingMessages) {
    return <LoadingSpinner />;
  }

  const unrepliedCount = messages.filter(m => m.status === 'Unreplied').length;

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header with Back Button */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/customer"
              className="p-2 rounded-lg transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: '#F3F4F4' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: '#1D546D' }} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
                <MessageSquare className="h-6 w-6" style={{ color: '#F3F4F4' }} />
              </div>
              <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>My Messages</h1>
            </div>
          </div>
          <p className="text-lg ml-14" style={{ color: '#1D546D' }}>
            Chat with the seller about your orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Total Messages</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#061E29' }}>{messages.length}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(6, 30, 41, 0.1)' }}>
                <Mail className="h-6 w-6" style={{ color: '#061E29' }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Unreplied</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#EAB308' }}>{unrepliedCount}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1D546D' }}>Replied</p>
                <p className="text-2xl font-bold mt-2" style={{ color: '#5F9598' }}>
                  {messages.filter(m => m.status === 'Replied').length}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}>
                <CheckCircle className="h-6 w-6" style={{ color: '#5F9598' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Send New Message Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24 fade-in">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#061E29' }}>Send New Message</h2>
              
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-4 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all mb-4"
                style={{ 
                  borderColor: '#F3F4F4',
                  backgroundColor: '#F3F4F4',
                  color: '#061E29'
                }}
                rows={5}
                placeholder="Type your message to the seller..."
              />
              
              <button
                onClick={handleSendMessage}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
              >
                <Send className="h-4 w-4" />
                Send Message
              </button>

              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#061E29' }}>Tips:</p>
                <ul className="text-xs space-y-1" style={{ color: '#1D546D' }}>
                  <li>• Be clear and specific about your inquiry</li>
                  <li>• Include order numbers if asking about an order</li>
                  <li>• The seller will respond as soon as possible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Messages History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border fade-in" style={{ borderColor: '#F3F4F4' }}>
              <div className="px-6 py-4" style={{ backgroundColor: '#061E29' }}>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F3F4F4' }}>
                  <MessageSquare className="h-5 w-5" />
                  Message History ({messages.length})
                </h2>
              </div>
              
              <div className="p-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3" style={{ color: '#1D546D', opacity: 0.5 }} />
                    <p className="text-lg mb-2" style={{ color: '#061E29' }}>No messages yet</p>
                    <p className="text-sm" style={{ color: '#1D546D' }}>
                      Send your first message to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className="border-b pb-6 last:border-0 last:pb-0"
                        style={{ borderColor: '#F3F4F4' }}
                      >
                        {/* Customer Message */}
                        <div className="flex gap-3 mb-4">
                          <div className="flex-shrink-0">
                            <div className="p-2 rounded-full" style={{ backgroundColor: '#F3F4F4' }}>
                              <User className="h-4 w-4" style={{ color: '#1D546D' }} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm" style={{ color: '#061E29' }}>You</span>
                              <span className="text-xs" style={{ color: '#1D546D' }}>
                                {msg.createdAt?.toLocaleString?.() || 
                                 new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div 
                              className="p-3 rounded-lg inline-block max-w-[80%]"
                              style={{ backgroundColor: '#F3F4F4' }}
                            >
                              <p className="text-sm" style={{ color: '#061E29' }}>{msg.message}</p>
                            </div>
                          </div>
                        </div>

                        {/* Seller Reply */}
                        {msg.reply && (
                          <div className="flex gap-3 ml-8">
                            <div className="flex-shrink-0">
                              <div className="p-2 rounded-full" style={{ backgroundColor: '#5F9598' }}>
                                <MessageSquare className="h-4 w-4" style={{ color: '#F3F4F4' }} />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm" style={{ color: '#5F9598' }}>Seller</span>
                                {msg.repliedAt && (
                                  <span className="text-xs" style={{ color: '#1D546D' }}>
                                    {new Date(msg.repliedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div 
                                className="p-3 rounded-lg inline-block max-w-[80%]"
                                style={{ backgroundColor: 'rgba(95, 149, 152, 0.1)' }}
                              >
                                <p className="text-sm" style={{ color: '#061E29' }}>{msg.reply}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="mt-2 flex justify-end">
                          <span 
                            className="text-xs font-semibold px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: msg.status === 'Unreplied' ? '#F3F4F4' : '#5F9598',
                              color: msg.status === 'Unreplied' ? '#1D546D' : '#F3F4F4'
                            }}
                          >
                            {msg.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center gap-4 fade-in">
          <Link 
            href="/customer/orders"
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 flex items-center gap-2"
            style={{ backgroundColor: '#1D546D', color: '#F3F4F4' }}
          >
            <MessageSquare className="h-4 w-4" />
            View My Orders
          </Link>
          <Link 
            href="/customer/shop"
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-90 flex items-center gap-2"
            style={{ backgroundColor: '#061E29', color: '#F3F4F4' }}
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Shop
          </Link>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F4;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1D546D;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5F9598;
        }
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