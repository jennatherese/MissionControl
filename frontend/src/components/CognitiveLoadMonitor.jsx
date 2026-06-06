import React, { useState, useEffect } from 'react';

export default function CognitiveLoadMonitor({ tasks, onTaskReassign, onAuditLog }) {
  const [loads, setLoads] = useState({});
  const [showBanner, setShowBanner] = useState(false);
  const [hasRebalanced, setHasRebalanced] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Calculate real-time loads from actual tasks
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setLoads({});
      return;
    }

    const newLoads = {};
    const taskCounts = {};

    tasks.forEach(task => {
      if (task.owner) {
        if (!newLoads[task.owner]) {
          newLoads[task.owner] = 0;
          taskCounts[task.owner] = 0;
        }
        const priority = task.priority || 3;
        // Base load: 20% per task + priority weight
        newLoads[task.owner] += 20 + (priority * 8);
        taskCounts[task.owner] += 1;
      }
    });

    // Cap at 100%
    Object.keys(newLoads).forEach(owner => {
      newLoads[owner] = Math.min(100, newLoads[owner]);
    });

    setLoads(newLoads);
  }, [tasks]);

  useEffect(() => {
    if (hasRebalanced) return;

    // Find the most overloaded person (>=85%)
    const overloaded = Object.entries(loads).find(([, load]) => load >= 85);
    if (!overloaded) return;

    const [overloadedName, overloadedLoad] = overloaded;

    // Find the least loaded person to reassign to
    const others = Object.entries(loads).filter(([name]) => name !== overloadedName);
    if (others.length === 0) return;
    const [targetName] = others.sort((a, b) => a[1] - b[1])[0];

    setShowBanner(true);

    const timer = setTimeout(() => {
      setLoads(prev => ({
        ...prev,
        [overloadedName]: Math.max(40, overloadedLoad - 30),
        [targetName]: Math.min(100, (prev[targetName] || 0) + 20),
      }));

      if (onAuditLog) {
        onAuditLog({
          id: String(Date.now()),
          timestamp: new Date().toISOString(),
          agent: 'COGNITIVE MONITOR',
          action: 'task_reassignment',
          status: 'success',
          input_summary: `${overloadedName} at ${overloadedLoad}% capacity`,
          output_summary: `Load rebalanced: ${overloadedName} ${overloadedLoad}%→${Math.max(40, overloadedLoad - 30)}%`,
          reasoning: `${overloadedName} exceeded capacity — task auto-reassigned to ${targetName} — cognitive load balanced`,
        });
      }

      if (onTaskReassign) {
        const overloadedTask = tasks.find(t => t.owner === overloadedName && t.status !== 'done');
        if (overloadedTask) {
          onTaskReassign(overloadedName, targetName, overloadedTask.title);
        }
      }

      setShowBanner(false);
      setShowToast(true);
      setHasRebalanced(true);
      setTimeout(() => setShowToast(false), 4000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [loads, hasRebalanced, onAuditLog, onTaskReassign, tasks]);

  const getLoadColor = (load) => {
    if (load >= 90) return '#3A2D28';
    if (load >= 71) return '#A48374';
    if (load >= 41) return '#CBAD8D';
    return '#A48374'; // Changed from #D1C7BD to make it more visible
  };

  const getLoadStatus = (load) => {
    if (load >= 90) return 'Critical';
    if (load >= 71) return 'Overloaded';
    if (load >= 41) return 'Moderate';
    return 'Optimal';
  };

  const getInitials = (name) => {
    return name.substring(0, 1);
  };

  const ownerCount = Object.keys(loads).length;
  const isCustomTranscript = ownerCount > 0 && !Object.keys(loads).every(name => 
    ['Ravi', 'James', 'Priya', 'Anita'].includes(name)
  );

  return (
    <div className="space-y-4">
      {showBanner && (
        <div className="bg-[#3A2D28] text-[#F1EDE6] px-6 py-3 rounded-lg text-center animate-pulse" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>
          Cognitive Overload Detected — {Object.entries(loads).find(([,l]) => l >= 85)?.[0] || 'Team member'} is at critical capacity
        </div>
      )}

      <div className="bg-[#EBE3DB] border border-[#D1C7BD] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#3A2D28] tracking-tight" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
            Cognitive Load Monitor
          </h3>
          {isCustomTranscript && (
            <span className="text-[9px] uppercase tracking-[1px] text-[#CBAD8D] bg-[#F1EDE6] px-2 py-1 rounded" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Custom Transcript
            </span>
          )}
        </div>

        <div className="space-y-3">
          {Object.entries(loads).map(([name, load]) => (
            <div key={name} className="bg-[#F1EDE6] border border-[#D1C7BD] rounded-lg p-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#3A2D28] flex items-center justify-center text-[#F1EDE6] text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                {getInitials(name)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#3A2D28]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                    {name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#3A2D28]" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
                      {load}%
                    </span>
                    <span className="text-[9px] uppercase tracking-[1px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: getLoadColor(load) }}>
                      {getLoadStatus(load)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-[#D1C7BD] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${load >= 90 ? 'animate-pulse' : ''}`}
                    style={{ 
                      width: `${load}%`,
                      backgroundColor: getLoadColor(load)
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>
          Task auto-redistributed to balance team load
        </div>
      )}
    </div>
  );
}
