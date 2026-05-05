import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Building, BarChart2 } from 'lucide-react';

import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Semester, Stats } from '../types';
import { dataService } from '../services/dataService';

interface DashboardProps {
  semester: Semester | null;
  refresh?: number;
}

// simple counter that animates from 0 to target value
const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800; // ms
    const increment = value > 0 ? Math.ceil(value / (duration / 16)) : 1;
    const step = () => {
      start += increment;
      if (start < value) {
        setDisplay(start);
        requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };
    step();
  }, [value]);
  return <>{display}</>;
};

const Dashboard = ({ semester, refresh }: DashboardProps) => {
  const [stats, setStats] = useState<Stats>({ courses: 0, enrolled: 0, registered: 0, certified: 0 });

  useEffect(() => {
    if (semester) {
      dataService.getDashboardStats()
        .then(res => {
          // API now returns both distinct counts and raw row counts
          setStats(res as Stats);
          // celebrate when we get fresh numbers
          confetti({ particleCount: 120, spread: 60, origin: { y: 0.6 } });
        })
        .catch(err => {
          console.error('Dashboard stats fetch failed:', err);
          setStats({ courses: 0, enrolled: 0, registered: 0, certified: 0 });
        });
    } else {
      setStats({ courses: 0, enrolled: 0, registered: 0, certified: 0 });
    }
  }, [semester, refresh]);

  const pieData = [
    { name: 'Enrolled', value: stats.enrolled, color: '#4f46e5' },
    { name: 'Certified', value: stats.certified, color: '#f59e0b' },
  ];

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div className="flex justify-between items-end" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div>
          <h3 className="text-3xl font-bold text-white">Dashboard Overview</h3>
          <p className="text-slate-300 mt-1">{semester ? `${semester.period} ${semester.year} Semester Analytics` : 'Select a semester to view data'}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Enrolled', value: stats.enrolled, icon: <Building size={24} /> },
          { label: 'Certified', value: stats.certified, icon: <BarChart2 size={24} /> },
        ].map((stat, i) => (
          <motion.div key={i} className="glass p-8 rounded-3xl shadow-lg border border-white/20 flex items-center gap-4" whileHover={{ scale: 1.02 }}>
            <div className="p-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white rounded-full">
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{stat.label}</p>
              <p className="text-4xl font-black mt-1 text-white">
                <AnimatedCounter value={stat.value} />
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="glass p-8 rounded-3xl shadow-lg border border-white/20">
          <h4 className="text-xl font-bold text-white mb-8">Overall Funnel</h4>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
