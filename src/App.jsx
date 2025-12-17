import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend 
} from 'recharts';
import { PlusCircle, BarChart3, List, Trash2, PieChart as PieIcon } from 'lucide-react';

// Connect to Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function App() {
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });
    setActivities(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !amount) return alert("Please fill in all fields");

    const { error } = await supabase
      .from('activities')
      .insert([{ name, amount: parseFloat(amount), category }]);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setName('');
      setAmount('');
      fetchData();
    }
  }

  async function deleteEntry(id) {
    if (window.confirm("Delete this entry?")) {
      await supabase.from('activities').delete().eq('id', id);
      fetchData();
    }
  }

  // Logic to group data by category for the charts
  const chartData = activities.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.category, value: curr.amount });
    }
    return acc;
  }, []);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '30px' }}>Personal Tracker</h1>

      {/* 1. INPUT FORM */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0' }}><PlusCircle size={20} color="#2563eb"/> Add New</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            placeholder="Expense Name (e.g. Lunch)" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="number" 
              placeholder="Amount" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', flex: 1 }}
            />
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', background: 'white' }}
            >
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Bills">Bills</option>
              <option value="Health">Health</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
            Save Activity
          </button>
        </form>
      </div>

      {/* 2. PIE CHART ANALYSIS */}
      {chartData.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0' }}><PieIcon size={20} color="#2563eb"/> Spending %</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. BAR CHART ANALYSIS */}
      {chartData.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0' }}><BarChart3 size={20} color="#2563eb"/> Totals</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. RECENT HISTORY WITH DELETE */}
      <div style={{ marginBottom: '50px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><List size={20} color="#2563eb"/> History</h3>
        {activities.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '10px', borderLeft: `5px solid ${COLORS[3]}` }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#334155' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.category}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontWeight: 'bold', color: '#e11d48' }}>${item.amount}</div>
              <button onClick={() => deleteEntry(item.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}