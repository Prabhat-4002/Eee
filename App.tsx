
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  ShoppingCart, Home, Heart, User as UserIcon, LogOut, Menu, Search, Globe, 
  ChevronRight, X, Phone, Play, Youtube, Facebook, Instagram, MessageCircle, 
  Zap, ShoppingBag, MapPin, Navigation, Settings, Check, Send, ExternalLink,
  Package, CheckCircle2, Truck, ClipboardList, ArrowLeft, Mic, MicOff, Loader2
} from 'lucide-react';
import { MOCK_PRODUCTS, CATEGORIES, LANGUAGES, SLIDER_OFFERS } from './constants';
import { Product, CartItem, Order, OrderStatus, Language, User } from './types';
import SplashScreen from './components/SplashScreen';
import Logo from './components/Logo';
import { getHelpAnswer, addToCartTool } from './services/geminiService';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateProfile
} from 'firebase/auth';

// --- Contexts ---
const CartContext = createContext<any>(null);
const AuthContext = createContext<any>(null);

// --- Audio Helpers ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>('English');
  const [pincodeFilter, setPincodeFilter] = useState('800001');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        setUser({
          name: firebaseUser.displayName || 'User',
          mobile: firebaseUser.phoneNumber || 'N/A',
          email: firebaseUser.email || '',
          pincode: '800001',
          address: 'Synced Address'
        });
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const placeOrder = (total: number) => {
    const newOrder: Order = {
      id: `QFD-${Math.floor(Math.random() * 90000) + 10000}`,
      items: [...cart],
      total,
      status: 'Placed',
      date: new Date().toLocaleDateString()
    };
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    alert(`Order ${newOrder.id} Placed! Tracking is active.`);
    setActiveTab('orders');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setActiveTab('home');
  };

  if (showSplash) return <SplashScreen />;

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, user, setUser, selectedLang, setSelectedLang, handleLogout }}>
      <CartContext.Provider value={{ 
        cart, setCart, addToCart, removeFromCart, updateQuantity, 
        wishlist, toggleWishlist, pincodeFilter, setPincodeFilter, 
        orders, placeOrder, selectedOrder, setSelectedOrder 
      }}>
        <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto relative shadow-2xl border-x overflow-x-hidden">
          {!isLoggedIn ? (
            <LoginFlow />
          ) : (
            <>
              {activeTab === 'settings' && <SettingsView onBack={() => setActiveTab('profile')} />}
              {activeTab === 'help' && <HelpAssistantView onBack={() => setActiveTab('profile')} />}
              {activeTab === 'orders' && <OrderHistoryView onBack={() => setActiveTab('profile')} onViewTracking={(o) => { setSelectedOrder(o); setActiveTab('tracking'); }} />}
              {activeTab === 'tracking' && <OrderTrackingView order={selectedOrder} onBack={() => setActiveTab('orders')} />}
              
              {!['settings', 'help', 'orders', 'tracking'].includes(activeTab) && (
                <>
                  <Header onProfileClick={() => setActiveTab('profile')} onSearchClick={() => setIsSearchOpen(true)} />
                  {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}
                  <main className="px-4 pt-4">
                    {activeTab === 'home' && <HomeView />}
                    {activeTab === 'wishlist' && <WishlistView />}
                    {activeTab === 'cart' && <CartView />}
                    {activeTab === 'profile' && (
                      <ProfileView 
                        onOpenSettings={() => setActiveTab('settings')} 
                        onOpenHelp={() => setActiveTab('help')} 
                        onOpenOrders={() => setActiveTab('orders')}
                      />
                    )}
                  </main>
                  
                  {activeTab === 'home' && (
                    <button 
                      onClick={() => setIsVoiceAssistantOpen(true)}
                      className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-transform animate-bounce hover:animate-none"
                    >
                      <Mic className="w-6 h-6" />
                      <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20 -z-10" />
                    </button>
                  )}

                  {isVoiceAssistantOpen && <VoiceAssistantOverlay onClose={() => setIsVoiceAssistantOpen(false)} />}
                  <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
                </>
              )}
            </>
          )}
        </div>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

// --- Components ---

