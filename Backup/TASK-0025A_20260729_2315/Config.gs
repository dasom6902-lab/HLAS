/**
 * HLAS-PMS configuration and sheet schema.
 * Change colors or headers here; initializePMS() applies them to the workbook.
 */
const PMS_CONFIG = Object.freeze({
  appName: 'HLAS-PMS',
  version: '0.11.0',
  headerBackground: '#1F4E78',
  headerFontColor: '#FFFFFF',
  headerFontSize: 10,
  sheets: Object.freeze([
    {
      name: '00_HOME',
      headers: ['항목', '내용', '최종 갱신일시'],
      widths: [180, 360, 170],
    },
    {
      name: '01_PROJECT',
      headers: [
        'PROJECT_ID', '프로젝트명', '설명', '상태', '현재버전',
        '담당자', '시작일', '종료예정일', '생성일시', '수정일시',
      ],
      widths: [120, 220, 360, 100, 100, 120, 110, 110, 170, 170],
    },
    {
      name: '02_EPIC',
      headers: [
        'EPIC_ID', 'PROJECT_ID', 'EPIC명', '설명', '상태',
        '우선순위', '담당자', '시작일', '종료예정일', '생성일시', '수정일시',
      ],
      widths: [110, 120, 220, 360, 100, 100, 120, 110, 110, 170, 170],
    },
    {
      name: '03_FEATURE',
      headers: [
        'FEATURE_ID', 'EPIC_ID', 'FEATURE명', '설명', '상태',
        '우선순위', '담당자', '생성일시', '수정일시',
      ],
      widths: [120, 110, 220, 360, 100, 100, 120, 170, 170],
    },
    {
      name: '04_FUNCTION',
      headers: [
        'FUNCTION_ID', 'FEATURE_ID', '기능명', '설명', '입력',
        '출력', '관련시트', '상태', '담당자', '생성일시', '수정일시',
      ],
      widths: [120, 120, 220, 360, 220, 220, 180, 100, 120, 170, 170],
    },
    {
      name: '05_TASK',
      headers: [
        'TASK_ID', 'FUNCTION_ID', 'EPIC_ID', '작업명', '설명',
        '상태', '우선순위', '담당자', '시작일', '완료예정일',
        '완료일', '진행률', '생성일시', '수정일시',
      ],
      widths: [110, 120, 110, 240, 360, 100, 100, 120, 110, 110, 110, 90, 170, 170],
    },
    {
      name: '09_CHANGELOG',
      headers: [
        'LOG_ID', '버전', '변경일시', '변경유형', '변경내용',
        '관련ID', '작업자', '결과',
      ],
      widths: [110, 90, 170, 110, 420, 140, 140, 100],
    },
    {
      name: '99_SETTING',
      headers: ['설정그룹', '설정키', '설정값', '설명', '사용여부', '수정일시'],
      widths: [130, 180, 240, 360, 90, 170],
    },
  ]),
});
