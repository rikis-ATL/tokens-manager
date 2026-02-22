import React from 'react';

interface JsonPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: any;
  title?: string;
}

export function JsonPreviewDialog({
  isOpen,
  onClose,
  jsonData,
  title = "Generated JSON Preview"
}: JsonPreviewDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto max-h-[60vh]">
          <pre className="overflow-auto p-4 text-xs bg-gray-50 rounded-md border">
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        </div>
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}