function VoiceAssistantOverlay({ onClose }: { onClose: () => void }) {
  const { addToCart } = useContext(CartContext);
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'idle'>('connecting');
  const [userTranscript, setUserTranscript] = useState('');
  const [botTranscript, setBotTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    let isActive = true;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isActive) return;

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputContext.createGain();
        outputNode.connect(outputContext.destination);

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: 'You are QFD Assistant. Help users order food. Use the addItemToCart tool when they name a food item (Burgir, Milk, etc). Keep answers short.',
            tools: [{ functionDeclarations: [addToCartTool] }],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              setStatus('listening');
              const source = audioContextRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current!.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (msg.serverContent?.inputTranscription) {
                setUserTranscript(prev => prev + msg.serverContent!.inputTranscription!.text);
              }
              if (msg.serverContent?.outputTranscription) {
                setBotTranscript(prev => prev + msg.serverContent!.outputTranscription!.text);
              }
              if (msg.serverContent?.turnComplete) {
                setUserTranscript('');
                setBotTranscript('');
              }

              const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioData) {
                setStatus('speaking');
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
                const buffer = await decodeAudioData(decode(audioData), outputContext, 24000, 1);
                const source = outputContext.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNode);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setStatus('listening');
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }

              if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                  if (fc.name === 'addItemToCart') {
                    const itemName = (fc.args as any).itemName;
                    const product = MOCK_PRODUCTS.find(p => p.name.toLowerCase().includes(itemName.toLowerCase()));
                    if (product) {
                      addToCart(product);
                      sessionPromise.then(s => s.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result: `Success! Added ${product.name} to cart.` } }
                      }));
                    } else {
                      sessionPromise.then(s => s.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result: `Sorry, I couldn't find ${itemName} in stock.` } }
                      }));
                    }
                  }
                }
              }

              if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e) => {
              console.error(e);
              setError("Connection error. Try again.");
            },
            onclose: () => onClose(),
          }
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        setError("Microphone access required.");
      }
    };

    startSession();
    return () => {
      isActive = false;
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-blue-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 animate-in fade-in zoom-in duration-300">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full">
        <X className="w-8 h-8" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center space-y-8">
        <div className="relative">
          <div className={`w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center transition-all duration-500 ${status === 'speaking' || status === 'listening' ? 'scale-110' : ''}`}>
             <div className={`w-24 h-24 rounded-full bg-blue-400 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)] ${status === 'listening' ? 'animate-pulse' : ''}`}>
               {status === 'connecting' ? <Loader2 className="w-10 h-10 animate-spin" /> : <Mic className="w-10 h-10" />}
             </div>
             {(status === 'speaking' || status === 'listening') && (
               <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-30" />
             )}
          </div>
        </div>

        <div className="space-y-4 w-full">
          <h2 className="text-2xl font-black uppercase tracking-widest">
            {status === 'connecting' ? 'Waking Up AI...' : status === 'listening' ? 'Listening...' : status === 'speaking' ? 'QFD Assistant' : 'Ready'}
          </h2>
          
          <div className="min-h-[100px] space-y-4">
             {userTranscript && (
               <div className="p-4 bg-white/10 rounded-2xl text-sm font-bold animate-in slide-in-from-bottom">
                 <p className="text-blue-300 text-[10px] uppercase font-black mb-1">You</p>
                 <p>"{userTranscript}"</p>
               </div>
             )}
             {botTranscript && (
               <div className="p-4 bg-blue-600/50 rounded-2xl text-sm font-black animate-in slide-in-from-bottom border border-blue-400">
                 <p className="text-white/60 text-[10px] uppercase font-black mb-1">QFD AI</p>
                 <p>{botTranscript}</p>
               </div>
             )}
          </div>
        </div>

        {error && <p className="text-red-400 font-bold uppercase text-xs tracking-widest">{error}</p>}
        
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
          Try saying: "Add milk to my cart"
        </p>
      </div>
    </div>
  );
}

