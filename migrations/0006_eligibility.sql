-- 지원 가능 여부 판정용: 거주지 요건이 있는 공고 표시
ALTER TABLE jobs ADD COLUMN residency_blocked INTEGER DEFAULT 0;
