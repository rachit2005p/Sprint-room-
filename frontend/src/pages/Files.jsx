import React, { useState } from 'react';
import { Upload, FileText, Image, Download, Trash2 } from 'lucide-react';

/**
 * Files — Displays a table of uploaded files with columns for name, uploader,
 * size, and time. Supports inline delete (local state only). The "Upload"
 * button and "Download" action are presentational. Frontend-only UI prototype.
 */
const initialFiles = [
  { id: 1, name: 'Sprint_Report_Q3.pdf', type: 'pdf', uploadedBy: 'Alice K.', size: '2.4 MB', time: '2 hours ago' },
  { id: 2, name: 'Mockup_Homepage_v2.png', type: 'image', uploadedBy: 'Bob L.', size: '4.1 MB', time: '5 hours ago' },
  { id: 3, name: 'API_Documentation.docx', type: 'doc', uploadedBy: 'Carol M.', size: '1.2 MB', time: 'Yesterday' },
  { id: 4, name: 'Design_System_Figma.sketch', type: 'image', uploadedBy: 'David R.', size: '8.7 MB', time: '2 days ago' },
  { id: 5, name: 'Meeting_Notes_Week_10.txt', type: 'text', uploadedBy: 'Eve S.', size: '36 KB', time: '3 days ago' },
  { id: 6, name: 'Presentation_Deck.pptx', type: 'ppt', uploadedBy: 'Frank T.', size: '5.9 MB', time: '5 days ago' },
];

/* Maps a file type string to the corresponding Lucide icon + colour.
   Every case returns a fragment-sized icon that sits beside the file name in the table. */
const getIcon = (type) => {
  switch (type) {
    case 'image': return <Image size={18} className="text-blue-500 shrink-0" />;
    case 'pdf':   return <FileText size={18} className="text-red-500 shrink-0" />;
    case 'doc':   return <FileText size={18} className="text-blue-600 shrink-0" />;
    case 'text':  return <FileText size={18} className="text-gray-500 shrink-0" />;
    case 'ppt':   return <FileText size={18} className="text-orange-500 shrink-0" />;
    default:      return <FileText size={18} className="text-brand shrink-0" />;
  }
};

const Files = () => {
  const [files, setFiles] = useState(initialFiles);

  const handleDelete = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title mb-1">Files</h1>
          <p className="section-subtitle">Browse and manage shared files.</p>
        </div>
        <button className="btn-primary">
          <Upload size={16} className="mr-2" /> Upload
        </button>
      </div>

      {/* Table layout: five columns — Name (with icon), Uploaded By, Size, Time, Actions.
           Rows are generated from the `files` state array. The delete button fades in on row hover. */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Uploaded By</th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Size</th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Time</th>
              <th className="text-right font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id} className="border-b border-border last:border-0 hover:bg-bg-secondary/50 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {/* Type-based icon rendered by getIcon(), followed by the raw file name */}
                    {getIcon(file.type)}
                    <span className="font-medium text-gray-900">{file.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600">{file.uploadedBy}</td>
                <td className="px-5 py-4 text-gray-600">{file.size}</td>
                <td className="px-5 py-4 text-gray-600">{file.time}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="btn-ghost p-2" title="Download">
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 rounded-btn text-gray-400 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No files yet.</div>
        )}
      </div>
    </div>
  );
};

export default Files;