function Header({ onProfileClick, onSearchClick }: { onProfileClick: () => void, onSearchClick: () => void }) {
  const { selectedLang } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Logo size="sm" showCart={false} />
        <span className="font-black text-xl text-blue-900 tracking-tighter">QFD</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative group flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full text-[10px] font-bold text-slate-600">
          <Globe className="w-3 h-3" />
          {selectedLang}
        </div>
        <button onClick={onSearchClick} className="bg-gray-100 p-1.5 rounded-full">
          <Search className="w-5 h-5 text-gray-600" />
        </button>
        <button onClick={onProfileClick} className="bg-blue-100 p-1.5 rounded-full">
          <UserIcon className="w-5 h-5 text-blue-600" />
        </button>
      </div>
    </header>
  );
}

function OrderHistoryView({ onBack, onViewTracking }: { onBack: () => void, onViewTracking: (o: Order) => void }) {
  const { orders } = useContext(CartContext);

  return (
    <div className="min-h-screen bg-slate-50 animate-in slide-in-from-right duration-300">
      <div className="p-4 flex items-center gap-4 bg-white shadow-sm sticky top-0 z-50">
        <button onClick={onBack} className="p-2"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">My Orders</h2>
      </div>

      <div className="p-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 opacity-30 flex flex-col items-center">
             <ClipboardList className="w-20 h-20 mb-4" />
             <p className="font-bold">No orders placed yet.</p>
          </div>
        ) : (
          orders.map((order: Order) => (
            <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.id}</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{order.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">{order.date}</p>
                  <p className="font-black text-lg text-slate-800">₹{order.total}</p>
                </div>
                <button 
                  onClick={() => onViewTracking(order)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Track Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OrderTrackingView({ order, onBack }: { order: Order | null, onBack: () => void }) {
  if (!order) return null;

  const steps: { status: OrderStatus, icon: any, label: string }[] = [
    { status: 'Placed', icon: <Package />, label: 'Order Received' },
    { status: 'Confirmed', icon: <CheckCircle2 />, label: 'Shop Confirmed' },
    { status: 'Shipped', icon: <Truck />, label: 'Shipped to Hub' },
    { status: 'Out for Delivery', icon: <Navigation />, label: 'On the Way' },
    { status: 'Delivered', icon: <MapPin />, label: 'Arrived at Destination' },
  ];

  const currentIdx = steps.findIndex(s => s.status === order.status);

  return (
    <div className="min-h-screen bg-slate-50 animate-in slide-in-from-right duration-300">
      <div className="p-4 flex items-center gap-4 bg-white shadow-sm sticky top-0 z-50">
        <button onClick={onBack} className="p-2"><ArrowLeft className="w-6 h-6" /></button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Track Order</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.id}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative">
          <div className="absolute left-12 top-12 bottom-12 w-0.5 bg-slate-100" />
          
          <div className="space-y-12">
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div key={step.status} className="flex items-center gap-6 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isCompleted ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                    {React.cloneElement(step.icon as React.ReactElement<any>, { size: 20 })}
                  </div>
                  <div>
                    <p className={`font-black text-sm uppercase tracking-tight ${isCompleted ? 'text-slate-800' : 'text-slate-300'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest animate-pulse">
                        In Progress...
                      </p>
                    )}
                  </div>
                  {isCompleted && !isCurrent && (
                    <div className="ml-auto text-green-500">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-blue-600 text-white p-6 rounded-3xl shadow-xl space-y-3">
          <h3 className="font-black uppercase tracking-widest text-xs">Delivery Address</h3>
          <p className="text-sm font-bold opacity-90">{order.items[0]?.shopName} 🚚 Local Area Delivery</p>
          <div className="flex items-center gap-2 pt-2 border-t border-white/20 mt-4">
            <Phone size={16} />
            <span className="font-black text-xs uppercase">Contact Delivery Boy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { addToCart } = useContext(CartContext);
  
  const results = query.length > 1 
    ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) 
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-top duration-300">
      <div className="max-w-md mx-auto h-full flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b">
          <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-slate-500" /></button>
          <input 
            autoFocus
            type="text" 
            placeholder="Search products..." 
            className="flex-1 bg-slate-100 p-3 rounded-xl outline-none font-bold text-slate-700"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {query.length > 0 && results.length === 0 && (
            <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">No results found</div>
          )}
          {results.map(product => (
            <div key={product.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <img src={product.image} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">{product.name}</h4>
                <p className="text-blue-600 font-black">₹{product.price}</p>
              </div>
              <button onClick={() => { addToCart(product); onClose(); }} className="bg-blue-600 text-white p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelpAssistantView({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string, videoUrl?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const botAnswer = await getHelpAnswer(userMsg);
    
    setMessages(prev => [...prev, { 
      role: 'bot', 
      content: typeof botAnswer === 'string' ? botAnswer : botAnswer.answer,
      videoUrl: botAnswer.videoUrl
    }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col max-w-md mx-auto animate-in slide-in-from-right">
      <div className="p-4 flex items-center gap-4 border-b bg-blue-600 text-white shadow-lg">
        <button onClick={onBack} className="p-1"><X className="w-6 h-6" /></button>
        <div className="flex-1">
           <h2 className="font-black text-lg tracking-tighter uppercase">Smart Assistant</h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-3xl font-bold text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'}`}>
              <p>{m.content}</p>
              {m.videoUrl && (
                <a 
                  href={m.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 bg-slate-100 p-2 rounded-xl text-blue-600 border border-blue-100"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span className="text-[10px] uppercase font-black">Watch Tutorial</span>
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs font-black text-slate-400 animate-pulse">Typing...</div>}
      </div>

      <div className="p-4 bg-white border-t flex gap-2">
        <input 
          type="text" 
          placeholder="Ask QFD Help..." 
          className="flex-1 bg-slate-100 p-4 rounded-2xl outline-none font-bold"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Footer({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { cart } = useContext(CartContext);
  const cartCount = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const tabs = [
    { id: 'home', icon: <Home className="w-6 h-6" />, label: 'Home' },
    { id: 'wishlist', icon: <Heart className="w-6 h-6" />, label: 'Wishlist' },
    { id: 'cart', icon: <div className="relative"><ShoppingCart className="w-6 h-6" />{cartCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}</div>, label: 'Cart' },
    { id: 'profile', icon: <UserIcon className="w-6 h-6" />, label: 'Profile' },
  ];

  return (
    <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex justify-around py-3 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id || (['settings', 'help', 'orders', 'tracking'].includes(activeTab) && tab.id === 'profile') ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </footer>
  );
}

function LoginFlow() {
  const { setIsLoggedIn, setUser } = useContext(AuthContext);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mobile: '', password: '', name: '', email: '', state: '', district: '', area: '', pincode: ''
  });

  const handleAuthError = (err: any) => {
    let msg = "Something went wrong.";
    if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
    if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
    if (err.code === 'auth/email-already-in-use') msg = "Email already registered.";
    alert(msg);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return alert("Email and Password required.");
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) return alert("All fields required.");

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await updateProfile(userCred.user, { displayName: formData.name });
      // setUser is handled by onAuthStateChanged listener in App
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'register') {
    return (
      <div className="p-8 space-y-6">
        <h2 className="text-3xl font-bold text-blue-900 uppercase tracking-tighter">Register Account</h2>
        <form onSubmit={handleRegister} className="grid gap-4">
          <input type="text" placeholder="Full Name" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input type="email" placeholder="Email Address" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white font-black uppercase py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing...' : 'Create Account'}
          </button>
          <button type="button" onClick={() => setView('login')} className="text-blue-600 font-bold uppercase text-xs">Already have an account? Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white">
      <Logo size="lg" />
      <h1 className="text-4xl font-extrabold text-blue-900 mb-1 mt-4 tracking-tighter uppercase">QFD App</h1>
      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-10">Fastest Food & Groceries Delivery</p>

      <div className="w-full space-y-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 border-transparent rounded-2xl font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-transparent rounded-2xl font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black uppercase py-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Logging In...' : 'Sign In'}
          </button>
        </form>

        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mt-4">
          <button onClick={() => setView('register')} className="text-blue-600">Register New</button>
          <button className="text-slate-400">Forgot Password?</button>
        </div>
      </div>
    </div>
  );
}

function HomeView() {
  const { addToCart, wishlist, toggleWishlist, pincodeFilter } = useContext(CartContext);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const slideTimer = setInterval(() => setCurrentSlide(s => (s + 1) % SLIDER_OFFERS.length), 4000);
    return () => clearInterval(slideTimer);
  }, []);

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const categoryMatch = selectedCategory === 'all' || p.category === selectedCategory;
    const pincodeMatch = p.pincode === pincodeFilter;
    return categoryMatch && pincodeMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded-r-lg flex items-center gap-3">
        <Zap className="w-5 h-5 text-blue-600 fill-blue-600" />
        <div className="text-xs text-blue-900 font-bold">
          <p>Morning Slot: 07:00 AM - 10:00 AM</p>
          <p>Evening Slot: 04:00 PM - 07:00 PM</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl h-36 shadow-md">
        <div className="flex transition-transform duration-500 h-full" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {SLIDER_OFFERS.map((offer) => (
            <div key={offer.id} className={`min-w-full h-full ${offer.color} flex items-center justify-center text-white text-center px-6`}>
              <h3 className="text-xl font-black uppercase tracking-tight">{offer.text}</h3>
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {SLIDER_OFFERS.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />)}
        </div>
      </div>

      <section>
        <div className="flex justify-between items-end mb-3">
          <h2 className="font-black text-lg text-slate-800 tracking-tight uppercase">Categories</h2>
          <button className="text-blue-600 text-xs font-bold underline">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-col items-center gap-2 min-w-[70px] transition-all ${selectedCategory === cat.id ? 'scale-110' : ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>
                {cat.icon}
              </div>
              <span className={`text-[10px] font-black uppercase ${selectedCategory === cat.id ? 'text-blue-600' : 'text-slate-400'}`}>{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="pb-4">
        <h2 className="font-black text-lg text-slate-800 tracking-tight uppercase mb-3">Popular Stores</h2>
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => {
            const isWishlisted = (wishlist as Product[]).some(p => p.id === product.id);
            return (
              <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 relative group active:scale-95 transition-all">
                <button 
                  onClick={() => toggleWishlist(product)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm"
                >
                  <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-300'}`} />
                </button>
                <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-slate-50">
                  <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{product.shopName}</p>
                  <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{product.name}</h4>
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <span className="font-black text-blue-600">₹{product.price}</span>
                    <button onClick={() => addToCart(product)} className="bg-blue-600 text-white p-2 rounded-xl shadow-md active:bg-blue-700 transition-all">
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function WishlistView() {
  const { wishlist, addToCart, toggleWishlist } = useContext(CartContext);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Favorites ❤️</h2>
      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Heart className="w-20 h-20 mb-4 opacity-10" />
          <p className="font-bold">No saved items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {(wishlist as Product[]).map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <div className="aspect-square rounded-xl overflow-hidden mb-3">
                <img src={product.image} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-bold text-slate-800 line-clamp-1">{product.name}</h4>
              <div className="flex items-center justify-between mt-2">
                <span className="font-black text-blue-600">₹{product.price}</span>
                <div className="flex gap-2">
                   <button onClick={() => toggleWishlist(product)} className="text-red-500 p-1.5"><Heart className="w-4 h-4 fill-current" /></button>
                   <button onClick={() => addToCart(product)} className="bg-blue-600 text-white p-1.5 rounded-lg"><ShoppingBag className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CartView() {
  const { cart, removeFromCart, updateQuantity, placeOrder } = useContext(CartContext);
  const [distance, setDistance] = useState(0);
  const [addressInput, setAddressInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('UPI');
  const [isOrdering, setIsOrdering] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const subtotal = (cart as CartItem[]).reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const currentHour = new Date().getHours();
  const nightSurcharge = currentHour >= 19 ? 5 : 0;
  const deliveryFee = distance <= 6 ? 0 : (distance - 6) * 5;
  const totalDeliveryCharge = deliveryFee + (distance > 0 ? nightSurcharge : 0);
  const total = subtotal + totalDeliveryCharge;

  const handleFetchGps = () => {
    setIsGpsLoading(true);
    setTimeout(() => {
      const simulatedDist = Math.floor(Math.random() * 12) + 1;
      setDistance(simulatedDist);
      setAddressInput(`${simulatedDist}km Linked Delivery`);
      setIsGpsLoading(false);
    }, 1500);
  };

  const handlePlaceOrder = () => {
    if (currentHour >= 21) {
      alert("Service Closed! Opens 7 AM.");
      return;
    }
    if (subtotal < 80) {
      alert("Min ₹80 order required.");
      return;
    }
    if (distance > 10) {
      alert("Delivery up to 10km only.");
      return;
    }
    if (!addressInput) {
      alert("Sync GPS Location first.");
      return;
    }

    setIsOrdering(true);
    setTimeout(() => {
      placeOrder(total);
      setIsOrdering(false);
    }, 2000);
  };

  if ((cart as CartItem[]).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <ShoppingCart className="w-20 h-20 mb-4 opacity-10" />
        <p className="font-bold uppercase tracking-widest text-xs">Bag is empty</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Checkout 🛍️</h2>
      
      <div className="space-y-4">
        {(cart as CartItem[]).map(item => (
          <div key={item.id} className="bg-white p-3 rounded-2xl flex gap-4 shadow-sm border border-slate-100">
            <img src={item.image} className="w-16 h-16 rounded-xl object-cover" />
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                <p className="text-blue-600 font-black">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-2 py-1">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 flex items-center justify-center font-bold text-slate-400">-</button>
                  <span className="text-xs font-black">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 flex items-center justify-center font-bold text-blue-600">+</button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-400"><X className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-600 p-5 rounded-3xl text-white space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-widest"><Navigation size={14} className="inline mr-2" /> GPS Tracker</h3>
          <button 
            onClick={handleFetchGps}
            className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase ${isGpsLoading ? 'bg-blue-500' : 'bg-white text-blue-600 active:scale-95'}`}
            disabled={isGpsLoading}
          >
            {isGpsLoading ? 'Syncing...' : 'Sync GPS'}
          </button>
        </div>
        <div className="space-y-1 text-xs font-bold text-blue-100">
          <div className="flex justify-between"><span>Distance:</span><span>{distance} km</span></div>
          <div className="flex justify-between"><span>Evening Extra:</span><span>₹{nightSurcharge}</span></div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex justify-between font-bold text-sm text-slate-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
        <div className="flex justify-between font-bold text-sm text-slate-500"><span>Delivery</span><span>₹{totalDeliveryCharge}</span></div>
        <div className="border-t-2 border-slate-50 pt-3 mt-3 flex justify-between font-black text-2xl text-blue-900 uppercase"><span>Total</span><span>₹{total}</span></div>
      </div>

      <div className="space-y-4">
        <h3 className="font-black uppercase text-xs tracking-widest">Payment Mode</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setPaymentMethod('COD')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-1 ${paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-300 opacity-60'}`}>
            <span className="font-black">COD</span>
            <span className="text-[10px] uppercase font-bold">Cash</span>
          </button>
          <button onClick={() => setPaymentMethod('UPI')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-1 ${paymentMethod === 'UPI' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-300 opacity-60'}`}>
            <span className="font-black">UPI / QR</span>
            <span className="text-[10px] uppercase font-bold">Online</span>
          </button>
        </div>
        
        {paymentMethod === 'UPI' && (
          <div className="bg-slate-900 text-white p-8 rounded-[40px] flex flex-col items-center text-center shadow-2xl">
             <div className="w-36 h-36 bg-white p-3 rounded-2xl shadow-inner border-4 border-blue-500">
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=QFD-PAY-${total}&color=2563eb`} alt="QR" className="w-full h-full" />
             </div>
             <p className="mt-4 font-black text-2xl text-blue-400">₹{total}</p>
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Scan for instant sync</p>
          </div>
        )}
      </div>

      <button 
        disabled={isOrdering || currentHour >= 21}
        onClick={handlePlaceOrder} 
        className={`w-full py-5 rounded-3xl text-white font-black text-xl shadow-2xl transition-all ${isOrdering || currentHour >= 21 ? 'bg-slate-300 grayscale' : 'bg-blue-600 active:scale-95 shadow-blue-200'}`}
      >
        {isOrdering ? 'Securing...' : 'Place Secure Order'}
      </button>
    </div>
  );
}

function ProfileView({ onOpenSettings, onOpenHelp, onOpenOrders }: { onOpenSettings: () => void, onOpenHelp: () => void, onOpenOrders: () => void }) {
  const { user, handleLogout } = useContext(AuthContext);

  const socialLinks = [
    { name: 'YouTube', icon: <Youtube />, color: 'bg-red-600', url: 'https://youtube.com' },
    { name: 'Facebook', icon: <Facebook />, color: 'bg-blue-700', url: 'https://facebook.com' },
    { name: 'Instagram', icon: <Instagram />, color: 'bg-pink-600', url: 'https://instagram.com' },
    { name: 'WhatsApp', icon: <MessageCircle />, color: 'bg-green-600', url: 'https://whatsapp.com' },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500 pb-10">
      <div className="flex flex-col items-center pt-4">
        <Logo size="lg" showCart={false} />
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mt-4">{user?.name}</h3>
        <p className="text-blue-600 font-black text-sm">{user?.email}</p>
        <div className="bg-slate-100 px-4 py-1.5 rounded-full mt-2 text-center max-w-[80%]">
           <p className="text-slate-500 text-[10px] font-bold line-clamp-1">{user?.address}</p>
        </div>
      </div>

      <div className="grid gap-2.5">
        <ProfileItem icon={<ShoppingBag />} label="My Orders" sub="Track active & past" onClick={onOpenOrders} />
        <ProfileItem icon={<Settings />} label="App Settings" sub="Language & UI" onClick={onOpenSettings} />
        <ProfileItem icon={<Play />} label="Tutorials" sub="App guide videos" onClick={onOpenHelp} />
        <ProfileItem icon={<MessageCircle />} label="AI Smart Help" sub="Ask anything about QFD" onClick={onOpenHelp} />
        <ProfileItem icon={<Phone />} label="Customer Support" sub="Live Agent assistance" onClick={() => alert("Call initiated...")} />
      </div>

      <section className="space-y-4 px-2">
        <h4 className="font-black text-slate-400 uppercase tracking-[0.3em] text-[9px] text-center">Join Our Channels</h4>
        <div className="grid grid-cols-2 gap-3">
          {socialLinks.map(link => (
            <button 
              key={link.name} 
              onClick={() => window.open(link.url, '_blank')}
              className={`${link.color} text-white flex items-center justify-center gap-3 py-4 rounded-3xl shadow-lg active:scale-95 transition-all`}
            >
              {React.cloneElement(link.icon as React.ReactElement<any>, { size: 18 })}
              <span className="text-[10px] font-black uppercase tracking-widest">{link.name}</span>
            </button>
          ))}
        </div>
      </section>

      <button onClick={handleLogout} className="w-full p-5 rounded-3xl bg-red-50 text-red-600 font-black uppercase tracking-widest text-xs border-2 border-red-100">
        Sign Out Securely
      </button>
    </div>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const { selectedLang, setSelectedLang } = useContext(AuthContext);

  return (
    <div className="p-6 animate-in slide-in-from-right duration-300 min-h-screen bg-white">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">App Settings</h2>
      </div>

      <section className="space-y-4">
        <h3 className="font-black text-blue-600 uppercase text-xs tracking-widest">Prefered Language</h3>
        <div className="grid gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang as Language)}
              className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${selectedLang === lang ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
            >
              <span className="font-black uppercase text-sm">{lang}</span>
              {selectedLang === lang && <Check className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileItem({ icon, label, sub, onClick }: { icon: any, label: string, sub?: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-5 bg-white rounded-[32px] border border-slate-100 shadow-sm active:bg-slate-50 transition-all group">
      <div className="flex items-center gap-4 text-slate-700">
        <span className="text-blue-600 bg-blue-50 p-3 rounded-2xl transition-transform group-active:scale-110">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
        </span>
        <div className="text-left">
          <p className="font-black text-sm uppercase tracking-tight">{label}</p>
          {sub && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{sub}</p>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-200" />
    </button>
  );
}
