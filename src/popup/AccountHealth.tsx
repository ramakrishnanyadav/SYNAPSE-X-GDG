import React from 'react';
import { Platform } from '../types/platform';

export default function AccountHealth() {
  const accounts = [
    { id: 'claude-main', platform: Platform.CLAUDE, status: 'active', label: 'Claude (Main)' },
    { id: 'claude-alt', platform: Platform.CLAUDE, status: 'rate-limited', label: 'Claude (Alt)' },
    { id: 'gpt-main', platform: Platform.CHATGPT, status: 'active', label: 'ChatGPT' },
    { id: 'gemini-main', platform: Platform.GEMINI, status: 'active', label: 'Gemini' }
  ];

  return (
    <div className="bg-[#1e1e2e] rounded-lg border border-[#2e2e3e] p-3">
      <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Health</h3>
      <div className="space-y-2">
        {accounts.map(acc => (
          <div key={acc.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${acc.status === 'active' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
              <span className="text-xs text-gray-300">{acc.label}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${acc.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {acc.status === 'active' ? 'Ready' : 'Cooldown'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
