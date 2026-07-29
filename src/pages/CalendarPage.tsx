import ApiCard from '@/components/ApiCard';
import PageHeader from '@/components/PageHeader';
import { calendarApi } from '@/api/calendarApi';
import { CalendarDays } from 'lucide-react';

/*
 * Calendar — the user-facing read of the compliance/events calendar.
 * Admins create/edit these under Admin → Calendar (see AdminPage).
 * Backend: server/src/routes/app/v1/calendarRoutes.ts (/api/v1/calendar).
 */
export default function CalendarPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Calendar"
        subtitle="The compliance & events calendar the user sees. Read-only for the app; admins curate the entries under Admin → Calendar."
        icon={<CalendarDays size={18} />}
        badge="B2C + B2B"
      />

      <div className="space-y-4">
        <ApiCard
          title="Get Calendar Events"
          method="GET"
          endpoint="/api/v1/calendar"
          description="All calendar events (compliance + general), sorted by date then start time."
          onSubmit={() => calendarApi.getEvents()}
        />
      </div>
    </div>
  );
}
