/**
 * Google Sheets 데이터 접근을 담당하는 Repository.
 *
 * 신규 Core API는 SpreadsheetApp에 직접 접근하지 않고 이 Repository만
 * 사용해야 한다. 기존 Project/Epic 코드는 TASK-0005 Phase 1에서 변경하지
 * 않으며, 후속 리팩터링에서 이 Repository로 전환한다.
 */
const SheetRepository = Object.freeze({
  /**
   * 이름으로 시트를 조회한다.
   *
   * @param {string} sheetName
   * @return {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet: function (sheetName) {
    const normalizedName = normalizeSheetName_(sheetName);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      throw new SystemError('연결된 스프레드시트를 찾을 수 없습니다.');
    }

    const sheet = spreadsheet.getSheetByName(normalizedName);
    if (!sheet) {
      throw new NotFoundError(
        '시트를 찾을 수 없습니다: ' + normalizedName,
        'sheetName',
        { sheetName: normalizedName },
        'SHEET_NOT_FOUND'
      );
    }

    return sheet;
  },

  /**
   * 시트의 전체 데이터 행을 헤더 기반 객체 배열로 반환한다.
   */
  findAll: function (sheetName) {
    const sheet = this.getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow < 2 || lastColumn < 1) {
      return [];
    }

    const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    const headers = normalizeHeaders_(values[0]);

    return values
      .slice(1)
      .filter(function (row) {
        return !isEmptyRepositoryRow_(row);
      })
      .map(function (row) {
        return rowToRepositoryObject_(headers, row);
      });
  },

  /**
   * 첫 번째 열의 ID를 기준으로 단건을 조회한다.
   * 대상이 없으면 null을 반환한다.
   */
  findById: function (sheetName, id) {
    const normalizedId = normalizeRepositoryId_(id);
    const sheet = this.getSheet(sheetName);
    const rowIndex = findRepositoryRowIndexById_(sheet, normalizedId);

    if (rowIndex === -1) {
      return null;
    }

    const lastColumn = sheet.getLastColumn();
    const headers = normalizeHeaders_(
      sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    );
    const row = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];

    return rowToRepositoryObject_(headers, row);
  },

  /**
   * 객체 또는 배열 데이터를 새 행으로 추가한다.
   */
  insert: function (sheetName, rowData) {
    const sheet = this.getSheet(sheetName);
    const lastColumn = sheet.getLastColumn();
    const headers = normalizeHeaders_(
      sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    );
    const row = repositoryDataToRow_(headers, rowData);

    sheet.appendRow(row);
    return this.findById(sheetName, row[0]);
  },

  /**
   * ID 기준 행을 수정한다.
   *
   * 객체 입력은 전달된 필드만 수정하며, 배열 입력은 전체 행을 교체한다.
   */
  update: function (sheetName, id, rowData) {
    const normalizedId = normalizeRepositoryId_(id);
    const sheet = this.getSheet(sheetName);
    const rowIndex = findRepositoryRowIndexById_(sheet, normalizedId);

    if (rowIndex === -1) {
      throw new NotFoundError(
        '수정할 데이터를 찾을 수 없습니다: ' + normalizedId,
        'id',
        { sheetName: sheetName, id: normalizedId }
      );
    }

    const lastColumn = sheet.getLastColumn();
    const headers = normalizeHeaders_(
      sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    );
    const currentRow = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
    const nextRow = mergeRepositoryRow_(headers, currentRow, rowData);

    // 조회 기준인 첫 번째 ID 열은 변경하지 않는다.
    nextRow[0] = currentRow[0];
    sheet.getRange(rowIndex, 1, 1, lastColumn).setValues([nextRow]);

    return this.findById(sheetName, normalizedId);
  },

  /**
   * ID 기준 실제 행을 삭제한다.
   *
   * Domain API에서는 데이터 정책에 따라 상태 변경 방식의 Soft Delete를
   * 우선 검토하고, 물리 삭제가 필요한 경우에만 이 함수를 사용한다.
   */
  delete: function (sheetName, id) {
    const normalizedId = normalizeRepositoryId_(id);
    const sheet = this.getSheet(sheetName);
    const rowIndex = findRepositoryRowIndexById_(sheet, normalizedId);

    if (rowIndex === -1) {
      throw new NotFoundError(
        '삭제할 데이터를 찾을 수 없습니다: ' + normalizedId,
        'id',
        { sheetName: sheetName, id: normalizedId }
      );
    }

    sheet.deleteRow(rowIndex);
    return true;
  },

  /**
   * 시트의 데이터 영역을 검증된 레코드 배열로 일괄 교체한다.
   *
   * 대용량 Backup 복원 전용 Repository 연산이다. 헤더는 보존하며,
   * Service가 Range에 직접 접근하지 않도록 데이터 접근을 캡슐화한다.
   *
   * @param {string} sheetName 시트명
   * @param {Array<Object|Array<*>>} rows 교체할 레코드
   * @return {number} 저장된 행 수
   */
  replaceAll: function (sheetName, rows) {
    const input = Array.isArray(rows) ? rows : [];
    const sheet = this.getSheet(sheetName);
    const lastColumn = sheet.getLastColumn();
    const headers = normalizeHeaders_(
      sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    );
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
    }
    if (!input.length) {
      return 0;
    }

    const values = input.map(function (record) {
      return repositoryDataToRow_(headers, record);
    });
    sheet.getRange(2, 1, values.length, lastColumn).setValues(values);
    return values.length;
  },

  /**
   * PMS 시트 구조와 초기 데이터를 구성한다.
   *
   * Domain Service에서는 사용하지 않으며 설치 진입점에서만 호출한다.
   *
   * @param {Object} config PMS_CONFIG
   * @return {{createdSheets:Array<string>, updatedSheets:Array<string>}}
   */
  initializeSchema: function (config) {
    if (!config || !Array.isArray(config.sheets)) {
      throw new ValidationError(
        'PMS 시트 설정이 필요합니다.',
        'config',
        null,
        'VALIDATION_REQUIRED'
      );
    }

    const spreadsheet = getRepositorySpreadsheet_();
    const createdSheets = [];
    const updatedSheets = [];

    config.sheets.forEach(function (definition) {
      let sheet = spreadsheet.getSheetByName(definition.name);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(definition.name);
        createdSheets.push(definition.name);
      } else {
        updatedSheets.push(definition.name);
      }
      configureRepositorySheet_(sheet, definition, config);
    });

    seedRepositorySheet_('99_SETTING', [
      ['SYSTEM', 'APP_NAME', config.appName, '애플리케이션 이름', 'Y', new Date()],
      ['SYSTEM', 'VERSION', config.version, '현재 PMS 버전', 'Y', new Date()],
      ['SYSTEM', 'ENVIRONMENT', 'DEV', 'DEV / TEST / PROD', 'Y', new Date()],
    ]);
    seedRepositorySheet_('00_HOME', [
      ['프로젝트', 'HLAS (Hansalim Logistics Automation System)', new Date()],
      ['관리 시스템', config.appName, new Date()],
      ['현재 버전', config.version, new Date()],
      ['상태', '초기화 완료', new Date()],
    ]);

    SpreadsheetApp.flush();
    spreadsheet.toast('PMS 초기화 완료', config.appName, 8);
    return {
      createdSheets: createdSheets,
      updatedSheets: updatedSheets,
    };
  },

  /**
   * 지정한 시트를 활성화한다.
   *
   * @param {string} sheetName 시트명
   * @return {boolean} 활성화 여부
   */
  activateSheet: function (sheetName) {
    const spreadsheet = getRepositorySpreadsheet_();
    spreadsheet.setActiveSheet(this.getSheet(sheetName));
    return true;
  },

  /**
   * Core 모듈 실제 테스트를 위한 전용 시트를 보장한다.
   * 운영 Domain API에서는 사용하지 않는다.
   */
  ensureTestSheet: function (sheetName, headers) {
    const normalizedName = normalizeSheetName_(sheetName);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(normalizedName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(normalizedName);
    }

    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  },

  /**
   * Core 모듈 테스트용 시트를 제거한다.
   */
  deleteTestSheet: function (sheetName) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(normalizeSheetName_(sheetName));

    if (sheet) {
      spreadsheet.deleteSheet(sheet);
    }
  },
});

function getRepositorySpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new SystemError(
      '연결된 Google 스프레드시트에서 실행해야 합니다.'
    );
  }
  return spreadsheet;
}

function configureRepositorySheet_(sheet, definition, config) {
  const headers = definition.headers || [];
  if (!headers.length) {
    throw new ValidationError('시트 헤더가 필요합니다.', 'headers');
  }

  const missingColumns = headers.length - sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumns);
  }

  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(config.headerBackground)
    .setFontColor(config.headerFontColor)
    .setFontWeight('bold')
    .setFontSize(config.headerFontSize)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  (definition.widths || []).forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}

function seedRepositorySheet_(sheetName, rows) {
  const sheet = SheetRepository.getSheet(sheetName);
  if (sheet.getLastRow() > 1 || !rows.length) {
    return;
  }
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function normalizeSheetName_(sheetName) {
  const value = String(sheetName || '').trim();
  if (!value) {
    throw new ValidationError('시트명이 필요합니다.', 'sheetName', null, 'VALIDATION_REQUIRED');
  }
  return value;
}

function normalizeRepositoryId_(id) {
  const value = String(id || '').trim();
  if (!value) {
    throw new ValidationError('ID가 필요합니다.', 'id', null, 'VALIDATION_REQUIRED');
  }
  return value;
}

function normalizeHeaders_(headers) {
  return headers.map(function (header, index) {
    const value = String(header || '').trim();
    return value || 'COLUMN_' + (index + 1);
  });
}

function findRepositoryRowIndexById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0] || '').trim() === id) {
      return index + 2;
    }
  }
  return -1;
}

function rowToRepositoryObject_(headers, row) {
  const record = {};
  headers.forEach(function (header, index) {
    record[header] = row[index];
  });
  return record;
}

function repositoryDataToRow_(headers, rowData) {
  if (Array.isArray(rowData)) {
    const result = rowData.slice(0, headers.length);
    while (result.length < headers.length) {
      result.push('');
    }
    return result;
  }

  if (!rowData || typeof rowData !== 'object') {
    throw new ValidationError('저장할 행 데이터가 필요합니다.', 'rowData');
  }

  return headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(rowData, header)
      ? rowData[header]
      : '';
  });
}

function mergeRepositoryRow_(headers, currentRow, rowData) {
  if (Array.isArray(rowData)) {
    return repositoryDataToRow_(headers, rowData);
  }

  if (!rowData || typeof rowData !== 'object') {
    throw new ValidationError('수정할 행 데이터가 필요합니다.', 'rowData');
  }

  return headers.map(function (header, index) {
    return Object.prototype.hasOwnProperty.call(rowData, header)
      ? rowData[header]
      : currentRow[index];
  });
}

function isEmptyRepositoryRow_(row) {
  return row.every(function (value) {
    return value === '' || value === null;
  });
}
