import { ActivityLog } from '../types';

interface Props {
  activities: ActivityLog[];
}

const ACTION_ICONS: Record<string, string> = {
  CREATED_JOB: '📋',
  UPLOADED_RESUMES: '📁',
  MATCHED_RESUMES: '🤖',
  CHANGED_STAGE: '📦',
  GENERATED_SHORTLIST: '⭐',
  INVITED_MEMBER: '👤',
  SYSTEM_SEEDED: '🌱',
  DEFAULT: '📝'
};

export default function ActivityFeed({ activities }: Props) {
  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
      ) : (
        activities.map((activity) => {
          const icon = ACTION_ICONS[activity.action] || ACTION_ICONS.DEFAULT;
          const meta = activity.metadata ? JSON.parse(activity.metadata) : {};
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-sm shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-300">
                  <span className="font-medium">{activity.user?.name}</span>{' '}
                  {formatAction(activity.action, meta)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(activity.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatAction(action: string, meta: any): string {
  switch (action) {
    case 'CREATED_JOB': return `created job "${meta.title || ''}"`;
    case 'UPLOADED_RESUMES': return `uploaded ${meta.count || ''} resume(s)`;
    case 'MATCHED_RESUMES': return `ran AI matching for ${meta.count || ''} resume(s)`;
    case 'CHANGED_STAGE': return `moved ${meta.candidateName || 'candidate'} to ${meta.stage || ''}`;
    case 'GENERATED_SHORTLIST': return `generated shortlist of ${meta.count || ''} candidates`;
    case 'INVITED_MEMBER': return `invited ${meta.email || ''} as ${meta.role || ''}`;
    default: return action.toLowerCase().replace(/_/g, ' ');
  }
}
