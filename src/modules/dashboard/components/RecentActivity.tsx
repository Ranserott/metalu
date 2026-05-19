import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Activity = {
  id: string;
  action: string;
  entityType: string;
  details: string | null;
  createdAt: Date;
  user: { name: string } | null;
};

export function RecentActivity({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No hay actividad reciente
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 text-sm">
          <div className="flex-1">
            <p>
              <span className="font-medium">{activity.user?.name || "Sistema"}</span>
              {" — "}
              {activity.action}
              {" "}
              <span className="text-gray-500">{activity.entityType}</span>
            </p>
            {activity.details && (
              <p className="text-gray-500 text-xs mt-0.5">{activity.details}</p>
            )}
          </div>
          <span className="text-gray-400 text-xs shrink-0">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
          </span>
        </div>
      ))}
    </div>
  );
}