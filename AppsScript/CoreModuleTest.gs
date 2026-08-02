/**
 * TASK-0005 Core 공통 모듈 실제 실행 테스트.
 *
 * 전용 임시 시트만 사용하고 finally에서 제거한다.
 * 테스트 결과는 실행 로그와 반환 객체로 확인할 수 있다.
 *
 * @return {Object} Core 모듈 테스트 결과
 */
function runCoreModuleTests() {
  const testSheetName = '98_CORE_TEST';
  const results = [];

  try {
    SheetRepository.ensureTestSheet(testSheetName, [
      'TEST_ID',
      'NAME',
      'STATUS',
      'UPDATED_AT',
    ]);

    runCoreTestCase_(results, 'Error 객체 생성', function () {
      const error = new ValidationError('필수값 오류', 'name');
      assertCoreTest_(error instanceof CoreError, 'CoreError 상속 실패');
      assertCoreTest_(error.code === 'VALIDATION_ERROR', '오류 코드 불일치');
    });

    runCoreTestCase_(results, 'Validation 정상 동작', function () {
      Validation.required('값', 'name');
      Validation.maxLength('123', 3, 'name');
      Validation.minLength('123', 2, 'name');
      Validation.validStatus('진행중');
      Validation.validDate('2026-07-28', 'date');
      Validation.dateRange('2026-07-28', '2026-07-29');

      let requiredFailed = false;
      try {
        Validation.required('', 'name');
      } catch (error) {
        requiredFailed = error instanceof ValidationError;
      }
      assertCoreTest_(requiredFailed, '필수값 오류가 발생하지 않음');
    });

    runCoreTestCase_(results, 'Repository 정상 동작', function () {
      const inserted = SheetRepository.insert(testSheetName, {
        TEST_ID: 'TEST-0001',
        NAME: 'Repository Test',
        STATUS: '진행중',
        UPDATED_AT: new Date(),
      });
      assertCoreTest_(inserted.TEST_ID === 'TEST-0001', 'insert 실패');

      Validation.uniqueId(testSheetName, 'TEST-0002');

      const found = SheetRepository.findById(testSheetName, 'TEST-0001');
      assertCoreTest_(found.NAME === 'Repository Test', 'findById 실패');

      const all = SheetRepository.findAll(testSheetName);
      assertCoreTest_(all.length === 1, 'findAll 건수 불일치');

      const updated = SheetRepository.update(testSheetName, 'TEST-0001', {
        NAME: 'Repository Updated',
        STATUS: '완료',
      });
      assertCoreTest_(updated.NAME === 'Repository Updated', 'update 실패');
      assertCoreTest_(updated.STATUS === '완료', '부분 update 실패');

      const deleted = SheetRepository.delete(testSheetName, 'TEST-0001');
      assertCoreTest_(deleted === true, 'delete 반환값 불일치');
      assertCoreTest_(
        SheetRepository.findById(testSheetName, 'TEST-0001') === null,
        'delete 후 데이터가 남아 있음'
      );
    });

    runCoreTestCase_(results, 'CommonAPI 응답 형식', function () {
      const success = CommonAPI.success({ id: 'TEST-0001' }, { requestId: 'REQ-TEST' });
      assertCoreTest_(success.ok === true, '성공 응답 ok 불일치');
      assertCoreTest_(success.error === null, '성공 응답 error 불일치');
      assertCoreTest_(success.meta.requestId === 'REQ-TEST', 'requestId 불일치');

      const failure = CommonAPI.error(
        new NotFoundError('대상을 찾을 수 없습니다.', 'id')
      );
      assertCoreTest_(failure.ok === false, '실패 응답 ok 불일치');
      assertCoreTest_(failure.error.code === 'ENTITY_NOT_FOUND', '실패 코드 불일치');
    });

    return {
      passed: results.every(function (result) {
        return result.status === 'PASS';
      }),
      results: results,
    };
  } finally {
    SheetRepository.deleteTestSheet(testSheetName);
  }
}

function runCoreTestCase_(results, name, testFunction) {
  try {
    testFunction();
    results.push({ name: name, status: 'PASS', message: '' });
    console.log('[PASS] ' + name);
  } catch (error) {
    results.push({
      name: name,
      status: 'FAIL',
      message: error && error.message ? error.message : String(error),
    });
    console.error('[FAIL] ' + name + ': ' + results[results.length - 1].message);
  }
}

function assertCoreTest_(condition, message) {
  if (!condition) {
    throw new Error(message || '테스트 검증 실패');
  }
}
