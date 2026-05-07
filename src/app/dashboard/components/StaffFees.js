'use client';
import { useState, useMemo, useEffect } from 'react';
import { feeUtils } from '../utils/staffDataUtils';

const FEE_FIELDS = [
  { key: 'tuitionFee',      label: 'Tuition Fee',       icon: '📚' },
  { key: 'libraryFee',      label: 'Library Fee',        icon: '📖' },
  { key: 'electricityBill', label: 'Electricity Bill',   icon: '⚡' },
  { key: 'waterBill',       label: 'Water Bill',         icon: '💧' },
  { key: 'dressFee',        label: 'Dress / Uniform Fee',icon: '👕' },
  { key: 'bookFee',         label: 'Book Fee',           icon: '📝' },
  { key: 'transportFee',    label: 'Transport Fee',      icon: '🚌' },
  { key: 'fine',            label: 'Fine',               icon: '⚠️' },
];

const BLANK_STRUCT = { tuitionFee:'', libraryFee:'', electricityBill:'', waterBill:'', dressFee:'', bookFee:'', transportFee:'', fine:'', fineReason:'' };
const BLANK_PLAN   = { planType:'one_time', installmentMonths:'3' };

export default function StaffFees({ isDarkMode, showMessage, students=[], parents=[] }) {
  const [tab, setTab] = useState('students');
  const [refresh, setRefresh] = useState(0);
  const reload = () => setRefresh(k => k+1);

  // Student list state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fee setup modal
  const [setupStudent, setSetupStudent] = useState(null);
  const [struct, setStruct] = useState(BLANK_STRUCT);
  const [plan, setPlan]     = useState(BLANK_PLAN);

  // Invoice preview modal
  const [previewInv, setPreviewInv] = useState(null);

  // Mark paid modal
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const allStructures = useMemo(() => feeUtils.getAllStructures(), [refresh]);
  const allPlans      = useMemo(() => feeUtils.getAllPlans(),      [refresh]);
  const allInvoices   = useMemo(() => feeUtils.getAllInvoices(),   [refresh]);

  // Auto-refresh when any external change (storage event) fires
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = () => reload();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Enrich students with fee info + compute OVERALL status across ALL invoices
  const enriched = useMemo(() => {
    return students.map(s => {
      const st   = allStructures.find(x => x.studentId === s.id);
      const pl   = allPlans.find(x => x.studentId === s.id);
      const invs = allInvoices.filter(x => String(x.studentId) === String(s.id));
      const latestInv = invs.length > 0 ? invs[invs.length - 1] : null;

      // Aggregate across all invoices for this student
      const totalInvoicedFee = invs.reduce((sum, i) => sum + (parseFloat(i.totalFee) || 0), 0);
      const totalPaid        = invs.reduce((sum, i) => sum + (parseFloat(i.paidAmount) || 0), 0);

      let overallStatus = 'no_invoice';
      if (invs.length > 0) {
        if (totalPaid <= 0)                           overallStatus = 'unpaid';
        else if (totalPaid >= totalInvoicedFee)       overallStatus = 'paid';
        else                                          overallStatus = 'partial';
      }

      return { ...s, feeStruct: st||null, plan: pl||null, latestInv, invoices: invs, overallStatus, totalPaid, totalInvoicedFee };
    });
  }, [students, allStructures, allPlans, allInvoices, refresh]);

  const filtered = useMemo(() => {
    return enriched.filter(s => {
      const nameMatch = s.name?.toLowerCase().includes(search.toLowerCase());
      if (statusFilter === 'all')     return nameMatch;
      if (statusFilter === 'paid')    return nameMatch && s.overallStatus === 'paid';
      if (statusFilter === 'partial') return nameMatch && s.overallStatus === 'partial';
      if (statusFilter === 'unpaid')  return nameMatch && (s.overallStatus === 'unpaid' || s.overallStatus === 'no_invoice') && s.feeStruct;
      if (statusFilter === 'setup')   return nameMatch && !s.feeStruct;
      return nameMatch;
    });
  }, [enriched, search, statusFilter]);

  // Summary
  const summary = useMemo(() => {
    const total = allInvoices.reduce((a,i) => a + (parseFloat(i.totalFee)||0), 0);
    const collected = allInvoices.reduce((a,i) => a + (parseFloat(i.paidAmount)||0), 0);
    const paid    = allInvoices.filter(i => i.status === 'paid').length;
    const partial = allInvoices.filter(i => i.status === 'partial').length;
    const unpaid  = allInvoices.filter(i => i.status === 'unpaid').length;
    return { total, collected, paid, partial, unpaid };
  }, [allInvoices, refresh]);

  const openSetup = (student) => {
    const ex = feeUtils.getStructure(student.id);
    const ep = feeUtils.getPlan(student.id);
    setStruct(ex ? { ...BLANK_STRUCT, ...ex } : BLANK_STRUCT);
    setPlan(ep ? { planType: ep.planType, installmentMonths: ep.installmentMonths||'3' } : BLANK_PLAN);
    setSetupStudent(student);
  };

  const handleSaveSetup = () => {
    if (!struct.tuitionFee) { showMessage('Tuition fee required','error'); return; }
    const saved = feeUtils.saveStructure({ ...struct, studentId: setupStudent.id, studentName: setupStudent.name, className: setupStudent.className, section: setupStudent.section||setupStudent.sec });
    feeUtils.savePlan({ ...plan, studentId: setupStudent.id, studentName: setupStudent.name });
    reload();
    showMessage('Fee structure saved!','success');
    setSetupStudent(null);
  };

  const handleGenerateInvoice = (student) => {
    const st = feeUtils.getStructure(student.id);
    const pl = feeUtils.getPlan(student.id);
    if (!st) { showMessage('Set fee structure first', 'error'); return; }

    const existingInvs = feeUtils.getStudentInvoices(student.id);
    const planType = pl?.planType || 'one_time';

    // --- One-time: only 1 invoice ever ---
    if (planType === 'one_time') {
      if (existingInvs.length >= 1) {
        showMessage('Invoice already generated for this student (One Time plan). View or pay the existing invoice.', 'error');
        return;
      }
    }

    // --- Installment: max N invoices (one per installment) ---
    if (planType === 'installment') {
      const maxInvoices = parseInt(pl?.installmentMonths) || 3;
      if (existingInvs.length >= maxInvoices) {
        showMessage(`All ${maxInvoices} installment invoice(s) already generated for this student.`, 'error');
        return;
      }
    }

    // --- Monthly: 1 invoice per calendar month ---
    if (planType === 'monthly') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const alreadyThisMonth = existingInvs.some(
        (inv) => inv.generatedAt && inv.generatedAt.startsWith(currentMonth)
      );
      if (alreadyThisMonth) {
        showMessage('Invoice already generated for this month.', 'error');
        return;
      }
    }

    const installmentNumber = existingInvs.length + 1;
    const inv = feeUtils.generateInvoice(student.id, student.name, st, pl, installmentNumber);
    reload();
    showMessage('Invoice generated!', 'success');
    setPreviewInv(inv);
  };


  const handleMarkPaid = () => {
    if (!payAmount || isNaN(parseFloat(payAmount))) { showMessage('Enter valid amount','error'); return; }
    feeUtils.markInvoicePaid(payModal.id, payAmount);
    reload();
    showMessage('Payment recorded!','success');
    setPayModal(null);
    setPayAmount('');
  };

  const computeTotal = () => FEE_FIELDS.reduce((sum, f) => sum + (parseFloat(struct[f.key])||0), 0);
  const formatCurrency = (value) => `Rs. ${(Number(value) || 0).toLocaleString()}`;

  const buildInvoiceHtml = (invoice) => {
    const lineItems = FEE_FIELDS
      .filter((field) => Number(invoice[field.key]) > 0)
      .map((field) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;">${field.label}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">${formatCurrency(invoice[field.key])}</td>
        </tr>
      `)
      .join('');

    const balance = Math.max(0, (Number(invoice.totalFee) || 0) - (Number(invoice.paidAmount) || 0));

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${invoice.invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
            .sheet { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
            .muted { color: #64748b; }
            .row { display: flex; justify-content: space-between; gap: 16px; }
            .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            .summary { margin-top: 24px; padding: 20px; border-radius: 18px; background: #f8fafc; }
            .summary .row { margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="row" style="align-items:flex-start;">
              <div>
                <h1 style="margin:0 0 8px;font-size:28px;">Fee Invoice</h1>
                <div class="muted" style="font-weight:700;">${invoice.invoiceNo}</div>
              </div>
              <span class="pill">${invoice.status}</span>
            </div>

            <div style="margin-top:24px;">
              <div class="row">
                <div>
                  <div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;">Student</div>
                  <div style="font-size:20px;font-weight:800;margin-top:6px;">${invoice.studentName || '-'}</div>
                </div>
                <div style="text-align:right;">
                  <div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;">Due Date</div>
                  <div style="font-size:18px;font-weight:800;margin-top:6px;">${invoice.dueDate || '-'}</div>
                </div>
              </div>
              <div class="row" style="margin-top:16px;">
                <div>
                  <div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;">Class</div>
                  <div style="font-weight:700;margin-top:6px;">${invoice.className || '-'} ${invoice.section || ''}</div>
                </div>
                <div style="text-align:right;">
                  <div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;">Plan</div>
                  <div style="font-weight:700;margin-top:6px;">${String(invoice.paymentPlan || 'one_time').replace('_', ' ')}</div>
                </div>
              </div>
            </div>

            <table>
              <tbody>
                ${lineItems}
              </tbody>
            </table>

            ${invoice.fineReason ? `<div style="margin-top:16px;color:#b45309;font-weight:700;">Fine Reason: ${invoice.fineReason}</div>` : ''}

            <div class="summary">
              <div class="row"><span style="font-weight:700;">Total Fee</span><span style="font-weight:800;">${formatCurrency(invoice.totalFee)}</span></div>
              <div class="row"><span style="font-weight:700;color:#059669;">Paid</span><span style="font-weight:800;color:#059669;">${formatCurrency(invoice.paidAmount)}</span></div>
              <div class="row"><span style="font-weight:700;color:#dc2626;">Balance</span><span style="font-weight:800;color:#dc2626;">${formatCurrency(balance)}</span></div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = (invoice) => {
    if (!invoice) return;

    const html = buildInvoiceHtml(invoice);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeStudentName = String(invoice.studentName || 'student').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

    link.href = url;
    link.download = `${invoice.invoiceNo || 'invoice'}-${safeStudentName || 'student'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Invoice downloaded successfully!', 'success');
  };

  const primary  = isDarkMode ? 'text-white'    : 'text-slate-900';
  const secondary= isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const cardBg   = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100';
  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'}`;

  return (
    <div className="space-y-6 pb-20">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label:'Total Billed',    val:`₹${summary.total.toLocaleString()}`,      color:'text-blue-600',    bg: isDarkMode?'bg-blue-900/30':'bg-blue-50' },
          { label:'Collected',       val:`₹${summary.collected.toLocaleString()}`,  color:'text-emerald-600', bg: isDarkMode?'bg-emerald-900/30':'bg-emerald-50' },
          { label:'Paid',            val:summary.paid,                              color:'text-emerald-600', bg: isDarkMode?'bg-emerald-900/30':'bg-emerald-50' },
          { label:'Partial',         val:summary.partial,                           color:'text-amber-600',   bg: isDarkMode?'bg-amber-900/30':'bg-amber-50' },
          { label:'Unpaid',          val:summary.unpaid,                            color:'text-red-600',     bg: isDarkMode?'bg-red-900/30':'bg-red-50' },
        ].map(c => (
          <div key={c.label} className={`p-5 rounded-2xl border ${cardBg} ${c.bg}`}>
            <p className={`text-[10px] font-black uppercase ${secondary}`}>{c.label}</p>
            <p className={`text-2xl font-black mt-1 ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className={`flex flex-wrap p-1.5 rounded-2xl w-fit ${isDarkMode?'bg-gray-800':'bg-slate-200'}`}>
        {[['students','👨‍🎓 Students'],['invoices','🧾 Invoices']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${tab===id?'bg-emerald-600 text-white shadow-lg':'${isDarkMode?\"text-gray-400\":\"text-slate-700\"}'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* STUDENTS TAB */}
      {tab === 'students' && (
        <div className={`p-6 rounded-[2rem] border shadow-xl ${cardBg}`}>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <input placeholder="Search student..." value={search} onChange={e=>setSearch(e.target.value)}
              className={`flex-1 max-w-sm px-5 py-3 rounded-2xl border text-sm font-bold ${isDarkMode?'bg-gray-700 border-gray-600 text-white':'bg-white border-slate-200 text-slate-900'}`}/>
            <div className={`flex p-1 rounded-xl ${isDarkMode?'bg-gray-900':'bg-slate-100'}`}>
              {[['all','All'],['paid','Paid'],['partial','Partial'],['unpaid','Unpaid'],['setup','No Setup']].map(([v,l])=>(
                <button key={v} onClick={()=>setStatusFilter(v)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter===v?'bg-emerald-600 text-white':'${isDarkMode?\"text-gray-400\":\"text-slate-800\"}'}`}>{l}</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-[10px] font-black uppercase border-b ${isDarkMode?'border-gray-700 text-gray-500':'border-slate-100 text-slate-400'}`}>
                  {['Student','Class','Payment Plan','Total Fee','Paid','Status','Actions'].map(h=>(
                    <th key={h} className="p-4 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode?'divide-gray-700/50':'divide-slate-50'}`}>
                {filtered.map(s => {
                  const inv = s.latestInv;
                  // Use aggregated overall status for the badge
                  const os = s.overallStatus;
                  const statusColor =
                    os === 'paid'       ? 'bg-emerald-100 text-emerald-600' :
                    os === 'partial'    ? 'bg-amber-100 text-amber-600' :
                    os === 'unpaid'     ? 'bg-red-100 text-red-600' :
                                         'bg-slate-100 text-slate-500';
                  const statusLabel =
                    os === 'paid'       ? 'Paid' :
                    os === 'partial'    ? 'Partial' :
                    os === 'unpaid'     ? 'Unpaid' :
                                         'No Invoice';
                  const planLabel = s.plan?.planType==='one_time'?'One Time':s.plan?.planType==='monthly'?'Monthly':`Installment (${s.plan?.installmentMonths}m)`;
                  return (
                    <tr key={s.id} className={`transition-all ${isDarkMode?'hover:bg-gray-700/30':'hover:bg-slate-50'}`}>
                      <td className="p-4">
                        <p className={`font-black ${primary}`}>{s.name}</p>
                        <p className={`text-[10px] font-bold ${secondary}`}>{s.number}</p>
                      </td>
                      <td className={`p-4 font-bold text-xs ${primary}`}>{s.className||'-'} {s.section||s.sec||''}</td>
                      <td className="p-4">
                        {s.plan ? <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black">{planLabel}</span>
                          : <span className="text-xs text-slate-400 font-bold">Not Set</span>}
                      </td>
                      <td className={`p-4 font-black ${primary}`}>₹{(s.totalInvoicedFee||s.feeStruct?.totalFee||0).toLocaleString()}</td>
                      <td className={`p-4 font-black text-emerald-600`}>₹{(s.totalPaid||0).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={()=>openSetup(s)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black">
                            {s.feeStruct?'Edit Fee':'Set Fee'}
                          </button>
                          {inv && (
                            <button onClick={()=>setPreviewInv(inv)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black">View</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-sm font-bold text-slate-400">No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVOICES TAB */}
      {tab === 'invoices' && (
        <div className={`p-6 rounded-[2rem] border shadow-xl ${cardBg}`}>
          <h3 className={`text-xl font-black mb-6 ${primary}`}>All Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-[10px] font-black uppercase border-b ${isDarkMode?'border-gray-700 text-gray-500':'border-slate-100 text-slate-400'}`}>
                  {['Invoice #','Student','Plan','Total','Paid','Due','Status','Action'].map(h=>(
                    <th key={h} className="p-4 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode?'divide-gray-700/50':'divide-slate-50'}`}>
                {allInvoices.slice().reverse().map(inv => {
                  const sc = inv.status==='paid'?'bg-emerald-100 text-emerald-600':inv.status==='partial'?'bg-amber-100 text-amber-600':'bg-red-100 text-red-600';
                  return (
                    <tr key={inv.id} className={`transition-all ${isDarkMode?'hover:bg-gray-700/30':'hover:bg-slate-50'}`}>
                      <td className={`p-4 text-xs font-black text-blue-600`}>{inv.invoiceNo}</td>
                      <td className={`p-4 font-black text-sm ${primary}`}>{inv.studentName}</td>
                      <td className={`p-4 text-xs font-bold ${secondary}`}>{inv.installmentLabel || inv.paymentPlan?.replace('_',' ')}</td>
                      <td className={`p-4 font-black ${primary}`}>₹{(inv.totalFee||0).toLocaleString()}</td>
                      <td className="p-4 font-black text-emerald-600">₹{(inv.paidAmount||0).toLocaleString()}</td>
                      <td className={`p-4 text-xs font-bold ${secondary}`}>{inv.dueDate}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${sc}`}>{inv.status}</span></td>
                      <td className="p-4 flex gap-2">
                        <button onClick={()=>setPreviewInv(inv)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black">View</button>
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                          title={`Download invoice for ${inv.studentName}`}
                          aria-label={`Download invoice for ${inv.studentName}`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                          </svg>
                        </button>
                        {inv.status!=='paid' && (
                          <button onClick={()=>{setPayModal(inv);setPayAmount('');}} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black">Pay</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {allInvoices.length===0 && (
                  <tr><td colSpan={8} className="py-16 text-center text-sm font-bold text-slate-400">No invoices generated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FEE SETUP MODAL */}
      {setupStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={()=>setSetupStudent(null)}/>
          <div className={`relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] shadow-2xl ${isDarkMode?'bg-gray-800 border border-gray-700':'bg-white'}`}>
            <div className="min-h-0 flex-1 overflow-y-auto p-8">
            <h3 className={`text-xl font-black mb-1 ${primary}`}>Fee Structure</h3>
            <p className={`text-xs font-bold mb-6 ${secondary}`}>{setupStudent.name} · Class {setupStudent.className}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {FEE_FIELDS.map(f => (
                <div key={f.key}>
                  <label className={`text-[10px] font-black uppercase mb-1 block ${secondary}`}>{f.icon} {f.label}</label>
                  <input type="number" min="0" placeholder="0" value={struct[f.key]}
                    onChange={e=>setStruct({...struct,[f.key]:e.target.value})}
                    className={inputCls}/>
                </div>
              ))}
              <div className="col-span-2">
                <label className={`text-[10px] font-black uppercase mb-1 block ${secondary}`}>⚠️ Fine Reason</label>
                <input placeholder="Reason for fine (optional)" value={struct.fineReason}
                  onChange={e=>setStruct({...struct,fineReason:e.target.value})} className={inputCls}/>
              </div>
            </div>

            <div className={`p-4 rounded-2xl mb-6 ${isDarkMode?'bg-gray-900':'bg-slate-50'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-black ${secondary}`}>Total Fee</span>
                <span className="text-2xl font-black text-emerald-600">₹{computeTotal().toLocaleString()}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className={`text-[10px] font-black uppercase mb-2 block ${secondary}`}>Payment Plan</label>
              <div className="grid grid-cols-3 gap-3">
                {[['one_time','One Time'],['monthly','Monthly'],['installment','Installment']].map(([v,l])=>(
                  <button key={v} onClick={()=>setPlan({...plan,planType:v})}
                    className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${plan.planType===v?'border-emerald-500 bg-emerald-500 text-white':'border-slate-200 dark:border-gray-700'}`}>{l}</button>
                ))}
              </div>
              {plan.planType==='installment' && (
                <div className="mt-4">
                  <label className={`text-[10px] font-black uppercase mb-1 block ${secondary}`}>Number of Months</label>
                  <select value={plan.installmentMonths} onChange={e=>setPlan({...plan,installmentMonths:e.target.value})} className={inputCls}>
                    {['3','6','12'].map(m=><option key={m} value={m}>{m} Months (₹{Math.ceil(computeTotal()/parseInt(m)).toLocaleString()}/mo)</option>)}
                  </select>
                </div>
              )}
            </div>

            </div>

            <div className={`flex gap-4 border-t px-8 py-6 ${isDarkMode?'border-gray-700':'border-slate-200'}`}>
              <button onClick={()=>setSetupStudent(null)} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase ${isDarkMode?'bg-gray-700 text-gray-300':'bg-slate-100 text-slate-600'}`}>Cancel</button>
              <button onClick={handleSaveSetup} className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase shadow-lg">Save & Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE PREVIEW MODAL */}
      {previewInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={()=>setPreviewInv(null)}/>
          <div className="relative w-full max-w-lg my-8 p-8 rounded-[2rem] shadow-2xl bg-white text-slate-900">
            <div className="text-center mb-8 border-b pb-6">
              <h2 className="text-2xl font-black text-slate-900">🏫 Fee Invoice</h2>
              <p className="text-sm font-bold text-slate-500 mt-1">{previewInv.invoiceNo}</p>
              <p className="text-base font-black text-blue-700 mt-2">{previewInv.studentName}</p>
              <p className="text-xs font-bold text-slate-500">Class {previewInv.className} · Due: {previewInv.dueDate}</p>
            </div>

            <div className="space-y-2 mb-6">
              {FEE_FIELDS.map(f => previewInv[f.key] > 0 && (
                <div key={f.key} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-600">{f.icon} {f.label}</span>
                  <span className="text-sm font-black text-slate-900">₹{parseFloat(previewInv[f.key]).toLocaleString()}</span>
                </div>
              ))}
              {previewInv.fineReason && <p className="text-xs text-amber-600 font-bold">Fine Reason: {previewInv.fineReason}</p>}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 mb-4">
              <div className="flex justify-between"><span className="font-black text-slate-700">Total</span><span className="text-xl font-black text-blue-700">₹{(previewInv.totalFee||0).toLocaleString()}</span></div>
              <div className="flex justify-between mt-1"><span className="font-bold text-sm text-slate-500">Paid</span><span className="font-black text-emerald-600">₹{(previewInv.paidAmount||0).toLocaleString()}</span></div>
              <div className="flex justify-between mt-1"><span className="font-bold text-sm text-slate-500">Balance</span><span className="font-black text-red-500">₹{Math.max(0,(previewInv.totalFee||0)-(previewInv.paidAmount||0)).toLocaleString()}</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={()=>setPreviewInv(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-black text-xs">Close</button>
              <button onClick={()=>handleDownloadInvoice(previewInv)} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs">Download</button>
              <button onClick={()=>window.print()} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-xs">🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {/* MARK PAID MODAL */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={()=>setPayModal(null)}/>
          <div className={`relative w-full max-w-sm p-8 rounded-[2rem] shadow-2xl ${isDarkMode?'bg-gray-800 border border-gray-700':'bg-white'}`}>
            <h3 className={`text-xl font-black mb-2 ${primary}`}>Record Payment</h3>
            <p className={`text-xs font-bold mb-6 ${secondary}`}>{payModal.studentName} · Balance: ₹{Math.max(0,(payModal.totalFee||0)-(payModal.paidAmount||0)).toLocaleString()}</p>
            <label className={`text-[10px] font-black uppercase mb-1 block ${secondary}`}>Amount Received (₹)</label>
            <input type="number" min="0" placeholder="Enter amount" value={payAmount} onChange={e=>setPayAmount(e.target.value)} className={`${inputCls} mb-6`}/>
            <div className="flex gap-4">
              <button onClick={()=>setPayModal(null)} className={`flex-1 py-3 rounded-xl font-black text-xs ${isDarkMode?'bg-gray-700 text-gray-300':'bg-slate-100 text-slate-600'}`}>Cancel</button>
              <button onClick={handleMarkPaid} className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
