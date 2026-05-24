import React, { useEffect, useState } from 'react';
import { Project } from '../types/project';
import { logger } from '../lib/logger';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        const res = await chrome.runtime.sendMessage({ type: 'GET_ALL_PROJECTS' });
        if (isMounted && res && res.projects) {
          setProjects(res.projects);
        }
      } catch (err) {
        logger.debug(`Failed to fetch projects silently: ${err}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProjects();
    
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6 border border-dashed border-[#2e2e3e] rounded-lg flex flex-col items-center text-center mt-2">
        <div className="text-gray-600 text-xl mb-2">📁</div>
        <p className="text-xs text-gray-400">No active projects mapped.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      {projects.map(p => (
        <div key={p.project_id} className="p-3 bg-[#1e1e2e] rounded-lg border border-[#2e2e3e] flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-gray-200 truncate">{p.name || 'Untitled Project'}</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Updated {new Date(p.updated_at).toLocaleDateString()} · {p.snapshot_ids?.length || 0} items
            </p>
          </div>
          <div className="flex gap-1 ml-3">
            {p.platform?.map((plat, i) => (
              <span key={i} className="w-4 h-4 rounded-full bg-[#2e2e3e] flex items-center justify-center text-[8px] uppercase font-bold text-gray-400" title={plat}>
                {plat.charAt(0)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
