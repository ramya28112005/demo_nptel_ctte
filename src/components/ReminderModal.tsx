import React, { useState, useEffect } from 'react';
// icon removed

import { motion } from 'framer-motion';
import { Department } from '../types';
import { dataService } from '../services/dataService';

interface ReminderModalProps {
  type: 'Enrollment' | 'Registration';
  onClose: () => void;
}

const ReminderModal = ({ type, onClose }: ReminderModalProps) => {
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-08-15');
  const [isSending, setIsSending] = useState(false);
  
  const defaultSubject = `NPTEL ${type} Reminder - CTTEWC`;
  const getDefaultContent = (s: string, e: string) => `Dear HOD,\n\nThis is a reminder regarding the NPTEL ${type} process for the current semester. \n\nThe ${type} period is scheduled from ${s} to ${e}.\n\nPlease ensure all students in your department complete their ${type} within this timeframe.\n\nRegards,\nNPTEL Coordinator,\nCTTEWC`;

  const [subject, setSubject] = useState(defaultSubject);
  const [content, setContent] = useState(getDefaultContent(startDate, endDate));
  const [depts, setDepts] = useState<Department[]>([]);

  useEffect(() => {
    dataService.getDepartments().then(setDepts);
  }, []);

  useEffect(() => {
    if (type === 'Registration') {
      setContent(getDefaultContent(startDate, endDate));
    }
  }, [startDate, endDate, type]);

  const handleSend = async () => {
    // Refresh departments to get latest saved HOD emails
    const updatedDepts = await dataService.getDepartments();
    setDepts(updatedDepts);
    
    const configuredHods = updatedDepts.filter(d => d.hod_email);
    if (configuredHods.length === 0) {
      alert("⚠️ SAFETY CHECK FAILED: No HOD emails have been configured in Module 2. Please set up at least one HOD email before sending reminders.");
      return;
    }

    setIsSending(true);
    try {
      const targetEmails = configuredHods.map(d => d.hod_email) as string[];

      for (const email of targetEmails) {
        await dataService.sendEmail({ to: email, subject, text: content });
      }

      alert(`${type} Reminder Emails sent to all configured HODs via Gmail!`);
      onClose();
    } catch (error: any) {
      console.error("Reminder error:", error);
      alert(`❌ ERROR: ${error.message || "Failed to send reminder emails."}`);
    } finally {
      setIsSending(false);
    }
  };

  const isReadOnly = type === 'Registration';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-600"
      >
        <div className="p-8 border-b border-slate-600 flex justify-between items-center bg-slate-700">
          <h3 className="text-2xl font-bold text-white">{type} Reminder</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
            {/* close icon */}
          </button>
        </div>
        
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              readOnly={isReadOnly}
              className={`w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Email Content</label>
            <textarea 
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={isReadOnly}
              className={`w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed ${isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
            />
            {type === 'Enrollment' && (
              <p className="text-[10px] text-slate-400 mt-2 italic">Note: You can manually edit the content for Enrollment reminders.</p>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending}
            className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? 'Sending...' : 'Send Reminder Emails'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReminderModal;
