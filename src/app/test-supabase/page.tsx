"use client";

import { useEffect, useState } from 'react';
import { getApplications } from '@/lib/api/applications';

export default function TestSupabase() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplications()
      .then((apps) => {
        setData(apps);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🧪 Test Supabase Connection</h1>
      
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-700">Loading from Supabase...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="font-bold text-red-800 mb-2">❌ Error:</h2>
          <pre className="text-sm text-red-700 overflow-auto">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      {data && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="font-bold text-green-800 mb-2">✅ Success! Found {data.length} applications</h2>
          </div>
          
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Ref No</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">No Siri</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((app: any) => (
                    <tr key={app.id} className="border-t">
                      <td className="px-4 py-2 text-sm font-mono">{app.ref_no}</td>
                      <td className="px-4 py-2 text-sm">{app.pemohon.name}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          app.status === 'Dalam Proses' ? 'bg-yellow-100 text-yellow-800' :
                          app.status === 'Diluluskan' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-mono">{app.no_siri || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <details className="bg-gray-50 border rounded p-4">
            <summary className="cursor-pointer font-semibold">View Raw Data</summary>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
