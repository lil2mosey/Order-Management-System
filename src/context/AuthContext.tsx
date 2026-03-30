'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole, Order, InventoryItem, InventoryTransaction } from '@/types';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  processPaymentAndDeductStock: (orderData: any, paymentMethod: string, transactionCode?: string) => Promise<string>; // Changed to Promise<string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Redirect based on user role
  const redirectToDashboard = (userData: User) => {
    if (userData.role === 'seller') {
      router.push('/dashboard');
    } else {
      router.push('/customer');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser(userData);
            console.log('User data loaded:', userData);
            
            // Only redirect if we're on an auth page
            if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/')) {
              redirectToDashboard(userData);
            }
          } else {
            console.log('No user document found');
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        console.log('No firebase user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Remove router dependency to prevent infinite loops

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      const userData: User = {
        uid: userCredential.user.uid,
        email,
        name,
        role,
        createdAt: new Date(),
        phone: '',
        address: '',
        displayName: '',
        phoneNumber: ''
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      setUser(userData);
      toast.success('Account created successfully!');
      
      // Redirect based on role
      if (role === 'seller') {
        router.push('/dashboard');
      } else {
        router.push('/customer');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred during sign up';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      toast.error(errorMessage);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user data including role
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser(userData);
        toast.success('Logged in successfully!');
        
        // Return the user credential
        return userCredential;
      } else {
        throw new Error('User data not found');
      }
    } catch (error: any) {
      let errorMessage = 'Invalid email or password';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Try again later';
      }
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      toast.success('Logged out successfully!');
      router.push('/auth/login');
    } catch (error: any) {
      toast.error('Error logging out');
      throw error;
    }
  };

  // Process payment and deduct stock
  const processPaymentAndDeductStock = async (
    orderData: any, 
    paymentMethod: string, 
    transactionCode?: string
  ): Promise<string> => {
    if (!user) {
      toast.error('Please login to continue');
      throw new Error('User not authenticated');
    }

    const batch = writeBatch(db);
    
    try {
      const orderId = 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
      
      // Create order object with all fields
      const order: Order = {
        id: orderId,
        orderId,
        customerId: user.uid,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        items: [{
          productId: orderData.productId,
          productName: orderData.productName,
          quantity: orderData.quantity,
          price: orderData.price,
          subtotal: orderData.price * orderData.quantity
        }],
        itemCount: orderData.quantity,
        subtotal: orderData.price * orderData.quantity,
        tax: 0,
        shipping: 0,
        totalAmount: orderData.amount,
        status: 'Pending',
        paymentStatus: 'Paid',
        paymentMethod: paymentMethod as any,
        transactionId: transactionCode,
        mpesaReceipt: paymentMethod === 'mpesa' ? transactionCode : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: ''
      };

      // Add order to batch
      const orderRef = doc(db, 'orders', orderId);
      batch.set(orderRef, order);

      // Update inventory - deduct stock
      const inventoryRef = doc(db, 'inventory', orderData.productId);
      const inventoryDoc = await getDoc(inventoryRef);
      
      if (!inventoryDoc.exists()) {
        throw new Error('Inventory item not found');
      }

      const inventoryData = inventoryDoc.data() as InventoryItem;
      const currentQuantity = inventoryData.quantity;
      const newQuantity = currentQuantity - orderData.quantity;

      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }

      // Update inventory quantity
      batch.update(inventoryRef, {
        quantity: newQuantity,
        status: newQuantity <= 0 ? 'Out of Stock' : 
                newQuantity <= (inventoryData.criticalStockThreshold || 5) ? 'Critical' :
                newQuantity <= (inventoryData.lowStockThreshold || 10) ? 'Low' : 'Ok',
        updatedAt: new Date()
      });

      // Create inventory transaction log with all required fields
      const transactionRef = doc(db, 'inventoryTransactions', `${orderId}_tx`);
      const inventoryTransaction: InventoryTransaction = {
        id: `${orderId}_tx`,
        itemId: orderData.productId,
        itemName: orderData.productName,
        type: 'sale',
        quantity: -orderData.quantity, // Negative for sale
        price: orderData.price, // Add the price per unit
        previousQuantity: currentQuantity,
        newQuantity: newQuantity,
        referenceId: orderId,
        referenceType: 'order',
        notes: `Sale via ${paymentMethod}`,
        createdBy: user.uid,
        createdAt: new Date()
      };
      batch.set(transactionRef, inventoryTransaction);

      // Create payment record
      const paymentRef = doc(db, 'payments', `PAY_${orderId}`);
      const payment = {
        id: `PAY_${orderId}`,
        orderId,
        customerId: user.uid,
        customerName: user.name,
        amount: orderData.amount,
        method: paymentMethod,
        status: 'Completed',
        transactionId: transactionCode,
        mpesaReceipt: paymentMethod === 'mpesa' ? transactionCode : undefined,
        phoneNumber: orderData.phoneNumber,
        paymentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      batch.set(paymentRef, payment);

      // Commit all changes
      await batch.commit();
      
      toast.success('Payment processed and stock updated successfully!');
      
      return orderId; // Return order ID for redirection if needed
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser,
      loading, 
      signUp, 
      signIn, 
      logout,
      processPaymentAndDeductStock 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}