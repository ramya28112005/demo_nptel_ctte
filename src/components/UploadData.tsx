import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
// icons removed

import { motion } from 'framer-motion';
import { Semester, Department } from '../types';
import { dataService } from '../services/dataService';

interface UploadDataProps {
  semester: Semester | null;
  onUploadComplete?: () => void;
}

const MODULES = [
  { id: 3, title: 'Course Excel Upload & Mapping', desc: 'Smart Match: Filename with Dept Name (e.g. "Physics_Courses.xlsx") sends only to that HOD. Others send to all.' },
  { id: 4, title: 'Enrollment Excel Upload', desc: 'Smart Match: Filename with Dept Name sends enrollment data to HOD. Others send to all.' },
  { id: 5, title: 'Registration Excel Upload', desc: 'Smart Match: Filename with Dept Name sends registration data to HOD. Others send to all.' },
  { id: 6, title: 'Result Excel Upload', desc: 'Smart Match: Filename with Dept Name sends final results to HOD. Others send to all.' },
];

const UploadData = ({ semester, onUploadComplete }: UploadDataProps) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const [sentStatus, setSentStatus] = useState<Record<number, { sent: boolean, time: string }>>({});
  const [depts, setDepts] = useState<Department[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);

  useEffect(() => {
    dataService.getDepartments().then(setDepts);
  }, []);

  const handleUploadClick = (id: number) => {
    const configuredHods = depts.filter(d => d.hod_email);
    if (configuredHods.length === 0) {
      alert("⚠️ SAFETY CHECK FAILED: No HOD emails have been configured in Module 2. Please set up at least one HOD email before uploading data to ensure the automated dispatch works.");
      return;
    }
    setActiveModuleId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = activeModuleId;
    if (!file || id === null) return;

    setUploading(id);
    const fileName = file.name;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Convert to base64 for email attachment and server storage
      const base64Data = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Parse Excel for database
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const excelData = XLSX.utils.sheet_to_json(sheet) as any[];

      // Save to DB based on module ID
      if (semester) {
        let endpoint = '';
        let payload: any = { semester_id: semester.id };
        
        if (id === 3) {
          endpoint = '/api/upload/courses';
          payload.courses = excelData.map(row => {
            const name = row.course_name || row.CourseName || row.Title || row['Course Name'] || row['Course Title'] || row.course_id || row.CourseID || row.CourseCode || row['Course Id'] || row['Course ID'] || row['Course Code'];
            const id = row.course_id || row.CourseID || row.CourseCode || row['Course Id'] || row['Course ID'] || row['Course Code'] || name;
            return {
              dept_id: row.dept_id || row.DepartmentID || row.DeptID || row['Dept ID'] || row['Department ID'],
              course_id: id,
              course_name: name
            };
          });
        } else if (id === 4) {
          endpoint = '/api/upload/enrollments';
          payload.enrollments = excelData.map(row => {
            const name = row.course_name || row.CourseName || row.Title || row['Course Name'] || row['Course Title'] || row.course_id || row.CourseID || row.CourseCode || row['Course Id'] || row['Course ID'] || row['Course Code'];
            return {
              email: row.email || row.Email || row.StudentEmail || row['Email Id'] || row['Email'] || row['Student Email'],
              name: row.name || row.Name || row.StudentName || row['Name'] || row['Student Name'],
              course_id: name,
              course_name: name
            };
          });
        } else if (id === 5) {
          endpoint = '/api/upload/registrations';
          payload.registrations = excelData.map(row => {
            const name = row.course_name || row.CourseName || row.Title || row['Course Name'] || row['Course Title'] || row.course_id || row.CourseID || row.CourseCode || row['Course Id'] || row['Course ID'] || row['Course Code'];
            return {
              email: row.email || row.Email || row.StudentEmail || row['Email Id'] || row['Email'] || row['Student Email'],
              course_id: name,
              course_name: name
            };
          });
        } else if (id === 6) {
          endpoint = '/api/upload/results';
          payload.results = excelData.map(row => {
            const name = row.course_name || row.CourseName || row.Title || row['Course Name'] || row['Course Title'] || row.course_id || row.CourseID || row.CourseCode || row['Course Id'] || row['Course ID'] || row['Course Code'];
            const score = row.score || row.Score || row.Marks || row['Final Score'] || row['Score'] || '0';
            return {
              email: row.email || row.Email || row.StudentEmail || row['Email Id'] || row['Email'] || row['Student Email'],
              course_id: name,
              course_name: name,
              score: score,
              status: row.status || row.Status || row.Result || row['Certificate Type'] || row['Certificate'] || row['Status'] || ''
            };
          });
        }

        if (endpoint) {
          payload.base64 = base64Data;
          payload.fileName = fileName;
          await dataService.uploadData(endpoint, payload);
        }
      }

      // Dynamic department matching based on all configured departments
      const matchedDept = depts.find(d => {
        const deptKeywords = d.name.toLowerCase().split(' ');
        return deptKeywords.some(keyword => keyword.length > 2 && fileName.toLowerCase().includes(keyword));
      });
      
      let targetEmails: string[] = [];
      if (matchedDept && matchedDept.hod_email) {
        targetEmails = [matchedDept.hod_email];
      } else {
        // If no specific department matched in filename, send to ALL configured HODs
        targetEmails = depts.map(d => d.hod_email).filter(Boolean) as string[];
      }

      if (targetEmails.length === 0) {
        alert("⚠️ WARNING: No HOD emails were found to send this file to. Please ensure HOD emails are configured in Module 2.");
        setUploading(null);
        return;
      }

      const moduleName = MODULES.find(m => m.id === id)?.title || "NPTEL Data";
      
      // Send emails to HODs with file attachment notification
      const emailSubject = `NPTEL Data Upload: ${moduleName}`;
      const emailBody = `Dear HOD,\n\nThe following Excel file has been uploaded to the NPTEL Automation System:\n\nFile: ${fileName}\nModule: ${moduleName}\nUpload Time: ${new Date().toLocaleString()}\n\nThe data has been processed and added to the system. Please review and confirm receipt.\n\nRegards,\nNPTEL Automation System`;
      
      // Prepare attachment
      const attachment = {
        filename: fileName,
        content: base64Data,
        encoding: 'base64'
      };
      
      let emailsSent = 0;
      let emailsFailed = 0;
      
      const emailPromises = targetEmails.map(email =>
        dataService.sendEmail({
          to: email,
          subject: emailSubject,
          text: emailBody,
          attachments: [attachment]
        })
          .then(() => {
            emailsSent++;
          })
          .catch(err => {
            emailsFailed++;
            console.log(`Email notification to ${email} failed, logging locally`);
            // Log email notification even if it fails
            const emailLog = JSON.parse(localStorage.getItem('email_notifications') || '[]');
            emailLog.push({
              to: email,
              subject: emailSubject,
              timestamp: new Date().toISOString(),
              module: moduleName,
              status: 'pending - backend unavailable',
              file: fileName
            });
            localStorage.setItem('email_notifications', JSON.stringify(emailLog.slice(-100)));
          })
      );
      
      await Promise.all(emailPromises);
      
      const now = new Date().toLocaleTimeString();
      setSentStatus({ ...sentStatus, [id]: { sent: true, time: now } });
      
      const target = matchedDept ? `the ${matchedDept.name} HOD` : "all configured HODs";
      
      if (emailsFailed > 0) {
        alert(`⚠️ EMAIL SETUP REQUIRED:\n\nTo send emails when uploading Excel files, you need to:\n\n1. Go to emailjs.com and sign up (FREE)\n2. Create a service and email template\n3. Copy your Public Key\n4. Paste it in src/services/dataService.ts:\n   EMAILJS_PUBLIC_KEY = 'your_key_here'\n\nWithout this, emails won't send. The data uploads successfully and is stored, but HOD notifications won't be delivered.\n\nConfigured? Just save and reload the page to try again.`);
      } else {
        alert(`✅ SUCCESS:\n1. Excel file "${fileName}" uploaded.\n2. Data mapped to departments.\n3. Emails sent to ${target}.\n4. Data stored for consolidated report.\n\nAutomation complete for Module ${id}.`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`❌ ERROR: ${error.message || "Failed to send emails. Please check your internet connection or HOD configurations."}`);
    } finally {
      setUploading(null);
      setActiveModuleId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploadComplete) onUploadComplete();
    }
  };

  return (
    <div className="space-y-6">
      {semester ? (
        <div className="glass flex items-center justify-between p-6 rounded-2xl border border-white/20 shadow-lg">
          <div className="flex gap-12">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Session</p>
              <p className="font-bold text-white">{semester.period} {semester.year}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Workflow Status</p>
              <div className="flex items-center gap-2 text-accent font-bold">
                <span>1 / 8 Modules</span>
              </div>
            </div>
          </div>
          <button className="text-xs font-bold text-rose-400 bg-red-800/20 px-4 py-2 rounded-lg hover:bg-red-800/30 transition-colors">
            Reset Workflow
          </button>
        </div>
      ) : (
        <div className="glass p-4 rounded-2xl flex items-center gap-3 text-amber-200">
          <p className="text-sm font-medium">Please configure and select a semester in Module 1 to enable data uploads.</p>
        </div>
      )}

      <div className="glass p-8 rounded-2xl shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-white mb-2">Execution Workflow</h3>
        <p className="text-slate-300 text-sm mb-8">Automation will skip any departments that don't have an HOD email configured.</p>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".xlsx, .xls"
        />

        <div className="space-y-4">
          {MODULES.map((m) => (
            <motion.div key={m.id} className="glass flex items-center gap-6 p-6 rounded-2xl border border-white/20 hover:shadow-xl transition-all group" whileHover={{ y: -2 }}>
              <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white rounded-full flex items-center justify-center font-bold text-lg">
                {m.id}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white">{m.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">{m.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                {sentStatus[m.id]?.sent && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col items-end"
                  >
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-800/20 px-3 py-1 rounded-full flex items-center gap-1">
                      ✅ Sent
                    </span>
                    <span className="text-[9px] text-slate-400 mt-1">at {sentStatus[m.id].time}</span>
                  </motion.div>
                )}
                <button 
                  onClick={() => handleUploadClick(m.id)}
                  disabled={uploading === m.id}
                  className="btn-gradient px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 min-w-[140px]"
                >
                  {uploading === m.id ? 'Sending...' : 'Drag / Click'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UploadData;
