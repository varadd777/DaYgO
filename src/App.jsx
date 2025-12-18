import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Calendar, Gamepad2, ShoppingBag, 
  Utensils, Car, Zap, MoreHorizontal, Activity, Search, 
  Settings, Check, X, ChevronLeft, ChevronRight, Lightbulb
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
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userBudget, setUserBudget] = useState(50000); // Updated default budget for INR
  const [editingId, setEditingId] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
    setActivities(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !amount) return;

    if (editingId) {
      await supabase.from('activities').update({ name, amount: parseFloat(amount), category }).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('activities').insert([{ name, amount: parseFloat(amount), category }]);
    }
    setName(''); setAmount(''); fetchData();
  }

  async function deleteEntry(id) {
    if(window.confirm("Delete this record?")) {
      await supabase.from('activities').delete().eq('id', id);
      fetchData();
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(item.amount);
    setCategory(item.category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeMonth = (offset) => {
    const newDate = new Date(viewDate.setMonth(viewDate.getMonth() + offset));
    setViewDate(new Date(newDate));
  };

  // --- LOGIC CALCULATIONS ---
  const filteredByMonth = activities.filter(a => {
    const d = new Date(a.created_at);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  });

  const todayTotal = activities
    .filter(a => new Date(a.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, a) => sum + a.amount, 0);

  const monthTotal = filteredByMonth.reduce((sum, a) => sum + a.amount, 0);
  const budgetPercent = Math.min((monthTotal / userBudget) * 100, 100);

  const getRemainingDaily = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = (lastDay - now.getDate()) + 1;
    const remainingBudget = userBudget - monthTotal;
    return Math.max(remainingBudget / remainingDays, 0);
  };

  const finalDisplayList = filteredByMonth.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilter === 'All' || a.category === activeFilter;
    return matchesSearch && matchesCategory;
  });

  const remainingDaily = getRemainingDaily();
  const isOverDaily = todayTotal > remainingDaily;

  // Helper for Indian Currency Formatting
  const formatINR = (val) => val.toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20 font-sans tracking-tight">
      <div className="max-w-md mx-auto">
        
        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <div className="bg-slate-900 w-full max-w-xs p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Settings size={20}/> Settings</h2>
              <p className="text-slate-400 text-xs font-bold uppercase mb-2">Monthly Budget: <span className="text-blue-400">₹{formatINR(userBudget)}</span></p>
              <input 
                type="range" min="1000" max="200000" step="1000"
                value={userBudget} onChange={(e) => setUserBudget(e.target.value)}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-8"
              />
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-blue-600 p-4 rounded-2xl font-bold">Save Changes</button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <header className="mb-4 pt-4 flex justify-between items-start">
          <div className="text-left">
            <h1 className="text-3xl font-black tracking-tighter">DayGo</h1>
            <p className="text-slate-500 text-xs font-bold uppercase">Smart Tracker</p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
            <Settings size={20} />
          </button>
        </header>

        {/* MONTH SELECTOR */}
        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-400">
            <ChevronLeft size={20}/>
          </button>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white text-center">
            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-400">
            <ChevronRight size={20}/>
          </button>
        </div>

        {/* BUDGET CARD */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-left">Monthly Total</p>
              <h2 className="text-3xl font-black">₹{formatINR(monthTotal)} <span className="text-slate-600 text-sm font-medium">/ {formatINR(userBudget)}</span></h2>
            </div>
            <div className="bg-slate-950/40 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Today</p>
              <p className="text-xl font-black text-emerald-400">₹{formatINR(todayTotal)}</p>
            </div>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-2">
            <div className={`h-full transition-all duration-1000 ease-out ${budgetPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${budgetPercent}%` }}></div>
          </div>
        </div>

        {/* INPUT FORM */}
        <div className="bg-white text-slate-950 p-6 rounded-[2.5rem] shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full bg-slate-100 p-4 rounded-2xl border-none font-bold placeholder:text-slate-400 outline-none" placeholder="Description..." value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <div className="w-2/3 relative">
                <span className="absolute left-4 top-4 font-black text-xl text-slate-400">₹</span>
                <input type="number" className="w-full bg-slate-100 p-4 pl-10 rounded-2xl border-none font-black text-xl outline-none" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="w-1/3 relative">
                <select className="w-full bg-slate-100 p-4 rounded-2xl border-none font-bold text-blue-600 outline-none appearance-none pr-8" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-blue-600"><MoreHorizontal size={14} /></div>
              </div>
            </div>
            <button className={`w-full ${editingId ? 'bg-emerald-500' : 'bg-slate-950'} text-white p-4 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl`}>
              {editingId ? <Check size={20}/> : <PlusCircle size={20}/>} {editingId ? "Update" : "Save Activity"}
            </button>
          </form>
        </div>

        {/* SMART ALLOWANCE BOX */}
        <div className={`mb-8 p-5 rounded-[2.5rem] border transition-all duration-500 flex items-center gap-4 ${
          isOverDaily 
            ? 'bg-red-500/10 border-red-500/30 text-red-200' 
            : 'bg-blue-600 border-blue-400/30 text-white shadow-[0_20px_40px_rgba(37,99,235,0.2)]'
        }`}>
          <div className={`p-3 rounded-2xl ${isOverDaily ? 'bg-red-500/20' : 'bg-blue-400/30'}`}>
            <Lightbulb className={isOverDaily ? 'text-red-400' : 'text-white'} size={24} />
          </div>
          <div className="text-left">
            <p className={`text-[10px] font-black uppercase tracking-widest ${isOverDaily ? 'text-red-400' : 'text-blue-100'}`}>
              {isOverDaily ? 'Limit Reached' : 'Daily Allowance'}
            </p>
            <p className="font-black text-xl tracking-tight">
              {isOverDaily 
                ? `Over by ₹${formatINR(Math.round(todayTotal - remainingDaily))}`
                : `Spend max ₹${formatINR(Math.round(remainingDaily))} today`
              }
            </p>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-4 text-slate-600" size={18} />
            <input className="w-full bg-slate-900 border border-slate-800 p-4 pl-12 rounded-2xl text-sm font-medium outline-none" placeholder="Find a transaction..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['All', ...CATEGORIES.map(c => c.name)].map(cat => (
              <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>{cat}</button>
            ))}
          </div>
        </div>

        {/* HISTORY */}
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
              <div className="flex items-center gap-3">
                <span className="font-black text-white">-₹{formatINR(Math.round(item.amount))}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(item)} className="p-2 text-slate-600 hover:text-blue-400"><Activity size={16} /></button>
                  <button onClick={() => deleteEntry(item.id)} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}