import React from 'react';
import { CognitiveSnapshot } from '../types/snapshot';

export default function SnapshotCard({ snapshot }: { snapshot: CognitiveSnapshot }) {
  if (!snapshot) return null;

  return (
    <div className="bg-[#1e1e2e] rounded-lg border border-[#2e2e3e] overflow-hidden">
      <div className="bg-[#1e1e2e]/90 border-b border-[#2e2e3e] p-3">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-semibold text-gray-200 tracking-tight text-sm truncate">{snapshot.project_id?.split('-')[0] || 'Unknown'}</h3>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-300 rounded-full uppercase tracking-wider">
            {snapshot.platform}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate" title={snapshot.current_goal}>
          {snapshot.current_goal}
        </p>
      </div>

      <div className="p-3 space-y-4">
        {snapshot.active_tasks && snapshot.active_tasks.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">In Progress</h4>
            <ul className="space-y-1">
              {snapshot.active_tasks.map((task, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">▪</span>
                  <span className="text-gray-300">{task}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {snapshot.blockers && snapshot.blockers.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider mb-1.5">Blocked On</h4>
            <ul className="space-y-1">
              {snapshot.blockers.map((blocker, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5 text-rose-200">
                  <span className="text-rose-500 mt-0.5">▪</span>
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {snapshot.decisions_made && snapshot.decisions_made.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">Decisions</h4>
            <ul className="space-y-1">
              {snapshot.decisions_made.map((decision, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5 text-emerald-200">
                  <span className="text-emerald-500 mt-0.5">▪</span>
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      
      <div className="p-2 border-t border-[#2e2e3e] flex justify-between items-center text-[10px] text-gray-500 bg-[#1e1e2e]/50">
        <span>Conf: {Math.round((snapshot.confidence_score || 0) * 100)}%</span>
        <span>{new Date(snapshot.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
