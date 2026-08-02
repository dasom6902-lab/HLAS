/**
 * @fileoverview 물류 운영본 Master Data 전용 Repository.
 *
 * 외부 운영 스프레드시트 접근은 이 Repository에서만 수행한다.
 * Service와 API는 SpreadsheetApp을 직접 사용하지 않는다.
 */

let masterDataSpreadsheetCache_ = null;

const MasterDataRepository = Object.freeze({
  /**
   * 설정된 물류 운영 스프레드시트를 반환한다.
   *
   * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} 운영 스프레드시트
   */
  getSpreadsheet: function () {
    if (masterDataSpreadsheetCache_) {
      return masterDataSpreadsheetCache_;
    }
    const config = getMasterDataConfig_();
    const propertyId = PropertiesService.getScriptProperties().getProperty(
      config.spreadsheetPropertyKey
    );
    const spreadsheetId = String(propertyId || config.spreadsheetId || '').trim();

    Validation.required(spreadsheetId, 'MASTER_SPREADSHEET_ID');
    masterDataSpreadsheetCache_ = SpreadsheetApp.openById(spreadsheetId);
    return masterDataSpreadsheetCache_;
  },

  /**
   * 기초시트를 헤더 기반 객체 배열로 한 번만 읽는다.
   *
   * @return {{sheetName:string,headers:Array<string>,records:Array<Object>,
   *   rowNumbers:Array<number>,lastRow:number}} Master Data snapshot
   */
  readMasterData: function () {
    const config = getMasterDataConfig_();
    return readMasterTable_(
      this.getSpreadsheet(),
      config.masterSheetName,
      config.masterHeaderRow,
      config.masterFirstDataRow,
      config.masterLastColumn
    );
  },

  /**
   * 주문내역을 헤더 기반 객체 배열로 한 번만 읽는다.
   *
   * @return {{sheetName:string,headers:Array<string>,records:Array<Object>,
   *   rowNumbers:Array<number>,lastRow:number}} 주문내역 snapshot
   */
  readOrderData: function () {
    const config = getMasterDataConfig_();
    return readMasterTable_(
      this.getSpreadsheet(),
      config.orderSheetName,
      config.orderHeaderRow,
      config.orderFirstDataRow,
      config.orderLastColumn
    );
  },

  /**
   * 운영 스프레드시트에 존재하는 시트명 목록을 반환한다.
   *
   * @return {Array<string>} 시트명
   */
  listSheetNames: function () {
    return this.getSpreadsheet().getSheets().map(function (sheet) {
      return sheet.getName();
    });
  },
});

function getMasterDataConfig_() {
  if (!PMS_CONFIG.masterData) {
    throw new SystemError(
      'Master Data 설정이 없습니다.',
      { field: 'PMS_CONFIG.masterData' },
      'MASTER_CONFIG_MISSING'
    );
  }
  return PMS_CONFIG.masterData;
}

function readMasterTable_(
  spreadsheet,
  sheetName,
  headerRow,
  firstDataRow,
  lastColumn
) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new NotFoundError(
      'Master Data 대상 시트를 찾을 수 없습니다: ' + sheetName,
      'sheetName',
      { sheetName: sheetName },
      'MASTER_SHEET_NOT_FOUND'
    );
  }

  const actualLastRow = sheet.getLastRow();
  const headerValues = sheet
    .getRange(headerRow, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || '').trim();
    });

  if (actualLastRow < firstDataRow) {
    return {
      sheetName: sheetName,
      headers: headerValues,
      records: [],
      rowNumbers: [],
      lastRow: actualLastRow,
    };
  }

  const values = sheet
    .getRange(firstDataRow, 1, actualLastRow - firstDataRow + 1, lastColumn)
    .getDisplayValues();
  const records = [];
  const rowNumbers = [];

  values.forEach(function (row, index) {
    if (isMasterEmptyRow_(row)) {
      return;
    }
    const record = {};
    headerValues.forEach(function (header, columnIndex) {
      if (header) {
        record[header] = row[columnIndex];
      }
    });
    records.push(record);
    rowNumbers.push(firstDataRow + index);
  });

  return {
    sheetName: sheetName,
    headers: headerValues,
    records: records,
    rowNumbers: rowNumbers,
    lastRow: actualLastRow,
  };
}

function isMasterEmptyRow_(row) {
  return row.every(function (value) {
    return String(value === null || value === undefined ? '' : value).trim() === '';
  });
}
