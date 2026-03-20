'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  User, 
  Clock,
  AlertCircle,
  Mail,
  MailOpen,
  Reply,
  X
} from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('all');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(messagesQuery);
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'messages', selectedMessage.id), {
        status: 'Replied',
        reply: replyText,
        repliedAt: new Date()
      });
      
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">✓ Reply Sent!</span>
          <span className="text-sm">Your reply has been sent to {selectedMessage.customerName}</span>
        </div>
      );
      
      setSelectedMessage(null);
      setReplyText('');
      fetchMessages();
    } catch (error) {
      toast.error('Error sending reply');
    }
  };

  const handleMarkReplied = async (message: Message) => {
    try {
      await updateDoc(doc(db, 'messages', message.id), {
        status: 'Replied',
        repliedAt: new Date()
      });
      toast.success('Message marked as replied');
      fetchMessages();
    } catch (error) {
      toast.error('Error updating message');
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filter === 'unreplied') return message.status === 'Unreplied';
    if (filter === 'replied') return message.status === 'Replied';
    return true;
  });

  const unrepliedCount = messages.filter(m => m.status === 'Unreplied').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F3F4F4' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#061E29' }}>
              <MessageSquare className="h-6 w-6" style={{ color: '#F3F4F4' }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#061E29' }}>Customer Messages</h1>
          </div>
          <p className="text-lg ml-14" style={{ color: '#1D546D' }}>
            Manage and respond to customer inquiries
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 fade-in">
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
                <AlertCircle className="h-6 w-6 text-yellow-600" />
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
                <MailOpen className="h-6 w-6" style={{ color: '#5F9598' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 fade-in">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === 'all' 
                ? 'text-white shadow-lg' 
                : 'hover:opacity-80'
            }`}
            style={{ 
              backgroundColor: filter === 'all' ? '#061E29' : '#F3F4F4',
              color: filter === 'all' ? '#F3F4F4' : '#1D546D'
            }}
          >
            All Messages
          </button>
          <button
            onClick={() => setFilter('unreplied')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === 'unreplied' 
                ? 'text-white shadow-lg' 
                : 'hover:opacity-80'
            }`}
            style={{ 
              backgroundColor: filter === 'unreplied' ? '#EAB308' : '#F3F4F4',
              color: filter === 'unreplied' ? 'white' : '#1D546D'
            }}
          >
            Unreplied ({unrepliedCount})
          </button>
          <button
            onClick={() => setFilter('replied')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === 'replied' 
                ? 'text-white shadow-lg' 
                : 'hover:opacity-80'
            }`}
            style={{ 
              backgroundColor: filter === 'replied' ? '#5F9598' : '#F3F4F4',
              color: filter === 'replied' ? 'white' : '#1D546D'
            }}
          >
            Replied
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border fade-in" style={{ borderColor: '#F3F4F4' }}>
            <div className="p-4" style={{ backgroundColor: '#061E29' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#F3F4F4' }}>
                <MessageSquare className="h-5 w-5" />
                Messages ({filteredMessages.length})
              </h2>
            </div>
            
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto mb-3" style={{ color: '#1D546D', opacity: 0.5 }} />
                <p className="font-medium" style={{ color: '#061E29' }}>No messages found</p>
                <p className="text-sm mt-1" style={{ color: '#1D546D' }}>
                  {filter !== 'all' ? 'Try changing your filter' : 'No messages available'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#F3F4F4' }}>
                {filteredMessages.map((message) => (
                  <div 
                    key={message.id} 
                    onClick={() => handleSelectMessage(message)}
                    className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedMessage?.id === message.id 
                        ? 'border-l-4' 
                        : ''
                    } ${message.status === 'Unreplied' ? 'bg-yellow-50/30' : ''}`}
                    style={{ 
                      borderLeftColor: selectedMessage?.id === message.id ? '#5F9598' : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-full" style={{ backgroundColor: '#F3F4F4' }}>
                          <User className="h-5 w-5" style={{ color: '#1D546D' }} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold truncate" style={{ color: '#061E29' }}>
                            {message.customerName}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            message.status === 'Unreplied' 
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            {message.status}
                          </span>
                        </div>
                        <p className="text-sm italic line-clamp-2 mb-2" style={{ color: '#1D546D' }}>
                          "{message.message}"
                        </p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#5F9598' }}>
                          <Clock className="h-3 w-3" />
              
                        </div>
                        {message.reply && (
                          <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: '#061E29' }}>Reply:</p>
                            <p className="text-xs italic" style={{ color: '#1D546D' }}>"{message.reply}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Reply Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border fade-in" style={{ borderColor: '#F3F4F4' }}>
            {selectedMessage ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#5F9598' }}>
                    <Reply className="h-5 w-5" style={{ color: '#F3F4F4' }} />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: '#061E29' }}>
                    Reply to {selectedMessage.customerName}
                  </h2>
                </div>
                
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F3F4F4' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: '#061E29' }}>Original Message:</p>
                  <p className="italic" style={{ color: '#1D546D' }}>"{selectedMessage.message}"</p>
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#5F9598' }}>
                    <Clock className="h-3 w-3" />
          
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1D546D' }}>
                    Your Reply
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-4 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#F3F4F4',
                      color: '#061E29',
                      backgroundColor: '#F3F4F4'
                    }}
                    rows={5}
                    placeholder="Type your reply here..."
                  />
                </div>
  
                <div className="flex gap-3">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    className="flex-1 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#5F9598', color: '#F3F4F4' }}
                  >
                    <Send className="h-4 w-4" />
                    Send Reply
                  </button>
                  <button
                    onClick={() => handleMarkReplied(selectedMessage)}
                    className="flex-1 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#1D546D', color: '#F3F4F4' }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Replied
                  </button>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="mt-3 w-full py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 flex items-center justify-center gap-2"
                  style={{ color: '#1D546D' }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4" style={{ backgroundColor: '#F3F4F4' }}>
                  <MessageSquare className="h-8 w-8" style={{ color: '#1D546D' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#061E29' }}>No Message Selected</h3>
                <p className="text-sm" style={{ color: '#1D546D' }}>
                  Select a message from the list to reply
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Footer */}
        {messages.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 border fade-in" style={{ borderColor: '#F3F4F4' }}>
            <div className="flex flex-wrap justify-between items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: '#061E29' }}>Response Rate:</span>
                <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F4', color: '#1D546D' }}>
                  {Math.round((messages.filter(m => m.status === 'Replied').length / messages.length) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: '#061E29' }}>Avg Response Time:</span>
                <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#F3F4F4', color: '#1D546D' }}>
                  Simulated
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: '#061E29' }}>Pending:</span>
                <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#EAB308', color: 'white' }}>
                  {unrepliedCount}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}