// ===== 지원 가능 여부 판정 =====
// 공고의 근무 지역·시차 조건을 분석해 "지원 가능 / 확인 필요 / 지원 불가"로 분류한다.
// 서버(수집 시 저장)와 화면(내 위치 기준 재계산) 양쪽에서 같은 기준을 쓰기 위해 분리.

export type Eligibility = {
  level: 'ok' | 'warn' | 'no'
  label: string
  reason: string
  overlap: number | null   // 하루 겹치는 업무시간 (8시간 기준), null이면 판단 불가
}

// 특정 국가/지역 "거주"를 요구하는 표현 → 시차와 무관하게 지원 불가
const RESIDENCY_PATTERNS = [
  /must\s+(be\s+)?(located|based|reside|live)\s+in/i,
  /must\s+have\s+the\s+right\s+to\s+work/i,
  /(residents?|citizens?)\s+of\s+[a-z]/i,
  /work\s+authorization\s+in/i,
  /\b(us|u\.s\.|usa|uk|canada|eu)\s*(only|-only|\s+based\s+only)/i,
  /only\s+(candidates|applicants)\s+(in|from|located)/i,
  /eligible\s+to\s+work\s+in/i,
]

// 전 세계 어디서나 가능한 표현
const ANYWHERE_PATTERNS = [
  /anywhere\s+in\s+the\s+world/i, /\bworldwide\b/i, /\bglobal(ly)?\b/i,
  /work\s+from\s+anywhere/i, /any\s+(location|timezone|time\s*zone)/i, /\banywhere\b/i,
]

/** 공고 텍스트에 거주지 요건이 있는지 */
export function hasResidencyRequirement(text: string): boolean {
  const s = text || ''
  if (ANYWHERE_PATTERNS.some((r) => r.test(s))) return false
  return RESIDENCY_PATTERNS.some((r) => r.test(s))
}

/** "UTC+9", "UTC-5", "CET", "GMT+2" 등에서 오프셋(시간) 추출 */
export function parseOffset(tz: string | null | undefined): number | null {
  if (!tz) return null
  const s = String(tz).trim()
  const m = s.match(/(?:UTC|GMT)\s*([+-])\s*(\d{1,2})/i)
  if (m) return (m[1] === '-' ? -1 : 1) * parseInt(m[2])
  if (/^(UTC|GMT)$/i.test(s)) return 0
  const named: Record<string, number> = {
    CET: 1, CEST: 2, EET: 2, BST: 1, WET: 0,
    EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, PST: -8, PDT: -7,
    KST: 9, JST: 9, IST: 5.5, SGT: 8, AEST: 10,
  }
  const key = (s.match(/\b([A-Z]{3,4})\b/) || [])[1]
  if (key && named[key] !== undefined) return named[key]
  return null
}

/** 두 시차 사이의 하루 겹치는 업무시간 (8시간 근무 기준) */
export function overlapHours(myOffset: number, jobOffset: number): number {
  let diff = Math.abs(myOffset - jobOffset)
  if (diff > 12) diff = 24 - diff
  return Math.max(0, 8 - diff)
}

/**
 * 공고 하나에 대해 내 위치(myOffset) 기준 지원 가능 여부를 판정
 * job: { remote_type, required_timezone, location_note, residency_blocked }
 */
export function judge(job: any, myOffset: number): Eligibility {
  // 1) 거주지 요건 → 지원 불가
  if (job.residency_blocked) {
    return { level: 'no', label: '지원 불가', reason: '특정 국가 거주자만 지원할 수 있어요', overlap: 0 }
  }

  const jobOffset = parseOffset(job.required_timezone)

  // 2) 전 세계 근무 가능 (시차 제한 없음)
  if (job.remote_type === 'fully_remote' && jobOffset === null) {
    return { level: 'ok', label: '지원 가능', reason: '전 세계 어디서나 근무 가능', overlap: 8 }
  }

  // 3) 시차 정보가 없어 판단 불가
  if (jobOffset === null) {
    return { level: 'warn', label: '확인 필요', reason: '근무 지역 정보가 없어 원문 확인이 필요해요', overlap: null }
  }

  // 4) 시차 계산
  const ov = overlapHours(myOffset, jobOffset)
  let diff = Math.abs(myOffset - jobOffset)
  if (diff > 12) diff = 24 - diff

  if (ov >= 4) return { level: 'ok', label: '지원 가능', reason: '업무시간이 하루 ' + ov + '시간 겹쳐요', overlap: ov }
  if (ov >= 1) return { level: 'warn', label: '시차 주의', reason: '겹치는 시간이 ' + ov + '시간뿐이라 새벽 근무가 생길 수 있어요', overlap: ov }
  return { level: 'no', label: '시차 불가', reason: '업무시간이 전혀 겹치지 않아요 (시차 ' + diff + '시간)', overlap: 0 }
}
