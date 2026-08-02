/**
 * @fileoverview HLAS-PMS 설치 및 초기화 진입점.
 *
 * 시트 생성·헤더·초기 데이터 처리는 Repository에 위임한다.
 */

/**
 * HLAS-PMS 필수 시트와 초기 설정을 생성한다.
 *
 * 기존 데이터 행은 유지하며, 여러 번 실행해도 동일한 결과를 보장한다.
 *
 * @return {{success:boolean, createdSheets:Array<string>,
 *   updatedSheets:Array<string>, message:string}} 초기화 결과
 */
function initializePMS() {
  const response = CommonAPI.execute(function () {
    const result = SheetRepository.initializeSchema(PMS_CONFIG);
    const summary = [
      'PMS 초기화 완료',
      '신규 시트: ' +
        (result.createdSheets.length
          ? result.createdSheets.join(', ')
          : '없음'),
      '기존 시트 갱신: ' +
        (result.updatedSheets.length
          ? result.updatedSheets.join(', ')
          : '없음'),
    ].join(' / ');

    CommonAPI.writeLog({
      changeType: 'INITIALIZE',
      message: summary,
      relatedId: PMS_CONFIG.appName,
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    SheetRepository.activateSheet('00_HOME');

    return {
      createdSheets: result.createdSheets,
      updatedSheets: result.updatedSheets,
      message: summary,
    };
  }, { operation: 'initializePMS' });

  if (!response.ok) {
    throw coreErrorFromResponse_(response.error);
  }

  return {
    success: true,
    createdSheets: response.data.createdSheets,
    updatedSheets: response.data.updatedSheets,
    message: response.data.message,
  };
}
