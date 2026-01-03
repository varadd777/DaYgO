import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Gamepad2, ShoppingBag, 
  Utensils, Car, Zap, MoreHorizontal, Activity, Search, 
  Settings, Check, X, ChevronLeft, ChevronRight, Lightbulb,
  LogOut, Mail, Lock, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip 
} from 'recharts';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const CATEGORIES = [
  { name: 'Food', icon: <Utensils size={18} />, color: '#3b82f6' },
  { name: 'Games', icon: <Gamepad2 size={18} />, color: '#8b5cf6' },
  { name: 'Shopping', icon: <ShoppingBag size={18} />, color: '#ec4899' },
  { name: 'Travel', icon: <Car size={18} />, color: '#f59e0b' },
  { name: 'Bills', icon: <Zap size={18} />, color: '#ef4444' },
  { name: 'Health', icon: <PlusCircle size={18} />, color: '#10b981' },
  { name: 'Other', icon: <MoreHorizontal size={18} />, color: '#64748b' },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userBudget, setUserBudget] = useState(50000);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
      fetchProfile();
    }
  }, [session]);

  async function fetchProfile() {
    const { data, error } = await supabase.from('profiles').select('budget, is_approved').single();
    if (data) {
      setUserBudget(data.budget);
      setIsApproved(data.is_approved);
    }
    if (error && error.code === 'PGRST116') {
      await supabase.from('profiles').insert([{ id: session.user.id, budget: 50000 }]);
      fetchProfile();
    }
  }

  async function updateBudget(newBudget) {
    setUserBudget(newBudget);
    await supabase.from('profiles').update({ budget: newBudget }).eq('id', session.user.id);
  }

  async function fetchData() {
    const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
    if (!error) setActivities(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !amount) return;
    const payload = { 
        name, amount: parseFloat(amount), category, 
        user_id: session.user.id, created_at: viewDate.toISOString() 
    };
    await supabase.from('activities').insert([payload]);
    setName(''); setAmount(''); fetchData();
  }

  const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
  const isSameMonth = (d1, d2) => d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const selectedDayActivities = activities.filter(a => isSameDay(new Date(a.created_at), viewDate));
  const selectedMonthActivities = activities.filter(a => isSameMonth(new Date(a.created_at), viewDate));

  const dayTotal = selectedDayActivities.reduce((sum, a) => sum + a.amount, 0);
  const monthTotal = selectedMonthActivities.reduce((sum, a) => sum + a.amount, 0);
  const formatINR = (val) => val.toLocaleString('en-IN');
  
  const pieData = useMemo(() => {
    const counts = selectedMonthActivities.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({
      name: key, value: counts[key],
      color: CATEGORIES.find(c => c.name === key)?.color || '#64748b'
    }));
  }, [selectedMonthActivities]);

  const barData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(new Date().setDate(diffToMonday));

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const total = activities.filter(a => isSameDay(new Date(a.created_at), d)).reduce((sum, a) => sum + a.amount, 0);
      return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), amount: total };
    });
  }, [activities]);

  const allowance = useMemo(() => {
    const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const daysRemaining = (lastDay - viewDate.getDate()) + 1;
    const amountLeft = userBudget - monthTotal + dayTotal; 
    return Math.max(amountLeft / daysRemaining, 0);
  }, [userBudget, monthTotal, dayTotal, viewDate]);

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
          <Activity size={40} className="mx-auto mb-6 text-blue-500" />
          <h1 className="text-4xl font-black mb-10 tracking-tighter">DayGo</h1>
          <form onSubmit={(e) => {
             e.preventDefault();
             setLoading(true);
             const call = isSignUp ? supabase.auth.signUp({email, password}) : supabase.auth.signInWithPassword({email, password});
             call.then(({error}) => { if(error) alert(error.message); setLoading(false); });
          }} className="space-y-4">
            <input className="w-full bg-slate-800 p-4 rounded-2xl outline-none" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="w-full bg-slate-800 p-4 rounded-2xl outline-none" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading} className="w-full bg-blue-600 p-4 rounded-2xl font-black">{isSignUp ? 'Sign Up' : 'Log In'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-slate-500 text-xs font-bold uppercase tracking-widest">{isSignUp ? 'Back to Login' : 'Create Account'}</button>
        </div>
      </div>
    );
  }

  if (session && !isApproved) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl">
          <Lock className="text-amber-500 mx-auto mb-6" size={40} />
          <h1 className="text-2xl font-black mb-2">Access Restricted</h1>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed">Pending administrator approval. Contact the owner to enable access.</p>
          <button onClick={() => supabase.auth.signOut()} className="w-full bg-slate-800 p-4 rounded-2xl font-bold">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20 font-sans tracking-tight">
      <div className="max-w-md mx-auto">
        <header className="mb-4 pt-4 flex justify-between items-center">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black">{session.user.email[0].toUpperCase()}</div>
            <div><h1 className="text-xl font-black">DayGo</h1><p className="text-[9px] text-slate-500 font-bold">{session.user.email}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-slate-900 rounded-2xl text-slate-400"><Settings size={20} /></button>
            <button onClick={() => supabase.auth.signOut()} className="p-3 bg-red-500/10 rounded-2xl text-red-500"><LogOut size={20} /></button>
          </div>
        </header>

        <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between px-2">
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 text-slate-600"><ChevronLeft size={16}/></button>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 text-slate-600"><ChevronRight size={16}/></button>
            </div>
            <div className="flex items-center justify-between px-2">
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-3 bg-slate-900 rounded-2xl"><ChevronLeft size={24}/></button>
              <div className="text-center">
                 <h2 className="text-xl font-black">{viewDate.getDate()} {viewDate.toLocaleString('default', { month: 'short' })}</h2>
                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{viewDate.toLocaleString('default', { weekday: 'long' })}</p>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-3 bg-slate-900 rounded-2xl"><ChevronRight size={24}/></button>
            </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl mb-8">
          <div className="flex justify-between items-start mb-6 text-left">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Spent This Month</p>
              <h2 className="text-3xl font-black">₹{formatINR(monthTotal)}</h2>
              <p className="text-slate-600 text-xs font-bold">of ₹{formatINR(userBudget)}</p>
            </div>
            <div className="bg-slate-950/40 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-right">
              <p className="text-[9px] font-black text-slate-500 mb-0.5 uppercase tracking-widest">Today</p>
              <p className="text-xl font-black text-emerald-400">₹{formatINR(dayTotal)}</p>
            </div>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-2">
            <div className={`h-full transition-all duration-1000 ${monthTotal > userBudget ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min((monthTotal/userBudget)*100, 100)}%` }}></div>
          </div>
        </div>

        <div className={`mb-8 p-5 rounded-[2.5rem] border flex items-center gap-4 ${dayTotal > allowance ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-blue-600 border-blue-400/30 text-white shadow-xl'}`}>
          <div className="p-3 bg-white/20 rounded-2xl"><Lightbulb size={24} /></div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Limit for {viewDate.getDate()} {viewDate.toLocaleString('default', { month: 'short' })}</p>
            <p className="font-black text-xl">₹{formatINR(Math.round(allowance))}</p>
          </div>
        </div>

        <div className="bg-white text-slate-950 p-6 rounded-[2.5rem] shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full bg-slate-100 p-4 rounded-2xl font-bold outline-none text-slate-800" placeholder="Description..." value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <input type="number" className="w-2/3 bg-slate-100 p-4 rounded-2xl font-black text-xl outline-none text-slate-900" placeholder="₹ Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select className="w-1/3 bg-slate-100 p-4 rounded-2xl font-bold text-blue-600 outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <button className="w-full bg-slate-950 text-white p-4 rounded-2xl font-black active:scale-95 transition-all">Add Expense</button>
          </form>
        </div>

        <div className="space-y-3 mb-10 text-left">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2 mb-2">Today's Activity</h3>
          {selectedDayActivities.length > 0 ? selectedDayActivities.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 rounded-2xl text-blue-400">{CATEGORIES.find(c => c.name === item.category)?.icon}</div>
                <div><div className="font-bold text-slate-100 text-sm">{item.name}</div><div className="text-[9px] text-slate-600 font-black uppercase">{item.category}</div></div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="font-black text-white">-₹{formatINR(item.amount)}</div>
                  <button onClick={async () => { if(window.confirm("Delete?")) { await supabase.from('activities').delete().eq('id', item.id); fetchData(); } }} className="text-slate-700 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            </div>
          )) : <div className="py-10 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">No spends recorded</div>}
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 border-t border-slate-800 pt-8">
            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-[2.5rem]">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><PieIcon size={14}/> Monthly Breakdown</h3>
                <div className="h-[220px] w-full">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px', color: '#ffffff' }}
                                    itemStyle={{ color: '#ffffff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-700 text-[10px] font-black uppercase">No Data</div>}
                </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-[2.5rem]">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><BarChart3 size={14}/> Monday to Sunday</h3>
                <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}} 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px', color: '#ffffff' }}
                                itemStyle={{ color: '#ffffff' }}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-slate-900 w-full max-w-xs p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-black mb-6">Settings</h2>
              <input type="range" min="5000" max="200000" step="5000" value={userBudget} onChange={(e) => updateBudget(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg accent-blue-500 mb-8" />
              <p className="text-white font-black text-xl mb-6">₹{formatINR(userBudget)}</p>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-blue-600 p-4 rounded-2xl font-bold active:scale-95 transition-all">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}