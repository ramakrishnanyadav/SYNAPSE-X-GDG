import React, { useEffect, useState } from 'react';
import { CognitiveSnapshot } from '../types/snapshot';
import { logger } from '../lib/logger';

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<CognitiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_LATEST_SNAPSHOT' });
        if (response?.snapshot) {
          setSnapshot(response.snapshot);
        } else if (response?.error) {
          setError(response.error);
        }
      } catch (err) {
        logger.error('Failed to fetch snapshot for dashboard', { err });
        setError('Failed to connect to background service');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSnapshot();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] w-[320px] bg-slate-900 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-400">Loading Cognitive State...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] w-[320px] bg-slate-900 text-white p-6">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️ Error</div>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] w-[320px] bg-slate-900 text-white p-6">
        <div className="text-indigo-400 text-3xl mb-4">🧠</div>
        <h2 className="text-lg font-semibold mb-2">No Active Session</h2>
        <p className="text-sm text-slate-400 text-center">
          Open a supported AI platform to start capturing your cognitive state.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] w-[320px] bg-slate-900 text-slate-200 overflow-y-auto">
      <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 z-10">
        <div className="flex justify-between items-center mb-1">
          <h1 className="font-bold text-white tracking-tight">SYNAPSE</h1>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-300 rounded-full uppercase tracking-wider">
            {snapshot.platform}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate" title={snapshot.current_goal}>
          {snapshot.current_goal}
        </p>
      </div>

      <div className="p-4 space-y-5">
        {snapshot.active_tasks.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">In Progress</h3>
            <ul className="space-y-1.5">
              {snapshot.active_tasks.map((task, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">▪</span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {snapshot.blockers.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">Blocked On</h3>
            <ul className="space-y-1.5">
              {snapshot.blockers.map((blocker, i) => (
                <li key={i} className="text-sm flex items-start gap-2 text-rose-200">
                  <span className="text-rose-500 mt-0.5">▪</span>
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {snapshot.decisions_made.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Decisions</h3>
            <ul className="space-y-1.5">
              {snapshot.decisions_made.map((decision, i) => (
                <li key={i} className="text-sm flex items-start gap-2 text-emerald-200">
                  <span className="text-emerald-500 mt-0.5">▪</span>
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      
      <div className="mt-auto p-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
        <span>Conf: {Math.round(snapshot.confidence_score * 100)}%</span>
        <span>{new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
