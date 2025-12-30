
export type Language = 'English' | 'Hindi' | 'Mathali' | 'Bhojpuri' | 'Malyalam' | 'Urdu' | 'Bangali' | 'Marathi';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  pincode: string;
  shopName: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Placed' | 'Confirmed' | 'Shipped' | 'Out for Delivery' | 'Delivered';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  date: string;
}

export interface User {
  name: string;
  mobile: string;
  email: string;
  pincode: string;
  address: string;
}
