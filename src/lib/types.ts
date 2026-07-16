export type UserRole = "admin" | "landlord" | "cleaner";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  landlord: "Vermieter",
  cleaner: "Reinigungskraft",
};

export type ApartmentStatus = "active" | "archived";
export type OccupancyStatus = "free" | "occupied";

export type CleaningJobStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "problem_reported";

export type PhotoPhase = "before" | "after" | "issue";

export type IssueCategory =
  | "damage"
  | "wear"
  | "missing_item"
  | "cleaning_not_possible"
  | "other";

export type IssuePriority = "critical" | "normal";
export type IssueStatus = "open" | "acknowledged" | "resolved";

export type NotificationType =
  | "cleaning_completed"
  | "issue_reported"
  | "cleaning_overdue"
  | "cleaning_reminder";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  locale: string;
  active: boolean;
  /** Genau ein ausgezeichneter Admin (Inhaber) — darf fremde Admin-Profile
   * verwalten und Admin-Accounts löschen. Nur per SQL setzbar. */
  is_superadmin: boolean;
  created_at: string;
}

export interface ApartmentInventoryItem {
  id: string;
  apartment_id: string;
  name: string;
  category: string | null;
  notes: string | null;
}

export interface Apartment {
  id: string;
  org_id: string;
  name: string;
  address: string;
  room_count: number;
  description: string | null;
  floor_plan_url: string | null;
  status: ApartmentStatus;
  occupancy_status: OccupancyStatus;
  ical_url: string | null;
  owner_id: string | null;
  default_cleaner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApartmentBooking {
  id: string;
  apartment_id: string;
  org_id: string;
  uid: string;
  start_date: string;
  end_date: string;
  summary: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  profile_id: string;
  org_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface CleaningRating {
  id: string;
  cleaning_job_id: string;
  org_id: string;
  apartment_id: string;
  cleaner_id: string | null;
  rating: number;
  comment: string | null;
  rated_by: string | null;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  room_name: string;
  position: number;
  label: string;
}

export interface CleaningJob {
  id: string;
  org_id: string;
  apartment_id: string;
  assigned_to: string | null;
  booking_id: string | null;
  checklist_template_id: string | null;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: CleaningJobStatus;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningJobChecklistResult {
  id: string;
  cleaning_job_id: string;
  org_id: string;
  room_name: string;
  label: string;
  checked: boolean;
  note: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  cleaning_job_id: string;
  org_id: string;
  room_name: string;
  phase: PhotoPhase;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface IssueReport {
  id: string;
  cleaning_job_id: string;
  apartment_id: string;
  org_id: string;
  category: IssueCategory;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  reported_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AppNotification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_job_id: string | null;
  related_apartment_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  damage: "Schaden",
  wear: "Verschleiß",
  missing_item: "Fehlender Gegenstand",
  cleaning_not_possible: "Reinigung nicht möglich",
  other: "Sonstiges",
};

export const CLEANING_JOB_STATUS_LABELS: Record<CleaningJobStatus, string> = {
  scheduled: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  problem_reported: "Problem gemeldet",
};
