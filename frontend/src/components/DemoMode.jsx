import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, AlertCircle, Clock, Users, Mail, Calendar, BarChart2, Zap, ChevronRight, RotateCcw } from 'lucide-react';

// ─── Full scripted demo state snapshots ────────────────────────────────────
const DEMO_TASKS = [
  { id: 't1', title: 'Vendor Contract — Financial Review', description: '[CRITICAL PATH] James to review all financial clauses and sign-off on the Nexus Corp vendor contract.', owner: 'James', priority: 5, deadline: '2025-09-20T17:00:00Z', status: 'done', sla_hours: 24, event_link: 'https://calendar.google.com', dependencies: ['Invoice Breakdown from Ravi'] },
  { id: 't2', title: 'Invoice Breakdown from Ravi', description: '[CRITICAL PATH] Ravi to compile and send the complete invoice breakdown to James before Sept 15.', owner: 'Ravi', priority: 4, deadline: '2025-09-15T17:00:00Z', status: 'done', sla_hours: 48, event_link: 'https://calendar.google.com', dependencies: [] },
  { id: 't3', title: 'Auth Service Migration', description: '[CRITICAL PATH] Ravi to migrate the authentication service to the new OAuth2 framework.', owner: 'Ravi', priority: 5, deadline: '2025-09-18T17:00:00Z', status: 'escalated', sla_hours: 12, event_link: null, dependencies: [] },
  { id: 't4', title: 'Onboarding Portal UX Redesign', description: 'Priya to redesign the onboarding flow. Dependent on Auth Service completion.', owner: 'Priya', priority: 3, deadline: '2025-09-21T17:00:00Z', status: 'done', sla_hours: 72, event_link: 'https://calendar.google.com', dependencies: ['Auth Service Migration'] },
  { id: 't5', title: 'Legal Compliance Review', description: 'Anita to validate all compliance clauses in the Nexus Corp vendor agreement.', owner: 'Anita', priority: 3, deadline: '2025-09-22T17:00:00Z', status: 'done', sla_hours: 96, event_link: 'https://calendar.google.com', dependencies: [] },
];

const DEMO_EMAILS = [
  { owner: 'James', title: 'Vendor Contract — Financial Review', timestamp: new Date(Date.now() - 25 * 60000).toISOString(), status: 'success' },
  { owner: 'Ravi', title: 'Invoice Breakdown from Ravi', timestamp: new Date(Date.now() - 24 * 60000).toISOString(), status: 'success' },
  { owner: 'Ravi', title: 'Auth Service Migration', timestamp: new Date(Date.now() - 23 * 60000).toISOString(), status: 'success' },
  { owner: 'Priya', title: 'Onboarding Portal UX Redesign', timestamp: new Date(Date.now() - 22 * 60000).toISOString(), status: 'success' },
  { owner: 'Anita', title: 'Legal Compliance Review', timestamp: new Date(Date.now() - 21 * 60000).toISOString(), status: 'success' },
];

const DEMO_CALENDAR = [
  { title: 'Vendor Contract — Financial Review', owner: 'James', deadline: '2025-09-20T17:00:00Z', event_link: 'https://calendar.google.com' },
  { title: 'Invoice Breakdown from Ravi', owner: 'Ravi', deadline: '2025-09-15T17:00:00Z', event_link: 'https://calendar.google.com' },
  { title: 'Onboarding Portal UX Redesign', owner: 'Priya', deadline: '2025-09-21T17:00:00Z', event_link: 'https://calendar.google.com' },
  { title: 'Legal Compliance Review', owner: 'Anita', deadline: '2025-09-22T17:00:00Z', event_link: 'https://calendar.google.com' },
];

