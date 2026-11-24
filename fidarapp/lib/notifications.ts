export type NotificationAudience = "all" | "location";

export type CreateNotificationCampaignRequest = {
  programId: string;
  idempotencyKey: string;
  audience: NotificationAudience;
  locationId: string | null;
  title: string;
  message: string;
};

