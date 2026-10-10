export type InstitutionType = "university" | "college" | "institute";

export interface Institution {
  id: string;
  name: string;
  short_name: string;
  type: InstitutionType;
  city: string;
  state: string;
  affiliated_to: string | null;
  website: string | null;
  established_year: number | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  branch_id: string;
  semester: number;
  name: string;
  code: string | null;
  created_at: string;
  branches?: { name: string; code: string | null };
}

export type ExamType =
  | "regular"
  | "supply"
  | "improvement"
  | "mid_sem"
  | "end_sem"
  | "preparatory"
  | "other";

export type PaperStatus = "draft" | "published" | "archived";

export interface Paper {
  id: string;
  institution_id: string;
  branch_id: string;
  semester: number;
  subject_id: string | null;
  subject_name: string;
  subject_code: string | null;
  paper_code: string | null;
  exam_type: ExamType;
  exam_year: number;
  original_path: string;
  processed_path: string;
  file_size_bytes: number;
  page_count: number;
  status: PaperStatus;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  download_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  institutions?: {
    name: string;
    short_name: string;
    type: InstitutionType;
    city?: string;
    verified?: boolean;
  };
  branches?: { name: string; code: string | null };
  subjects?: { name: string; code: string | null };
  related?: Paper[];
}

export interface PaperListResponse {
  data: Paper[];
  total: number;
  page: number;
  limit: number;
}

export interface FilterOptions {
  institutions: Institution[];
  branches: Branch[];
  semesters: number[];
  exam_types: { value: ExamType; label: string }[];
  years: number[];
}

export interface Admin {
  user_id: string;
  email: string;
  role: "super_admin" | "admin";
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
  active?: boolean;
}

export interface ActivityLog {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_hash: string | null;
  created_at: string;
}

export interface StatsOverview {
  total_papers: number;
  published_papers: number;
  draft_papers: number;
  total_downloads: number;
  downloads_last_7_days: number;
}

export interface StatsCatalog {
  institutions: number;
  universities: number;
  colleges_and_institutes: number;
  branches: number;
  subjects: number;
  admins: number;
  active_admins: number;
}

export interface DashboardStats {
  overview: StatsOverview;
  catalog: StatsCatalog;
  downloads_by_day: { date: string; downloads: number }[];
  recent_uploads: Paper[];
  top_papers: Paper[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ToastMessage {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}