const DEMO_AUDIT = [
  { id: 'a1', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), agent: 'Scribe', action: 'Extract tasks', input_summary: 'Q3 Planning Meeting transcript', output_summary: 'Extracted 5 enterprise tasks from meeting', reasoning: 'Parsed structured tasks: Vendor Contract, Invoice Breakdown, Auth Migration, UX Redesign, Legal Review', status: 'success' },
  { id: 'a2', timestamp: new Date(Date.now() - 29 * 60000).toISOString(), agent: 'Planner', action: 'Plan Task', input_summary: 'Task: Vendor Contract — Financial Review', output_summary: 'Owner: James | SLA: 24h | Priority: 5 | Critical path', reasoning: 'High priority — financial sign-off blocks contract closure', status: 'success' },
  { id: 'a3', timestamp: new Date(Date.now() - 28 * 60000).toISOString(), agent: 'Planner', action: 'send_email', input_summary: 'Assigning Vendor Contract to James', output_summary: 'Email sent to James at xjennatherese@gmail.com', reasoning: 'Notifying task owner via Gmail', status: 'success' },
  { id: 'a4', timestamp: new Date(Date.now() - 27 * 60000).toISOString(), agent: 'Planner', action: 'create_calendar_event', input_summary: 'Scheduling deadline for Vendor Contract', output_summary: 'Calendar event created with deadline reminder', reasoning: 'Creating Google Calendar event for task deadline', status: 'success' },
  { id: 'a5', timestamp: new Date(Date.now() - 20 * 60000).toISOString(), agent: 'Executor', action: 'Execute Vendor Contract — Financial Review', input_summary: 'Execution attempt 1', output_summary: 'Task completed successfully', reasoning: 'All checks passed — financial review signed off', status: 'success' },
  { id: 'a6', timestamp: new Date(Date.now() - 18 * 60000).toISOString(), agent: 'Executor', action: 'Execute Invoice Breakdown from Ravi', input_summary: 'Execution attempt 1', output_summary: 'Task completed successfully', reasoning: 'Invoice breakdown compiled and sent to James', status: 'success' },
  { id: 'a7', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), agent: 'Executor', action: 'Execute Auth Service Migration', input_summary: 'Execution attempt 1', output_summary: 'Failed: Infrastructure access not granted', reasoning: 'DevOps ticket pending approval — cannot proceed without access', status: 'error' },
  { id: 'a8', timestamp: new Date(Date.now() - 12 * 60000).toISOString(), agent: 'Executor', action: 'Execute Auth Service Migration', input_summary: 'Execution attempt 2', output_summary: 'Failed: Dependency service timeout', reasoning: 'Legacy auth service not responding to migration script', status: 'error' },
  { id: 'a9', timestamp: new Date(Date.now() - 9 * 60000).toISOString(), agent: 'Executor', action: 'Execute Auth Service Migration', input_summary: 'Execution attempt 3', output_summary: 'Max retries reached — escalating to human', reasoning: 'Task escalated due to repeated failures after 3 attempts', status: 'error' },
  { id: 'a10', timestamp: new Date(Date.now() - 7 * 60000).toISOString(), agent: 'Escalation', action: 'Escalate Auth Service Migration', input_summary: 'Task failed after 3 attempts', output_summary: 'Task escalated to human review — requires manual intervention', reasoning: 'Max retries reached — SLA at risk for dependent tasks', status: 'error' },
  { id: 'a11', timestamp: new Date(Date.now() - 5 * 60000).toISOString(), agent: 'COGNITIVE MONITOR', action: 'task_reassignment', input_summary: 'Ravi exceeded capacity threshold (85%)', output_summary: 'Load rebalanced: Ravi 85%→55%, James 40%→60%', reasoning: 'Ravi exceeded capacity — task auto-reassigned to James — cognitive load balanced', status: 'success' },
  { id: 'a12', timestamp: new Date(Date.now() - 3 * 60000).toISOString(), agent: 'Auditor', action: 'System Audit', input_summary: 'Checking 5 tasks', output_summary: 'Autonomy Rate: 80.0% (5 tasks)', reasoning: 'Audit complete. 4/5 tasks completed autonomously. 1 escalated for human review.', status: 'success' },
];

const DEMO_METRICS = { total: 5, completed: 4, failed: 0, escalated: 1, autonomy_rate: 80 };

const AGENT_STATUSES = { scribe: 'done', planner: 'done', executor: 'done', auditor: 'done', escalation_check: 'done' };

// ─── Step-by-step scenarios for judges ─────────────────────────────────────
const SCENARIOS = [
  {
    id: 'extraction',
    icon: '🎙️',
    title: 'Meeting → Tasks in 3 sec',
    subtitle: 'Scribe Agent extracts 5 structured tasks from a raw meeting transcript',
    color: 'bg-[#EBE3DB] border-[#D1C7BD]',
    accent: '#A48374',
  },
  {
    id: 'cognitive',
    icon: '🧠',
    title: 'Cognitive Load Rebalancing',
    subtitle: 'System detects Ravi at 85% capacity and auto-reassigns a task to James',
    color: 'bg-[#EBE3DB] border-[#D1C7BD]',
    accent: '#A48374',
  },
  {
    id: 'escalation',
    icon: '🚨',
    title: 'Auto-Escalation Flow',
    subtitle: 'Auth Service Migration fails 3 times — system escalates to human with full context',
    color: 'bg-[#ff3355]/5 border-[#ff3355]/20',
    accent: '#ff3355',
  },
  {
    id: 'comms',
    icon: '📧',
    title: 'Automated Communications',
    subtitle: '5 Gmail notifications sent + 4 Google Calendar events created automatically',
    color: 'bg-[#EBE3DB] border-[#D1C7BD]',
    accent: '#A48374',
  },
  {
    id: 'analytics',
    icon: '📊',
    title: 'Real-Time Analytics',
    subtitle: '80% autonomy rate — 4/5 tasks completed with zero human clicks',
    color: 'bg-[#EBE3DB] border-[#D1C7BD]',
    accent: '#A48374',
  },
];

