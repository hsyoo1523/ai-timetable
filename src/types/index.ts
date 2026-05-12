// ── Timetable ──────────────────────────────────────────────────────────────
export type Timetable = {
  id: string
  title: string
  semester: string | null
  year_class: string | null
  owner_id: string
  custom_fields: CustomField[]
  created_at: string
  schedule_slots?: ScheduleSlot[]
}

export type ScheduleSlot = {
  id: string
  timetable_id: string
  subject_name: string
  day: '월' | '화' | '수' | '목' | '금' | '토'
  period: number
  room: string | null
  professor: string | null
  color: string
}

export type CustomField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
}

// ── Curriculum ─────────────────────────────────────────────────────────────
export type CurriculumSubject = {
  name: string
  type: '전공' | '교양'
  credits: number
  lecture: number
  lab: number
}

export type Curriculum = {
  id: string
  department_name: string
  data: Record<string, CurriculumSubject[]>
  updated_at: string
}

// ── Parser ─────────────────────────────────────────────────────────────────
export type FileType = 'pdf' | 'xlsx' | 'csv' | 'image' | 'html'
export type ParseTarget = 'curriculum' | 'other'

export type ParsedRow = Record<string, string | number | null>

export type ParsedTable = {
  headers: string[]
  rows: ParsedRow[]
}

export type StructuredCurriculum = {
  department_name: string
  data: Record<string, CurriculumSubject[]>
}

export type ClassifyResult = {
  target: ParseTarget
  reason: string
}

// ── API 공통 응답 ──────────────────────────────────────────────────────────
export type ApiOk<T> = { ok: true } & T
export type ApiError = { ok: false; error: string; detail?: string }
export type ApiResponse<T> = ApiOk<T> | ApiError

// ── 상수 ───────────────────────────────────────────────────────────────────
export const DAYS = ['월', '화', '수', '목', '금', '토'] as const
export const SEMESTERS = ['1학기', '2학기'] as const

export const DAYTIME_TIMES = [
  '09:00~09:50', '10:00~10:50', '11:00~11:50', '12:00~12:50',
  '13:00~13:50', '14:00~14:50', '15:00~15:50', '16:00~16:50',
]

export const EVENING_TIMES = [
  '18:30~19:15', '19:15~20:00', '20:05~20:50', '20:50~21:35',
  '21:40~22:25', '22:25~23:10',
]