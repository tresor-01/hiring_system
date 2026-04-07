import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  jobId: string;
  stage?: string;
}

export default function ExportButton({ jobId, stage }: Props) {
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const exportFile = async (type: 'pdf' | 'csv') => {
    setExporting(type);
    try {
      const params = new URLSearchParams();
      if (stage) params.append('stage', stage);

      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token
        : null;

      const response = await fetch(
        `${API_URL}/api/reports/jobs/${jobId}/export/${type}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortlist-${jobId}.${type === 'pdf' ? 'html' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${type.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => exportFile('csv')}
        disabled={!!exporting}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        {exporting === 'csv' ? '...' : '📊'} CSV
      </button>
      <button
        onClick={() => exportFile('pdf')}
        disabled={!!exporting}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        {exporting === 'pdf' ? '...' : '📄'} PDF
      </button>
    </div>
  );
}
