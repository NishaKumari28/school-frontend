'use client';
import { useState, useMemo } from 'react';
import DashboardCard from './DashboardCard';
import { getFeeStructure, updateFeeStructure, getFeePayments, updateFeePaymentStatus } from '../../components/auth/authService';

export default function StaffFees({ isDarkMode, showMessage, staffClassOptions, students, parents }) {
  const [fee, setFee] = useState({ className: '', feeAmount: '', description: '' });
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);

  const feePayments = useMemo(() => {
    return getFeePayments().slice().sort((a, b) => new Date(b.requestedAt || b.paidAt) - new Date(a.requestedAt || a.paidAt));
  }, [paymentRefreshKey]);

  const paymentSummary = useMemo(() => ({
    pending: feePayments.filter((payment) => payment.status === 'pending').length,
    processing: feePayments.filter((payment) => payment.status === 'processing').length,
    paid: feePayments.filter((payment) => payment.status === 'paid').length,
    totalCollection: feePayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0)
  }), [feePayments]);

  const handleUpdateFee = () => {
    if (!fee.className || !fee.feeAmount) {
      showMessage('Please fill fee fields', 'error');
      return;
    }
    const result = updateFeeStructure({
      className: fee.className,
      feeAmount: parseFloat(fee.feeAmount),
      description: fee.description
    });
    if (result.success) {
      showMessage('Fee structure updated successfully!');
      setFee({ className: '', feeAmount: '', description: '' });
    } else {
      showMessage(result.message, 'error');
    }
  };

  const handlePaymentStatusUpdate = (paymentId, status) => {
    const result = updateFeePaymentStatus({ id: paymentId, status });
    if (result.success) {
      setPaymentRefreshKey((prev) => prev + 1);
      showMessage(`Payment marked as ${status}`);
    } else {
      showMessage(result.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Collection</p>
          <h3 className="text-2xl font-black text-emerald-600">Rs. {paymentSummary.totalCollection.toLocaleString()}</h3>
        </div>
        <DashboardCard title="Pending" icon="⏳" value={paymentSummary.pending} color="orange" />
        <DashboardCard title="Processing" icon="⚙️" value={paymentSummary.processing} color="blue" />
        <DashboardCard title="Paid" icon="✅" value={paymentSummary.paid} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Update Structure */}
        <div className={`p-6 rounded-2xl border shadow-sm lg:col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <h2 className="text-lg font-bold mb-4">Set Fee Structure</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Class</label>
              <select
                value={fee.className}
                onChange={(e) => setFee({...fee, className: e.target.value})}
                className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700"
              >
                <option value="">Select Class</option>
                {staffClassOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Annual Fee Amount (Rs)</label>
              <input
                type="number"
                placeholder="50000"
                value={fee.feeAmount}
                onChange={(e) => setFee({...fee, feeAmount: e.target.value})}
                className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Category / Description</label>
              <input
                type="text"
                placeholder="Standard Tuition Fee"
                value={fee.description}
                onChange={(e) => setFee({...fee, description: e.target.value})}
                className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700"
              />
            </div>
            <button
              onClick={handleUpdateFee}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
            >
              Apply Changes
            </button>
          </div>
        </div>

        {/* Right: Payment Logs */}
        <div className={`p-6 rounded-2xl border shadow-sm lg:col-span-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <h2 className="text-lg font-bold mb-4">Recent Payment Requests</h2>
          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
            {feePayments.map((payment) => {
              const student = students.find((entry) => entry.id === payment.studentId);
              const parent = parents.find((entry) => entry.id === payment.parentId);
              return (
                <div key={payment.id} className={`p-4 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">Rs. {payment.amount}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold">{student?.name || 'Unknown Student'}</p>
                      <p className="text-xs text-slate-500">Parent: {parent?.name || 'Unknown'} · {payment.plan.replace('_', ' ')}</p>
                      <p className="text-[10px] text-slate-400">Date: {new Date(payment.requestedAt).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {payment.status !== 'paid' && (
                        <>
                          <button 
                            onClick={() => handlePaymentStatusUpdate(payment.id, 'paid')}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handlePaymentStatusUpdate(payment.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {payment.status === 'paid' && (
                        <button className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">Download Receipt</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {feePayments.length === 0 && (
              <p className="text-center py-12 text-slate-500">No payment records found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
