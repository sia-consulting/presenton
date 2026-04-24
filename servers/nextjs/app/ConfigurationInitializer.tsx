'use client';

import { useEffect, useState } from 'react';
import { setCanChangeKeys, setLLMConfig } from '@/store/slices/userConfig';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';

export function ConfigurationInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const route = usePathname();

  useEffect(() => {
    fetchUserConfigState();
  }, []);

  const fetchUserConfigState = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/can-change-keys');
      const canChangeKeys = (await response.json()).canChange;
      dispatch(setCanChangeKeys(canChangeKeys));

      if (canChangeKeys) {
        const configResponse = await fetch('/api/user-config');
        const llmConfig = await configResponse.json();
        if (!llmConfig.LLM) {
          llmConfig.LLM = 'azure_ai_foundry';
        }
        if (!llmConfig.IMAGE_PROVIDER) {
          llmConfig.IMAGE_PROVIDER = 'azure_ai_foundry';
        }
        dispatch(setLLMConfig(llmConfig));
      }

      // Always redirect root to /upload
      if (route === '/') {
        router.push('/upload');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E9E8F8] via-[#F5F4FF] to-[#E0DFF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
            <div className="mb-6">
              <img src="/Logo.png" alt="PresentOn" className="h-12 mx-auto mb-4 opacity-90" />
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 font-inter">Initializing Application</h3>
              <p className="text-sm text-gray-600 font-inter">Loading configuration...</p>
            </div>
            <div className="mt-6">
              <div className="flex space-x-1 justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
