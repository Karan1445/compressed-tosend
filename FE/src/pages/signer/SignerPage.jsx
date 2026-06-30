import React from 'react';
import { useSelector } from 'react-redux';

export default function SignerPage() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
      <div className="bg-white p-12 rounded-xl border shadow-sm flex flex-col items-center">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Hello, {user?.name || 'Signer'}
        </h1>
        <p className="text-gray-500 mt-2 text-center max-w-sm">
          Welcome to the signer dashboard. Documents pending your signature will appear here.
        </p>
      </div>
    </div>
  );
}
