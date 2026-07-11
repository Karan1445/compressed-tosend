import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, Package, ChevronRight, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:8888/api/lawyer/packages';

export default function PackageStore() {
  const navigate = useNavigate();
  const { token } = useSelector(s => s.auth);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/store/published`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPackages(data); else toast.error('Failed to load packages'); })
      .catch(() => toast.error('Failed to load packages'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="p-6 md:p-10 w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Package Store</h1>
        <p className="text-gray-500 mt-1 text-sm">Select a package to fill out and generate your documents.</p>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-20 border-2 border-solid rounded-2xl border-gray-200">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No published packages available</p>
          <p className="text-gray-400 text-sm mt-1">Ask a lawyer to publish a package first.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {packages.map(pkg => (
            <div
              key={pkg._id}
              onClick={() => navigate(`/lawyer/packages/store/${pkg._id}/fill`)}
              className="flex items-center justify-between p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-gray-100 transition-colors">
                  <FileText className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-[15px]">{pkg.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {pkg.documents?.length || 0} document{pkg.documents?.length !== 1 ? 's' : ''} &bull;{' '}
                    <span className="text-green-600 font-medium">
                      <CheckCircle className="inline h-3 w-3 mr-0.5" />Published
                    </span>
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
