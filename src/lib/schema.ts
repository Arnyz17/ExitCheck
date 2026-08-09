import { z } from 'zod';

export const ExitCheckResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  display_theme: z.enum(['alert_warning', 'normal', 'success', 'critical']),
  sections: z.object({
    critical_alerts: z.array(z.object({
      id: z.string(),
      icon: z.string(),
      severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      message: z.string(),
      action: z.string(),
    })),
    quick_actions: z.array(
      z.object({
        id: z.string().describe("Unique identifier for the action (e.g. tesla_climate, garage_toggle)"),
        label: z.string().describe("Short action label, max 3 words"),
        icon: z.string().describe("Lucide icon name (e.g. 'car', 'door-open', 'power')"),
        endpoint: z.string().describe("API endpoint path to trigger the action, e.g. /api/actions"),
      })
    ).optional(),
    calendar_commute: z.object({
      next_event: z.string().nullable().describe("Title of the next calendar event. Null if none."),
      event_time: z.string().describe("Time of the next event (e.g. '09:00 AM') or 'N/A'"),
      destinations: z.array(
        z.object({
          label: z.string().describe("Label for the destination, e.g. 'Home' or 'Work'"),
          address: z.string().describe("The physical destination address, or 'N/A' if unknown"),
          raw_origin: z.string().describe("The raw GPS or string origin address used for calculation"),
          raw_destination: z.string().describe("The raw destination string address used for calculation"),
          travel_options: z.object({
            driving: z.string(),
            transit: z.string(),
            walking: z.string(),
          })
        })
      ).describe("List of calculated commute routes (usually Home and Work)"),
      recommendation: z.string().describe("A brief, actionable directive (e.g. 'LEAVE NOW via Car for Work')"),
    }),
    smart_home_check: z.object({
      doors_and_locks: z.string(),
      windows: z.string(),
      appliances_cleared: z.boolean(),
    }),
    errands_and_shopping: z.object({
      active_store_nearby: z.string(),
      items: z.array(z.string()),
    }),
    weather_directive: z.object({
      temp_range: z.string(),
      condition: z.string(),
      action: z.string(),
    }),
    required_gear_checklist: z.array(z.string()),
  })
});

export type ExitCheckResponse = z.infer<typeof ExitCheckResponseSchema>;
