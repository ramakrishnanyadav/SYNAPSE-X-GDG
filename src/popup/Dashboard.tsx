import React, { useEffect, useState } from 'react';
import { CognitiveSnapshot } from '../types/snapshot';
import { logger } from '../lib/logger';
import SnapshotCard from './SnapshotCard';
import ProjectList from './ProjectList';
import AccountHealth from './AccountHealth';

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<CognitiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'projects'>('current');
  const [copyFeedback, setCopyFeedback] = useState('Copy Brief');

  useEffect(() => {
    let isMounted = true;
    
    const fetchSnapshot = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_LATEST_SNAPSHOT' });
        if (!isMounted) return;
        
        if (response?.snapshot) {
          setSnapshot(response.snapshot);
        } else if (response?.error) {
          setError(response.error);
        }
      } catch (err) {
        logger.error('Failed to fetch snapshot for dashboard', { err });
        if (isMounted) setError('Failed to connect to background service');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchSnapshot();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const exportSnapshot = async () => {
    const snap = await chrome.runtime.sendMessage({ type: 'GET_LATEST_SNAPSHOT' });
    if (!snap || !snap.snapshot) return;
    
    const s = snap.snapshot;
    const exportText = `
SYNAPSE COGNITIVE EXPORT
Generated: ${new Date().toLocaleString()}
═══════════════════════════════

GOAL: ${s.current_goal}

IN PROGRESS:
${s.active_tasks?.map((t: string) => `• ${t}`).join('\n') || 'None'}

BLOCKED ON:
${s.blockers?.map((b: string) => `• ${b}`).join('\n') || 'None'}

DECISIONS MADE:
${s.decisions_made?.map((d: string) => `• ${d}`).join('\n') || 'None'}

Platform: ${s.platform}
Captured: ${new Date(s.timestamp).toLocaleString()}
Confidence: ${Math.round(s.confidence_score * 100)}%
    `.trim();
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBriefToClipboard = async () => {
    const snap = await chrome.runtime.sendMessage({ type: 'GET_LATEST_SNAPSHOT' });
    if (!snap || !snap.snapshot) return;
    
    const s = snap.snapshot;
    const brief = `
SYNAPSE CONTEXT BRIEF
─────────────────────────────────────
GOAL: ${s.current_goal}

IN PROGRESS:
${s.active_tasks?.map((t: string) => `• ${t}`).join('\n') || 'None'}

BLOCKED ON:
${s.blockers?.map((b: string) => `• ${b}`).join('\n') || 'None'}

ALREADY DECIDED:
${s.decisions_made?.map((d: string) => `• ${d}`).join('\n') || 'None'}
─────────────────────────────────────
Continue from exactly here.
    `.trim();
    
    try {
      await navigator.clipboard.writeText(brief);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback('Copy Brief'), 2000);
    } catch (e) {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback('Copy Brief'), 2000);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-[360px] bg-[#0f0f0f] text-gray-200 font-sans">
      <div className="shrink-0 bg-[#0f0f0f] border-b border-[#1e1e2e] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-indigo-500 text-xl font-bold">⚡</div>
          <h1 className="font-bold text-white tracking-tight text-sm">SYNAPSE</h1>
        </div>
        
        <div className="flex bg-[#1e1e2e] rounded-md p-1 relative">
          <button 
            className={`flex-1 text-[11px] py-1.5 rounded-sm font-medium transition-colors z-10 ${activeTab === 'current' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('current')}
          >
            Current State
          </button>
          <button 
            className={`flex-1 text-[11px] py-1.5 rounded-sm font-medium transition-colors z-10 ${activeTab === 'projects' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('projects')}
          >
            All Projects
          </button>
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#2e2e3e] rounded-sm transition-transform duration-200 ease-out shadow-sm ${activeTab === 'current' ? 'translate-x-0' : 'translate-x-[calc(100%+4px)]'}`}
            style={{ left: '4px' }}
          ></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'current' ? (
          <div className="space-y-4">
            <AccountHealth />
            
            <div>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Latest Cognitive Snapshot</h2>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs text-gray-400">Syncing brain state...</p>
                </div>
              ) : error ? (
                <div className="p-4 border border-rose-500/30 bg-rose-500/10 rounded-lg text-center">
                  <div className="text-rose-400 text-xs">{error}</div>
                </div>
              ) : snapshot ? (
                <div className="space-y-3">
                  <SnapshotCard snapshot={snapshot} />
                  <div className="flex gap-2">
                    <button
                      onClick={copyBriefToClipboard}
                      className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-medium rounded transition-colors"
                    >
                      {copyFeedback}
                    </button>
                    <button
                      onClick={exportSnapshot}
                      className="flex-1 py-2 bg-[#2e2e3e] hover:bg-[#3e3e4e] text-white text-[11px] font-medium rounded transition-colors border border-[#3e3e4e]"
                    >
                      Export ↓
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-[#2e2e3e] rounded-lg flex flex-col items-center text-center mt-2">
                  <div className="text-gray-600 text-2xl mb-2">🧠</div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">No active session found.<br/>Open Claude or ChatGPT to start capturing.</p>
                  <button 
                    onClick={() => chrome.tabs.create({ url: 'https://claude.ai/new' })}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-medium rounded transition-colors shadow-sm"
                  >
                    Open Claude to start
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
             <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Continuity Graph</h2>
             <ProjectList />
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f0f0f;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2e2e3e;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4a4a5a;
        }
      `}</style>
    </div>
  );
}