// ─── Sub-views per scenario ─────────────────────────────────────────────────
function ScenarioExtraction({ tasks }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible < tasks.length) {
      const t = setTimeout(() => setVisible(v => v + 1), 500);
      return () => clearTimeout(t);
    }
  }, [visible, tasks.length]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#A48374] mb-4">The Scribe Agent parsed this meeting transcript and extracted 5 actionable tasks with owners, priorities, and deadlines — no manual entry needed.</p>
      {tasks.slice(0, visible).map((t, i) => (
        <div key={t.id} className="flex items-center gap-3 bg-[#F1EDE6] border border-[#D1C7BD] rounded-xl p-3 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-[#3A2D28] text-[#F1EDE6] flex items-center justify-center text-sm font-bold shrink-0">{t.owner[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#3A2D28] truncate">{t.title}</div>
            <div className="text-[10px] text-[#A48374]">{t.owner} · P{t.priority} · Due {new Date(t.deadline).toLocaleDateString()}</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        </div>
      ))}
      {visible < tasks.length && (
        <div className="flex items-center gap-2 text-xs text-[#A48374] animate-pulse">
          <div className="w-2 h-2 rounded-full bg-[#A48374]" />
          Extracting tasks...
        </div>
      )}
    </div>
  );
}

function ScenarioCognitive() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep(1), 1000);
    const t2 = setTimeout(() => setStep(2), 2500);
    const t3 = setTimeout(() => setStep(3), 4000);
    return () => { clearTimeout(t); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const members = [
    { name: 'Ravi', before: 85, after: 55, critical: true },
    { name: 'James', before: 40, after: 60, critical: false },
    { name: 'Priya', before: 45, after: 45, critical: false },
    { name: 'Anita', before: 30, after: 30, critical: false },
  ];

  return (
    <div className="space-y-4">
      {step >= 1 && (
        <div className="bg-[#3A2D28] text-[#F1EDE6] px-4 py-2 rounded-lg text-xs text-center animate-pulse animate-in fade-in duration-300">
          ⚠️ Cognitive Overload Detected — Ravi is at 85% capacity
        </div>
      )}
      <div className="space-y-3">
        {members.map(m => {
          const load = step >= 2 ? m.after : m.before;
          const color = load >= 80 ? '#ff3355' : load >= 60 ? '#A48374' : '#CBAD8D';
          return (
            <div key={m.name} className="bg-[#F1EDE6] border border-[#D1C7BD] rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#3A2D28] text-[#F1EDE6] flex items-center justify-center text-xs font-bold">{m.name[0]}</div>
                  <span className="text-sm font-medium text-[#3A2D28]">{m.name}</span>
                </div>
                <span className="text-sm font-bold" style={{ color }}>{load}%</span>
              </div>
              <div className="w-full h-2 bg-[#D1C7BD] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${load}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
      {step >= 3 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 animate-in fade-in duration-300">
          ✅ Task auto-redistributed — "Invoice Breakdown" reassigned from Ravi to James. Load balanced.
        </div>
      )}
    </div>
  );
}

function ScenarioEscalation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2200),
      setTimeout(() => setStep(4), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const attempts = [
    { label: 'Attempt 1', msg: 'Failed: Infrastructure access not granted', },
    { label: 'Attempt 2', msg: 'Failed: Dependency service timeout', },
    { label: 'Attempt 3', msg: 'Max retries reached — escalating to human', },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#A48374]">Auth Service Migration failed 3 consecutive times. The Executor Agent automatically escalated with full context.</p>
      {attempts.slice(0, Math.min(step, 3)).map((a, i) => (
        <div key={i} className="flex items-start gap-3 bg-[#ff3355]/5 border border-[#ff3355]/20 rounded-xl p-3 animate-in fade-in duration-300">
          <AlertCircle className="w-4 h-4 text-[#ff3355] mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-bold text-[#ff3355]">{a.label}</div>
            <div className="text-xs text-[#3A2D28]">{a.msg}</div>
          </div>
        </div>
      ))}
      {step >= 4 && (
        <div className="bg-[#EBE3DB] border border-[#D1C7BD] rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff3355] flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#3A2D28]">Escalation Required</div>
              <div className="text-xs text-[#A48374]">Human decision needed</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" /> Approve
            </div>
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#ff3355]/5 border border-[#ff3355]/20 text-[#ff3355] text-xs font-bold">
              ✕ Reject
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioComms({ emails, calendar }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-[#A48374]" />
          <span className="text-sm font-semibold text-[#3A2D28]">Gmail Notifications Sent</span>
        </div>
        <div className="space-y-2">
          {emails.map((e, i) => (
            <div key={i} className="flex items-center justify-between bg-[#F1EDE6] border border-[#D1C7BD] rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#CBAD8D] text-[#3A2D28] flex items-center justify-center text-xs font-bold">{e.owner[0]}</div>
                <span className="text-xs text-[#3A2D28]">{e.title.substring(0, 28)}…</span>
              </div>
              <span className="text-[10px] font-bold text-green-600">✓ Sent</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-[#A48374]" />
          <span className="text-sm font-semibold text-[#3A2D28]">Calendar Events Created</span>
        </div>
        <div className="space-y-2">
          {calendar.map((e, i) => (
            <div key={i} className="flex items-center justify-between bg-[#F1EDE6] border border-[#D1C7BD] rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#A48374] text-white flex items-center justify-center text-xs font-bold">{e.owner[0]}</div>
                <span className="text-xs text-[#3A2D28]">{e.title.substring(0, 28)}…</span>
              </div>
              <span className="text-[10px] font-bold text-green-600">✓ Created</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScenarioAnalytics({ metrics, tasks }) {
  const done = tasks.filter(t => t.status === 'done').length;
  const escalated = tasks.filter(t => t.status === 'escalated').length;

  const stats = [
    { label: 'Tasks Completed', value: done, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    { label: 'Auto-Escalated', value: escalated, icon: AlertCircle, color: 'text-[#ff3355]', bg: 'bg-[#ff3355]/5 border-[#ff3355]/20' },
    { label: 'Autonomy Rate', value: `${metrics.autonomy_rate}%`, icon: Zap, color: 'text-[#A48374]', bg: 'bg-[#EBE3DB] border-[#D1C7BD]' },
    { label: 'Execution Time', value: '12s', icon: Clock, color: 'text-[#3A2D28]', bg: 'bg-[#EBE3DB] border-[#D1C7BD]' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`border rounded-xl p-4 ${s.bg}`}>
            <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[#A48374] font-medium uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-[#F1EDE6] border border-[#D1C7BD] rounded-xl p-4">
        <div className="text-xs font-semibold text-[#3A2D28] mb-3">Task Distribution</div>
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.status === 'done' ? '#00e676' : t.status === 'escalated' ? '#ff3355' : '#A48374' }} />
            <div className="text-xs text-[#3A2D28] flex-1 truncate">{t.title}</div>
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-[#ff3355]/10 text-[#ff3355]'}`}>
              {t.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Demo Mode component ────────────────────────────────────────────────
export default function DemoMode() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [scenarioKey, setScenarioKey] = useState(0); // force re-mount to replay

  const handleSelect = (id) => {
    setActiveScenario(id);
    setScenarioKey(k => k + 1);
  };

  const renderScenario = () => {
    switch (activeScenario) {
      case 'extraction': return <ScenarioExtraction key={scenarioKey} tasks={DEMO_TASKS} />;
      case 'cognitive':  return <ScenarioCognitive key={scenarioKey} />;
      case 'escalation': return <ScenarioEscalation key={scenarioKey} />;
      case 'comms':      return <ScenarioComms key={scenarioKey} emails={DEMO_EMAILS} calendar={DEMO_CALENDAR} />;
      case 'analytics':  return <ScenarioAnalytics key={scenarioKey} metrics={DEMO_METRICS} tasks={DEMO_TASKS} />;
      default: return null;
    }
  };

  const active = SCENARIOS.find(s => s.id === activeScenario);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="bg-[#3A2D28] rounded-2xl p-6 text-[#F1EDE6]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#CBAD8D] flex items-center justify-center">
            <Play className="w-4 h-4 text-[#3A2D28] fill-current" />
          </div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Interactive Demo</h2>
        </div>
        <p className="text-[#CBAD8D] text-sm">Click any scenario below to see MissionControl in action. No backend required — everything runs in your browser.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="bg-[#CBAD8D]/20 text-[#CBAD8D] px-2 py-1 rounded-full">✓ AI Agents working</span>
          <span className="bg-[#CBAD8D]/20 text-[#CBAD8D] px-2 py-1 rounded-full">✓ Real-time simulation</span>
          <span className="bg-[#CBAD8D]/20 text-[#CBAD8D] px-2 py-1 rounded-full">✓ Full feature walkthrough</span>
          <span className="bg-[#CBAD8D]/20 text-[#CBAD8D] px-2 py-1 rounded-full">✓ Theme: AI at Work</span>
        </div>
      </div>

      {/* Relevance to theme */}
      <div className="bg-[#EBE3DB] border border-[#D1C7BD] rounded-2xl p-5">
        <div className="text-xs font-bold text-[#A48374] uppercase tracking-widest mb-3">How MissionControl addresses the theme</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '🎙️', text: 'Turns chaotic meeting transcripts into prioritized action lists' },
            { icon: '🤝', text: 'Makes distributed team coordination feel effortless' },
            { icon: '🔁', text: 'Eliminates repetitive work — emails, calendars, task tracking all automated' },
            { icon: '🧠', text: 'Smart assistant that monitors cognitive load and prevents burnout' },
            { icon: '🚨', text: 'Ensures no task falls through the cracks with auto-escalation' },
            { icon: '⚡', text: 'Meeting notes → executed workflow in 12 seconds, not 4 hours' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 bg-[#F1EDE6] rounded-xl p-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs text-[#3A2D28]">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario picker + viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: scenario list */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#A48374] uppercase tracking-widest">Choose a scenario to explore</div>
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.01]
                ${activeScenario === s.id
                  ? 'bg-[#3A2D28] border-[#3A2D28] text-[#F1EDE6] shadow-lg'
                  : `${s.color} text-[#3A2D28] hover:border-[#A48374]`}
              `}
            >
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{s.title}</div>
                <div className={`text-[11px] mt-0.5 ${activeScenario === s.id ? 'text-[#CBAD8D]' : 'text-[#A48374]'}`}>{s.subtitle}</div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeScenario === s.id ? 'rotate-90 text-[#CBAD8D]' : 'text-[#D1C7BD]'}`} />
            </button>
          ))}
        </div>

        {/* Right: scenario output */}
        <div className="bg-[#EBE3DB] border border-[#D1C7BD] rounded-2xl p-5">
          {!activeScenario ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="text-4xl mb-3">👆</div>
              <div className="text-sm font-semibold text-[#3A2D28]">Select a scenario</div>
              <div className="text-xs text-[#A48374] mt-1">Click any item on the left to see it in action</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{active?.icon}</span>
                  <span className="text-sm font-bold text-[#3A2D28]">{active?.title}</span>
                </div>
                <button
                  onClick={() => handleSelect(activeScenario)}
                  className="flex items-center gap-1 text-[10px] text-[#A48374] hover:text-[#3A2D28] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Replay
                </button>
              </div>
              <div className="overflow-y-auto max-h-[420px] pr-1">
                {renderScenario()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full audit trail preview */}
      <div className="bg-[#EBE3DB] border border-[#D1C7BD] rounded-2xl p-5">
        <div className="text-xs font-bold text-[#A48374] uppercase tracking-widest mb-3">Complete Audit Trail — Every Agent Decision Explained</div>
        <div className="space-y-2 max-h-64 overflow-y-auto" style={{ fontFamily: 'DM Mono, monospace' }}>
          {DEMO_AUDIT.map((entry, i) => (
            <div key={i} className="border-l-2 border-[#D1C7BD] pl-3 py-1 hover:bg-[#F1EDE6] transition-colors rounded-r">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#CBAD8D]">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                <span className="text-[10px] font-bold uppercase text-[#A48374]">{entry.agent}</span>
                <span className={`text-[10px] px-1.5 rounded font-bold ${entry.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-[#ff3355]/10 text-[#ff3355]'}`}>
                  {entry.status}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-[#3A2D28]">{entry.action}</div>
              <div className="text-[10px] text-[#A48374] italic">{entry.reasoning}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
