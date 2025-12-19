import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Gamepad2, ShoppingBag, 
  Utensils, Car, Zap, MoreHorizontal, Activity, Search, 
  Settings, Check, X, ChevronLeft, ChevronRight, Lightbulb,
  LogOut, User, Mail, Lock
} from 'lucide-react';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const CATEGORIES = [
  { name: 'Food', icon: <Utensils size={18} /> },
  { name: 'Games', icon: <Gamepad2 size={18} /> },
  { name: 'Shopping', icon: <ShoppingBag size={18} /> },
  { name: 'Travel', icon: <Car size={18} /> },
  { name: 'Bills', icon: <Zap size={18} /> },
  { name: 'Health', icon: <PlusCircle size={18} /> },
  { name: 'Other', icon: <MoreHorizontal size={18} /> },
];

export default function App() {
  // Auth State
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // App State
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userBudget, setUserBudget] = useState(50000);
  const [editingId, setEditingId] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  // --- 1. AUTH LISTENERS ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, viewDate]); // Re-fetch when month changes

  // --- 2. DATA ACTIONS ---
  async function fetchData() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setActivities(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !amount) return;

    const payload = { 
      name, 
      amount: parseFloat(amount), 
      category,
      user_id: session.user.id // Critical: Ties data to user
    };

    if (editingId) {
      await supabase.from('activities').update(payload).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('activities').insert([payload]);
    }

    setName(''); setAmount(''); fetchData();
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert(error.message);
    setLoading(false);
  }

  const changeMonth = (offset) => {
    const newDate = new Date(viewDate.setMonth(viewDate.getMonth() + offset));
    setViewDate(new Date(newDate));
  };

  // --- 3. LOGIC ---
  const filteredByMonth = activities.filter(a => {
    const d = new Date(a.created_at);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  });

  const todayTotal = activities
    .filter(a => new Date(a.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, a) => sum + a.amount, 0);

  const monthTotal = filteredByMonth.reduce((sum, a) => sum + a.amount, 0);
  const budgetPercent = Math.min((monthTotal / userBudget) * 100, 100);
  const formatINR = (val) => val.toLocaleString('en-IN');

  const getRemainingDaily = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = (lastDay - now.getDate()) + 1;
    return Math.max((userBudget - monthTotal) / remainingDays, 0);
  };

  const finalDisplayList = filteredByMonth.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilter === 'All' || a.category === activeFilter;
    return matchesSearch && matchesCategory;
  });

  const remainingDaily = getRemainingDaily();

  // --- 4. AUTH UI ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Activity size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">DayGo</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Personal Finance Pro</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-500" size={18} />
              <input className="w-full bg-slate-800 p-4 pl-12 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-500" size={18} />
              <input className="w-full bg-slate-800 p-4 pl-12 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 p-4 rounded-2xl font-black text-lg active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          
          <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
            {isSignUp ? 'Already have an account? Log In' : 'New to DayGo? Create Account'}
          </button>
        </div>
      </div>
    );
  }

  // --- 5. MAIN APP UI ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20 font-sans tracking-tight">
      <div className="max-w-md mx-auto">
        
        {/* LOGOUT & PROFILE HEADER */}
        <header className="mb-4 pt-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black">
              {session.user.email[0].toUpperCase()}
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black tracking-tighter leading-none">DayGo</h1>
              <p className="text-[9px] text-slate-500 font-bold truncate max-w-[120px]">{session.user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400"><Settings size={20} /></button>
            <button onClick={() => supabase.auth.signOut()} className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500"><LogOut size={20} /></button>
          </div>
        </header>

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-slate-900 w-full max-w-xs p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Settings size={20}/> Budget</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase mb-2 text-left">Monthly Limit: <span className="text-blue-400">₹{formatINR(userBudget)}</span></p>
              <input type="range" min="5000" max="200000" step="5000" value={userBudget} onChange={(e) => setUserBudget(e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-8" />
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-blue-600 p-4 rounded-2xl font-bold">Save</button>
            </div>
          </div>
        )}

        {/* MONTH SELECTOR */}
        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-400"><ChevronLeft size={20}/></button>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-400"><ChevronRight size={20}/></button>
        </div>

        {/* BUDGET CARD */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="text-left">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Monthly Spent</p>
              <h2 className="text-3xl font-black">₹{formatINR(monthTotal)} <span className="text-slate-600 text-sm font-medium">/ {formatINR(userBudget)}</span></h2>
            </div>
            <div className="bg-slate-950/40 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Today</p>
              <p className="text-xl font-black text-emerald-400">₹{formatINR(todayTotal)}</p>
            </div>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-2">
            <div className={`h-full transition-all duration-1000 ${budgetPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${budgetPercent}%` }}></div>
          </div>
        </div>

        {/* INPUT FORM */}
        <div className="bg-white text-slate-950 p-6 rounded-[2.5rem] shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full bg-slate-100 p-4 rounded-2xl border-none font-bold placeholder:text-slate-400 outline-none" placeholder="What did you buy?" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <div className="w-2/3 relative">
                <span className="absolute left-4 top-4 font-black text-xl text-slate-300">₹</span>
                <input type="number" className="w-full bg-slate-100 p-4 pl-10 rounded-2xl border-none font-black text-xl outline-none" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="w-1/3 relative">
                <select className="w-full bg-slate-100 p-4 rounded-2xl border-none font-bold text-blue-600 outline-none appearance-none pr-8 cursor-pointer" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-blue-600"><MoreHorizontal size={14} /></div>
              </div>
            </div>
            <button className={`w-full ${editingId ? 'bg-emerald-500' : 'bg-slate-950'} text-white p-4 rounded-2xl font-black text-lg active:scale-95 transition-all`}>
              {editingId ? <Check size={20}/> : <PlusCircle size={20}/>} {editingId ? "Update" : "Add Expense"}
            </button>
          </form>
        </div>

        {/* SMART ALLOWANCE BOX */}
        <div className={`mb-8 p-5 rounded-[2.5rem] border transition-all flex items-center gap-4 ${todayTotal > remainingDaily ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-blue-600 border-blue-400/30 text-white'}`}>
          <div className="p-3 bg-white/20 rounded-2xl"><Lightbulb size={24} /></div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{todayTotal > remainingDaily ? 'Limit Exceeded' : 'Daily Allowance'}</p>
            <p className="font-black text-xl tracking-tight">
              {todayTotal > remainingDaily ? `Over by ₹${formatINR(Math.round(todayTotal - remainingDaily))}` : `Spend max ₹${formatINR(Math.round(remainingDaily))} today`}
            </p>
          </div>
        </div>

        {/* HISTORY LIST */}
        <div className="space-y-3">
          {finalDisplayList.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-slate-900 group">
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-slate-800 rounded-2xl text-blue-400">
                  {CATEGORIES.find(c => c.name === item.category)?.icon || <MoreHorizontal />}
                </div>
                <div>
                  <div className="font-bold text-slate-100 text-sm tracking-tight">{item.name}</div>
                  <div className="text-[9px] text-slate-600 font-black uppercase">{item.category} • {new Date(item.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="font-black text-white">-₹{formatINR(item.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}