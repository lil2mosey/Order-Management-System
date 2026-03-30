// User Types
export type UserRole = 'customer' | 'seller';

export interface User {
  displayName: string;
  phoneNumber: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

// Order Types
export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Refunded';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Refunded' | 'Partially Paid';
export type PaymentMethod = 'M-Pesa' | 'Cash' | 'Bank Transfer' | 'Card' | 'Mobile Money';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount?: number;
  tax?: number;
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount?: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  mpesaReceipt?: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
}

// Inventory Types
export type InventoryStatus = 'Ok' | 'Low' | 'Critical' | 'Out of Stock';

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  price: number;
  cost?: number;
  status: InventoryStatus;
  lowStockThreshold: number;
  criticalStockThreshold?: number;
  category?: string;
  supplier?: string;
  supplierContact?: string;
  location?: string;
  imageUrl?: string;
  lastRestocked?: Date;
  lastSold?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalValue: number; // quantity * price
  profit?: number; // (price - cost) * quantity
}

// Inventory Transaction Types
export type InventoryTransactionType = 'restock' | 'sale' | 'adjustment' | 'return' | 'damage' | 'transfer';

export interface InventoryTransaction {
  price: number;
  id: string;
  itemId: string;
  itemName: string;
  type: InventoryTransactionType;
  quantity: number; // Positive for restock, negative for sale/damage
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string; // Order ID if from sale, PO ID if from restock
  referenceType?: 'order' | 'purchase' | 'manual' | 'return';
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

// Message Types
export type MessageStatus = 'Unreplied' | 'Replied' | 'Archived';

export interface Message {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  message: string;
  status: MessageStatus;
  reply?: string;
  repliedAt?: Date;
  repliedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Payment Types
export type PaymentStatus_ = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

export interface Payment {
  id: string;
  orderId: string;
  order?: Partial<Order>;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus_;
  transactionId?: string;
  mpesaReceipt?: string;
  phoneNumber?: string;
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Stock Alert Types
export type StockAlertType = 'low' | 'critical' | 'out';
export type StockAlertStatus = 'active' | 'resolved' | 'ignored';

export interface StockAlert {
  id: string;
  itemId: string;
  itemName: string;
  currentQuantity: number;
  threshold: number;
  type: StockAlertType;
  status: StockAlertStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Order Inventory Impact (for tracking stock changes)
export interface OrderInventoryImpact {
  orderId: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    price: number;
    subtotal: number;
  }>;
  totalImpact: number;
  totalValue: number;
  timestamp: Date;
}

// Dashboard Stats Type
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalProfit?: number;
  lowStockItems: number;
  criticalStockItems: number;
  outOfStockItems: number;
  unreadMessages: number;
  recentOrders: Order[];
  topSellingItems?: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    revenue: number;
  }>;
}

// Customer Dashboard Stats
export interface CustomerStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  recentOrders: Order[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter Types
export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface InventoryFilters {
  status?: InventoryStatus;
  category?: string;
  supplier?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
}