
import React from 'react';
import { ShoppingBag, UtensilsCrossed, Milk, Leaf, Candy, Apple, Zap } from 'lucide-react';

export const LANGUAGES = ['English', 'Hindi', 'Mathali', 'Bhojpuri', 'Malyalam', 'Urdu', 'Bangali', 'Marathi'];

export const CATEGORIES = [
  { id: 'all', name: 'All', icon: <ShoppingBag className="w-5 h-5" /> },
  { id: 'fastfood', name: 'Fast Food', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { id: 'sudha', name: 'Sudha', icon: <Milk className="w-5 h-5" /> },
  { id: 'bevegreg', name: 'Beverage', icon: <Zap className="w-5 h-5" /> },
  { id: 'vegitable', name: 'Vegetable', icon: <Leaf className="w-5 h-5" /> },
  { id: 'treats', name: 'Treats', icon: <Candy className="w-5 h-5" /> },
  { id: 'fruit', name: 'Fruits', icon: <Apple className="w-5 h-5" /> },
];

export const MOCK_PRODUCTS = [
  { id: '1', name: 'Burgir Supreme', price: 120, category: 'fastfood', image: 'https://picsum.photos/seed/burger/400/400', pincode: '800001', shopName: 'Patna Fast Center' },
  { id: '2', name: 'Sudha Milk 1L', price: 60, category: 'sudha', image: 'https://picsum.photos/seed/milk/400/400', pincode: '800001', shopName: 'Daily Dairy' },
  { id: '3', name: 'Fresh Apples 1kg', price: 180, category: 'fruit', image: 'https://picsum.photos/seed/apple/400/400', pincode: '800001', shopName: 'Green Farm' },
  { id: '4', name: 'Masala Dosa', price: 90, category: 'fastfood', image: 'https://picsum.photos/seed/dosa/400/400', pincode: '800001', shopName: 'South Indian Hub' },
  { id: '5', name: 'Mixed Veggies', price: 50, category: 'vegitable', image: 'https://picsum.photos/seed/veg/400/400', pincode: '800001', shopName: 'Sabzi Mandi' },
  { id: '6', name: 'Dark Chocolate', price: 150, category: 'treats', image: 'https://picsum.photos/seed/choc/400/400', pincode: '800001', shopName: 'Sweet Tooth' },
];

export const SLIDER_OFFERS = [
  { id: 1, text: "50% OFF on Fast Food!", color: "bg-red-500" },
  { id: 2, text: "Free Delivery for first 5 orders!", color: "bg-blue-600" },
  { id: 3, text: "Sudha Milk - Morning Slot Available!", color: "bg-green-500" },
];
