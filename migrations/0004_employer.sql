-- 기업용 공고 등록: 사용자-회사 연결 및 공고 작성자 기록

-- 사용자의 회사 프로필 (공고를 올리는 주체)
ALTER TABLE users ADD COLUMN company_id INTEGER;

-- 공고 작성자 (본인 공고만 수정/삭제 가능하도록)
ALTER TABLE jobs ADD COLUMN posted_by INTEGER;
