function setupBasicFastSheetSearch() {
    /*
     * 사용 중단:
     * I:M 검색 결과 영역을 생성하지 않습니다.
     */
    return;
}


// =====================================================
// 기존 선택 행 강조 조건부서식 제거
// =====================================================
function removeBasicSelectedRowHighlightRule() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    var rules =
        sheet.getConditionalFormatRules();

    var filtered =
        rules.filter(function(rule) {
            var condition =
                rule.getBooleanCondition();

            if (!condition) {
                return true;
            }

            var values =
                condition.getCriteriaValues();

            if (
                !values ||
                values.length === 0
            ) {
                return true;
            }

            var formula =
                String(values[0] || '');

            return (
                formula.indexOf('$W$1') === -1 &&
                formula.indexOf(
                    'ROW()=$W$1'
                ) === -1
            );
        });

    sheet.setConditionalFormatRules(
        filtered
    );

    if (sheet.getMaxColumns() >= 23) {
        sheet.getRange('W1:W2')
            .clearContent()
            .clearNote();
    }

    ss.toast(
        '선택 행 강조 조건부서식을 제거했습니다.',
        '✅ 강조 기능 제거',
        5
    );
}


function onEdit(e) {
    if (!e || !e.range) return;

    var ss = e.source;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    var startRow = e.range.getRow();
    var startCol = e.range.getColumn();
    var endCol = startCol + e.range.getNumColumns() - 1;


    // =========================================================================
    // 1. 통계 시트 J2 체크박스 기록
    // =========================================================================
   
if (sheetName === '통계' && e.range.getA1Notation() === 'J2') {
  if (e.range.getValue() === true) {
    try {
      saveStatisticsSnapshot_(ss, sheet);

      ss.toast(
        '일자별 요약·코스·지역·저장상태 기록을 저장했습니다.',
        '✅ 통계 기록 완료',
        5
      );

    } catch (err) {
      ss.toast(
        '통계 기록 저장 실패: ' + err.message,
        '❌ 오류',
        7
      );

    } finally {
      e.range.uncheck();
    }
  }

  return;
}






    // =========================================================================
    // 2. 입력시트 S:V 미등록/불일치 안내 영역
    // v10부터 V열 직접 등록 체크박스는 사용하지 않습니다.
    // 실제 처리는 기초시트 '신규물품 점검' 창에서 수행합니다.
    // =========================================================================


    // =========================================================================
    // 3. 입력시트 P1 체크박스 데이터 삭제
    // v11.6: 실제 사용범위만 한 번에 삭제하고 무거운 후처리는 하지 않습니다.
    // =========================================================================
    if (
        sheetName === '입력시트' &&
        e.range.getA1Notation() === 'P1'
    ) {
        if (e.range.getValue() === true) {
            try {
                e.range.uncheck();

                var clearLastRow =
                    Math.max(
                        2,
                        getRealLastRow(sheet),
                        getLastRowByColumns_(
                            sheet,
                            19,
                            21,
                            2
                        )
                    );

                sheet
                    .getRangeList([
                        'A2:O' + clearLastRow,
                        'Q2:Q' + clearLastRow,
                        'S2:V' + clearLastRow
                    ])
                    .clearContent();

                var deleteProps =
                    PropertiesService
                    .getDocumentProperties();

                deleteProps
                    .deleteProperty(
                        'UNREGISTERED_ITEMS_FG_SIGNATURE'
                    );

                /*
                 * v11.9:
                 * 삭제 직후 A2에 붙여넣는 자료는 새 전체 데이터 세트입니다.
                 * 다음 붙여넣기에서 전체 시트 재탐색을 생략할 수 있도록
                 * 짧은 유효시간의 표시를 남깁니다.
                 */
                deleteProps.setProperty(
                    'INPUT_FULL_REPLACE_PENDING_V119',
                    String(Date.now())
                );

                ss.toast(
                    '입력시트 주문자료를 삭제했습니다. 바로 새 자료를 붙여넣어도 됩니다.',
                    '✅ 삭제 완료',
                    3
                );

            } catch (err) {
                try {
                    e.range.uncheck();
                } catch (ignore) {}

                ss.toast(
                    '데이터 삭제 중 오류가 발생했습니다: ' +
                    err.message,
                    '❌ 오류',
                    5
                );
            }

            return;
        }
    }

    // =========================================================================
    // 4. 입력시트 자료 변경
    // A:Q 범위가 편집될 때 필요한 행만 즉시 자동 채우기
    // =========================================================================
    var dataChanged = false;

    if (
        sheetName === '입력시트' &&
        startRow >= 2 &&
        startCol <= 17
    ) {
        dataChanged = true;

        try {
            /*
             * v11.9:
             * 자동채우기 과정에서 이미 읽은 입력행과 기초 마스터를
             * 미등록 검사에서도 그대로 재사용합니다.
             */
            var fastInputResult =
                autoFillInputRowsFastV11_9_(
                    sheet,
                    ss,
                    startRow,
                    e.range.getNumRows()
                );

            /*
             * v11.13:
             * 총수량!A1 날짜는 사용자 수동 선택값을 유지합니다.
             * 입력자료 변경으로 A1을 자동 갱신하지 않습니다.
             */
            var props119 =
                PropertiesService
                .getDocumentProperties();

            var pendingAt =
                Number(
                    props119.getProperty(
                        'INPUT_FULL_REPLACE_PENDING_V119'
                    ) || 0
                );

            /*
             * 삭제 후 10분 안에 A2부터 새 자료를 붙여넣은 경우만
             * "전체 교체 고속 경로"를 사용합니다.
             * 일반적인 부분 수정은 기존 전체검증 경로로 보내
             * S:V 목록의 정확성을 보존합니다.
             */
            var isFreshFullReplace =
                startRow === 2 &&
                pendingAt > 0 &&
                (
                    Date.now() -
                    pendingAt
                ) <= 600000;

            var reviewResult119;

            if (isFreshFullReplace) {
                reviewResult119 =
                    refreshUnregisteredFromFastInputV11_9_(
                        ss,
                        sheet,
                        fastInputResult
                    );

                props119.deleteProperty(
                    'INPUT_FULL_REPLACE_PENDING_V119'
                );

            } else {
                var reviewChanged =
                    refreshUnregisteredItemsIfChanged_(
                        ss
                    );

                reviewResult119 = {
                    changed:
                        reviewChanged,
                    total:
                        -1,
                    newCount:
                        -1,
                    mismatchCount:
                        -1
                };
            }

            if (reviewResult119.changed) {
                /*
                 * v11.10:
                 * 단순 onEdit에서는 HTML 모달을 직접 띄우지 않습니다.
                 * 설치형 onEdit 트리거가 읽을 요약정보만 저장합니다.
                 */
                var popupSummary119 =
                    reviewResult119.total >= 0
                        ? reviewResult119
                        : getPendingItemReviewSummary_(
                            ss
                        );

                if (
                    popupSummary119 &&
                    popupSummary119.total > 0
                ) {
                    PropertiesService
                        .getDocumentProperties()
                        .setProperty(
                            'ITEM_REVIEW_PENDING_POPUP_V1110',
                            JSON.stringify({
                                total:
                                    popupSummary119.total,
                                newCount:
                                    popupSummary119.newCount,
                                mismatchCount:
                                    popupSummary119.mismatchCount,
                                createdAt:
                                    Date.now()
                            })
                        );
                } else {
                    PropertiesService
                        .getDocumentProperties()
                        .deleteProperty(
                            'ITEM_REVIEW_PENDING_POPUP_V1110'
                        );
                }
            } else {
                PropertiesService
                    .getDocumentProperties()
                    .deleteProperty(
                        'ITEM_REVIEW_PENDING_POPUP_V1110'
                    );
            }

        } catch (err) {
            console.error(
                '입력시트 고속 업데이트 에러:',
                err
            );
        }
    }


    // =========================================================================
    // 5. 총수량 및 코스시트 변경
    // =========================================================================
    var courseSheets = [
        '31코스',
        '32코스',
        '33코스',
        '34코스',
        '35코스',
        '36코스'
    ];

    if (courseSheets.indexOf(sheetName) !== -1) {
        dataChanged = true;
        sortAndRefreshAll(ss);
    }

    if (dataChanged) {
        updateInsights(ss);
    }


    // =========================================================================
    // 6. 기초시트 I2 물품코드·물품명 검색
    // =========================================================================
    if (
        sheetName === '기초' &&
        startRow <= 2 &&
        startRow + e.range.getNumRows() - 1 >= 2 &&
        startCol <= 9 &&
        endCol >= 9
    ) {
        return;
    }


    // =========================================================================
    // 6.1 기초시트 체크박스 선택 처리
    //
    // T열: 미등록 물품 표시 영역의 이동 대상 선택
    // N열: 검색 결과의 이동 위치 선택
    // O열: 검색 결과 원본 행으로 이동
    // 체크만으로 이동하지 않고, 실행 버튼에서 최종 이동합니다.
    // =========================================================================
    if (
        sheetName === '기초' &&
        startRow >= 3 &&
        startCol === endCol &&
        (
            startCol === 14 ||
            startCol === 15 ||
            startCol === 20
        )
    ) {
        if (e.range.getValue() === true) {
            if (startCol === 20) {
                selectBasicMoveSourceFromDisplay_(
                    sheet,
                    startRow
                );
            } else if (startCol === 14) {
                selectBasicMoveDestinationFromSearch_(
                    sheet,
                    startRow
                );
            } else {
                jumpToBasicSearchResultRow_(
                    sheet,
                    startRow
                );
            }
        }

        return;
    }


    // =========================================================================
    // 7. 기초시트 E열 자동 갱신
    // E열 = D열 저장상태 + G열 집품순서
    // =========================================================================
    if (
        sheetName === '기초' &&
        startRow >= 3
    ) {
        var includesD =
            startCol <= 4 && endCol >= 4;

        var includesG =
            startCol <= 7 && endCol >= 7;

        if (includesD || includesG) {
            updateBasicCombinedColumn_(
                sheet,
                startRow,
                e.range.getNumRows()
            );
        }
    }
}







// =====================================================
// 기초시트 D열 저장상태 / F열 물류지 백업 복원
//
// 백업본:
// 주문공급집계표 운용본의 백업본20260719
//
// 물품코드(A열)를 기준으로 현재 기초시트와 백업본을 대조하여
// D열과 F열만 복원합니다.
// 백업에 없는 신규 미등록 물품은 현재 값을 그대로 유지합니다.
// =====================================================
function restoreBasicStatusAndLogisticsFromBackup() {
    var BACKUP_SPREADSHEET_ID =
        '1fX7pP6OK8DcDSCamjTdayxIVXJmhoAXPVkdsybbcfMs';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentSheet = ss.getSheetByName('기초');

    if (!currentSheet) {
        throw new Error('현재 파일에서 기초시트를 찾을 수 없습니다.');
    }

    var backupSs = SpreadsheetApp.openById(
        BACKUP_SPREADSHEET_ID
    );

    var backupSheet = backupSs.getSheetByName('기초');

    if (!backupSheet) {
        throw new Error('백업본에서 기초시트를 찾을 수 없습니다.');
    }

    var currentLastRow = getLastBasicDataRow_(currentSheet);
    var backupLastRow = getLastRowByColumns_(
        backupSheet,
        1,
        2,
        2
    );

    if (currentLastRow < 3) {
        throw new Error('현재 기초시트에 복원할 자료가 없습니다.');
    }

    if (backupLastRow < 2) {
        throw new Error('백업본에 복원할 자료가 없습니다.');
    }

    /*
     * 백업본 A:F
     * A 물품코드
     * D 저장상태
     * F 물류지
     */
    var backupValues = backupSheet
        .getRange(
            2,
            1,
            backupLastRow - 1,
            6
        )
        .getDisplayValues();

    var backupMap = {};

    for (var i = 0; i < backupValues.length; i++) {
        var backupCode = normalizeItemCode_(
            backupValues[i][0]
        );

        if (backupCode === '') {
            continue;
        }

        backupMap[backupCode] = {
            status: backupValues[i][3],
            logistics: backupValues[i][5]
        };
    }

    var currentCodes = currentSheet
        .getRange(
            3,
            1,
            currentLastRow - 2,
            1
        )
        .getDisplayValues();

    var currentStatus = currentSheet
        .getRange(
            3,
            4,
            currentLastRow - 2,
            1
        )
        .getDisplayValues();

    var currentLogistics = currentSheet
        .getRange(
            3,
            6,
            currentLastRow - 2,
            1
        )
        .getDisplayValues();

    var restoredStatus = [];
    var restoredLogistics = [];

    var matchedCount = 0;
    var notFoundCount = 0;

    for (var rowIndex = 0; rowIndex < currentCodes.length; rowIndex++) {
        var currentCode = normalizeItemCode_(
            currentCodes[rowIndex][0]
        );

        var backupItem = backupMap[currentCode];

        if (backupItem) {
            restoredStatus.push([
                backupItem.status
            ]);

            restoredLogistics.push([
                backupItem.logistics
            ]);

            matchedCount++;

        } else {
            /*
             * 백업에 없는 신규 물품은
             * 미등록 상태와 현재 물류지 값을 유지합니다.
             */
            restoredStatus.push([
                currentStatus[rowIndex][0]
            ]);

            restoredLogistics.push([
                currentLogistics[rowIndex][0]
            ]);

            if (currentCode !== '') {
                notFoundCount++;
            }
        }
    }

    currentSheet
        .getRange(
            3,
            4,
            restoredStatus.length,
            1
        )
        .setValues(restoredStatus);

    currentSheet
        .getRange(
            3,
            6,
            restoredLogistics.length,
            1
        )
        .setValues(restoredLogistics);

    SpreadsheetApp.flush();

    /*
     * D열 복원 후 E열을 현재 D/G 기준으로 다시 계산합니다.
     */
    rebuildBasicCombinedColumn();

    refreshBasicUnregisteredDisplay_(currentSheet);

    ss.toast(
        'D열·F열 복원을 완료했습니다.\n' +
        '백업 일치: ' + matchedCount + '건\n' +
        '백업에 없는 신규 자료: ' + notFoundCount + '건',
        '✅ 기초자료 복원 완료',
        10
    );

    return {
        success: true,
        matchedCount: matchedCount,
        notFoundCount: notFoundCount
    };
}






// =====================================================
// 검색/미등록 영역의 불필요한 FALSE 정리
// =====================================================
function cleanupBasicCheckboxFalseValues_(sheet) {
    var maxRows = sheet.getMaxRows();

    /*
     * 검색 결과는 5~34행까지만 사용합니다.
     * N:O의 그 아래 불필요한 값과 체크박스를 정리합니다.
     */
    if (maxRows >= 35) {
        sheet.getRange(
            35,
            14,
            maxRows - 34,
            2
        )
            .clearContent()
            .clearDataValidations()
            .setBackground(null);
    }

    /*
     * 미등록 표시 영역 T열도 실제 표시 범위 밖을 정리합니다.
     */
    var qValues = sheet.getRange(
        3,
        17,
        Math.max(1, maxRows - 2),
        1
    ).getDisplayValues();

    var lastDisplayRow = 2;

    for (
        var i = qValues.length - 1;
        i >= 0;
        i--
    ) {
        var value = String(
            qValues[i][0] || ''
        ).trim();

        if (
            value !== '' &&
            value !==
                '현재 미등록 물품이 없습니다.'
        ) {
            lastDisplayRow = i + 3;
            break;
        }
    }

    if (lastDisplayRow < maxRows) {
        sheet.getRange(
            lastDisplayRow + 1,
            20,
            maxRows - lastDisplayRow,
            1
        )
            .clearContent()
            .clearDataValidations()
            .setBackground(null);
    }
}


// =====================================================
// 화면에 남은 FALSE 값 한 번 정리
// =====================================================
function cleanupBasicCheckboxFalseValues() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    cleanupBasicCheckboxFalseValues_(sheet);

    ss.toast(
        '불필요한 FALSE 표시를 정리했습니다.',
        '✅ 체크박스 정리',
        4
    );
}




// =====================================================
// 기초시트 행·열 크기 유지 정책
//
// 이 함수는 크기를 변경하지 않습니다.
// 반복 갱신 함수에서도 setColumnWidth, setRowHeight,
// autoResizeColumns, autoResizeRows를 사용하지 않도록 합니다.
// =====================================================
function preserveBasicSheetDimensions_(
    sheet
) {
    if (
        !sheet ||
        sheet.getName() !== '기초'
    ) {
        return;
    }

    /*
     * 의도적으로 아무 크기 조정도 하지 않습니다.
     * 사용자가 설정한 행 높이와 열 너비를 그대로 유지합니다.
     */
}


// =====================================================
// 기초시트 선택 행 A:G 강조 조건부서식 설정



// =====================================================
// 선택 행 강조 기능 다시 설정



// =====================================================
// 기초시트 F1 선택 행 삭제 체크 버튼 생성
// =====================================================
// F1 삭제 버튼 다시 만들기
// =====================================================
// 마지막으로 선택한 기초자료 행 저장



// =====================================================
// F1 버튼에서 저장된 선택 행 삭제 실행
// =====================================================
// 선택한 기초자료 행의 A:G만 삭제
//
// 전체 행을 삭제하지 않고 A:G 셀만 위로 당기므로
// I열 이후의 검색 영역과 미등록 표시 영역은 유지됩니다.
// =====================================================
function deleteSelectedBasicCells() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getActiveSheet();

    if (
        !sheet ||
        sheet.getName() !== '기초'
    ) {
        throw new Error(
            '기초시트에서 삭제할 자료 행을 선택하세요.'
        );
    }

    var range =
        sheet.getActiveRange();

    if (!range) {
        throw new Error(
            '삭제할 자료 행을 선택하세요.'
        );
    }

    var startRow =
        range.getRow();

    var rowCount =
        range.getNumRows();

    if (startRow < 3) {
        throw new Error(
            '1행과 2행은 삭제할 수 없습니다.'
        );
    }

    var lastDataRow =
        getLastBasicDataRow_(sheet);

    if (lastDataRow < startRow) {
        throw new Error(
            '선택한 행에 삭제할 기초자료가 없습니다.'
        );
    }

    var endRow = Math.min(
        startRow + rowCount - 1,
        lastDataRow
    );

    rowCount =
        endRow - startRow + 1;

    var preview =
        sheet.getRange(
            startRow,
            1,
            rowCount,
            2
        ).getDisplayValues();

    var previewNames =
        preview.map(function(row) {
            var code =
                String(row[0] || '').trim();

            var name =
                String(row[1] || '').trim();

            return code +
                (
                    name
                        ? ' / ' + name
                        : ''
                );
        })
        .filter(function(value) {
            return value !== '';
        })
        .slice(0, 5)
        .join('\n');

    var message =
        '선택한 ' +
        rowCount +
        '개 행의 A:G 자료만 삭제합니다.\n' +
        '오른쪽 조회 영역은 유지됩니다.';

    if (previewNames !== '') {
        message +=
            '\n\n' +
            previewNames;
    }

    var ui =
        SpreadsheetApp.getUi();

    var response =
        ui.alert(
            '기초자료 삭제 확인',
            message,
            ui.ButtonSet.YES_NO
        );

    if (
        response !== ui.Button.YES
    ) {
        return {
            success: false,
            cancelled: true
        };
    }

    sheet.getRange(
        startRow,
        1,
        rowCount,
        7
    ).deleteCells(
        SpreadsheetApp.Dimension.ROWS
    );

    rebuildBasicCombinedColumn();
    refreshBasicUnregisteredDisplay_(
        sheet
    );

    var query =
        String(
            sheet.getRange('I2')
            .getDisplayValue() || ''
        ).trim();

    if (query !== '') {
    }

    ss.toast(
        rowCount +
        '개 행의 A:G 자료만 삭제했습니다.',
        '✅ 기초자료 삭제 완료',
        5
    );

    return {
        success: true,
        deletedRows: rowCount,
        startRow: startRow
    };
}



// =====================================================
// 이동 체크박스 공통 서식
// =====================================================
function applyBasicMoveCheckboxStyle_(
    range
) {
    range
        .setBackground('#E2F0D9')
        .setFontColor('#000000')
        .setFontWeight('normal')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setBorder(
            true,
            true,
            true,
            true,
            true,
            true,
            '#A9D18E',
            SpreadsheetApp.BorderStyle.SOLID
        );
}


// =====================================================
// 미등록 표시 영역에서 이동 대상 선택
// =====================================================
function selectBasicMoveSourceFromDisplay_(
    sheet,
    displayRow
) {
    var actualRow = Number(
        sheet.getRange(
            displayRow,
            21
        ).getValue()
    );

    if (!actualRow || actualRow < 3) {
        throw new Error(
            '선택한 미등록 물품의 실제 행을 찾을 수 없습니다.'
        );
    }

    var selectedCount =
        getSelectedBasicMoveSources_(sheet)
        .length;

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            selectedCount +
            '개 물품이 이동 대상으로 선택되었습니다.',
            '✅ 이동대상 선택',
            2
        );
}



// =====================================================
// 검색 결과의 실제 기초자료 행으로 이동
// =====================================================
function jumpToBasicSearchResultRow_(
    sheet,
    searchRow
) {
    var actualRow = Number(
        sheet.getRange(
            searchRow,
            22
        ).getValue()
    );

    if (!actualRow || actualRow < 3) {
        throw new Error(
            '선택한 검색 결과의 실제 행을 찾을 수 없습니다.'
        );
    }

    /*
     * O열 행이동 체크박스는 실행 직후 해제합니다.
     */
    sheet.getRange(
        searchRow,
        15
    ).uncheck();

    SpreadsheetApp.flush();

    sheet.setActiveSelection(
        sheet.getRange(
            actualRow,
            1
        )
    );

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            actualRow +
            '행의 A열로 이동했습니다.',
            '✅ 원본 행 이동',
            3
        );
}



// =====================================================
// 검색 결과 영역의 불필요한 FALSE 정리
// =====================================================
function cleanupBasicSearchFalseValues_(
    sheet
) {
    var resultStartRow = 5;
    var maxResultCount = 30;

    for (
        var i = 0;
        i < maxResultCount;
        i++
    ) {
        var row =
            resultStartRow + i;

        var moveCell =
            sheet.getRange(
                row,
                14
            );

        var jumpCell =
            sheet.getRange(
                row,
                15
            );

        if (
            !moveCell.getDataValidation()
        ) {
            moveCell.clearContent();
        }

        if (
            !jumpCell.getDataValidation()
        ) {
            jumpCell.clearContent();
        }
    }
}


// =====================================================
// 검색 결과에서 이동 위치 선택
// =====================================================
function selectBasicMoveDestinationFromSearch_(
    sheet,
    searchRow
) {
    var actualRow = Number(
        sheet.getRange(
            searchRow,
            22
        ).getValue()
    );

    if (!actualRow || actualRow < 3) {
        throw new Error(
            '선택한 검색 결과의 실제 행을 찾을 수 없습니다.'
        );
    }

    /*
     * 이동 위치는 한 개만 유지합니다.
     * 이전 체크를 해제하고 현재 행만 체크합니다.
     */
    syncBasicDestinationCheckboxByActualRow_(
        sheet,
        actualRow
    );

    PropertiesService
        .getUserProperties()
        .setProperty(
            'BASIC_MOVE_DESTINATION_ROW',
            String(actualRow)
        );

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            sheet.getRange(
                searchRow,
                10
            ).getDisplayValue() +
            ' 아래를 이동 위치로 선택했습니다.',
            '✅ 이동 위치 선택',
            2
        );
}


// =====================================================
// 선택한 이동 대상과 이동 위치로 최종 실행
// =====================================================
function executeSelectedBasicMove() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    var selectedSources =
        getSelectedBasicMoveSources_(sheet);

    if (selectedSources.length === 0) {
        throw new Error(
            '미등록 표시 영역에서 이동대상을 하나 이상 선택하세요.'
        );
    }

    var sourceCodes = [];

    for (
        var i = 0;
        i < selectedSources.length;
        i++
    ) {
        sourceCodes.push(
            sheet.getRange(
                selectedSources[i].actualRow,
                1
            ).getDisplayValue()
        );
    }

    var destinationRow = Number(
        PropertiesService
            .getUserProperties()
            .getProperty(
                'BASIC_MOVE_DESTINATION_ROW'
            )
    );

    if (
        !destinationRow ||
        destinationRow < 3
    ) {
        throw new Error(
            '검색 결과에서 이동 위치를 먼저 선택하세요.'
        );
    }

    var destinationCode =
        sheet.getRange(
            destinationRow,
            1
        ).getDisplayValue();

    return moveBasicItemsBatchFromSidebar(
        sourceCodes,
        destinationCode,
        sheet.getRange('I2')
            .getDisplayValue()
    );
}


// =====================================================
// 기초시트 A:G 실제 마지막 자료 행
//
// 오른쪽 검색/표시 영역은 제외하고 A:B 기준으로 확인합니다.
// =====================================================
function getLastBasicDataRow_(sheet) {
    return getLastRowByColumns_(
        sheet,
        1,
        2,
        3
    );
}


// =====================================================
// 기초시트 미등록 표시 영역 준비
//
// Q:W는 실제 자료를 옮기지 않고,
// A:G에 있는 미등록 자료만 위쪽에서 확인하는 표시 영역입니다.
// =====================================================
function setupBasicUnregisteredDisplay_(sheet) {
    /*
     * 사용 중단:
     * 미등록 목록은 모델리스 창과 사이드바에서
     * 기초 A:G 자료를 직접 읽습니다.
     */
    return;
}


// =====================================================
// 기초시트 미등록 표시 영역 새로고침
// =====================================================
function refreshBasicUnregisteredDisplay() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    cleanupLegacyBasicHelperArea_(sheet);

    ss.toast(
        '기초시트의 예전 미등록 표시 영역을 정리했습니다.',
        '✅ 보조영역 정리',
        5
    );

    return 0;
}


// =====================================================
// 내부용 미등록 표시 영역 새로고침
// =====================================================
function refreshBasicUnregisteredDisplay_(sheet) {
    /*
     * 이전 코드와의 호출 호환용입니다.
     * 더 이상 Q:U 영역에 자료를 출력하지 않습니다.
     */
    return 0;
}


// =====================================================
// 기초시트 물품 검색 영역 생성
// I1: 제목 / I2: 검색어 / I4:O4: 결과 제목
// =====================================================
function setupBasicItemSearchArea() {
    /*
     * 사용 중단:
     * 기초시트 I:M의 예전 검색 영역은 더 이상 만들지 않습니다.
     */
    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            '예전 시트 검색 영역은 사용하지 않습니다. 기초 관리의 통합 검색창을 사용하세요.',
            '안내',
            5
        );
}


// =====================================================
// 기초시트 검색 영역 서식 준비
// =====================================================
function ensureBasicItemSearchArea_(sheet) {
    /*
     * 사용 중단:
     * 호출 호환만 유지하고 시트에는 아무것도 생성하지 않습니다.
     */
    return;
}


// =====================================================
// I2 검색어로 기초시트 A:G 검색
// 정확 일치 → 부분 일치 → 유사 이름 순으로 최대 30건 표시
// =====================================================
function searchBasicItems_(sheet) {
    /*
     * 사용 중단:
     * 검색 결과를 기초시트 셀에 출력하지 않습니다.
     */
    return [];
}


// =====================================================
// 검색 비교용 문자열 정리
// 공백·기호를 제외하고 소문자로 변환
// =====================================================
function normalizeSearchText_(value) {
    return String(value == null ? '' : value)
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[\-_*()[\]{}\/\\.,·:;"'`~!@#$%^&+=?|<>]/g, '');
}


// =====================================================
// 두 문자열의 bigram Dice 유사도
// 0: 전혀 다름 / 1: 동일
// =====================================================
function diceSimilarity_(first, second) {
    first = normalizeSearchText_(first);
    second = normalizeSearchText_(second);

    if (first === second) {
        return 1;
    }

    if (first.length < 2 || second.length < 2) {
        return 0;
    }

    var firstPairs = {};
    var secondPairs = {};
    var firstCount = 0;
    var secondCount = 0;

    for (var i = 0; i < first.length - 1; i++) {
        var firstPair = first.substring(i, i + 2);
        firstPairs[firstPair] = (firstPairs[firstPair] || 0) + 1;
        firstCount++;
    }

    for (var j = 0; j < second.length - 1; j++) {
        var secondPair = second.substring(j, j + 2);
        secondPairs[secondPair] = (secondPairs[secondPair] || 0) + 1;
        secondCount++;
    }

    var intersection = 0;

    Object.keys(firstPairs).forEach(function(pair) {
        if (secondPairs[pair]) {
            intersection += Math.min(
                firstPairs[pair],
                secondPairs[pair]
            );
        }
    });

    return (2 * intersection) / (firstCount + secondCount);
}


// =====================================================
// 기초시트 E열 재계산
// E열 = D열 저장상태 + G열 집품순서
// =====================================================
function updateBasicCombinedColumn_(sheet, startRow, numRows) {
    if (!sheet || startRow < 3 || numRows <= 0) {
        return;
    }

    var sourceValues = sheet
        .getRange(startRow, 4, numRows, 4)
        .getValues();

    var eValues = [];

    for (var i = 0; i < sourceValues.length; i++) {
        var status = String(
            sourceValues[i][0] == null
                ? ''
                : sourceValues[i][0]
        ).trim();

        var order = String(
            sourceValues[i][3] == null
                ? ''
                : sourceValues[i][3]
        ).trim();

        eValues.push([
            status !== '' && order !== ''
                ? status + order
                : ''
        ]);
    }

    sheet
        .getRange(startRow, 5, numRows, 1)
        .setValues(eValues);
}


// =====================================================
// 기초시트 E열 전체 재계산
// 최초 교체 후 한 번 수동 실행하면 안전합니다.
// =====================================================
function rebuildBasicCombinedColumn() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        ss.toast(
            '기초시트를 찾을 수 없습니다.',
            '❌ 오류',
            5
        );
        return;
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 3) {
        ss.toast(
            '수정할 기초자료가 없습니다.',
            '안내',
            4
        );
        return;
    }

    updateBasicCombinedColumn_(
        sheet,
        3,
        lastRow - 2
    );

    SpreadsheetApp.flush();

    ss.toast(
        '기초시트 E열을 D열+G열 기준으로 다시 만들었습니다.',
        '✅ E열 재계산 완료',
        5
    );
}


// =====================================================
// 입력시트 미등록 물품 확인 영역 준비
// S: 물품코드 / T: 물품명 / U: 확인상태 / V: 기초등록
// =====================================================
function ensureInputUnregisteredArea_(sheet) {
    var requiredColumns = 22; // V열

    if (sheet.getMaxColumns() < requiredColumns) {
        sheet.insertColumnsAfter(
            sheet.getMaxColumns(),
            requiredColumns - sheet.getMaxColumns()
        );
    }

    sheet
        .getRange(1, 19, 1, 3)
        .setValues([[
            '물품코드',
            '물품명',
            '확인상태'
        ]])
        .setBackground('#F4B183')
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setWrap(true);

    /*
     * v10.1:
     * V열 데이터행에는 어떤 값도 쓰지 않습니다.
     * 과거 체크박스 검증과 충돌하지 않도록
     * V열 전체 검증을 먼저 제거하고 V1만 안내용으로 사용합니다.
     */
    sheet
        .getRange(1, 22, sheet.getMaxRows(), 1)
        .clearDataValidations()
        .clearContent();

    sheet
        .getRange('V1')
        .setValue('처리안내')
        .setNote(
            '미등록 또는 물품명 불일치 품목은 기초시트의 신규물품 점검 창에서 처리합니다.'
        )
        .setBackground('#F4B183')
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setWrap(true);

    sheet.setColumnWidth(19, 120);
    sheet.setColumnWidth(20, 280);
    sheet.setColumnWidth(21, 130);
    sheet.setColumnWidth(22, 190);
}



// =====================================================
// 미등록 물품 목록 수동 새로고침
// =====================================================
function refreshUnregisteredItems() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var count = refreshUnregisteredItems_(ss);

    ss.toast(
        '입력시트에서 확인할 물품 ' + count + '건을 표시했습니다.',
        '✅ 미등록 물품 확인 완료',
        5
    );
}


// =====================================================
// 입력시트 F·G와 기초시트 A·B 비교
// 기초에 없는 조합은 S:U에 중복 없이 표시 / V는 안내 전용
// =====================================================
function refreshUnregisteredItems_(ss) {
    var inputSheet =
        ss.getSheetByName('입력시트');

    var basicSheet =
        ss.getSheetByName('기초');

    if (!inputSheet || !basicSheet) {
        return 0;
    }

    ensureInputUnregisteredArea_(
        inputSheet
    );

    /*
     * v11.8
     * 기존에는 S:V를 입력시트 최대행까지 매번 지웠습니다.
     * 이제 실제 이전 점검 결과가 존재하는 범위만 지웁니다.
     */
    var oldReviewLastRow =
        getLastRowByColumns_(
            inputSheet,
            19,
            21,
            2
        );

    if (oldReviewLastRow >= 2) {
        inputSheet
            .getRange(
                2,
                19,
                oldReviewLastRow - 1,
                4
            )
            .clearContent()
            .clearDataValidations()
            .setBackground(null);
    }

    /*
     * 기초 A:B는 한 번만 읽어 메모리 맵으로 비교합니다.
     */
    var basicByCode = {};
    var basicPairMap = {};

    var basicLastRow =
        getLastBasicDataRow_(
            basicSheet
        );

    if (basicLastRow >= 3) {
        var basicValues =
            basicSheet
            .getRange(
                3,
                1,
                basicLastRow - 2,
                2
            )
            .getDisplayValues();

        for (
            var i = 0;
            i < basicValues.length;
            i++
        ) {
            var basicCode =
                normalizeItemCode_(
                    basicValues[i][0]
                );

            var basicName =
                normalizeItemName_(
                    basicValues[i][1]
                );

            if (basicCode === '') {
                continue;
            }

            basicByCode[
                basicCode
            ] = true;

            basicPairMap[
                basicCode +
                '\u0001' +
                basicName
            ] = true;
        }
    }

    var inputSignature =
        getInputFgSignature_(
            inputSheet
        );

    var ignoredMismatchMap =
        getIgnoredMismatchMapForSignature_(
            inputSignature
        );

    var inputLastRow =
        getLastRowByColumns_(
            inputSheet,
            6,
            7,
            2
        );

    var results = [];
    var seen = {};

    if (inputLastRow >= 2) {
        var inputValues =
            inputSheet
            .getRange(
                2,
                6,
                inputLastRow - 1,
                2
            )
            .getDisplayValues();

        for (
            var r = 0;
            r < inputValues.length;
            r++
        ) {
            var displayCode =
                String(
                    inputValues[r][0] || ''
                ).trim();

            var displayName =
                String(
                    inputValues[r][1] || ''
                ).trim();

            var code =
                normalizeItemCode_(
                    displayCode
                );

            var name =
                normalizeItemName_(
                    displayName
                );

            if (
                code === '' ||
                name === ''
            ) {
                continue;
            }

            var pairKey =
                code +
                '\u0001' +
                name;

            if (seen[pairKey]) {
                continue;
            }

            seen[pairKey] = true;

            if (!basicPairMap[pairKey]) {
                var hasExistingCode =
                    !!basicByCode[code];

                if (
                    hasExistingCode &&
                    ignoredMismatchMap[
                        pairKey
                    ]
                ) {
                    continue;
                }

                results.push([
                    formatItemCode9_(
                        displayCode
                    ),
                    displayName,
                    hasExistingCode
                        ? '물품명 불일치'
                        : '신규물품'
                ]);
            }
        }
    }

    if (results.length > 0) {
        var outputValues = [];
        var backgrounds = [];

        for (
            var n = 0;
            n < results.length;
            n++
        ) {
            var isNew =
                results[n][2] ===
                '신규물품';

            outputValues.push([
                results[n][0],
                results[n][1],
                results[n][2],
                isNew
                    ? '기초시트에서 신규 등록'
                    : '기초시트에서 물품명 확인'
            ]);

            backgrounds.push([
                isNew
                    ? '#FFF2CC'
                    : '#FCE4D6',
                isNew
                    ? '#FFF2CC'
                    : '#FCE4D6',
                isNew
                    ? '#FFF2CC'
                    : '#FCE4D6',
                '#FCECC9'
            ]);
        }

        /*
         * v11.8 핵심:
         * 결과 행마다 getRange().setBackground() 하지 않고
         * S:V 전체를 단 두 번의 쓰기로 처리합니다.
         */
        var outputRange =
            inputSheet.getRange(
                2,
                19,
                outputValues.length,
                4
            );

        outputRange
            .clearDataValidations()
            .setValues(
                outputValues
            )
            .setWrap(true)
            .setBackgrounds(
                backgrounds
            );
    }

    /*
     * refreshUnregisteredItemsIfChanged_와 동일한 기준으로
     * 현재 F:G 상태를 저장하여 같은 데이터의 재검사를 피합니다.
     */
    var currentSignature =
        getInputFgSignature_(
            inputSheet
        );

    PropertiesService
        .getDocumentProperties()
        .setProperty(
            'UNREGISTERED_ITEMS_FG_SIGNATURE',
            currentSignature
        );

    return results.length;
}


// =====================================================
// 입력시트 F:G 현재 데이터 서명
// '기존 물품명 유지' 선택은 이 데이터 세트에서만 유효합니다.
// =====================================================
function getInputFgSignature_(inputSheet) {
    var lastRow =
        getLastRowByColumns_(
            inputSheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        return '';
    }

    var values =
        inputSheet
        .getRange(
            2,
            6,
            lastRow - 1,
            2
        )
        .getDisplayValues();

    var lines = [];

    for (
        var i = 0;
        i < values.length;
        i++
    ) {
        var code =
            String(
                values[i][0] || ''
            ).trim();

        var name =
            String(
                values[i][1] || ''
            ).trim();

        if (
            code !== '' ||
            name !== ''
        ) {
            lines.push(
                code + '|' + name
            );
        }
    }

    var digest =
        Utilities.computeDigest(
            Utilities.DigestAlgorithm.MD5,
            lines.join('\n'),
            Utilities.Charset.UTF_8
        );

    return digest
        .map(function(value) {
            var number =
                value < 0
                    ? value + 256
                    : value;

            return (
                '0' +
                number.toString(16)
            ).slice(-2);
        })
        .join('');
}


function getIgnoredMismatchMapForSignature_(
    signature
) {
    var raw =
        PropertiesService
        .getDocumentProperties()
        .getProperty(
            'ITEM_NAME_MISMATCH_IGNORES'
        );

    if (!raw) {
        return {};
    }

    try {
        var parsed = JSON.parse(raw);

        if (
            parsed.signature !== signature ||
            !parsed.keys
        ) {
            return {};
        }

        var map = {};

        parsed.keys.forEach(
            function(key) {
                map[key] = true;
            }
        );

        return map;

    } catch (err) {
        return {};
    }
}


function addIgnoredMismatchForCurrentInput_(
    inputSheet,
    pairKey
) {
    var signature =
        getInputFgSignature_(
            inputSheet
        );

    var current =
        getIgnoredMismatchMapForSignature_(
            signature
        );

    current[pairKey] = true;

    PropertiesService
        .getDocumentProperties()
        .setProperty(
            'ITEM_NAME_MISMATCH_IGNORES',
            JSON.stringify({
                signature: signature,
                keys: Object.keys(current)
            })
        );
}


// =====================================================
// V1 전체등록 체크박스
// U열이 '미등록'인 물품을 기초시트에 일괄 임시 등록
// '물품명 확인' 항목은 제외
// =====================================================
function bulkRegisterUnregisteredItems_(
    ss,
    inputSheet
) {
    inputSheet.getRange('V1').uncheck();

    var basicSheet = ss.getSheetByName('기초');

    if (!basicSheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    var listLastRow = getLastRowByColumns_(
        inputSheet,
        19,
        21,
        2
    );

    if (listLastRow < 2) {
        throw new Error('전체등록할 미등록 물품이 없습니다.');
    }

    var listValues = inputSheet
        .getRange(
            2,
            19,
            listLastRow - 1,
            3
        )
        .getDisplayValues();

    var existingCodeMap = {};
    var basicLastRow = basicSheet.getLastRow();

    if (basicLastRow >= 3) {
        var existingCodes = basicSheet
            .getRange(
                3,
                1,
                basicLastRow - 2,
                1
            )
            .getDisplayValues();

        for (var i = 0; i < existingCodes.length; i++) {
            var existingCode = normalizeItemCode_(
                existingCodes[i][0]
            );

            if (existingCode !== '') {
                existingCodeMap[existingCode] = true;
            }
        }
    }

    var rowsToRegister = [];
    var addedCodeMap = {};
    var skippedCount = 0;

    for (var r = 0; r < listValues.length; r++) {
        var itemCode = String(
            listValues[r][0] || ''
        ).trim();

        var itemName = String(
            listValues[r][1] || ''
        ).trim();

        var checkStatus = String(
            listValues[r][2] || ''
        ).trim();

        if (checkStatus !== '미등록') {
            continue;
        }

        if (itemCode === '' || itemName === '') {
            skippedCount++;
            continue;
        }

        var normalizedCode = normalizeItemCode_(itemCode);

        if (
            normalizedCode === '' ||
            existingCodeMap[normalizedCode] ||
            addedCodeMap[normalizedCode]
        ) {
            skippedCount++;
            continue;
        }

        rowsToRegister.push([
            itemCode,
            itemName,
            '',
            '미등록',
            '',
            '',
            ''
        ]);

        addedCodeMap[normalizedCode] = true;
    }

    if (rowsToRegister.length === 0) {
        refreshUnregisteredItems_(ss);

        throw new Error(
            '새로 등록할 미등록 물품이 없습니다. 물품명 확인 항목은 전체등록에서 제외됩니다.'
        );
    }

    /*
     * 기존 3행의 수식과 기초자료 구조를 보호하기 위해
     * 실제 미등록 자료는 기초시트 A:G의 맨 아래에 추가합니다.
     */
    var firstNewRow = Math.max(
        3,
        getLastBasicDataRow_(basicSheet) + 1
    );

    basicSheet
        .getRange(
            firstNewRow,
            1,
            rowsToRegister.length,
            7
        )
        .setValues(rowsToRegister);

    // 첫 번째 신규 행을 행 이동 대상으로 자동 지정
    PropertiesService
        .getUserProperties()
        .setProperty(
            BASIC_MOVE_SOURCE_KEY,
            String(firstNewRow)
        );

    refreshUnregisteredItems_(ss);
    refreshBasicUnregisteredDisplay_(basicSheet);

    /*
     * 기초시트에는 A:G 자료만 추가합니다.
     * I열 이후의 예전 '물품명 찾기' 영역은 생성하거나 갱신하지 않습니다.
     */
    ss.setActiveSheet(basicSheet);
    basicSheet.setActiveSelection(
        basicSheet.getRange(firstNewRow, 1)
    );

    ss.toast(
        '미등록 물품 ' +
        rowsToRegister.length +
        '건을 기초시트에 임시 등록했습니다.' +
        (skippedCount > 0
            ? '\n중복 또는 빈 자료 ' + skippedCount + '건은 제외했습니다.'
            : '') +
        '\n첫 번째 신규 물품이 이동 대상으로 지정되었습니다.',
        '✅ 전체 기초등록 완료',
        9
    );

    return {
        success: true,
        registeredCount: rowsToRegister.length,
        skippedCount: skippedCount,
        firstNewRow: firstNewRow
    };
}


// =====================================================
// V2 이하에서 체크한 미등록 물품을 기초시트에 임시 등록
// 등록 후 해당 행을 기초자료 이동 원본으로 자동 지정
// =====================================================
function registerUnregisteredItemFromInput_(
    ss,
    inputSheet,
    inputRow
) {
    var rowValues = inputSheet
        .getRange(inputRow, 19, 1, 4)
        .getDisplayValues()[0];

    var itemCode = String(rowValues[0] || '').trim();
    var itemName = String(rowValues[1] || '').trim();
    var checkStatus = String(rowValues[2] || '').trim();

    if (itemCode === '' || itemName === '') {
        inputSheet.getRange(inputRow, 22).uncheck();
        throw new Error('등록할 물품코드 또는 물품명이 없습니다.');
    }

    if (checkStatus !== '미등록') {
        inputSheet.getRange(inputRow, 22).uncheck();
        throw new Error(
            '같은 물품코드가 기초시트에 있습니다. 기존 물품명을 먼저 확인하세요.'
        );
    }

    var basicSheet = ss.getSheetByName('기초');

    if (!basicSheet) {
        inputSheet.getRange(inputRow, 22).uncheck();
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    var normalizedCode = normalizeItemCode_(itemCode);
    var basicLastRow = basicSheet.getLastRow();

    if (basicLastRow >= 3) {
        var existingCodes = basicSheet
            .getRange(3, 1, basicLastRow - 2, 1)
            .getDisplayValues();

        for (var i = 0; i < existingCodes.length; i++) {
            if (normalizeItemCode_(existingCodes[i][0]) === normalizedCode) {
                inputSheet.getRange(inputRow, 22).uncheck();
                refreshUnregisteredItems_(ss);
                throw new Error('이미 기초시트에 등록된 물품코드입니다.');
            }
        }
    }

    /*
     * 기존 3행의 수식과 기초자료 구조를 보호하기 위해
     * 실제 미등록 자료는 기초시트 A:G의 맨 아래에 추가합니다.
     */
    var newRow = Math.max(
        3,
        getLastBasicDataRow_(basicSheet) + 1
    );

    basicSheet
        .getRange(newRow, 1, 1, 7)
        .setValues([[
            itemCode,
            itemName,
            '',
            '미등록',
            '',
            '',
            ''
        ]]);

    // 바로 행 이동 사이드바에서 사용할 수 있도록 원본 행 저장
    PropertiesService
        .getUserProperties()
        .setProperty(
            BASIC_MOVE_SOURCE_KEY,
            String(newRow)
        );

    inputSheet.getRange(inputRow, 22).uncheck();
    refreshUnregisteredItems_(ss);
    refreshBasicUnregisteredDisplay_(basicSheet);

    /*
     * 기초시트에는 A:G 자료만 추가합니다.
     * I열 이후의 예전 '물품명 찾기' 영역은 생성하거나 갱신하지 않습니다.
     */
    ss.setActiveSheet(basicSheet);
    basicSheet.setActiveSelection(
        basicSheet.getRange(newRow, 1)
    );

    ss.toast(
        itemName + '을(를) 기초시트 ' + newRow + '행에 임시 등록했습니다.\n' +
        '이 물품은 이동 대상으로 자동 지정되었습니다.',
        '✅ 기초자료 임시등록 완료',
        8
    );
}


// =====================================================
// 물품코드 비교용 정규화
// 앞자리 0은 비교할 때만 제외
// =====================================================
function normalizeItemCode_(value) {
    var text = String(value == null ? '' : value).trim();
    if (text === '') return '';

    var normalized = text.replace(/^0+/, '');
    return normalized === '' ? '0' : normalized;
}


// =====================================================
// v11.5 물품코드 저장용 표준화
//
// 비교용 normalizeItemCode_는 앞자리 0을 제거하지만,
// 실제 입력/집계/통계에 저장할 때는 숫자형 물품코드를
// 9자리 문자열로 통일합니다.
//
// 예)
// 10101239  -> 010101239
// 60203010  -> 060203010
// 100201069 -> 100201069
// =====================================================
function formatItemCode9_(value) {
    var text =
        String(
            value == null
                ? ''
                : value
        ).trim();

    if (text === '') {
        return '';
    }

    /*
     * Google Sheets에서 숫자값이 12345678.0 형태로
     * 문자열화되는 예외도 방어합니다.
     */
    if (/^\d+\.0+$/.test(text)) {
        text =
            text.replace(
                /\.0+$/,
                ''
            );
    }

    /*
     * 순수 숫자 코드만 9자리로 맞춥니다.
     * 숫자가 아닌 식별자가 들어오면 원문을 보존합니다.
     */
    if (/^\d+$/.test(text)) {
        if (text.length < 9) {
            return (
                '000000000' +
                text
            ).slice(-9);
        }

        return text;
    }

    return text;
}


// =====================================================
// v11.5 입력시트 F열 현재 자료 1회 복구
// 물품코드를 9자리 텍스트로 통일합니다.
// =====================================================
function repairCurrentInputItemCodesV11_5() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '입력시트'
        );

    if (!sheet) {
        throw new Error(
            '입력시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastRowByColumns_(
            sheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        ss.toast(
            '복구할 입력자료가 없습니다.',
            '물품코드 복구',
            5
        );

        return {
            changedCount: 0,
            checkedCount: 0
        };
    }

    var range =
        sheet.getRange(
            2,
            6,
            lastRow - 1,
            1
        );

    var values =
        range.getValues();

    var output = [];
    var changedCount = 0;

    for (
        var i = 0;
        i < values.length;
        i++
    ) {
        var before =
            String(
                values[i][0] == null
                    ? ''
                    : values[i][0]
            ).trim();

        var after =
            formatItemCode9_(
                values[i][0]
            );

        if (
            before !== after &&
            after !== ''
        ) {
            changedCount++;
        }

        output.push([
            after
        ]);
    }

    range
        .setNumberFormat('@')
        .setValues(output);

    SpreadsheetApp.flush();

    /*
     * 입력코드가 바뀌었으므로 자동채우기/미등록/총수량을
     * 현재 자료 기준으로 다시 계산합니다.
     */
    autoFillInputSheet(
        sheet,
        ss
    );

    refreshUnregisteredItems_(
        ss
    );

    sortAndRefreshAll(
        ss
    );

    SpreadsheetApp.flush();

    ss.toast(
        '입력 물품코드 ' +
        changedCount +
        '건을 9자리 형식으로 복구했습니다.',
        '✅ 물품코드 복구 완료',
        7
    );

    return {
        changedCount:
            changedCount,
        checkedCount:
            output.length
    };
}


// =====================================================
// v11.5 총수량 A3 수식 코드형식 방어
//
// 기존 LET 수식 구조는 유지하고,
// 주문내역/기초의 물품코드 배열만 9자리 문자열로 정규화합니다.
// =====================================================
function ensureTotalQuantityCodeNormalizationV11_5_(
    ss
) {
    var sheet =
        ss.getSheetByName(
            '총수량'
        );

    if (!sheet) {
        throw new Error(
            '총수량 시트를 찾을 수 없습니다.'
        );
    }

    var cell =
        sheet.getRange('A3');

    var formula =
        cell.getFormula();

    if (!formula) {
        throw new Error(
            '총수량!A3 핵심 배열수식을 찾을 수 없습니다.'
        );
    }

    /*
     * 이미 v11.5 방식이면 다시 건드리지 않습니다.
     */
    if (
        formula.indexOf(
            'raw_codes, CHOOSECOLS(order_data, 6)'
        ) >= 0 &&
        formula.indexOf(
            'raw_basic_codes, CHOOSECOLS(basic_data, 1)'
        ) >= 0
    ) {
        return false;
    }

    var updated =
        formula;

    updated =
        updated.replace(
            'codes, CHOOSECOLS(order_data, 6),',
            'raw_codes, CHOOSECOLS(order_data, 6),\n' +
            '  codes, MAP(raw_codes, LAMBDA(c, IF(c="", "", IFERROR(TEXT(VALUE(c), "000000000"), TO_TEXT(c))))),'
        );

    updated =
        updated.replace(
            'basic_codes, CHOOSECOLS(basic_data, 1),',
            'raw_basic_codes, CHOOSECOLS(basic_data, 1),\n' +
            '  basic_codes, MAP(raw_basic_codes, LAMBDA(c, IF(c="", "", IFERROR(TEXT(VALUE(c), "000000000"), TO_TEXT(c))))),'
        );

    if (updated === formula) {
        throw new Error(
            '총수량!A3 수식 구조가 예상과 달라 자동 보정하지 못했습니다.'
        );
    }

    cell.setFormula(
        updated
    );

    SpreadsheetApp.flush();

    return true;
}


// =====================================================
// v11.5 현재 코드/총수량 중복 상태 진단
// 시트 변경 없이 검사만 수행합니다.
// =====================================================
function auditItemCodeNormalizationV11_5() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var input =
        ss.getSheetByName(
            '입력시트'
        );

    var total =
        ss.getSheetByName(
            '총수량'
        );

    if (!input || !total) {
        throw new Error(
            '입력시트 또는 총수량 시트를 찾을 수 없습니다.'
        );
    }

    var inputLast =
        getLastRowByColumns_(
            input,
            6,
            7,
            2
        );

    var inputIssues = [];

    if (inputLast >= 2) {
        var inputCodes =
            input
            .getRange(
                2,
                6,
                inputLast - 1,
                1
            )
            .getValues();

        for (
            var i = 0;
            i < inputCodes.length;
            i++
        ) {
            var raw =
                String(
                    inputCodes[i][0] == null
                        ? ''
                        : inputCodes[i][0]
                ).trim();

            var canonical =
                formatItemCode9_(
                    inputCodes[i][0]
                );

            if (
                raw !== '' &&
                raw !== canonical
            ) {
                inputIssues.push({
                    row:
                        i + 2,
                    current:
                        raw,
                    expected:
                        canonical
                });
            }
        }
    }

    var totalLast =
        getRealLastRow(
            total
        );

    var duplicateMap = {};
    var totalDuplicates = [];

    if (totalLast >= 3) {
        var totalRows =
            total
            .getRange(
                3,
                1,
                totalLast - 2,
                2
            )
            .getDisplayValues();

        for (
            var t = 0;
            t < totalRows.length;
            t++
        ) {
            var codeText =
                String(
                    totalRows[t][0] || ''
                ).trim();

            var nameText =
                String(
                    totalRows[t][1] || ''
                ).trim();

            if (
                codeText === '' ||
                nameText === '총계' ||
                nameText === '총합계'
            ) {
                continue;
            }

            var key =
                normalizeItemCode_(
                    codeText
                );

            if (!duplicateMap[key]) {
                duplicateMap[key] = [];
            }

            duplicateMap[key].push({
                row:
                    t + 3,
                code:
                    codeText,
                name:
                    nameText
            });
        }

        Object.keys(
            duplicateMap
        ).forEach(function(key) {
            if (
                duplicateMap[key].length > 1
            ) {
                totalDuplicates.push({
                    normalizedCode:
                        key,
                    rows:
                        duplicateMap[key]
                });
            }
        });
    }

    var result = {
        inputNonCanonicalCount:
            inputIssues.length,
        inputExamples:
            inputIssues.slice(
                0,
                20
            ),
        totalDuplicateCodeCount:
            totalDuplicates.length,
        totalDuplicateExamples:
            totalDuplicates.slice(
                0,
                20
            )
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '입력 코드형식 문제 ' +
        inputIssues.length +
        '건 / 총수량 중복코드 ' +
        totalDuplicates.length +
        '건',
        (
            inputIssues.length === 0 &&
            totalDuplicates.length === 0
        )
            ? '✅ 코드 점검 정상'
            : '⚠ 코드 점검 필요',
        8
    );

    return result;
}


// =====================================================
// 물품명 비교용 정규화
// 앞뒤 공백과 연속 공백을 정리
// =====================================================
function normalizeItemName_(value) {
    return String(value == null ? '' : value)
        .trim()
        .replace(/\s+/g, ' ');
}


// =====================================================
// 지정한 두 열 중 실제 마지막 자료 행 확인
// =====================================================
function getLastRowByColumns_(
    sheet,
    firstColumn,
    secondColumn,
    startRow
) {
    var lastRow = sheet.getLastRow();

    if (lastRow < startRow) {
        return startRow - 1;
    }

    var values = sheet
        .getRange(
            startRow,
            firstColumn,
            lastRow - startRow + 1,
            secondColumn - firstColumn + 1
        )
        .getDisplayValues();

    for (var i = values.length - 1; i >= 0; i--) {
        if (
            String(values[i][0] || '').trim() !== '' ||
            String(values[i][1] || '').trim() !== ''
        ) {
            return startRow + i;
        }
    }

    return startRow - 1;
}


// =========================================================================
// ⭐ 입력시트 자동 채우기 핵심 함수 (동적 헤더 탐색 적용)
// =========================================================================
// =========================================================================
// v11.6 입력시트 붙여넣기 전용 고속 자동채우기
// 편집된 행만 F / M:O를 처리합니다.
// =========================================================================
// =========================================================================
// v11.9 입력 자동채우기 + 미등록검사용 데이터 재사용
//
// 시트 읽기:
//   기초 A:G 1회
//   붙여넣은 A:O 1회
//
// 반환값에 F:G와 기초 비교맵을 담아 미등록 검사에서 재사용합니다.
// =========================================================================
// =====================================================
// v11.13 총수량 A1 수동 날짜 선택
//
// A1에 날짜 데이터 유효성 검사를 적용하여
// 사용자가 셀에서 달력으로 날짜를 직접 선택할 수 있게 합니다.
// 현재 값은 변경하지 않습니다.
// =====================================================
function ensureTotalDatePickerV11_13_(
    ss
) {
    ss =
        ss ||
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '총수량'
        );

    if (!sheet) {
        return false;
    }

    var cell =
        sheet.getRange(
            'A1'
        );

    var rule =
        SpreadsheetApp
        .newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .setHelpText(
            '날짜를 직접 선택하세요.'
        )
        .build();

    cell
        .setDataValidation(
            rule
        )
        .setNumberFormat(
            'yyyy년 m월 d일 dddd'
        );

    return true;
}


// =====================================================
// v11.13 날짜선택 기능 1회 설정
// =====================================================
function setupTotalDatePickerV11_13() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    ensureTotalDatePickerV11_13_(
        ss
    );

    ss.toast(
        '총수량 A1에서 날짜를 직접 선택할 수 있습니다.',
        '✅ 날짜 선택 설정 완료',
        5
    );
}


// =====================================================
// v11.13 날짜선택 상태 확인
// =====================================================
function checkTotalDatePickerV11_13() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '총수량'
        );

    if (!sheet) {
        throw new Error(
            '총수량 시트를 찾을 수 없습니다.'
        );
    }

    var cell =
        sheet.getRange(
            'A1'
        );

    var validation =
        cell.getDataValidation();

    var result = {
        displayValue:
            cell.getDisplayValue(),
        hasDateValidation:
            !!validation,
        numberFormat:
            cell.getNumberFormat(),
        automaticDateUpdate:
            false
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        validation
            ? 'A1 날짜 선택 기능이 설정되어 있습니다.'
            : 'A1 날짜 선택 기능이 없습니다.',
        validation
            ? '✅ 정상'
            : '⚠ 설정 필요',
        5
    );

    return result;
}


// =====================================================
// v11.12 공급일련번호에서 YYYYMMDD 날짜 추출
//
// 예:
// 10005120241127045908 → 2024-11-27
// =====================================================
function extractDateFromSupplySerialV11_12_(
    value
) {
    var text =
        String(
            value == null
                ? ''
                : value
        ).trim();

    if (text === '') {
        return null;
    }

    /*
     * 공급일련번호 내부의 20YYYYMMDD 형태 중
     * 첫 번째 유효한 YYYYMMDD를 찾습니다.
     */
    var matches =
        text.match(
            /20\d{6}/g
        );

    if (!matches) {
        return null;
    }

    for (
        var i = 0;
        i < matches.length;
        i++
    ) {
        var token =
            matches[i];

        var year =
            Number(
                token.slice(
                    0,
                    4
                )
            );

        var month =
            Number(
                token.slice(
                    4,
                    6
                )
            );

        var day =
            Number(
                token.slice(
                    6,
                    8
                )
            );

        var date =
            new Date(
                year,
                month - 1,
                day
            );

        if (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        ) {
            return date;
        }
    }

    return null;
}


// =====================================================
// 총수량 A1 날짜 반영
// 기존 표시서식은 보존하고 값만 바꿉니다.
// =====================================================
function updateTotalDateFromSupplyDateV11_12_(
    ss,
    date
) {
    if (
        !(date instanceof Date) ||
        isNaN(
            date.getTime()
        )
    ) {
        return false;
    }

    var totalSheet =
        ss.getSheetByName(
            '총수량'
        );

    if (!totalSheet) {
        return false;
    }

    var cell =
        totalSheet.getRange(
            'A1'
        );

    var current =
        cell.getValue();

    var sameDate =
        current instanceof Date &&
        !isNaN(
            current.getTime()
        ) &&
        current.getFullYear() ===
            date.getFullYear() &&
        current.getMonth() ===
            date.getMonth() &&
        current.getDate() ===
            date.getDate();

    if (sameDate) {
        return false;
    }

    cell.setValue(
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    return true;
}


function autoFillInputRowsFastV11_9_(
    sheet,
    ss,
    startRow,
    rowCount
) {
    startRow =
        Math.max(
            2,
            Number(startRow) || 2
        );

    rowCount =
        Math.max(
            1,
            Number(rowCount) || 1
        );

    if (startRow > sheet.getMaxRows()) {
        return {
            fgRows: [],
            basicByCode: {},
            basicPairMap: {}
        };
    }

    rowCount =
        Math.min(
            rowCount,
            sheet.getMaxRows() -
                startRow + 1
        );

    var baseMap = {};
    var basicByCode = {};
    var basicPairMap = {};

    var baseSheet =
        ss.getSheetByName('기초');

    if (
        baseSheet &&
        baseSheet.getLastRow() >= 3
    ) {
        var baseData =
            baseSheet
            .getRange(
                3,
                1,
                baseSheet.getLastRow() - 2,
                7
            )
            .getValues();

        for (
            var b = 0;
            b < baseData.length;
            b++
        ) {
            var codeKey =
                normalizeItemCode_(
                    baseData[b][0]
                );

            if (codeKey === '') {
                continue;
            }

            var nameKey =
                normalizeItemName_(
                    baseData[b][1]
                );

            var rawOrder =
                baseData[b][6];

            baseMap[codeKey] = {
                status:
                    baseData[b][3],
                logistics:
                    baseData[b][5],
                order:
                    (
                        rawOrder !== '' &&
                        rawOrder != null &&
                        !isNaN(rawOrder)
                    )
                        ? Number(rawOrder)
                        : rawOrder
            };

            basicByCode[
                codeKey
            ] = true;

            basicPairMap[
                codeKey +
                '\u0001' +
                nameKey
            ] = true;
        }
    }

    var values =
        sheet
        .getRange(
            startRow,
            1,
            rowCount,
            15
        )
        .getValues();

    var codeOutput = [];
    var infoOutput = [];
    var fgRows = [];

    /*
     * v11.12:
     * 붙여넣은 데이터의 공급일련번호(C열) 안에 포함된 날짜를
     * 집계합니다. 여러 날짜가 있으면 가장 많이 나온 날짜를 사용합니다.
     */
    var supplyDateCounts = {};
    var supplyDateObjects = {};

    for (
        var i = 0;
        i < values.length;
        i++
    ) {
        var row =
            values[i];

        var supplyDate =
            extractDateFromSupplySerialV11_12_(
                row[2]
            );

        if (supplyDate) {
            var supplyDateKey =
                Utilities.formatDate(
                    supplyDate,
                    Session.getScriptTimeZone(),
                    'yyyyMMdd'
                );

            supplyDateCounts[
                supplyDateKey
            ] =
                (
                    supplyDateCounts[
                        supplyDateKey
                    ] || 0
                ) + 1;

            supplyDateObjects[
                supplyDateKey
            ] =
                supplyDate;
        }

        var hasData = false;

        for (
            var c = 0;
            c < 12;
            c++
        ) {
            if (
                String(
                    row[c] == null
                        ? ''
                        : row[c]
                ).trim() !== ''
            ) {
                hasData = true;
                break;
            }
        }

        var code =
            formatItemCode9_(
                row[5]
            );

        var itemName =
            String(
                row[6] == null
                    ? ''
                    : row[6]
            ).trim();

        var status =
            row[12];

        var logistics =
            row[13];

        var order =
            row[14];

        if (!hasData) {
            code = '';
            itemName = '';
            status = '';
            logistics = '';
            order = '';

        } else {
            var key =
                normalizeItemCode_(
                    code
                );

            var master =
                key !== ''
                    ? baseMap[key]
                    : null;

            if (master) {
                if (
                    String(
                        status == null
                            ? ''
                            : status
                    ).trim() === ''
                ) {
                    status =
                        master.status;
                }

                if (
                    String(
                        logistics == null
                            ? ''
                            : logistics
                    ).trim() === ''
                ) {
                    logistics =
                        master.logistics;
                }

                if (
                    String(
                        order == null
                            ? ''
                            : order
                    ).trim() === ''
                ) {
                    order =
                        master.order;
                }
            }

            if (
                typeof order === 'string' &&
                order.trim() !== '' &&
                !isNaN(order)
            ) {
                order =
                    Number(order);
            }

            if (
                String(
                    order == null
                        ? ''
                        : order
                ).trim() !== '' &&
                String(
                    logistics == null
                        ? ''
                        : logistics
                ).trim() === ''
            ) {
                logistics = 910;
            }
        }

        codeOutput.push([
            code
        ]);

        infoOutput.push([
            status,
            logistics,
            order
        ]);

        fgRows.push([
            code,
            itemName
        ]);
    }

    /*
     * 두 번의 쓰기만 수행합니다.
     */
    sheet
        .getRange(
            startRow,
            6,
            rowCount,
            1
        )
        .setNumberFormat('@')
        .setValues(
            codeOutput
        );

    sheet
        .getRange(
            startRow,
            13,
            rowCount,
            3
        )
        .setValues(
            infoOutput
        );

    var selectedSupplyDate = null;
    var selectedSupplyDateCount = -1;

    Object.keys(
        supplyDateCounts
    ).forEach(function(key) {
        if (
            supplyDateCounts[key] >
            selectedSupplyDateCount
        ) {
            selectedSupplyDateCount =
                supplyDateCounts[key];

            selectedSupplyDate =
                supplyDateObjects[key];
        }
    });

    return {
        fgRows:
            fgRows,
        basicByCode:
            basicByCode,
        basicPairMap:
            basicPairMap,
        supplyDate:
            selectedSupplyDate
    };
}


// =====================================================
// v11.9 메모리 F:G 배열에서 서명 계산
// 시트를 다시 읽지 않습니다.
// =====================================================
function makeFgSignatureFromRowsV11_9_(
    fgRows
) {
    var lines = [];

    for (
        var i = 0;
        i < fgRows.length;
        i++
    ) {
        var code =
            String(
                fgRows[i][0] || ''
            ).trim();

        var name =
            String(
                fgRows[i][1] || ''
            ).trim();

        if (
            code !== '' ||
            name !== ''
        ) {
            lines.push(
                code + '|' + name
            );
        }
    }

    if (lines.length === 0) {
        return '';
    }

    var digest =
        Utilities.computeDigest(
            Utilities.DigestAlgorithm.MD5,
            lines.join('\n'),
            Utilities.Charset.UTF_8
        );

    return digest
        .map(function(value) {
            var number =
                value < 0
                    ? value + 256
                    : value;

            return (
                '0' +
                number.toString(16)
            ).slice(-2);
        })
        .join('');
}


// =====================================================
// v11.9 삭제→전체붙여넣기 전용 미등록 고속 검사
//
// 입력 F:G 재읽기 0회
// 기초 A:B 재읽기 0회
// 전체 서명용 F:G 재읽기 0회
// =====================================================
function refreshUnregisteredFromFastInputV11_9_(
    ss,
    inputSheet,
    fastInputResult
) {
    ensureInputUnregisteredArea_(
        inputSheet
    );

    var fgRows =
        fastInputResult &&
        fastInputResult.fgRows
            ? fastInputResult.fgRows
            : [];

    var basicByCode =
        fastInputResult &&
        fastInputResult.basicByCode
            ? fastInputResult.basicByCode
            : {};

    var basicPairMap =
        fastInputResult &&
        fastInputResult.basicPairMap
            ? fastInputResult.basicPairMap
            : {};

    var signature =
        makeFgSignatureFromRowsV11_9_(
            fgRows
        );

    /*
     * 새 전체 데이터 세트이므로 이전 데이터 세트의
     * '기존 물품명 유지' 보류값은 서명이 다르면 자동 무효화됩니다.
     */
    var ignoredMismatchMap =
        getIgnoredMismatchMapForSignature_(
            signature
        );

    var seen = {};
    var outputValues = [];
    var backgrounds = [];
    var newCount = 0;
    var mismatchCount = 0;

    for (
        var i = 0;
        i < fgRows.length;
        i++
    ) {
        var displayCode =
            String(
                fgRows[i][0] || ''
            ).trim();

        var displayName =
            String(
                fgRows[i][1] || ''
            ).trim();

        var code =
            normalizeItemCode_(
                displayCode
            );

        var name =
            normalizeItemName_(
                displayName
            );

        if (
            code === '' ||
            name === ''
        ) {
            continue;
        }

        var pairKey =
            code +
            '\u0001' +
            name;

        if (seen[pairKey]) {
            continue;
        }

        seen[pairKey] = true;

        if (basicPairMap[pairKey]) {
            continue;
        }

        var hasExistingCode =
            !!basicByCode[code];

        if (
            hasExistingCode &&
            ignoredMismatchMap[pairKey]
        ) {
            continue;
        }

        var status =
            hasExistingCode
                ? '물품명 불일치'
                : '신규물품';

        if (hasExistingCode) {
            mismatchCount++;
        } else {
            newCount++;
        }

        var isNew =
            !hasExistingCode;

        outputValues.push([
            formatItemCode9_(
                displayCode
            ),
            displayName,
            status,
            isNew
                ? '기초시트에서 신규 등록'
                : '기초시트에서 물품명 확인'
        ]);

        backgrounds.push([
            isNew
                ? '#FFF2CC'
                : '#FCE4D6',
            isNew
                ? '#FFF2CC'
                : '#FCE4D6',
            isNew
                ? '#FFF2CC'
                : '#FCE4D6',
            '#FCECC9'
        ]);
    }

    /*
     * 삭제 직후에는 S:V가 이미 비어 있으므로
     * 이전 점검영역 삭제 작업도 생략합니다.
     */
    if (outputValues.length > 0) {
        inputSheet
            .getRange(
                2,
                19,
                outputValues.length,
                4
            )
            .clearDataValidations()
            .setValues(
                outputValues
            )
            .setWrap(true)
            .setBackgrounds(
                backgrounds
            );
    }

    PropertiesService
        .getDocumentProperties()
        .setProperty(
            'UNREGISTERED_ITEMS_FG_SIGNATURE',
            signature
        );

    return {
        changed:
            true,
        total:
            newCount +
            mismatchCount,
        newCount:
            newCount,
        mismatchCount:
            mismatchCount
    };
}


// =====================================================
// v11.9 이미 계산한 건수로 바로 알림창 표시
// S:U를 다시 읽어 집계하지 않습니다.
// =====================================================
// =====================================================
// v11.10 설치형 onEdit - 미등록/물품명 불일치 팝업 전용
//
// 역할:
// - 단순 onEdit이 만들어 둔 판정결과만 읽음
// - 입력/기초 재검사하지 않음
// - HTML 모달만 표시
// =====================================================
function installedOnEditItemReviewV11_10_(e) {
    try {
        if (
            !e ||
            !e.range
        ) {
            return;
        }

        var sheet =
            e.range.getSheet();

        if (
            !sheet ||
            sheet.getName() !== '입력시트'
        ) {
            return;
        }

        /*
         * P1 삭제 체크는 팝업 대상이 아닙니다.
         */
        if (
            e.range.getA1Notation() === 'P1'
        ) {
            return;
        }

        if (
            e.range.getRow() < 2 ||
            e.range.getColumn() > 17
        ) {
            return;
        }

        /*
         * v11.12:
         * 이 설치형 트리거는 단순 onEdit과 별도로 실행되므로
         * 총수량 B열 폭 점검은 사용자 붙여넣기 대기시간에 포함되지 않습니다.
         */
        asyncFitTotalItemNameColumnV11_12_(
            e.source ||
            SpreadsheetApp.getActiveSpreadsheet()
        );

        var props =
            PropertiesService
            .getDocumentProperties();

        /*
         * 단순 onEdit과 설치형 onEdit의 실행 순서는
         * Google에서 보장하지 않으므로, 최대 약 1.5초 동안
         * 매우 짧게 결과 property를 기다립니다.
         * 시트 재검사는 하지 않습니다.
         */
        var raw = '';
        var waitStarted =
            Date.now();

        while (
            raw === '' &&
            (
                Date.now() -
                waitStarted
            ) < 1500
        ) {
            raw =
                props.getProperty(
                    'ITEM_REVIEW_PENDING_POPUP_V1110'
                ) || '';

            if (raw === '') {
                Utilities.sleep(
                    100
                );
            }
        }

        if (raw === '') {
            return;
        }

        var summary =
            JSON.parse(
                raw
            );

        /*
         * 오래된 결과가 다음 편집에서 다시 뜨지 않도록
         * 15초가 지난 결과는 폐기합니다.
         */
        if (
            !summary ||
            !summary.createdAt ||
            (
                Date.now() -
                Number(
                    summary.createdAt
                )
            ) > 15000
        ) {
            props.deleteProperty(
                'ITEM_REVIEW_PENDING_POPUP_V1110'
            );

            return;
        }

        /*
         * 재표시 방지를 위해 먼저 소비합니다.
         */
        props.deleteProperty(
            'ITEM_REVIEW_PENDING_POPUP_V1110'
        );

        showPendingItemReviewNotificationV11_9_({
            total:
                Number(
                    summary.total
                ) || 0,
            newCount:
                Number(
                    summary.newCount
                ) || 0,
            mismatchCount:
                Number(
                    summary.mismatchCount
                ) || 0
        });

    } catch (err) {
        console.error(
            '설치형 onEdit 물품점검 알림 오류: ' +
            err.message
        );
    }
}


// =====================================================
// v11.10 설치형 onEdit 트리거 1회 설치
// 기존 동일 핸들러 트리거가 있으면 중복 생성하지 않습니다.
// =====================================================
function setupItemReviewEditTriggerV11_10() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var handler =
        'installedOnEditItemReviewV11_10_';

    var triggers =
        ScriptApp
        .getProjectTriggers();

    var exists = false;

    for (
        var i = 0;
        i < triggers.length;
        i++
    ) {
        if (
            triggers[i].getHandlerFunction() ===
            handler
        ) {
            exists = true;
            break;
        }
    }

    if (!exists) {
        ScriptApp
            .newTrigger(
                handler
            )
            .forSpreadsheet(
                ss
            )
            .onEdit()
            .create();
    }

    ss.toast(
        exists
            ? '미등록 팝업용 설치형 onEdit 트리거가 이미 있습니다.'
            : '미등록 팝업용 설치형 onEdit 트리거를 설치했습니다.',
        '✅ 트리거 확인',
        6
    );

    return {
        installed:
            true,
        alreadyExisted:
            exists
    };
}


// =====================================================
// v11.10 설치형 onEdit 트리거 상태 확인
// =====================================================
function checkItemReviewEditTriggerV11_10() {
    var handler =
        'installedOnEditItemReviewV11_10_';

    var triggers =
        ScriptApp
        .getProjectTriggers();

    var matches = [];

    for (
        var i = 0;
        i < triggers.length;
        i++
    ) {
        if (
            triggers[i].getHandlerFunction() ===
            handler
        ) {
            matches.push({
                handler:
                    triggers[i].getHandlerFunction(),
                eventType:
                    String(
                        triggers[i].getEventType()
                    )
            });
        }
    }

    console.log(
        JSON.stringify(
            matches
        )
    );

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            matches.length > 0
                ? '설치형 onEdit 트리거 ' +
                  matches.length +
                  '개 확인'
                : '설치형 onEdit 트리거가 없습니다.',
            matches.length > 0
                ? '✅ 정상'
                : '⚠ 설치 필요',
            6
        );

    return matches;
}


// =====================================================
// v11.10 팝업 자체 수동 시험
// 실제 미등록 판정과 무관하게 HTML 모달이 열리는지만 확인합니다.
// =====================================================
function testItemReviewPopupV11_10() {
    showPendingItemReviewNotificationV11_9_({
        total: 2,
        newCount: 1,
        mismatchCount: 1
    });
}


function showPendingItemReviewNotificationV11_9_(
    summary
) {
    if (
        !summary ||
        summary.total <= 0
    ) {
        return;
    }

    var template =
        HtmlService
        .createTemplateFromFile(
            '물품점검알림'
        );

    template.total =
        summary.total;

    template.newCount =
        summary.newCount;

    template.mismatchCount =
        summary.mismatchCount;

    var html =
        template
        .evaluate()
        .setWidth(440)
        .setHeight(330);

    SpreadsheetApp
        .getUi()
        .showModalDialog(
            html,
            '확인 필요한 물품'
        );
}


// =====================================================
// v11.9 실제 삭제→전체붙여넣기 경로 속도 측정
// 팝업 렌더링 시간은 제외합니다.
// =====================================================
// =====================================================
// v11.12 레이아웃 및 구버전 날짜추출 점검(자동반영은 v11.13부터 미사용)
// =====================================================
// =====================================================
// v11.13 총수량 수동 날짜 선택 점검
// =====================================================
function testTotalManualDateV11_13() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    ensureTotalDatePickerV11_13_(
        ss
    );

    var sheet =
        ss.getSheetByName(
            '총수량'
        );

    var cell =
        sheet.getRange(
            'A1'
        );

    var result = {
        currentDate:
            cell.getDisplayValue(),
        numberFormat:
            cell.getNumberFormat(),
        hasValidation:
            !!cell.getDataValidation(),
        automaticDateUpdate:
            false
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        'A1 날짜는 자동 변경하지 않습니다. 셀에서 직접 선택하세요.',
        '✅ 수동 날짜 모드',
        6
    );

    return result;
}


function testTotalDateAndLayoutV11_12() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var total =
        ss.getSheetByName(
            '총수량'
        );

    if (!total) {
        throw new Error(
            '총수량 시트를 찾을 수 없습니다.'
        );
    }

    var sample =
        extractDateFromSupplySerialV11_12_(
            '10005120241127045908'
        );

    var baseline =
        ensureTotalSheetLayoutBaselineV11_12_(
            total
        );

    var result = {
        sampleDate:
            sample
                ? Utilities.formatDate(
                    sample,
                    Session.getScriptTimeZone(),
                    'yyyy-MM-dd'
                )
                : '',
        currentA1:
            total.getRange('A1')
                .getDisplayValue(),
        baselineWidths:
            baseline.widths,
        row1:
            baseline.row1,
        row2:
            baseline.row2,
        dataRow:
            baseline.dataRow
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '날짜 추출 예시: ' +
        result.sampleDate +
        ' / 총수량 기준 셀크기 확인 완료',
        'v11.12 점검',
        7
    );

    return result;
}


function testInputPastePathSpeedV11_9() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '입력시트'
        );

    if (!sheet) {
        throw new Error(
            '입력시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastRowByColumns_(
            sheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        return {
            rows: 0,
            autoFillMs: 0,
            reviewMs: 0,
            flushMs: 0,
            totalMs: 0
        };
    }

    /*
     * 실제 삭제 직후 상태와 동일하게 S:V만 비웁니다.
     */
    var oldReviewLast =
        getLastRowByColumns_(
            sheet,
            19,
            21,
            2
        );

    if (oldReviewLast >= 2) {
        sheet
            .getRange(
                2,
                19,
                oldReviewLast - 1,
                4
            )
            .clearContent()
            .setBackground(null);
    }

    var started =
        Date.now();

    var t1 =
        Date.now();

    var fastInputResult =
        autoFillInputRowsFastV11_9_(
            sheet,
            ss,
            2,
            lastRow - 1
        );

    var autoFillMs =
        Date.now() - t1;

    var t2 =
        Date.now();

    var summary =
        refreshUnregisteredFromFastInputV11_9_(
            ss,
            sheet,
            fastInputResult
        );

    var reviewMs =
        Date.now() - t2;

    var totalMs =
        Date.now() - started;

    var result = {
        rows:
            lastRow - 1,
        autoFillMs:
            autoFillMs,
        reviewMs:
            reviewMs,
        flushMs:
            0,
        totalMs:
            totalMs,
        reviewTotal:
            summary.total,
        newCount:
            summary.newCount,
        mismatchCount:
            summary.mismatchCount
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '자동채우기 ' +
        (autoFillMs / 1000).toFixed(2) +
        '초 / 미등록확인 ' +
        (reviewMs / 1000).toFixed(2) +
        '초 / 총 ' +
        (totalMs / 1000).toFixed(2) +
        '초',
        'v11.9 입력 속도',
        8
    );

    return result;
}


function autoFillInputRowsFastV11_6_(
    sheet,
    ss,
    startRow,
    rowCount
) {
    startRow =
        Math.max(
            2,
            Number(startRow) || 2
        );

    rowCount =
        Math.max(
            1,
            Number(rowCount) || 1
        );

    if (startRow > sheet.getMaxRows()) {
        return false;
    }

    rowCount =
        Math.min(
            rowCount,
            sheet.getMaxRows() - startRow + 1
        );

    var baseMap = {};
    var baseSheet =
        ss.getSheetByName('기초');

    if (
        baseSheet &&
        baseSheet.getLastRow() >= 3
    ) {
        var baseData =
            baseSheet
            .getRange(
                3,
                1,
                baseSheet.getLastRow() - 2,
                7
            )
            .getValues();

        for (
            var b = 0;
            b < baseData.length;
            b++
        ) {
            var key =
                normalizeItemCode_(
                    baseData[b][0]
                );

            if (key === '') continue;

            var rawOrder =
                baseData[b][6];

            baseMap[key] = {
                status:
                    baseData[b][3],
                logistics:
                    baseData[b][5],
                order:
                    (
                        rawOrder !== '' &&
                        rawOrder != null &&
                        !isNaN(rawOrder)
                    )
                        ? Number(rawOrder)
                        : rawOrder
            };
        }
    }

    var values =
        sheet
        .getRange(
            startRow,
            1,
            rowCount,
            15
        )
        .getValues();

    var codeOutput = [];
    var infoOutput = [];

    for (
        var i = 0;
        i < values.length;
        i++
    ) {
        var row =
            values[i];

        var hasData = false;

        for (
            var c = 0;
            c < 12;
            c++
        ) {
            if (
                String(
                    row[c] == null
                        ? ''
                        : row[c]
                ).trim() !== ''
            ) {
                hasData = true;
                break;
            }
        }

        var code =
            formatItemCode9_(
                row[5]
            );

        var status =
            row[12];

        var logistics =
            row[13];

        var order =
            row[14];

        if (!hasData) {
            code = '';
            status = '';
            logistics = '';
            order = '';

        } else {
            var key =
                normalizeItemCode_(
                    code
                );

            var master =
                key !== ''
                    ? baseMap[key]
                    : null;

            if (master) {
                if (
                    String(
                        status == null
                            ? ''
                            : status
                    ).trim() === ''
                ) {
                    status =
                        master.status;
                }

                if (
                    String(
                        logistics == null
                            ? ''
                            : logistics
                    ).trim() === ''
                ) {
                    logistics =
                        master.logistics;
                }

                if (
                    String(
                        order == null
                            ? ''
                            : order
                    ).trim() === ''
                ) {
                    order =
                        master.order;
                }
            }

            if (
                typeof order === 'string' &&
                order.trim() !== '' &&
                !isNaN(order)
            ) {
                order =
                    Number(order);
            }

            if (
                String(
                    order == null
                        ? ''
                        : order
                ).trim() !== '' &&
                String(
                    logistics == null
                        ? ''
                        : logistics
                ).trim() === ''
            ) {
                logistics = 910;
            }
        }

        codeOutput.push([
            code
        ]);

        infoOutput.push([
            status,
            logistics,
            order
        ]);
    }

    sheet
        .getRange(
            startRow,
            6,
            rowCount,
            1
        )
        .setNumberFormat('@')
        .setValues(
            codeOutput
        );

    sheet
        .getRange(
            startRow,
            13,
            rowCount,
            3
        )
        .setValues(
            infoOutput
        );

    return true;
}


// =====================================================
// v11.6 전체 진단용 속도 측정(미등록확인/flush 포함)
// =====================================================
// =====================================================
// v11.7 실제 붙여넣기 경로 속도 측정
//
// 미등록 확인과 강제 flush를 제외한
// "사용자가 실제로 기다리는 경로"만 측정합니다.
// =====================================================
// =====================================================
// v11.8 실제 입력 처리 속도 측정
// 자동채우기 + 미등록확인, 강제 flush 없음
// =====================================================
function testInputPastePathSpeedV11_8() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '입력시트'
        );

    if (!sheet) {
        throw new Error(
            '입력시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastRowByColumns_(
            sheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        return {
            rows: 0,
            autoFillMs: 0,
            reviewMs: 0,
            flushMs: 0,
            totalMs: 0
        };
    }

    var started =
        Date.now();

    var t1 =
        Date.now();

    autoFillInputRowsFastV11_6_(
        sheet,
        ss,
        2,
        lastRow - 1
    );

    var autoFillMs =
        Date.now() - t1;

    /*
     * 테스트에서는 실제 재검사 속도를 보기 위해
     * 저장된 F:G 서명을 한 번 제거합니다.
     */
    PropertiesService
        .getDocumentProperties()
        .deleteProperty(
            'UNREGISTERED_ITEMS_FG_SIGNATURE'
        );

    var t2 =
        Date.now();

    refreshUnregisteredItemsIfChanged_(
        ss
    );

    var reviewMs =
        Date.now() - t2;

    var totalMs =
        Date.now() - started;

    var result = {
        rows:
            lastRow - 1,
        autoFillMs:
            autoFillMs,
        reviewMs:
            reviewMs,
        flushMs:
            0,
        totalMs:
            totalMs
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '자동채우기 ' +
        (autoFillMs / 1000).toFixed(2) +
        '초 / 미등록확인 ' +
        (reviewMs / 1000).toFixed(2) +
        '초 / flush 0초',
        'v11.8 입력 속도',
        8
    );

    return result;
}


function testInputPastePathSpeedV11_7() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '입력시트'
        );

    if (!sheet) {
        throw new Error(
            '입력시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastRowByColumns_(
            sheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        return {
            rows: 0,
            autoFillMs: 0,
            totalMs: 0
        };
    }

    var started =
        Date.now();

    autoFillInputRowsFastV11_6_(
        sheet,
        ss,
        2,
        lastRow - 1
    );

    var totalMs =
        Date.now() - started;

    var result = {
        rows:
            lastRow - 1,
        autoFillMs:
            totalMs,
        unregisteredMs:
            0,
        flushMs:
            0,
        totalMs:
            totalMs
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '실제 입력 대기 경로 ' +
        (totalMs / 1000).toFixed(2) +
        '초 / 미등록확인 0초 / 강제 flush 0초',
        'v11.7 입력 속도',
        7
    );

    return result;
}


// =====================================================
// v11.7 미등록 점검을 필요할 때만 수동 실행
// =====================================================
function refreshItemReviewNowV11_7() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var started =
        Date.now();

    var changed =
        refreshUnregisteredItemsIfChanged_(
            ss
        );

    var elapsedMs =
        Date.now() - started;

    ss.toast(
        '미등록/물품명 점검 ' +
        (elapsedMs / 1000).toFixed(2) +
        '초',
        changed
            ? '✅ 점검목록 갱신'
            : '✅ 변경 없음',
        6
    );

    return {
        changed:
            changed,
        elapsedMs:
            elapsedMs
    };
}


function testInputAutoFillSpeedV11_6() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '입력시트'
        );

    if (!sheet) {
        throw new Error(
            '입력시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastRowByColumns_(
            sheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        return {
            rows: 0,
            totalMs: 0
        };
    }

    var started =
        Date.now();

    var t1 =
        Date.now();

    autoFillInputRowsFastV11_6_(
        sheet,
        ss,
        2,
        lastRow - 1
    );

    var autoFillMs =
        Date.now() - t1;

    var t2 =
        Date.now();

    refreshUnregisteredItemsIfChanged_(
        ss
    );

    var reviewMs =
        Date.now() - t2;

    var t3 =
        Date.now();

    SpreadsheetApp.flush();

    var flushMs =
        Date.now() - t3;

    var totalMs =
        Date.now() - started;

    var result = {
        rows:
            lastRow - 1,
        autoFillMs:
            autoFillMs,
        reviewMs:
            reviewMs,
        flushMs:
            flushMs,
        totalMs:
            totalMs
    };

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '자동채우기 ' +
        (autoFillMs / 1000).toFixed(2) +
        '초 / 미등록확인 ' +
        (reviewMs / 1000).toFixed(2) +
        '초 / 계산반영 ' +
        (flushMs / 1000).toFixed(2) +
        '초',
        '입력 고속처리 측정',
        8
    );

    return result;
}


function autoFillInputSheet(sheet, ss) {
    var lastRow = Math.max(sheet.getLastRow(), getRealLastRow(sheet));
    if (lastRow < 2) return false;
    
    var maxCol = Math.max(16, sheet.getLastColumn());
    var headers = sheet.getRange(1, 1, 1, maxCol).getValues()[0];
    
    // 1행의 제목을 읽어 자동으로 열 위치를 찾음 (열이 삭제되거나 추가되어도 완벽 대응)
    var itemCodeIdx = headers.indexOf("물품코드");
    var statusIdx = headers.indexOf("저장상태");
    var logisticsIdx = headers.indexOf("물류지");
    var orderIdx = headers.indexOf("집품순서");
    
    // 만약 헤더를 찾지 못할 경우를 대비한 기본값 (A열 삭제 기준)
   if (itemCodeIdx === -1) itemCodeIdx = 5;
if (statusIdx === -1) statusIdx = 12;
if (logisticsIdx === -1) logisticsIdx = 13;
if (orderIdx === -1) orderIdx = 14;

    var fullRange = sheet.getRange(2, 1, lastRow - 1, maxCol);
    var values = fullRange.getValues();
    var needWrite = false;

    var baseMap = {};
    var baseSheet = ss.getSheetByName("기초");
    if (baseSheet && baseSheet.getLastRow() >= 3) {
        var baseData = baseSheet.getRange(3, 1, baseSheet.getLastRow() - 2, 7).getValues();
        for (var b = 0; b < baseData.length; b++) {
            // 물품코드 앞자리 0을 무시하고 완벽 매칭
            var bCode = String(baseData[b][0]).trim().replace(/^0+/, '');
            if (bCode !== "") {
                var oVal = baseData[b][6];
                var orderNum = (oVal !== "" && !isNaN(oVal)) ? Number(oVal) : oVal;
                baseMap[bCode] = { status: baseData[b][3], logistics: baseData[b][5], order: orderNum };
            }
        }
    }

    for (var i = 0; i < values.length; i++) {
        var isEmptyRow = true;
        for (var j = 0; j < statusIdx; j++) {
            if (String(values[i][j] || "").trim() !== "") {
                isEmptyRow = false;
                break;
            }
        }

        if (isEmptyRow) {
            // 빈 행이면 저장상태 등도 지움
            if (String(values[i][statusIdx] || "").trim() !== "") { values[i][statusIdx] = ""; needWrite = true; }
            if (String(values[i][logisticsIdx] || "").trim() !== "") { values[i][logisticsIdx] = ""; needWrite = true; }
            if (String(values[i][orderIdx] || "").trim() !== "") { values[i][orderIdx] = ""; needWrite = true; }
        } else {
            /*
             * v11.5:
             * 입력시트 물품코드는 실제 저장값부터 9자리 텍스트로 통일합니다.
             * 이후 기초 비교는 기존처럼 앞자리 0을 제외한 비교키를 사용합니다.
             */
            var originalItemCode =
                String(
                    values[i][itemCodeIdx] == null
                        ? ''
                        : values[i][itemCodeIdx]
                ).trim();

            var canonicalItemCode =
                formatItemCode9_(
                    values[i][itemCodeIdx]
                );

            if (
                canonicalItemCode !== '' &&
                originalItemCode !== canonicalItemCode
            ) {
                values[i][itemCodeIdx] =
                    canonicalItemCode;

                needWrite = true;
            }

            var itemCode =
                normalizeItemCode_(
                    canonicalItemCode
                );

            if (itemCode !== "" && baseMap[itemCode]) {
                if (String(values[i][statusIdx] || "").trim() === "") { values[i][statusIdx] = baseMap[itemCode].status; needWrite = true; }
                if (String(values[i][logisticsIdx] || "").trim() === "") { values[i][logisticsIdx] = baseMap[itemCode].logistics; needWrite = true; }
                if (String(values[i][orderIdx] || "").trim() === "") { values[i][orderIdx] = baseMap[itemCode].order; needWrite = true; }
            }

            var currentOrder = values[i][orderIdx];
            if (currentOrder !== "" && currentOrder != null && typeof currentOrder === "string" && !isNaN(currentOrder)) {
                values[i][orderIdx] = Number(currentOrder);
                needWrite = true;
            }

            if (String(values[i][orderIdx] || "").trim() !== "" && String(values[i][logisticsIdx] || "").trim() === "") {
                values[i][logisticsIdx] = 910;
                needWrite = true;
            }
        }
    }

    if (needWrite) {
        /*
         * F열 물품코드는 선행 0이 사라지지 않도록 텍스트 형식 고정.
         */
        if (
            itemCodeIdx >= 0 &&
            lastRow >= 2
        ) {
            sheet
                .getRange(
                    2,
                    itemCodeIdx + 1,
                    lastRow - 1,
                    1
                )
                .setNumberFormat('@');
        }

        fullRange.setValues(values);
    }
    
    var finalLastRow = getRealLastRow(sheet);
    var targetMax = Math.max(20, finalLastRow + 2);
    var currentMaxRows = sheet.getMaxRows();
    if (currentMaxRows > targetMax) {
        sheet.deleteRows(targetMax + 1, currentMaxRows - targetMax);
    } else if (currentMaxRows < targetMax) {
        sheet.insertRowsAfter(currentMaxRows, targetMax - currentMaxRows);
    }
    
    drawBorders(sheet, 2, maxCol);
    return needWrite;
}

// =========================================================================
// ⭐ 즉시 청소 및 숫자 강제 변환 수동 실행 함수
// =========================================================================
function forceCleanUpAllSheets() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var inputSheet = ss.getSheetByName("입력시트");
    
    if (inputSheet) {
        autoFillInputSheet(inputSheet, ss);
        refreshUnregisteredItems_(ss);
    }

    sortAndRefreshAll(ss);
    ss.toast("데이터 자동 채우기 및 정리가 완료되었습니다.", "✅ 정리 완료", 5);
}

// -------------------------------------------------------------------------
// 헬퍼 함수들 (주문내역 시트 기준 정렬 및 테두리)
// -------------------------------------------------------------------------
function sortAndRefreshAll(ss) {
    /*
     * 수동 정리 메뉴 등 다른 진입점에서도 배열 수식 확장 공간을 확보합니다.
     */
    var inputForCapacity = ss.getSheetByName("입력시트");
    var inputCapacityRows = inputForCapacity
      ? Math.max(inputForCapacity.getLastRow() + 10, 30)
      : 100;

    ensureAggregateOutputCapacity_(
      ss,
      inputCapacityRows
    );

    /*
     * v11.5:
     * 총수량 핵심 수식도 숫자/문자 물품코드를 동일한
     * 9자리 문자열로 계산하도록 1회 보정합니다.
     */
    ensureTotalQuantityCodeNormalizationV11_5_(
      ss
    );

    var orderSheet = ss.getSheetByName("주문내역");
    var pickOrderMap = {};
    if (orderSheet && orderSheet.getLastRow() > 1) {
        var headers = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
        var itemCodeIdx = headers.indexOf("물품코드");
        var orderIdx = headers.indexOf("집품순서");
        
       if (itemCodeIdx === -1) itemCodeIdx = 5;
if (orderIdx === -1) orderIdx = 14;

        var orderData = orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, orderSheet.getLastColumn()).getValues();
        for (var r = 0; r < orderData.length; r++) {
            var itemCode = String(orderData[r][itemCodeIdx] || "").trim().replace(/^0+/, ''); 
            var pickOrder = orderData[r][orderIdx]; 
            
            if (itemCode !== "" && pickOrder !== "") {
                pickOrderMap[itemCode] = pickOrder; 
            }
        }
    }

    var totalSheet = ss.getSheetByName("총수량");
    if (!totalSheet) return;

    sortSheetByOrderMap(totalSheet, pickOrderMap, false, 11);

    var masterOrderMap = {};
    var totalLastRow = getRealLastRow(totalSheet);
    if (totalLastRow > 2) {
        var valA = String(totalSheet.getRange(totalLastRow, 1).getValue()).trim();
        var valB = String(totalSheet.getRange(totalLastRow, 2).getValue()).trim();

        if (valA === "총합계" || valB === "총합계" || valA === "총계" || valB === "총계") totalLastRow--;
        
        if (totalLastRow > 2) {
            var totalItemCodes = totalSheet.getRange(3, 1, totalLastRow - 2, 1).getValues();
            for (var i = 0; i < totalItemCodes.length; i++) {
                var code = String(totalItemCodes[i][0]).trim().replace(/^0+/, '');
                if (code !== "" && masterOrderMap[code] === undefined) {
                    masterOrderMap[code] = i; 
                }
            }
        }
    }

    var courseSheets = ["31코스", "32코스", "33코스", "34코스", "35코스", "36코스"];
    for (var c = 0; c < courseSheets.length; c++) {
        var sheet = ss.getSheetByName(courseSheets[c]);
        if (sheet) {
            sortSheetByOrderMap(sheet, masterOrderMap, false, 5);
        }
    }

    /*
     * 배열 수식 계산과 테두리 처리가 끝난 뒤,
     * 총수량 및 코스 시트의 불필요한 빈 행을 제거합니다.
     */
    SpreadsheetApp.flush();
    trimAggregateOutputSheets_(ss);

    /*
     * IMP-015
     * 총수량·코스·관내·신규 출력 시트만
     * 실제 데이터 범위에 맞게 자동 조정합니다.
     */
    autoFitAggregateOutputSheets_(ss);
}

// =====================================================
// IMP-014 배열 수식 출력 시트 행 관리
// =====================================================
function getAggregateOutputSheetNames_() {
  return [
    '총수량',
    '31코스',
    '32코스',
    '33코스',
    '34코스',
    '35코스',
    '36코스',
    '관내',
    '신규'
  ];
}


// =====================================================
// 실행 전에 배열 수식이 펼쳐질 공간 확보
// 입력자료 행 수보다 10행 여유를 둔 값을 전달합니다.
// =====================================================
function ensureAggregateOutputCapacity_(
  ss,
  requiredRows
) {
  requiredRows = Math.max(
    Number(requiredRows) || 0,
    30
  );

  getAggregateOutputSheetNames_()
    .forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;

      var currentRows = sheet.getMaxRows();

      if (currentRows < requiredRows) {
        sheet.insertRowsAfter(
          currentRows,
          requiredRows - currentRows
        );
      }
    });
}


// =====================================================
// 계산 완료 후 실제 데이터가 끝나는 행에서 시트도 종료
//
// A열 또는 B열의 마지막 표시값을 기준으로 판단합니다.
// 총수량·코스 시트는 물품코드/물품명 또는 총계가
// A·B열에 있으므로 전체 열을 읽을 필요가 없습니다.
// =====================================================
function trimAggregateOutputSheets_(ss) {
  getAggregateOutputSheetNames_()
    .forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;

      var lastDataRow =
        getLastDisplayRowInColumns_(
          sheet,
          1,
          2
        );

      /*
       * 제목 2행과 A3 배열 수식 셀을 보호하기 위해
       * 최소 3행은 유지합니다.
       */
      var targetRows = Math.max(
        lastDataRow,
        3
      );

      var currentRows =
        sheet.getMaxRows();

      if (currentRows > targetRows) {
        sheet.deleteRows(
          targetRows + 1,
          currentRows - targetRows
        );
      }
    });
}


// =====================================================
// 지정 열 범위에서 마지막 표시값 행 확인
// 전체 시트 대신 A·B열만 읽어 처리량을 제한합니다.
// =====================================================
function getLastDisplayRowInColumns_(
  sheet,
  startColumn,
  columnCount
) {
  var lastRow = sheet.getLastRow();

  if (lastRow < 1) {
    return 0;
  }

  var values = sheet
    .getRange(
      1,
      startColumn,
      lastRow,
      columnCount
    )
    .getDisplayValues();

  for (
    var rowIndex = values.length - 1;
    rowIndex >= 0;
    rowIndex--
  ) {
    for (
      var columnIndex = 0;
      columnIndex < columnCount;
      columnIndex++
    ) {
      if (
        String(
          values[rowIndex][columnIndex] || ''
        ).trim() !== ''
      ) {
        return rowIndex + 1;
      }
    }
  }

  return 0;
}


// =====================================================
// IMP-015 자동 실행 대상 셀 크기 맞춤
//
// 자동 실행 대상:
// - 총수량
// - 31코스~36코스
// - 관내
// - 신규
//
// 그 외 시트는 기존 사용자 설정을 그대로 유지합니다.
// =====================================================
function autoFitAggregateOutputSheets_(ss) {
  getAggregateOutputSheetNames_()
    .forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;
      applyOutputSheetLayout_(sheet);
    });
}


// =====================================================
// 출력 시트 전용 안전 레이아웃
// =====================================================
function applyOutputSheetLayout_(sheet) {
  var sheetName = sheet.getName();
  var lastRow = sheet.getLastRow();

  if (sheetName === '총수량') {
    /*
     * v11.12
     * 총수량은 사용자가 현재 직접 맞춰둔 셀 크기를 기준으로 보존합니다.
     * 자동 갱신에서는 고정 폭을 다시 덮어쓰지 않습니다.
     * B 물품명 열만 필요한 경우 확대합니다.
     */
    ensureTotalSheetLayoutBaselineV11_12_(
      sheet
    );

    expandTotalItemNameColumnIfNeededV11_12_(
      sheet
    );

  } else if (/^3[1-6]코스$/.test(sheetName)) {
    /*
     * 총수량 시트와 동일한 가독성 기준:
     * A 물품코드, B 물품명,
     * C 수량(총수량 I열 합계 폭),
     * D 저장상태(총수량 J열 폭),
     * E 특이사항(총수량 K열 폭)
     */
    setColumnWidthsByArray_(sheet, [
      105, 285, 65, 95, 170
    ]);
  } else if (
    sheetName === '관내' ||
    sheetName === '신규'
  ) {
    safeAutoFitSheetUsedRange_(sheet, false);
  }

  if (lastRow >= 1 && lastRow <= 2000) {
    /*
     * 총수량과 코스 시트의 행 높이를 동일하게 유지합니다.
     * 제목행 1~2행은 28px, 데이터행은 24px입니다.
     */
    if (
      /^3[1-6]코스$/.test(sheetName)
    ) {
      if (lastRow >= 1) {
        sheet.setRowHeight(1, 28);
      }

      if (lastRow >= 2) {
        sheet.setRowHeight(2, 28);
      }

      if (lastRow >= 3) {
        sheet.setRowHeights(
          3,
          lastRow - 2,
          24
        );
      }
    } else if (
      sheetName !== '총수량'
    ) {
      sheet.autoResizeRows(1, lastRow);
    }
  }

  return true;
}


// =====================================================
// v11.12 총수량 현재 셀 크기 기준 저장
//
// 최초 실행 시점의 사용자가 직접 맞춰둔 상태를 기준값으로 저장합니다.
// A:K 열 폭, 1행/2행, 대표 데이터행(3행) 높이를 저장합니다.
// =====================================================
function ensureTotalSheetLayoutBaselineV11_12_(
    sheet
) {
    if (
        !sheet ||
        sheet.getName() !== '총수량'
    ) {
        return null;
    }

    var props =
        PropertiesService
        .getDocumentProperties();

    var key =
        'TOTAL_LAYOUT_BASELINE_V1112';

    var raw =
        props.getProperty(
            key
        );

    if (raw) {
        try {
            return JSON.parse(
                raw
            );
        } catch (ignore) {}
    }

    var widths = [];

    for (
        var column = 1;
        column <= 11;
        column++
    ) {
        widths.push(
            sheet.getColumnWidth(
                column
            )
        );
    }

    var baseline = {
        widths:
            widths,
        row1:
            sheet.getRowHeight(1),
        row2:
            sheet.getRowHeight(2),
        dataRow:
            sheet.getMaxRows() >= 3
                ? sheet.getRowHeight(3)
                : 24,
        savedAt:
            Date.now()
    };

    props.setProperty(
        key,
        JSON.stringify(
            baseline
        )
    );

    return baseline;
}


// =====================================================
// 사용자가 현재 맞춰둔 총수량 셀 크기를 새 기준으로 다시 저장
//
// 메뉴/스크립트에서 필요할 때 한 번 실행하면 됩니다.
// =====================================================
function saveCurrentTotalSheetLayoutAsBaselineV11_12() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName(
            '총수량'
        );

    if (!sheet) {
        throw new Error(
            '총수량 시트를 찾을 수 없습니다.'
        );
    }

    var props =
        PropertiesService
        .getDocumentProperties();

    props.deleteProperty(
        'TOTAL_LAYOUT_BASELINE_V1112'
    );

    var baseline =
        ensureTotalSheetLayoutBaselineV11_12_(
            sheet
        );

    ss.toast(
        '현재 총수량 시트의 셀 크기를 기준값으로 저장했습니다.',
        '✅ 총수량 기준 저장',
        5
    );

    return baseline;
}


// =====================================================
// 총수량 기준 셀 크기 복원
//
// A:K 폭은 저장 기준으로 복원.
// 행 높이는 1행/2행 및 데이터행 기준으로 복원합니다.
// =====================================================
function restoreTotalSheetLayoutBaselineV11_12_(
    sheet
) {
    var baseline =
        ensureTotalSheetLayoutBaselineV11_12_(
            sheet
        );

    if (
        !baseline ||
        !baseline.widths
    ) {
        return false;
    }

    for (
        var column = 1;
        column <= baseline.widths.length &&
        column <= sheet.getMaxColumns();
        column++
    ) {
        sheet.setColumnWidth(
            column,
            Number(
                baseline.widths[
                    column - 1
                ]
            )
        );
    }

    if (sheet.getMaxRows() >= 1) {
        sheet.setRowHeight(
            1,
            Number(
                baseline.row1
            )
        );
    }

    if (sheet.getMaxRows() >= 2) {
        sheet.setRowHeight(
            2,
            Number(
                baseline.row2
            )
        );
    }

    var lastRow =
        Math.min(
            getRealLastRow(
                sheet
            ),
            sheet.getMaxRows()
        );

    if (
        lastRow >= 3 &&
        Number(
            baseline.dataRow
        ) > 0
    ) {
        sheet.setRowHeights(
            3,
            lastRow - 2,
            Number(
                baseline.dataRow
            )
        );
    }

    return true;
}


// =====================================================
// 총수량 B열 물품명만 필요할 때 확장
//
// - 기준 폭보다 절대 작아지지 않음
// - 텍스트가 현재 폭을 초과할 때만 setColumnWidth 1회
// - 전체 autoResizeColumns/Rows 사용 안 함
// - 기본 최대폭 560px
// =====================================================
function expandTotalItemNameColumnIfNeededV11_12_(
    sheet,
    forceCheck
) {
    if (
        !sheet ||
        sheet.getName() !== '총수량'
    ) {
        return false;
    }

    var baseline =
        ensureTotalSheetLayoutBaselineV11_12_(
            sheet
        );

    if (
        !baseline ||
        !baseline.widths ||
        baseline.widths.length < 2
    ) {
        return false;
    }

    var lastRow =
        getRealLastRow(
            sheet
        );

    var baseWidth =
        Number(
            baseline.widths[1]
        ) || sheet.getColumnWidth(2);

    var currentWidth =
        sheet.getColumnWidth(2);

    /*
     * 데이터가 없으면 사용자가 저장한 기준폭만 보장합니다.
     */
    if (lastRow < 3) {
        if (
            currentWidth < baseWidth
        ) {
            sheet.setColumnWidth(
                2,
                baseWidth
            );
            return true;
        }

        return false;
    }

    /*
     * B3:B만 읽습니다.
     * 총수량 전체 11개 열 자동맞춤보다 매우 가볍습니다.
     */
    var names =
        sheet
        .getRange(
            3,
            2,
            lastRow - 2,
            1
        )
        .getDisplayValues();

    var requiredWidth =
        baseWidth;

    for (
        var i = 0;
        i < names.length;
        i++
    ) {
        var name =
            String(
                names[i][0] || ''
            );

        if (
            name === '' ||
            name === '총계' ||
            name === '총합계'
        ) {
            continue;
        }

        requiredWidth =
            Math.max(
                requiredWidth,
                estimateTextPixelWidth_(
                    name
                ) + 30
            );
    }

    requiredWidth =
        Math.min(
            requiredWidth,
            560
        );

    if (
        forceCheck ||
        requiredWidth >
            currentWidth + 6 ||
        currentWidth <
            baseWidth
    ) {
        var targetWidth =
            Math.max(
                baseWidth,
                requiredWidth
            );

        if (
            Math.abs(
                targetWidth -
                currentWidth
            ) > 6
        ) {
            sheet.setColumnWidth(
                2,
                targetWidth
            );

            return true;
        }
    }

    return false;
}


// =====================================================
// 입력 후 비동기 총수량 B열 폭 점검
// 설치형 onEdit에서 호출되어 사용자 입력 대기시간에 포함되지 않습니다.
// =====================================================
function asyncFitTotalItemNameColumnV11_12_(
    ss
) {
    try {
        var totalSheet =
            ss.getSheetByName(
                '총수량'
            );

        if (!totalSheet) {
            return false;
        }

        return expandTotalItemNameColumnIfNeededV11_12_(
            totalSheet
        );

    } catch (error) {
        console.error(
            '총수량 B열 비동기 폭 점검 실패: ' +
            error.message
        );

        return false;
    }
}


function setColumnWidthsByArray_(sheet, widths) {
  var maxColumns = sheet.getMaxColumns();

  for (
    var index = 0;
    index < widths.length &&
    index < maxColumns;
    index++
  ) {
    sheet.setColumnWidth(
      index + 1,
      widths[index]
    );
  }
}


// =====================================================
// 실제 사용 범위의 열 너비·행 높이 자동 맞춤
//
// force:
// - false: 같은 행·열 구조면 반복 실행 생략
// - true : 메뉴에서 수동 실행할 때 강제로 다시 맞춤
// =====================================================
function safeAutoFitSheetUsedRange_(
  sheet,
  force
) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return false;
  }

  var propertyKey =
    'AUTOFIT_V7_' + sheet.getSheetId();

  var currentSignature =
    lastRow + '|' + lastColumn;

  var properties =
    PropertiesService.getDocumentProperties();

  if (
    !force &&
    properties.getProperty(propertyKey) ===
      currentSignature
  ) {
    return false;
  }

  var originalWidths = [];

  for (
    var column = 1;
    column <= lastColumn;
    column++
  ) {
    originalWidths.push(
      sheet.getColumnWidth(column)
    );
  }

  sheet.autoResizeColumns(
    1,
    lastColumn
  );

  for (
    var fitColumn = 1;
    fitColumn <= lastColumn;
    fitColumn++
  ) {
    var fittedWidth =
      sheet.getColumnWidth(fitColumn);

    var preservedWidth =
      Math.max(
        originalWidths[fitColumn - 1],
        fittedWidth
      );

    preservedWidth =
      Math.min(
        preservedWidth,
        320
      );

    sheet.setColumnWidth(
      fitColumn,
      preservedWidth
    );
  }

  if (lastRow <= 2000) {
    sheet.autoResizeRows(
      1,
      lastRow
    );
  }

  properties.setProperty(
    propertyKey,
    currentSignature
  );

  return true;
}


// =====================================================
// 현재 보고 있는 시트만 강제 자동 맞춤
// 입력시트는 보호합니다.
// =====================================================
function autoFitCurrentSheetFromMenu_() {
  var ss =
    SpreadsheetApp.getActiveSpreadsheet();

  var sheet =
    ss.getActiveSheet();

  if (
    !sheet ||
    sheet.getName() === '입력시트'
  ) {
    ss.toast(
      '입력시트는 자동 맞춤 대상에서 제외됩니다.',
      '셀 서식 일괄 정렬',
      5
    );
    return;
  }

  if (
    sheet.getName() === '총수량'
  ) {
    /*
     * v11.12:
     * 현재 총수량 시트에서 저장한 기준 폭/행높이를 먼저 복원하고,
     * B 물품명 열만 실제 텍스트가 넘칠 때 확장합니다.
     */
    restoreTotalSheetLayoutBaselineV11_12_(
      sheet
    );

    expandTotalItemNameColumnIfNeededV11_12_(
      sheet,
      true
    );

  } else {
    fastFitSheetUsedRange_(
      sheet,
      {
        maxSampleRows: 1000,
        maxColumns: 40,
        horizontalPadding: 24,
        maximumColumnWidth: 320,
        rowHeightMultiplier: 1.5,
        maximumRowsForHeight: 3000
      }
    );
  }

  ss.toast(
    sheet.getName() +
      ' 시트의 셀 크기를 자동 맞춤했습니다.',
    '셀 서식 일괄 정렬',
    5
  );
}


// =====================================================
// 입력시트를 제외한 전체 시트 수동 자동 맞춤
//
// 숨김 시트도 포함합니다.
// 대형 시트는 열 너비만 조정하고,
// 2,000행 이하 시트는 행 높이도 조정합니다.
// =====================================================
function autoFitAllSheetsExceptInputFromMenu_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var startedAt = Date.now();
  var processedCount = 0;
  var expandedColumnCount = 0;

  ss.getSheets().forEach(function(sheet) {
    if (
      sheet.getName() === '입력시트' ||
      sheet.isSheetHidden()
    ) {
      return;
    }

    var result = fastFitSheetUsedRange_(
      sheet,
      {
        maxSampleRows: 500,
        maxColumns: 30,
        horizontalPadding: 24,
        maximumColumnWidth: 320,
        rowHeightMultiplier: 1.5,
        maximumRowsForHeight: 2000
      }
    );

    if (result.processed) {
      processedCount++;
      expandedColumnCount += result.expandedColumns;
    }
  });

  var elapsedSeconds =
    ((Date.now() - startedAt) / 1000).toFixed(1);

  ss.toast(
    processedCount +
      '개 시트를 빠르게 점검했습니다.\\n' +
      expandedColumnCount +
      '개 열만 확장했습니다.\\n' +
      '소요시간: ' +
      elapsedSeconds +
      '초',
    '빠른 셀 크기 맞춤 완료',
    8
  );
}


// =====================================================
// 빠른 셀 크기 맞춤
// =====================================================
function fastFitSheetUsedRange_(sheet, options) {
  options = options || {};

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return {
      processed: false,
      expandedColumns: 0
    };
  }

  var sampleRowCount = Math.min(
    lastRow,
    Number(options.maxSampleRows) || 500
  );

  var checkedColumnCount = Math.min(
    lastColumn,
    Number(options.maxColumns) || 30
  );

  var horizontalPadding =
    Number(options.horizontalPadding) || 24;

  var maximumColumnWidth =
    Number(options.maximumColumnWidth) || 320;

  var values = sheet
    .getRange(
      1,
      1,
      sampleRowCount,
      checkedColumnCount
    )
    .getDisplayValues();

  var expandedColumns = 0;

  for (
    var columnIndex = 0;
    columnIndex < checkedColumnCount;
    columnIndex++
  ) {
    var requiredWidth = 0;

    for (
      var rowIndex = 0;
      rowIndex < values.length;
      rowIndex++
    ) {
      var value = String(
        values[rowIndex][columnIndex] || ''
      );

      if (value === '') continue;

      requiredWidth = Math.max(
        requiredWidth,
        estimateTextPixelWidth_(value) +
          horizontalPadding
      );
    }

    if (requiredWidth <= 0) continue;

    var columnNumber = columnIndex + 1;
    var currentWidth =
      sheet.getColumnWidth(columnNumber);

    if (requiredWidth > currentWidth + 6) {
      sheet.setColumnWidth(
        columnNumber,
        Math.min(
          requiredWidth,
          maximumColumnWidth
        )
      );
      expandedColumns++;
    }
  }

  var maximumRowsForHeight =
    Number(options.maximumRowsForHeight) ||
    2000;

  if (lastRow <= maximumRowsForHeight) {
    var baseRow = Math.min(
      Math.max(
        sheet.getFrozenRows() + 1,
        1
      ),
      lastRow
    );

    var currentHeight =
      sheet.getRowHeight(baseRow);

    var targetHeight = Math.min(
      45,
      Math.max(
        24,
        Math.round(
          currentHeight *
          (
            Number(
              options.rowHeightMultiplier
            ) || 1.5
          )
        )
      )
    );

    sheet.setRowHeights(
      1,
      lastRow,
      targetHeight
    );
  }

  return {
    processed: true,
    expandedColumns: expandedColumns
  };
}


function estimateTextPixelWidth_(text) {
  var width = 0;

  for (
    var index = 0;
    index < text.length;
    index++
  ) {
    var character = text.charAt(index);
    var code = text.charCodeAt(index);

    if (code >= 0x2E80) {
      width += 14;
    } else if (/[A-Z0-9]/.test(character)) {
      width += 8;
    } else if (/[a-z]/.test(character)) {
      width += 7;
    } else {
      width += 5;
    }
  }

  return width;
}


// =====================================================
// 자동 맞춤 캐시 초기화
// =====================================================
function resetAutoFitCache_() {
  var properties =
    PropertiesService.getDocumentProperties();

  properties.getKeys()
    .filter(function(key) {
      return (
        key.indexOf('AUTOFIT_V5_') === 0 ||
        key.indexOf('AUTOFIT_V6_') === 0 ||
        key.indexOf('AUTOFIT_V7_') === 0
      );
    })
    .forEach(function(key) {
      properties.deleteProperty(key);
    });

  return true;
}


function sortSheetByOrderMap(sheet, orderMap, isDescending, numCols) {
    var maxRows = sheet.getMaxRows();
    if (maxRows < 3) return; 

    var a3Formula = sheet.getRange(3, 1).getFormula();
    if (a3Formula !== "") {
        drawBorders(sheet, 3, numCols);
        return; 
    }

    var lastDataRow = getRealLastRow(sheet);
    if (lastDataRow > 2) {
        var valA = String(sheet.getRange(lastDataRow, 1).getValue()).trim();
        var valB = String(sheet.getRange(lastDataRow, 2).getValue()).trim();
        if (valA === "총합계" || valB === "총합계" || valA === "총계" || valB === "총계") {
            lastDataRow--;
        }
        
        if (lastDataRow > 2) {
            var numRows = lastDataRow - 2;
            var fullRange = sheet.getRange(3, 1, numRows, numCols);
            var fullValues = fullRange.getValues();
            var rowsToDelete = [];
            
            for (var i = numRows - 1; i >= 0; i--) {
                if (String(fullValues[i][0]).trim() === "" && String(fullValues[i][1]).trim() === "") {
                    rowsToDelete.push(i + 3); 
                }
            }
            
            for (var r = 0; r < rowsToDelete.length; r++) {
                sheet.deleteRow(rowsToDelete[r]);
            }
            
            lastDataRow = getRealLastRow(sheet);
            valA = String(sheet.getRange(lastDataRow, 1).getValue()).trim();
            valB = String(sheet.getRange(lastDataRow, 2).getValue()).trim();
            if (valA === "총합계" || valB === "총합계" || valA === "총계" || valB === "총계") lastDataRow--;
            
            if (lastDataRow > 2) {
                numRows = lastDataRow - 2;
                var tempCol = numCols + 1; 
                
                if (sheet.getMaxColumns() < tempCol) {
                    sheet.insertColumnAfter(sheet.getMaxColumns());
                }

                var sheetItemCodes = sheet.getRange(3, 1, numRows, 1).getValues();
                var tempValues = [];
                
                for (var j = 0; j < sheetItemCodes.length; j++) {
                    var code = String(sheetItemCodes[j][0]).trim().replace(/^0+/, '');
                    var orderVal;
                    
                    if (code === "") {
                        orderVal = isDescending ? -99999999 : "\uFFFF"; 
                    } else {
                        orderVal = orderMap[code];
                        if (orderVal === undefined || orderVal === "") {
                            orderVal = isDescending ? -88888888 : "\uFFFE"; 
                        }
                    }
                    tempValues.push([orderVal]);
                }
                
                sheet.getRange(3, tempCol, numRows, 1).setValues(tempValues);
                
                sheet.getRange(3, 1, numRows, tempCol).sort([
                    {column: tempCol, ascending: !isDescending}, 
                    {column: 1, ascending: true} 
                ]);
                
                sheet.getRange(3, tempCol, numRows, 1).clearContent();
            }
        }
    }
    
    var currentLastRow = getRealLastRow(sheet);
    var targetMax = Math.max(20, currentLastRow + 2);
    maxRows = sheet.getMaxRows();
    if (maxRows > targetMax) {
        sheet.deleteRows(targetMax + 1, maxRows - targetMax);
    } else if (maxRows < targetMax) {
        sheet.insertRowsAfter(maxRows, targetMax - maxRows);
    }

    drawBorders(sheet, 3, numCols);
}

function getRealLastRow(sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) return 0;
    var maxCols = sheet.getLastColumn();
    if (maxCols === 0) return lastRow;
    var rangeData = sheet.getRange(1, 1, lastRow, maxCols).getValues();
    for (var i = rangeData.length - 1; i >= 0; i--) {
        for (var j = 0; j < maxCols; j++) {
            var val = rangeData[i][j];
            if (val !== "" && val != null && val.toString().trim() !== "") {
                return i + 1;
            }
        }
    }
    return 0;
}

// =====================================================
// IMP-013 테두리 처리 최적화
// =====================================================
function drawBorders(sheet, startRow, numCols) {
  if (!sheet || startRow < 1 || numCols < 1) return false;

  var lastDataRow = Math.max(0, sheet.getLastRow());
  var maxRows = sheet.getMaxRows();
  var propertyKey =
    'BORDER_RANGE_V3_' +
    sheet.getSheetId() +
    '_' +
    startRow +
    '_' +
    numCols;

  var properties = PropertiesService.getDocumentProperties();
  var previousValue = properties.getProperty(propertyKey) || '';
  var currentValue = lastDataRow + '|' + maxRows;

  if (previousValue === currentValue) {
    return false;
  }

  var previousParts = previousValue.split('|');
  var previousLastRow = Number(previousParts[0]) || 0;

  if (previousLastRow >= startRow && previousLastRow > lastDataRow) {
    var clearStartRow =
      lastDataRow >= startRow ? lastDataRow + 1 : startRow;
    var clearRowCount =
      previousLastRow - Math.max(lastDataRow, startRow - 1);

    if (clearRowCount > 0) {
      sheet
        .getRange(clearStartRow, 1, clearRowCount, numCols)
        .setBorder(false, false, false, false, false, false);
    }
  }

  if (lastDataRow >= startRow) {
    sheet
      .getRange(startRow, 1, lastDataRow - startRow + 1, numCols)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        '#000000',
        SpreadsheetApp.BorderStyle.SOLID
      );
  }

  properties.setProperty(propertyKey, currentValue);
  return true;
}

function updateInsights(ss) {
    // v11.6: 입력 onEdit 경로에서 이미 필요한 flush를 수행합니다.
    return;
}


// =====================================================
// 기초시트 행 이동 사이드바
// =====================================================

// 이동할 원본 행을 기억할 속성 이름
var BASIC_MOVE_SOURCE_KEY = 'BASIC_MOVE_SOURCE_ROW';


function showBasicMoveSidebar() {
    var html = HtmlService
        .createHtmlOutputFromFile('기초행이동')
        .setTitle('기초자료 행 이동');

    SpreadsheetApp.getUi().showSidebar(html);
}




// =====================================================
// 현재 체크된 미등록 이동대상 목록
// T열 체크박스 / U열 실제 원본 행
// =====================================================
function getSelectedBasicMoveSources_(
    sheet
) {
    var startRow = 3;
    var maxRows = Math.min(
        500,
        Math.max(
            1,
            sheet.getMaxRows() - startRow + 1
        )
    );

    var displayData = sheet.getRange(
        startRow,
        20,
        maxRows,
        2
    ).getValues();

    var selected = [];

    for (
        var i = 0;
        i < displayData.length;
        i++
    ) {
        if (
            displayData[i][0] === true &&
            Number(displayData[i][1]) >= 3
        ) {
            selected.push({
                displayRow: startRow + i,
                actualRow:
                    Number(displayData[i][1])
            });
        }
    }

    return selected;
}



// =====================================================
// 사이드바 로컬 검색용 기초자료 목록
//
// 사이드바를 열 때 한 번만 전달합니다.
// 검색할 때마다 시트를 다시 읽지 않습니다.
// =====================================================
function getBasicSearchDatasetForSidebar_() {
    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (!sheet) {
        return [];
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (lastRow < 3) {
        return [];
    }

    var data = sheet.getRange(
        3,
        1,
        lastRow - 2,
        7
    ).getDisplayValues();

    var items = [];

    for (
        var i = 0;
        i < data.length;
        i++
    ) {
        var code =
            String(data[i][0] || '')
            .trim();

        var name =
            String(data[i][1] || '')
            .trim();

        if (
            code === '' &&
            name === ''
        ) {
            continue;
        }

        items.push({
            row: i + 3,
            code: code,
            name: name,
            status:
                String(data[i][3] || '')
                .trim(),
            logistics:
                String(data[i][5] || '')
                .trim(),
            order:
                String(data[i][6] || '')
                .trim()
        });
    }

    return items;
}



// =====================================================
// 사이드바 검색어를 기초시트 I2에 동기화
//
// 검색 결과는 I5의 FILTER 수식이 자동 표시합니다.
// I2 한 셀만 기록하므로 부하는 매우 작습니다.
// =====================================================
function syncBasicSheetSearchQueryFromSidebar(
    queryText
) {
    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (!sheet) {
        return {
            success: false
        };
    }

    var query =
        String(
            queryText == null
                ? ''
                : queryText
        ).trim();

    var current =
        String(
            sheet.getRange('I2')
            .getDisplayValue() || ''
        ).trim();

    if (current !== query) {
        sheet.getRange('I2')
            .setValue(query);
    }

    return {
        success: true,
        query: query
    };
}



// =====================================================
// 기초시트에서 현재 선택한 검색 결과를 이동 위치로 가져오기
//
// 셀 선택 시에는 아무 작업도 하지 않습니다.
// 사이드바 버튼을 눌렀을 때만 한 번 실행됩니다.
// =====================================================
function getSelectedBasicSearchResultForSidebar() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getActiveSheet();

    if (
        !sheet ||
        sheet.getName() !== '기초'
    ) {
        throw new Error(
            '기초시트의 검색 결과 행을 먼저 선택하세요.'
        );
    }

    var range =
        sheet.getActiveRange();

    if (!range) {
        throw new Error(
            '검색 결과 행을 먼저 선택하세요.'
        );
    }

    var selectedRow =
        range.getRow();

    var selectedColumn =
        range.getColumn();

    /*
     * 검색 결과 영역: I5:M34
     */
    if (
        selectedRow < 5 ||
        selectedRow > 34 ||
        selectedColumn < 9 ||
        selectedColumn > 13
    ) {
        throw new Error(
            '물품코드 또는 물품명 찾기의 ' +
            '검색 결과 I:M 영역에서 원하는 물품을 선택하세요.'
        );
    }

    var result =
        sheet.getRange(
            selectedRow,
            9,
            1,
            5
        ).getDisplayValues()[0];

    var code =
        String(result[0] || '').trim();

    var name =
        String(result[1] || '').trim();

    if (
        code === '' &&
        name === ''
    ) {
        throw new Error(
            '선택한 검색 결과 행에 물품이 없습니다.'
        );
    }

    var actualRow =
        findBasicRowByCode_(
            sheet,
            code
        );

    if (actualRow < 3) {
        throw new Error(
            '선택한 물품의 원본 행을 찾을 수 없습니다.'
        );
    }

    var original =
        sheet.getRange(
            actualRow,
            1,
            1,
            7
        ).getDisplayValues()[0];

    return {
        valid: true,
        row: actualRow,
        code: original[0],
        name: original[1],
        status: original[3],
        logistics: original[5],
        order: original[6],
        message:
            original[1] +
            ' 아래를 이동 위치로 선택했습니다.'
    };
}



// =====================================================
// 사이드바에서 기초시트 3행으로 이동
// =====================================================
function focusBasicTopRowFromSidebar() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    ss.setActiveSheet(sheet);

    sheet.setActiveSelection(
        sheet.getRange(
            3,
            1,
            1,
            7
        )
    );

    return {
        success: true,
        row: 3,
        message:
            '기초시트 3행의 A:G을 선택했습니다.'
    };
}


// =====================================================
// 사이드바용 통합 상태
// =====================================================
function getBasicMoveSidebarState() {
    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    var selectedItems = [];

    if (sheet) {
        var selectedSources =
            getSelectedBasicMoveSources_(
                sheet
            );

        for (
            var i = 0;
            i < selectedSources.length;
            i++
        ) {
            var row =
                selectedSources[i].actualRow;

            var values =
                sheet.getRange(
                    row,
                    1,
                    1,
                    2
                ).getDisplayValues()[0];

            selectedItems.push({
                row: row,
                code:
                    String(values[0] || '')
                    .trim(),
                name:
                    String(values[1] || '')
                    .trim()
            });
        }
    }

    return {
        destination:
            getBasicMoveDestinationForSidebar_(),
        unregistered:
            getBasicUnregisteredItemsForSidebar(),
        searchItems:
            getBasicSearchDatasetForSidebar_(),
        selectedSources:
            selectedItems,
        sheetQuery:
            sheet
                ? String(
                    sheet.getRange('I2')
                    .getDisplayValue() || ''
                ).trim()
                : ''
    };
}


// =====================================================
// 사이드바용 미등록 물품 목록
// 물품코드, 물품명, 이동대상 선택 상태만 반환
// =====================================================
function getBasicUnregisteredItemsForSidebar() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    if (!sheet) {
        return [];
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (lastRow < 3) {
        return [];
    }

    var data = sheet.getRange(
        3,
        1,
        lastRow - 2,
        7
    ).getDisplayValues();

    var items = [];

    for (
        var i = 0;
        i < data.length;
        i++
    ) {
        var code =
            String(data[i][0] || '')
            .trim();

        var name =
            String(data[i][1] || '')
            .trim();

        var status =
            String(data[i][3] || '')
            .trim();

        if (
            status === '미등록' &&
            (code !== '' || name !== '')
        ) {
            items.push({
                row: i + 3,
                code: code,
                name: name,
                selected: false
            });
        }
    }

    return items;
}


// =====================================================
// 사이드바 검색
// 기초시트 I2와 동일한 검색 결과를 사용
// =====================================================
function searchBasicItemsForSidebar(
    queryText
) {
    /*
     * 사이드바 검색은 브라우저 로컬 데이터로 처리합니다.
     * 이 함수는 이전 HTML과의 호환만 유지합니다.
     */
    return {
        success: true,
        message:
            '사이드바 로컬 검색을 사용하세요.',
        items: []
    };
}


// =====================================================
// 검색 결과 행을 기초시트에서 선택
// =====================================================
function focusBasicRowFromSidebar(
    rowNumber
) {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    var row =
        Number(rowNumber);

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (
        row < 3 ||
        row > lastRow
    ) {
        throw new Error(
            '선택할 기초자료 행을 찾을 수 없습니다.'
        );
    }

    ss.setActiveSheet(sheet);

    /*
     * 조건부서식 없이 A:G 전체를 선택해
     * 즉시 기본 선택 표시가 나타나도록 합니다.
     */
    sheet.setActiveSelection(
        sheet.getRange(
            row,
            1,
            1,
            7
        )
    );

    return {
        success: true,
        row: row,
        message:
            row +
            '행의 A:G을 선택했습니다.'
    };
}


// =====================================================
// 실제 행을 이동 대상으로 선택하고
// 기초시트 미등록 T열 체크와 동기화
// =====================================================
function saveBasicMoveSourceByRow(
    rowNumber,
    isSelected
) {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    var row =
        Number(rowNumber);

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (
        row < 3 ||
        row > lastRow
    ) {
        throw new Error(
            '이동 대상으로 지정할 행을 찾을 수 없습니다.'
        );
    }

    var actualRows = sheet.getRange(
        3,
        21,
        Math.min(
            500,
            Math.max(
                1,
                sheet.getMaxRows() - 2
            )
        ),
        1
    ).getValues();

    var displayRow = 0;

    for (
        var i = 0;
        i < actualRows.length;
        i++
    ) {
        if (
            Number(actualRows[i][0]) ===
            row
        ) {
            displayRow = i + 3;
            break;
        }
    }

    if (!displayRow) {
        throw new Error(
            '미등록 표시 영역에서 해당 물품을 찾을 수 없습니다.'
        );
    }

    var checkboxCell =
        sheet.getRange(
            displayRow,
            20
        );

    if (
        !checkboxCell.getDataValidation()
    ) {
        throw new Error(
            '이동대상 체크박스를 찾을 수 없습니다.'
        );
    }

    if (isSelected === false) {
        checkboxCell.uncheck();
    } else {
        checkboxCell.check();
    }

    var source =
        getBasicMoveSource();

    return {
        valid: source.valid,
        count: source.count || 0,
        items: source.items || [],
        message:
            source.valid
                ? source.message
                : '이동대상 선택을 해제했습니다.',
        source: source
    };
}


// =====================================================
// 사이드바 검색 결과를 이동 위치로 선택하고
// 기초시트 N열 체크와 동기화
// =====================================================
function selectBasicDestinationByRowFromSidebar(
    rowNumber
) {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    var row =
        Number(rowNumber);

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (
        row < 3 ||
        row > lastRow
    ) {
        throw new Error(
            '이동 위치로 지정할 행을 찾을 수 없습니다.'
        );
    }

    PropertiesService
        .getUserProperties()
        .setProperty(
            'BASIC_MOVE_DESTINATION_ROW',
            String(row)
        );

    /*
     * 검색 결과의 N열 체크박스만 동기화합니다.
     * 검색을 다시 실행하거나 열 너비를 변경하지 않습니다.
     */
    syncBasicDestinationCheckboxByActualRow_(
        sheet,
        row
    );

    var values =
        sheet.getRange(
            row,
            1,
            1,
            7
        ).getDisplayValues()[0];

    return {
        success: true,
        destination: {
            row: row,
            code: values[0],
            name: values[1]
        },
        message:
            values[1] +
            ' 아래를 이동 위치로 선택했습니다.'
    };
}



// =====================================================
// 현재 이동대상 실제 행 확인
// =====================================================
function resolveBasicMoveSourceRow_(
    sheet
) {
    var properties = PropertiesService.getUserProperties();
    var savedRow = Number(
        properties.getProperty(
            BASIC_MOVE_SOURCE_KEY
        )
    );
    var lastDataRow = getLastBasicDataRow_(sheet);

    if (
        savedRow >= 3 &&
        savedRow <= lastDataRow
    ) {
        return savedRow;
    }

    var startRow = 3;
    var maxCheckRows = Math.min(
        500,
        Math.max(
            1,
            sheet.getMaxRows() - startRow + 1
        )
    );
    var displayData = sheet.getRange(
        startRow,
        20,
        maxCheckRows,
        2
    ).getValues();
    var selectedActualRow = 0;

    for (var i = 0; i < displayData.length; i++) {
        if (
            displayData[i][0] === true &&
            Number(displayData[i][1]) >= 3
        ) {
            selectedActualRow = Number(displayData[i][1]);
        }
    }

    if (selectedActualRow >= 3) {
        properties.setProperty(
            BASIC_MOVE_SOURCE_KEY,
            String(selectedActualRow)
        );
        syncBasicSourceCheckboxExistingRows_(
            sheet,
            selectedActualRow
        );
        return selectedActualRow;
    }

    return 0;
}



// =====================================================
// 물품코드로 현재 기초자료 행 찾기
// =====================================================
function findBasicRowByCode_(
    sheet,
    itemCode
) {
    var normalizedCode =
        normalizeItemCode_(itemCode);

    if (normalizedCode === '') {
        return 0;
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (lastRow < 3) {
        return 0;
    }

    var codes =
        sheet.getRange(
            3,
            1,
            lastRow - 2,
            1
        ).getDisplayValues();

    for (
        var i = 0;
        i < codes.length;
        i++
    ) {
        if (
            normalizeItemCode_(
                codes[i][0]
            ) === normalizedCode
        ) {
            return i + 3;
        }
    }

    return 0;
}


// =====================================================
// 실제 원본 행의 A:G만 목적지 아래로 이동
//
// 전체 시트 행을 삽입·삭제하지 않으므로
// I열 이후 검색·미등록 영역과 행·열 크기는 유지됩니다.
// =====================================================
function moveBasicDataCellsBelowRow_(
    sheet,
    sourceRow,
    destinationRow
) {
    sourceRow = Number(sourceRow);
    destinationRow = Number(destinationRow);

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (
        sourceRow < 3 ||
        sourceRow > lastRow
    ) {
        throw new Error(
            '이동할 원본 자료 행을 찾을 수 없습니다.'
        );
    }

    if (
        destinationRow < 3 ||
        destinationRow > lastRow
    ) {
        throw new Error(
            '이동할 위치의 자료 행을 찾을 수 없습니다.'
        );
    }

    if (sourceRow === destinationRow) {
        throw new Error(
            '이동대상과 이동 위치가 같은 행입니다.'
        );
    }

    var originalStatus =
        String(
            sheet.getRange(
                sourceRow,
                4
            ).getDisplayValue() || ''
        ).trim();

    var destinationStatus =
        String(
            sheet.getRange(
                destinationRow,
                4
            ).getDisplayValue() || ''
        ).trim();

    if (destinationStatus === '') {
        throw new Error(
            '이동 위치의 저장상태가 비어 있습니다.'
        );
    }

    var insertedRow =
        destinationRow + 1;

    /*
     * A:G 범위에만 빈 셀 한 행을 삽입합니다.
     */
    sheet.getRange(
        insertedRow,
        1,
        1,
        7
    ).insertCells(
        SpreadsheetApp.Dimension.ROWS
    );

    var sourceRowAfterInsert =
        sourceRow;

    if (destinationRow < sourceRow) {
        sourceRowAfterInsert =
            sourceRow + 1;
    }

    var sourceRange =
        sheet.getRange(
            sourceRowAfterInsert,
            1,
            1,
            7
        );

    var targetRange =
        sheet.getRange(
            insertedRow,
            1,
            1,
            7
        );

    sourceRange.copyTo(
        targetRange,
        SpreadsheetApp.CopyPasteType.PASTE_NORMAL,
        false
    );

    /*
     * 원본 A:G 셀만 삭제하고 아래 자료를 위로 당깁니다.
     */
    sourceRange.deleteCells(
        SpreadsheetApp.Dimension.ROWS
    );

    var finalRow =
        sourceRow < destinationRow
            ? destinationRow
            : destinationRow + 1;

    /*
     * 목적지의 저장상태 적용,
     * 원본 물류지 F열은 copyTo로 그대로 유지,
     * 집품순서 G열은 재번호를 위해 비웁니다.
     */
    sheet.getRange(
        finalRow,
        4
    ).setValue(
        destinationStatus
    );

    sheet.getRange(
        finalRow,
        7
    ).clearContent();

    renumberBasicGroup(
        sheet,
        destinationStatus
    );

    if (
        originalStatus !== '' &&
        originalStatus !==
            destinationStatus
    ) {
        renumberBasicGroup(
            sheet,
            originalStatus
        );
    }

    return {
        success: true,
        movedRow: finalRow
    };
}



// =====================================================
// 저장상태별 집품순서와 결합열을 배열에서 재계산
// =====================================================
function rebuildBasicRowsInMemory_(
    rows
) {
    var counters = {};

    for (
        var i = 0;
        i < rows.length;
        i++
    ) {
        var row = rows[i];

        var code =
            String(row[0] || '').trim();

        var name =
            String(row[1] || '').trim();

        if (
            code === '' &&
            name === ''
        ) {
            continue;
        }

        var status =
            String(row[3] || '').trim();

        if (status === '') {
            row[4] = '';
            row[6] = '';
            continue;
        }

        if (!counters[status]) {
            counters[status] = 0;
        }

        counters[status]++;

        row[6] =
            counters[status];

        row[4] =
            status +
            counters[status];
    }

    return rows;
}


// =====================================================
// 사이드바 선택 목록을 한 번에 이동
//
// sourceCodes: 선택된 미등록 물품코드 배열
// destinationCode: 이동 위치 물품코드
//
// A:G을 한 번 읽고, 메모리에서 재배치한 뒤,
// A:G을 한 번만 기록합니다.
// =====================================================
function moveBasicItemsBatchFromSidebar(
    sourceCodes,
    destinationCode,
    searchQuery
) {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    if (
        !Array.isArray(sourceCodes)
    ) {
        sourceCodes = [];
    }

    /*
     * 선택값은 모델리스 창 또는 사이드바가
     * 함수 인자로 직접 전달합니다.
     */
    if (sourceCodes.length === 0) {
        throw new Error(
            '미등록 물품에서 이동대상을 하나 이상 선택하세요.'
        );
    }

    var normalizedDestinationCode =
        normalizeItemCode_(
            destinationCode
        );

    if (
        normalizedDestinationCode === ''
    ) {
        throw new Error(
            '검색 결과에서 이동 위치를 먼저 선택하세요.'
        );
    }

    /*
     * 중복 선택 제거
     */
    var selectedCodeMap = {};
    var selectedCodes = [];

    for (
        var i = 0;
        i < sourceCodes.length;
        i++
    ) {
        var normalizedCode =
            normalizeItemCode_(
                sourceCodes[i]
            );

        if (
            normalizedCode !== '' &&
            !selectedCodeMap[
                normalizedCode
            ]
        ) {
            selectedCodeMap[
                normalizedCode
            ] = true;

            selectedCodes.push(
                normalizedCode
            );
        }
    }

    if (selectedCodes.length === 0) {
        throw new Error(
            '유효한 이동대상 물품코드가 없습니다.'
        );
    }

    if (
        selectedCodeMap[
            normalizedDestinationCode
        ]
    ) {
        throw new Error(
            '이동 위치로 선택한 물품이 이동대상에 포함되어 있습니다.'
        );
    }

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (lastRow < 3) {
        throw new Error(
            '이동할 기초자료가 없습니다.'
        );
    }

    var rowCount =
        lastRow - 2;

    /*
     * 값과 수식을 포함한 A:G 원본을 한 번 읽습니다.
     */
    var rows =
        sheet.getRange(
            3,
            1,
            rowCount,
            7
        ).getValues();

    var destinationRowData = null;
    var remainingRows = [];
    var selectedRowsByCode = {};
    var selectedRowsInOrder = [];

    /*
     * 선택 물품을 분리하면서
     * 원본 기초시트의 위쪽 순서를 유지합니다.
     */
    for (
        var r = 0;
        r < rows.length;
        r++
    ) {
        var row =
            rows[r].slice();

        var code =
            normalizeItemCode_(
                row[0]
            );

        if (
            code ===
            normalizedDestinationCode
        ) {
            destinationRowData =
                row;
        }

        if (
            selectedCodeMap[code]
        ) {
            if (!selectedRowsByCode[code]) {
                selectedRowsByCode[code] =
                    true;

                selectedRowsInOrder.push(
                    row
                );
            }

            continue;
        }

        remainingRows.push(
            row
        );
    }

    if (!destinationRowData) {
        throw new Error(
            '이동 위치의 현재 자료를 찾을 수 없습니다.'
        );
    }

    if (
        selectedRowsInOrder.length === 0
    ) {
        throw new Error(
            '선택한 미등록 물품을 기초자료에서 찾을 수 없습니다.'
        );
    }

    var destinationStatus =
        String(
            destinationRowData[3] || ''
        ).trim();

    if (destinationStatus === '') {
        throw new Error(
            '이동 위치의 저장상태가 비어 있습니다.'
        );
    }

    /*
     * 이동대상은 목적지 저장상태를 적용합니다.
     * F 물류지는 기존 값을 유지합니다.
     * E/G는 아래에서 일괄 재계산합니다.
     */
    for (
        var s = 0;
        s < selectedRowsInOrder.length;
        s++
    ) {
        selectedRowsInOrder[s][3] =
            destinationStatus;

        selectedRowsInOrder[s][4] =
            '';

        selectedRowsInOrder[s][6] =
            '';
    }

    var destinationIndex = -1;

    for (
        var d = 0;
        d < remainingRows.length;
        d++
    ) {
        if (
            normalizeItemCode_(
                remainingRows[d][0]
            ) ===
            normalizedDestinationCode
        ) {
            destinationIndex = d;
            break;
        }
    }

    if (destinationIndex < 0) {
        throw new Error(
            '이동 위치의 현재 행을 찾을 수 없습니다.'
        );
    }

    var rebuiltRows =
        remainingRows
            .slice(
                0,
                destinationIndex + 1
            )
            .concat(
                selectedRowsInOrder
            )
            .concat(
                remainingRows.slice(
                    destinationIndex + 1
                )
            );

    rebuildBasicRowsInMemory_(
        rebuiltRows
    );

    /*
     * 원본 크기와 동일해야 합니다.
     */
    if (
        rebuiltRows.length !==
        rows.length
    ) {
        throw new Error(
            '자료 재배치 과정에서 행 개수가 일치하지 않습니다.'
        );
    }

    /*
     * A:G을 한 번만 기록합니다.
     * 행 높이와 열 너비는 변경하지 않습니다.
     */
    sheet.getRange(
        3,
        1,
        rebuiltRows.length,
        7
    ).setValues(
        rebuiltRows
    );

    /*
     * 조회 영역은 마지막에 한 번만 갱신합니다.
     */
    refreshBasicUnregisteredDisplay_(
        sheet
    );

    if (
        searchQuery != null
    ) {
        sheet.getRange('I2')
            .setValue(
                String(
                    searchQuery || ''
                )
            );
    }

    PropertiesService
        .getUserProperties()
        .deleteProperty(
            BASIC_MOVE_SOURCE_KEY
        );

    PropertiesService
        .getUserProperties()
        .deleteProperty(
            'BASIC_MOVE_DESTINATION_ROW'
        );

    ss.toast(
        selectedRowsInOrder.length +
        '개 물품을 이동했습니다.',
        '✅ 일괄 이동 완료',
        5
    );

    return {
        success: true,
        movedCount:
            selectedRowsInOrder.length,
        message:
            selectedRowsInOrder.length +
            '개 물품을 이동했습니다.'
    };
}


// =====================================================
// 사이드바에서 선택한 목적지 아래로 이동
// =====================================================
function moveBasicSourceBelowSidebarDestination(
    rowNumber
) {
    throw new Error(
        '사이드바를 새로고침한 뒤 다시 실행하세요.'
    );
}



// =====================================================
// 사이드바 현재 이동대상 해제
// =====================================================
function clearBasicMoveSourceFromSidebar() {
    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (sheet) {
        var maxRows = Math.min(
            500,
            Math.max(
                1,
                sheet.getMaxRows() - 2
            )
        );

        var actualRows =
            sheet.getRange(
                3,
                21,
                maxRows,
                1
            ).getValues();

        for (
            var i = 0;
            i < actualRows.length;
            i++
        ) {
            if (!Number(actualRows[i][0])) {
                continue;
            }

            var cell =
                sheet.getRange(
                    i + 3,
                    20
                );

            if (cell.getDataValidation()) {
                cell.uncheck();
            }
        }
    }

    PropertiesService
        .getUserProperties()
        .deleteProperty(
            BASIC_MOVE_SOURCE_KEY
        );

    return {
        success: true,
        message:
            '모든 이동대상 선택을 해제했습니다.'
    };
}


// =====================================================
// 사이드바 현재 이동 위치
// =====================================================
function getBasicMoveDestinationForSidebar_() {
    var row = Number(
        PropertiesService
            .getUserProperties()
            .getProperty(
                'BASIC_MOVE_DESTINATION_ROW'
            )
    );

    if (!row) {
        return {
            valid: false,
            message:
                '선택된 이동 위치가 없습니다.'
        };
    }

    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    var lastRow =
        getLastBasicDataRow_(sheet);

    if (
        !sheet ||
        row < 3 ||
        row > lastRow
    ) {
        return {
            valid: false,
            message:
                '선택된 이동 위치를 찾을 수 없습니다.'
        };
    }

    var values =
        sheet.getRange(
            row,
            1,
            1,
            7
        ).getDisplayValues()[0];

    return {
        valid: true,
        row: row,
        code: values[0],
        name: values[1]
    };
}



// =====================================================
// 기존 미등록 표시 영역에서 이동대상 체크만 동기화
// 전체 영역을 다시 만들지 않습니다.
// =====================================================
function syncBasicSourceCheckboxExistingRows_(
    sheet,
    actualRow
) {
    var startRow = 3;
    var maxCheckRows = Math.min(
        500,
        Math.max(
            1,
            sheet.getMaxRows() - startRow + 1
        )
    );

    var actualRows = sheet.getRange(
        startRow,
        21,
        maxCheckRows,
        1
    ).getValues();

    var lastDisplayRow = startRow - 1;

    for (
        var i = actualRows.length - 1;
        i >= 0;
        i--
    ) {
        if (Number(actualRows[i][0])) {
            lastDisplayRow = startRow + i;
            break;
        }
    }

    if (lastDisplayRow < startRow) {
        return false;
    }

    var rowCount = lastDisplayRow - startRow + 1;
    var checkboxRange = sheet.getRange(
        startRow,
        20,
        rowCount,
        1
    );
    var checkboxValues = checkboxRange.getValues();
    var foundIndex = -1;

    for (var j = 0; j < rowCount; j++) {
        checkboxValues[j][0] = false;
        if (
            Number(actualRows[j][0]) ===
            Number(actualRow)
        ) {
            foundIndex = j;
        }
    }

    if (foundIndex >= 0) {
        checkboxValues[foundIndex][0] = true;
    }

    checkboxRange.setValues(checkboxValues);
    return foundIndex >= 0;
}


// =====================================================
// 실제 원본 행에 해당하는 미등록 T열 체크 동기화
// =====================================================
function syncBasicSourceCheckboxByActualRow_(
    sheet,
    actualRow
) {
    refreshBasicUnregisteredDisplay_(sheet);

    var maxRows =
        sheet.getMaxRows();

    var displayData =
        sheet.getRange(
            3,
            20,
            Math.max(1, maxRows - 2),
            2
        ).getValues();

    for (
        var i = 0;
        i < displayData.length;
        i++
    ) {
        if (
            Number(
                displayData[i][1]
            ) === Number(actualRow)
        ) {
            sheet.getRange(
                i + 3,
                20
            ).check();

            return true;
        }
    }

    return false;
}


// =====================================================
// 실제 목적지 행에 해당하는 검색 N열 체크 동기화
// =====================================================
function syncBasicDestinationCheckboxByActualRow_(
    sheet,
    actualRow
) {
    var resultStartRow = 5;
    var maxResultCount = 30;

    var actualRows =
        sheet.getRange(
            resultStartRow,
            22,
            maxResultCount,
            1
        ).getValues();

    var foundIndex = -1;

    /*
     * 실제 검색 결과가 있는 행만 확인합니다.
     * 빈 행에는 FALSE 값을 쓰지 않습니다.
     */
    for (
        var i = 0;
        i < actualRows.length;
        i++
    ) {
        var storedRow =
            Number(actualRows[i][0]);

        if (!storedRow) {
            continue;
        }

        var checkboxCell =
            sheet.getRange(
                resultStartRow + i,
                14
            );

        /*
         * 체크박스가 존재하는 검색 결과 행만 해제합니다.
         */
        if (
            checkboxCell.getDataValidation()
        ) {
            checkboxCell.uncheck();
        }

        if (
            storedRow ===
            Number(actualRow)
        ) {
            foundIndex = i;
        }
    }

    if (foundIndex >= 0) {
        var targetCell =
            sheet.getRange(
                resultStartRow +
                    foundIndex,
                14
            );

        if (
            targetCell.getDataValidation()
        ) {
            targetCell.check();
        }
    }

    return foundIndex >= 0;
}


// 현재 선택한 행 정보
function getSelectedBasicRow() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var range = sheet.getActiveRange();

    if (!sheet || sheet.getName() !== '기초') {
        return {
            valid: false,
            message: '기초시트에서 이동할 행을 선택하세요.'
        };
    }

    if (!range || range.getRow() < 3) {
        return {
            valid: false,
            message: '제목행을 제외한 자료 행을 선택하세요.'
        };
    }

    var row = range.getRow();
    var values = sheet.getRange(row, 1, 1, 7).getDisplayValues()[0];

    if (values[0] === '' && values[1] === '') {
        return {
            valid: false,
            message: '자료가 있는 행을 선택하세요.'
        };
    }

    return {
        valid: true,
        row: row,
        cell: range.getA1Notation(),
        code: values[0],
        name: values[1],
        price: values[2],
        status: values[3],
        logistics: values[5],
        order: values[6]
    };
}


// 현재 선택한 행을 이동할 원본으로 저장
function saveBasicMoveSource() {
    var data = getSelectedBasicRow();

    if (!data.valid) {
        return data;
    }

    PropertiesService
        .getUserProperties()
        .setProperty(BASIC_MOVE_SOURCE_KEY, String(data.row));

    return {
        valid: true,
        message: data.row + '행을 이동 대상으로 선택했습니다.',
        source: data
    };
}


// 저장된 원본 행 정보
function getBasicMoveSource() {
    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (!sheet) {
        return {
            valid: false,
            count: 0,
            message:
                '기초시트를 찾을 수 없습니다.'
        };
    }

    var selected =
        getSelectedBasicMoveSources_(sheet);

    if (selected.length === 0) {
        return {
            valid: false,
            count: 0,
            message:
                '이동 대상으로 선택된 미등록 물품이 없습니다.'
        };
    }

    var items = [];

    for (
        var i = 0;
        i < selected.length;
        i++
    ) {
        var row =
            selected[i].actualRow;

        var values =
            sheet.getRange(
                row,
                1,
                1,
                7
            ).getDisplayValues()[0];

        items.push({
            row: row,
            code: values[0],
            name: values[1],
            status: values[3],
            logistics: values[5],
            order: values[6]
        });
    }

    return {
        valid: true,
        count: items.length,
        items: items,
        message:
            items.length +
            '개 물품이 이동 대상으로 선택되었습니다.'
    };
}


// 현재 선택한 행을 이동할 기준 위치로 확인
function getBasicMoveDestination() {
    var selected = getSelectedBasicRow();

    if (!selected.valid) {
        return selected;
    }

    var source = getBasicMoveSource();

    if (!source.valid) {
        return source;
    }

    if (selected.row === source.row) {
        return {
            valid: false,
            message: '이동 대상 행과 이동 위치가 같습니다.'
        };
    }

    return {
        valid: true,
        destination: selected,
        message: selected.row + '행 아래로 이동합니다.'
    };
}


// =====================================================
// 지정한 실제 기초자료 행 아래로 이동
//
// 현재 선택 셀을 읽지 않고 destinationRow를 직접 사용하므로
// 검색 결과의 표시 행 번호와 실제 자료 행 번호가 섞이지 않습니다.
// =====================================================
function moveBasicRowBelowRow_(destinationRow) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    destinationRow = Number(destinationRow);

    var sourceData = getBasicMoveSource();

    if (!sourceData.valid) {
        throw new Error(sourceData.message);
    }

    var sourceRow = Number(sourceData.row);
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    if (
        destinationRow < 3 ||
        destinationRow > lastRow
    ) {
        throw new Error(
            '이동할 위치의 실제 기초자료 행을 찾을 수 없습니다.'
        );
    }

    if (
        sourceRow < 3 ||
        sourceRow > lastRow
    ) {
        throw new Error(
            '이동할 원본 행을 찾을 수 없습니다.'
        );
    }

    if (sourceRow === destinationRow) {
        throw new Error(
            '이동 대상 행과 이동 위치가 같습니다.'
        );
    }

    var originalStatus = sheet
        .getRange(sourceRow, 4)
        .getValue();

    var destinationStatus = sheet
        .getRange(destinationRow, 4)
        .getValue();

    if (
        String(destinationStatus).trim() === ''
    ) {
        throw new Error(
            '이동할 위치의 D열 저장상태가 비어 있습니다.'
        );
    }

    /*
     * 실제 목적지 행 바로 아래에 새 행 삽입
     */
    sheet.insertRowAfter(destinationRow);

    var insertedRow = destinationRow + 1;
    var sourceRowAfterInsert = sourceRow;

    /*
     * 목적지가 원본보다 위에 있으면
     * 행 삽입으로 원본 행 번호가 1 증가
     */
    if (destinationRow < sourceRow) {
        sourceRowAfterInsert = sourceRow + 1;
    }

    var sourceRange = sheet.getRange(
        sourceRowAfterInsert,
        1,
        1,
        lastColumn
    );

    var targetRange = sheet.getRange(
        insertedRow,
        1,
        1,
        lastColumn
    );

    sourceRange.copyTo(
        targetRange,
        SpreadsheetApp.CopyPasteType.PASTE_NORMAL,
        false
    );

    var sourceHeight = sheet.getRowHeight(
        sourceRowAfterInsert
    );

    sheet.setRowHeight(
        insertedRow,
        sourceHeight
    );

    sheet.deleteRow(sourceRowAfterInsert);

    var finalRow = insertedRow;

    if (sourceRowAfterInsert < insertedRow) {
        finalRow = insertedRow - 1;
    }

    /*
     * 이동 후 처리 규칙
     *
     * D열 저장상태:
     *   선택한 목적지 물품의 저장상태를 적용합니다.
     *
     * F열 물류지:
     *   이동 대상 원본 행의 값을 그대로 유지합니다.
     *   목적지 물류지로 덮어쓰지 않습니다.
     *
     * G열 집품순서:
     *   목적지 저장상태 그룹 기준으로 다시 번호를 부여합니다.
     */
    sheet
        .getRange(finalRow, 4)
        .setValue(destinationStatus);

    sheet
        .getRange(finalRow, 7)
        .clearContent();

    SpreadsheetApp.flush();

    var movedGroupCount = renumberBasicGroup(
        sheet,
        destinationStatus
    );

    var originalGroupCount = 0;

    if (
        String(originalStatus).trim() !==
        String(destinationStatus).trim()
    ) {
        originalGroupCount = renumberBasicGroup(
            sheet,
            originalStatus
        );
    }

    PropertiesService
        .getUserProperties()
        .deleteProperty(BASIC_MOVE_SOURCE_KEY);

    refreshBasicUnregisteredDisplay_(sheet);

    sheet.setActiveSelection(
        sheet.getRange(finalRow, 1)
    );

    ss.toast(
        finalRow + '행으로 이동했습니다.\n' +
        '선택한 실제 기초자료 행 아래에 배치했습니다.\n' +
        '새 그룹 재번호: ' + movedGroupCount + '건',
        '✅ 이동 완료',
        7
    );

    return {
        success: true,
        movedRow: finalRow,
        code: sheet
            .getRange(finalRow, 1)
            .getDisplayValue(),
        status: destinationStatus,
        movedGroupCount: movedGroupCount,
        originalGroupCount: originalGroupCount
    };
}


// =====================================================
// 기초시트에서 현재 선택한 행 아래로 이동
// =====================================================
function moveBasicRowBelowSelected() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var range = sheet.getActiveRange();

    if (
        !sheet ||
        sheet.getName() !== '기초' ||
        !range ||
        range.getRow() < 3
    ) {
        throw new Error(
            '기초시트에서 이동할 위치의 자료 행을 선택하세요.'
        );
    }

    return moveBasicRowBelowRow_(
        range.getRow()
    );
}








// =====================================================
// D열 저장상태가 같은 자료의 G열 재번호
// F열 물류지는 그룹 기준에서 제외
// 3행부터 현재 표시 순서대로 1, 2, 3... 입력
// =====================================================
function renumberBasicGroup(
    sheet,
    status
) {
    status = String(
        status === null || status === undefined
            ? ''
            : status
    ).trim();

    if (status === '') {
        return 0;
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 3) {
        return 0;
    }

    /*
     * D:G 범위
     * data[i][0] = D열 저장상태
     * data[i][3] = G열 집품순서
     */
    var data = sheet
        .getRange(
            3,
            4,
            lastRow - 2,
            4
        )
        .getValues();

    var newGValues = [];
    var sequence = 1;
    var changedCount = 0;

    for (var i = 0; i < data.length; i++) {
        var rowStatus = String(
            data[i][0] === null ||
            data[i][0] === undefined
                ? ''
                : data[i][0]
        ).trim();

        var currentOrder = data[i][3];

        if (rowStatus === status) {
            newGValues.push([sequence]);
            sequence++;
            changedCount++;
        } else {
            newGValues.push([currentOrder]);
        }
    }

    sheet
        .getRange(
            3,
            7,
            newGValues.length,
            1
        )
        .setValues(newGValues);

    updateBasicCombinedColumn_(
        sheet,
        3,
        newGValues.length
    );

    SpreadsheetApp.flush();

    return changedCount;
}


// =====================================================
// 현재 선택한 기초 그룹 재번호 시험
// =====================================================
function testRenumberSelectedBasicGroup() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var range = sheet.getActiveRange();

    if (
        !sheet ||
        sheet.getName() !== '기초'
    ) {
        ss.toast(
            '기초시트에서 시험할 행을 선택하세요.',
            '확인 필요',
            5
        );
        return;
    }

    if (
        !range ||
        range.getRow() < 3
    ) {
        ss.toast(
            '자료가 있는 행을 선택하세요.',
            '확인 필요',
            5
        );
        return;
    }

    var row = range.getRow();

    var status = sheet
        .getRange(row, 4)
        .getValue();

    var count = renumberBasicGroup(
        sheet,
        status
    );

    ss.toast(
        'D열 저장상태: ' + status + '\n' +
        'G열 재번호: ' + count + '건',
        '✅ 재번호 시험 완료',
        7
    );
}


// =====================================================
// 이동 선택 취소
// =====================================================
function cancelBasicMove() {
    var properties =
        PropertiesService
        .getUserProperties();

    properties.deleteProperty(
        BASIC_MOVE_SOURCE_KEY
    );

    properties.deleteProperty(
        'BASIC_MOVE_DESTINATION_ROW'
    );

    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (sheet) {
        var maxRows =
            sheet.getMaxRows();

        sheet.getRange(
            3,
            20,
            Math.max(1, maxRows - 2),
            1
        ).uncheck();

        sheet.getRange(
            5,
            14,
            30,
            1
        ).uncheck();
    }

    return {
        success: true,
        message:
            '이동 대상과 이동 위치 선택을 취소했습니다.'
    };
}

// =====================================================
// 기초시트 정렬
//
// 1순위: D열 사용자 지정 순서
// 미등록 → 상온 → 냉장(가공) → 냉장 → 냉동
//
// 2순위: G열 오름차순
// F열은 정렬 기준에서 제외
// =====================================================
function sortBasicSheetByStatusAndOrder() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    // 1행은 빈 행, 2행은 제목, 3행부터 자료
    if (lastRow < 3) {
        ss.toast(
            '정렬할 자료가 없습니다.',
            '안내',
            4
        );
        return;
    }

    var numRows = lastRow - 2;
    var tempColumn = lastColumn + 1;

    if (sheet.getMaxColumns() < tempColumn) {
        sheet.insertColumnAfter(sheet.getMaxColumns());
    }

    var statusValues = sheet
        .getRange(3, 4, numRows, 1)
        .getDisplayValues();

    var tempValues = [];

    for (var i = 0; i < statusValues.length; i++) {
        var status = String(statusValues[i][0]).trim();
        var sortNumber;

        if (status === '미등록') {
            sortNumber = 1;
        } else if (status === '상온') {
            sortNumber = 2;
        } else if (status === '냉장(가공)') {
            sortNumber = 3;
        } else if (status === '냉장') {
            sortNumber = 4;
        } else if (status === '냉동') {
            sortNumber = 5;
        } else {
            sortNumber = 99;
        }

        tempValues.push([sortNumber]);
    }

    sheet
        .getRange(3, tempColumn, numRows, 1)
        .setValues(tempValues);

    sheet
        .getRange(3, 1, numRows, tempColumn)
        .sort([
            {
                column: tempColumn,
                ascending: true
            },
            {
                column: 7,
                ascending: true
            }
        ]);

    sheet
        .getRange(3, tempColumn, numRows, 1)
        .clearContent();

    updateBasicCombinedColumn_(
        sheet,
        3,
        numRows
    );

    SpreadsheetApp.flush();

    ss.toast(
        '미등록 → 상온 → 냉장(가공) → 냉장 → 냉동 순서로 정렬했습니다.\n' +
        '같은 저장상태에서는 G열 순서로 정렬했습니다.',
        '✅ 기초자료 정렬 완료',
        6
    );
}


// =====================================================
// v10.2 입력시트 미등록 영역 수동 복구
// 기존 V열 체크박스/검증을 즉시 제거하고 목록을 재작성합니다.
// =====================================================
function repairInputItemReviewAreaV10_2() {
    var ss =
        SpreadsheetApp.getActiveSpreadsheet();

    var inputSheet =
        ss.getSheetByName('입력시트');

    if (!inputSheet) {
        throw new Error(
            '입력시트를 찾을 수 없습니다.'
        );
    }

    ensureInputUnregisteredArea_(
        inputSheet
    );

    var count =
        refreshUnregisteredItems_(
            ss
        );

    ss.toast(
        'V열 체크박스를 제거하고 확인 대상 ' +
        count +
        '건을 다시 표시했습니다.',
        '입력시트 점검영역 복구 완료',
        6
    );

    return count;
}


// =====================================================
// 스프레드시트를 열 때 기초 관리 메뉴 생성
// =====================================================
function onOpen(e) {
    /*
     * 메뉴를 가장 먼저 만듭니다.
     * 이미지 생성이나 보조영역 정리에서 오류가 발생해도
     * 기초 관리 메뉴는 항상 표시되도록 합니다.
     */
    SpreadsheetApp
        .getUi()
        .createMenu('기초 관리')
        .addItem(
            '물품 검색·미등록 창 열기',
            'showBasicToolsDialog'
        )
        .addItem(
            '신규물품 점검 창 열기',
            'showNewItemReviewDialog'
        )
        .addSeparator()
        .addItem(
            '행 이동 사이드바 열기',
            'showBasicMoveSidebar'
        )
        .addItem(
            '미등록 물품 목록 새로고침',
            'refreshUnregisteredItems'
        )
        .addSeparator()
        .addItem(
            '정렬: 저장상태 지정순서 → 집품순서',
            'sortBasicSheetByStatusAndOrder'
        )
        .addItem(
            '현재 저장상태 G열 재번호',
            'testRenumberSelectedBasicGroup'
        )
        .addItem(
            'E열 전체 재계산',
            'rebuildBasicCombinedColumn'
        )
        .addSeparator()
        .addItem(
            '선택 행 A:G만 삭제',
            'deleteSelectedBasicCells'
        )
        .addToUi();

    /*
     * 셀 크기 자동 맞춤은 저장·기간 일괄처리와 분리합니다.
     * 사용자가 시트를 확인하기 전에 필요할 때 한 번만 실행합니다.
     */
    SpreadsheetApp
        .getUi()
        .createMenu('셀 크기 맞춤')
        .addItem(
            '현재 시트 빠른 맞춤',
            'autoFitCurrentSheetFromMenu_'
        )
        .addSeparator()
        .addItem(
            '입력시트 제외 전체 시트 빠른 맞춤',
            'autoFitAllSheetsExceptInputFromMenu_'
        )
        .addToUi();

    /*
     * onOpen에서는 이미지 생성처럼 무거운 작업을 하지 않습니다.
     * 예전 보조영역 정리만 안전하게 시도합니다.
     */
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var basicSheet = ss.getSheetByName('기초');

        if (basicSheet) {
            cleanupLegacyBasicHelperArea_(basicSheet);
        }
    } catch (error) {
        console.error(
            '기초시트 보조영역 정리 실패: ' +
            error.message
        );
    }

    /*
     * v11.4
     * 단순 onOpen에서는 물품 비교를 수행하지 않습니다.
     * 메뉴 생성만 담당합니다.
     *
     * 미등록/물품명 불일치 검사는 설치형 open 트리거에서
     * 입력 F:G가 변경된 경우에만 수행합니다.
     */

    /*
     * 별도 GS 파일의 메뉴도 함께 생성합니다.
     * 함수가 존재할 때만 호출하여 복구 과정의 메뉴 오류를 방지합니다.
     */
    if (typeof HLAS2025_addMenu_ === 'function') {
        HLAS2025_addMenu_();
    }

    if (typeof HLAS2025_addBatchMenu_ === 'function') {
        HLAS2025_addBatchMenu_();
    }

    /*
     * v11.13:
     * A1 날짜 값은 건드리지 않고 날짜 선택 규칙만 보장합니다.
     */
    try {
        ensureTotalDatePickerV11_13_(
            SpreadsheetApp.getActiveSpreadsheet()
        );
    } catch (datePickerError) {
        console.error(
            '총수량 날짜선택 설정 오류: ' +
            datePickerError.message
        );
    }

}




// =====================================================
// 입력시트 F·G열 변경 시 미등록 물품 목록 최초 1회 갱신
// =====================================================
function refreshUnregisteredItemsIfChanged_(ss) {
    var inputSheet =
        ss.getSheetByName('입력시트');

    if (!inputSheet) {
        return false;
    }

    var lastRow =
        getRealLastRow(inputSheet);

    /*
     * 입력자료가 없으면 기존 기록값을 삭제하고
     * 미등록 목록도 비웁니다.
     */
    if (lastRow < 2) {
        PropertiesService
            .getDocumentProperties()
            .deleteProperty(
                'UNREGISTERED_ITEMS_FG_SIGNATURE'
            );

        refreshUnregisteredItems_(ss);

        return true;
    }

    /*
     * F열: 물품코드
     * G열: 물품명
     */
    var fgValues = inputSheet
        .getRange(
            2,
            6,
            lastRow - 1,
            2
        )
        .getDisplayValues();

    /*
     * 빈 행을 제외하고 비교용 문자열 생성
     */
    var signatureData = [];

    for (
        var i = 0;
        i < fgValues.length;
        i++
    ) {
        var itemCode = String(
            fgValues[i][0] || ''
        ).trim();

        var itemName = String(
            fgValues[i][1] || ''
        ).trim();

        if (
            itemCode !== '' ||
            itemName !== ''
        ) {
            signatureData.push(
                itemCode + '|' + itemName
            );
        }
    }

    /*
     * F·G열 전체 상태를 해시값으로 변환
     */
    var rawSignature =
        signatureData.join('\n');

    var digest =
        Utilities.computeDigest(
            Utilities.DigestAlgorithm.MD5,
            rawSignature,
            Utilities.Charset.UTF_8
        );

    var newSignature = digest
        .map(function(value) {
            var number =
                value < 0
                    ? value + 256
                    : value;

            return (
                '0' +
                number.toString(16)
            ).slice(-2);
        })
        .join('');

    var properties =
        PropertiesService
            .getDocumentProperties();

    var oldSignature =
        properties.getProperty(
            'UNREGISTERED_ITEMS_FG_SIGNATURE'
        );

    /*
     * 이전과 동일하면 다시 실행하지 않습니다.
     */
    if (
        oldSignature === newSignature
    ) {
        return false;
    }

    /*
     * F·G열이 변경된 경우에만 목록 갱신
     */
    refreshUnregisteredItems_(ss);

    properties.setProperty(
        'UNREGISTERED_ITEMS_FG_SIGNATURE',
        newSignature
    );

    return true;
}










// =====================================================
// v10 신규물품/물품명 불일치 점검
// =====================================================
function getPendingItemReviewSummary_(ss) {
    var inputSheet =
        ss.getSheetByName('입력시트');

    if (!inputSheet) {
        return {
            total: 0,
            newCount: 0,
            mismatchCount: 0
        };
    }

    /*
     * S:U는 refreshUnregisteredItems_가 위에서부터 연속으로 씁니다.
     * 따라서 전체 시트 마지막 행을 찾지 않고
     * 최대 입력 데이터 행 수만큼만 읽습니다.
     */
    var inputDataLastRow =
        getLastRowByColumns_(
            inputSheet,
            6,
            7,
            2
        );

    if (inputDataLastRow < 2) {
        return {
            total: 0,
            newCount: 0,
            mismatchCount: 0
        };
    }

    var maxReviewRows =
        Math.max(
            1,
            inputDataLastRow - 1
        );

    var values =
        inputSheet
        .getRange(
            2,
            19,
            maxReviewRows,
            3
        )
        .getDisplayValues();

    var newCount = 0;
    var mismatchCount = 0;

    for (
        var i = 0;
        i < values.length;
        i++
    ) {
        var code =
            String(
                values[i][0] || ''
            ).trim();

        var status =
            String(
                values[i][2] || ''
            ).trim();

        /*
         * 목록은 위에서부터 연속 출력되므로
         * 첫 완전 빈 행에서 바로 종료합니다.
         */
        if (
            code === '' &&
            status === ''
        ) {
            break;
        }

        if (status === '신규물품') {
            newCount++;
        } else if (
            status === '물품명 불일치'
        ) {
            mismatchCount++;
        }
    }

    return {
        total:
            newCount +
            mismatchCount,
        newCount: newCount,
        mismatchCount:
            mismatchCount
    };
}


// =====================================================
// v11.3 설치형 새로고침 알림 트리거
//
// showModalDialog()는 승인 권한이 필요하므로
// 단순 onOpen이 아니라 설치형 open 트리거에서 실행합니다.
// =====================================================
function installedOnOpenItemReview_(e) {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    if (!ss) {
        return;
    }

    try {
        /*
         * v11.4 핵심:
         * 매 새로고침마다 기초 전체와 다시 비교하지 않습니다.
         *
         * 입력시트 F:G 서명이 이전과 같으면
         * S:U 기존 결과를 그대로 사용하고 즉시 알림 단계로 갑니다.
         */
        refreshUnregisteredItemsIfChanged_(
            ss
        );

        offerPendingItemReviewAfterRun_();

    } catch (error) {
        console.error(
            '설치형 새로고침 물품 점검 실패: ' +
            error.message
        );
    }
}


// =====================================================
// 설치형 open 트리거 최초 1회 설치/재설치
//
// Apps Script 편집기에서 이 함수를 한 번 직접 실행합니다.
// Google 권한 승인창이 뜨면 승인합니다.
// =====================================================
function setupItemReviewOpenTrigger() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    if (!ss) {
        throw new Error(
            '현재 스프레드시트를 확인할 수 없습니다.'
        );
    }

    var functionName =
        'installedOnOpenItemReview_';

    var triggers =
        ScriptApp
        .getProjectTriggers();

    var removedCount = 0;

    triggers.forEach(function(trigger) {
        if (
            trigger.getHandlerFunction() ===
            functionName
        ) {
            ScriptApp.deleteTrigger(
                trigger
            );

            removedCount++;
        }
    });

    ScriptApp
        .newTrigger(
            functionName
        )
        .forSpreadsheet(
            ss
        )
        .onOpen()
        .create();

    ss.toast(
        '물품점검 자동 알림 트리거를 설치했습니다.\n' +
        '이제 스프레드시트를 다시 새로고침해 주세요.',
        '✅ 자동 알림 준비 완료',
        8
    );

    return {
        success: true,
        removedOldTriggers:
            removedCount,
        handler:
            functionName
    };
}


// =====================================================
// 설치 상태 확인
// =====================================================
function checkItemReviewOpenTrigger() {
    var functionName =
        'installedOnOpenItemReview_';

    var matches =
        ScriptApp
        .getProjectTriggers()
        .filter(function(trigger) {
            return (
                trigger.getHandlerFunction() ===
                functionName
            );
        });

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            matches.length > 0
                ? '물품점검 자동 알림 트리거가 설치되어 있습니다.'
                : '물품점검 자동 알림 트리거가 설치되어 있지 않습니다.',
            matches.length > 0
                ? '✅ 트리거 정상'
                : '⚠ 트리거 없음',
            6
        );

    return matches.length;
}


// =====================================================
// 자동 알림창 자체 수동 테스트
// 트리거 설치 전 HTML 파일/권한 문제를 확인할 때 사용합니다.
// =====================================================
// =====================================================
// v11.4 새로고침 물품점검 속도 측정
// Apps Script에서 수동 실행하면 단계별 시간을 로그로 확인할 수 있습니다.
// =====================================================
function testItemReviewOpenSpeedV11_4() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var startedAt =
        Date.now();

    var refreshStarted =
        Date.now();

    var changed =
        refreshUnregisteredItemsIfChanged_(
            ss
        );

    var refreshMs =
        Date.now() -
        refreshStarted;

    var summaryStarted =
        Date.now();

    var summary =
        getPendingItemReviewSummary_(
            ss
        );

    var summaryMs =
        Date.now() -
        summaryStarted;

    var totalMs =
        Date.now() -
        startedAt;

    console.log(
        JSON.stringify({
            changed:
                changed,
            refreshMs:
                refreshMs,
            summaryMs:
                summaryMs,
            totalMs:
                totalMs,
            summary:
                summary
        })
    );

    ss.toast(
        '변경검사 ' +
        (refreshMs / 1000).toFixed(2) +
        '초 / 알림집계 ' +
        (summaryMs / 1000).toFixed(2) +
        '초',
        '물품점검 속도 측정',
        7
    );

    return {
        changed:
            changed,
        refreshMs:
            refreshMs,
        summaryMs:
            summaryMs,
        totalMs:
            totalMs,
        summary:
            summary
    };
}


function testItemReviewNotificationDialog() {
    refreshUnregisteredItems_(
        SpreadsheetApp
        .getActiveSpreadsheet()
    );

    offerPendingItemReviewAfterRun_();
}


function offerPendingItemReviewAfterRun_() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var summary =
        getPendingItemReviewSummary_(
            ss
        );

    if (summary.total <= 0) {
        return;
    }

    var template =
        HtmlService
        .createTemplateFromFile(
            '물품점검알림'
        );

    template.total =
        summary.total;

    template.newCount =
        summary.newCount;

    template.mismatchCount =
        summary.mismatchCount;

    var html =
        template
        .evaluate()
        .setWidth(440)
        .setHeight(330);

    /*
     * Ui.alert() 대신 모달 HTML을 사용합니다.
     * 바깥 영역 클릭으로 닫히지 않습니다.
     */
    SpreadsheetApp
        .getUi()
        .showModalDialog(
            html,
            '확인 필요한 물품'
        );
}


function openItemReviewFromNotification() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var basicSheet =
        ss.getSheetByName('기초');

    if (!basicSheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    ss.setActiveSheet(
        basicSheet
    );

    basicSheet
        .setActiveRange(
            basicSheet.getRange('A1')
        );

    SpreadsheetApp.flush();

    showNewItemReviewDialog();

    return true;
}


// =====================================================
// 신규물품 점검창 검색 결과의 실제 기초 행 보기
// =====================================================
function focusBasicRowFromNewItemReview(
    rowNumber
) {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var sheet =
        ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    rowNumber =
        Number(rowNumber);

    var lastRow =
        getLastBasicDataRow_(
            sheet
        );

    if (
        !rowNumber ||
        rowNumber < 3 ||
        rowNumber > lastRow
    ) {
        throw new Error(
            '이동할 기초시트 행을 확인할 수 없습니다.'
        );
    }

    ss.setActiveSheet(
        sheet
    );

    /*
     * 선택 행의 위·아래를 함께 볼 수 있도록
     * 한 행 위부터 3개 행 A:G을 선택합니다.
     */
    var startRow =
        Math.max(
            3,
            rowNumber - 1
        );

    var rowCount =
        Math.min(
            3,
            lastRow - startRow + 1
        );

    sheet.setActiveSelection(
        sheet.getRange(
            startRow,
            1,
            rowCount,
            7
        )
    );

    return {
        success: true,
        row: rowNumber,
        startRow: startRow,
        message:
            '기초시트 ' +
            rowNumber +
            '행으로 이동했습니다.'
    };
}


function showNewItemReviewDialog() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    refreshUnregisteredItems_(ss);

    var basicSheet =
        ss.getSheetByName('기초');

    if (!basicSheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    ss.setActiveSheet(
        basicSheet
    );

    SpreadsheetApp.flush();

    var html =
        HtmlService
        .createHtmlOutputFromFile(
            '신규물품점검'
        )
        .setWidth(760)
        .setHeight(680);

    /*
     * v11.2
     * 신규물품 점검 창은 모델리스로 표시합니다.
     * 창을 유지한 채 기초시트의 검색 행으로 이동하고
     * 주변 행을 직접 확인·수정할 수 있습니다.
     *
     * 바깥 클릭으로 사라지던 문제는 이 창이 아니라
     * 앞 단계 Ui.alert() 알림이었으므로,
     * 알림만 별도 모달 HTML로 교체했습니다.
     */
    SpreadsheetApp
        .getUi()
        .showModelessDialog(
            html,
            '신규물품 등록 · 물품명 점검'
        );
}


// =====================================================
// 입력시트에서 신규물품의 "개당 단가" 자동 확인
//
// F=물품코드
// G=물품명
// H=예정수량
// I=예정금액(예정수량 전체 금액)
// J=결과수량
// K=결과금액(결과수량 전체 금액)
//
// v11.11:
// 1순위: 결과금액 ÷ 결과수량
// 2순위: 예정금액 ÷ 예정수량
//
// 예)
// 결과수량 2 / 결과금액 2000 → 신규물품 금액 1000
// =====================================================
function getInputItemAmountForReview_(
    inputSheet,
    itemCode,
    itemName
) {
    var lastRow =
        getLastRowByColumns_(
            inputSheet,
            6,
            7,
            2
        );

    if (lastRow < 2) {
        return 0;
    }

    /*
     * F:K
     * 0 F 물품코드
     * 1 G 물품명
     * 2 H 예정수량
     * 3 I 예정금액
     * 4 J 결과수량
     * 5 K 결과금액
     */
    var values =
        inputSheet
        .getRange(
            2,
            6,
            lastRow - 1,
            6
        )
        .getValues();

    var targetCode =
        normalizeItemCode_(itemCode);

    var targetName =
        normalizeItemName_(itemName);

    for (
        var i = 0;
        i < values.length;
        i++
    ) {
        var code =
            normalizeItemCode_(
                values[i][0]
            );

        var name =
            normalizeItemName_(
                values[i][1]
            );

        if (
            code !== targetCode ||
            name !== targetName
        ) {
            continue;
        }

        var plannedQty =
            parseReviewAmount_(
                values[i][2]
            );

        var plannedAmount =
            parseReviewAmount_(
                values[i][3]
            );

        var resultQty =
            parseReviewAmount_(
                values[i][4]
            );

        var resultAmount =
            parseReviewAmount_(
                values[i][5]
            );

        /*
         * 결과값이 있으면 실제 결과 기준 단가를 최우선 사용합니다.
         * 반품처럼 수량/금액이 모두 음수인 경우에도
         * 나눗셈 결과가 양수 단가이면 정상 사용합니다.
         */
        if (
            resultQty !== 0 &&
            resultAmount !== 0
        ) {
            var resultUnitPrice =
                resultAmount /
                resultQty;

            if (
                isFinite(
                    resultUnitPrice
                ) &&
                resultUnitPrice > 0
            ) {
                return resultUnitPrice;
            }
        }

        /*
         * 결과수량을 사용할 수 없는 경우 예정값으로 보완합니다.
         */
        if (
            plannedQty !== 0 &&
            plannedAmount !== 0
        ) {
            var plannedUnitPrice =
                plannedAmount /
                plannedQty;

            if (
                isFinite(
                    plannedUnitPrice
                ) &&
                plannedUnitPrice > 0
            ) {
                return plannedUnitPrice;
            }
        }
    }

    return 0;
}


// =====================================================
// v11.11 신규물품 단가 계산 확인용
// 예시 결과: 2개 / 2000원 → 1000원
// =====================================================
function testNewItemUnitPriceV11_11() {
    var cases = [
        {
            plannedQty: 2,
            plannedAmount: 2000,
            resultQty: 2,
            resultAmount: 2000,
            expected: 1000
        },
        {
            plannedQty: 3,
            plannedAmount: 4500,
            resultQty: 0,
            resultAmount: 0,
            expected: 1500
        },
        {
            plannedQty: 2,
            plannedAmount: 2000,
            resultQty: -2,
            resultAmount: -2000,
            expected: 1000
        }
    ];

    var results =
        cases.map(function(testCase) {
            var unitPrice = 0;

            if (
                testCase.resultQty !== 0 &&
                testCase.resultAmount !== 0
            ) {
                unitPrice =
                    testCase.resultAmount /
                    testCase.resultQty;
            } else if (
                testCase.plannedQty !== 0 &&
                testCase.plannedAmount !== 0
            ) {
                unitPrice =
                    testCase.plannedAmount /
                    testCase.plannedQty;
            }

            return {
                expected:
                    testCase.expected,
                actual:
                    unitPrice,
                pass:
                    unitPrice ===
                    testCase.expected
            };
        });

    console.log(
        JSON.stringify(
            results
        )
    );

    return results;
}


function parseReviewAmount_(value) {
    if (
        typeof value === 'number' &&
        isFinite(value)
    ) {
        return value;
    }

    var number = Number(
        String(value == null ? '' : value)
        .replace(/,/g, '')
        .replace(/원/g, '')
        .trim()
    );

    return isFinite(number)
        ? number
        : 0;
}


function getNewItemReviewDialogState() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var inputSheet =
        ss.getSheetByName('입력시트');

    var basicSheet =
        ss.getSheetByName('기초');

    if (
        !inputSheet ||
        !basicSheet
    ) {
        return {
            items: [],
            storageStatuses: [],
            logisticsLocations: [],
            searchItems: []
        };
    }

    refreshUnregisteredItems_(ss);

    var basicLastRow =
        basicSheet.getLastRow();

    var basicByCode = {};
    var basicDuplicateCount = {};
    var storageMap = {};
    var logisticsMap = {};

    if (basicLastRow >= 3) {
        var basicValues =
            basicSheet
            .getRange(
                3,
                1,
                basicLastRow - 2,
                7
            )
            .getDisplayValues();

        for (
            var i = 0;
            i < basicValues.length;
            i++
        ) {
            var code =
                normalizeItemCode_(
                    basicValues[i][0]
                );

            if (code !== '') {
                basicDuplicateCount[code] =
                    (
                        basicDuplicateCount[
                            code
                        ] || 0
                    ) + 1;

                if (!basicByCode[code]) {
                    basicByCode[code] = {
                        row: i + 3,
                        code:
                            String(
                                basicValues[i][0] || ''
                            ).trim(),
                        name:
                            String(
                                basicValues[i][1] || ''
                            ).trim(),
                        amount:
                            String(
                                basicValues[i][2] || ''
                            ).trim(),
                        storageStatus:
                            String(
                                basicValues[i][3] || ''
                            ).trim(),
                        logistics:
                            String(
                                basicValues[i][5] || ''
                            ).trim(),
                        pickOrder:
                            String(
                                basicValues[i][6] || ''
                            ).trim()
                    };
                }
            }

            var storage =
                String(
                    basicValues[i][3] || ''
                ).trim();

            var logistics =
                String(
                    basicValues[i][5] || ''
                ).trim();

            if (
                storage !== '' &&
                storage !== '미등록'
            ) {
                storageMap[storage] = true;
            }

            if (logistics !== '') {
                logisticsMap[
                    logistics
                ] = true;
            }
        }
    }

    var listLastRow =
        getLastRowByColumns_(
            inputSheet,
            19,
            21,
            2
        );

    var items = [];

    if (listLastRow >= 2) {
        var listValues =
            inputSheet
            .getRange(
                2,
                19,
                listLastRow - 1,
                3
            )
            .getDisplayValues();

        for (
            var r = 0;
            r < listValues.length;
            r++
        ) {
            var displayCode =
                String(
                    listValues[r][0] || ''
                ).trim();

            var displayName =
                String(
                    listValues[r][1] || ''
                ).trim();

            var status =
                String(
                    listValues[r][2] || ''
                ).trim();

            if (
                status !== '신규물품' &&
                status !==
                    '물품명 불일치'
            ) {
                continue;
            }

            var normalizedCode =
                normalizeItemCode_(
                    displayCode
                );

            var existing =
                basicByCode[
                    normalizedCode
                ] || null;

            items.push({
                inputRow: r + 2,
                code: displayCode,
                name: displayName,
                status: status,
                amount:
                    getInputItemAmountForReview_(
                        inputSheet,
                        displayCode,
                        displayName
                    ),
                existing:
                    existing,
                duplicateBasicCodeCount:
                    Number(
                        basicDuplicateCount[
                            normalizedCode
                        ] || 0
                    )
            });
        }
    }

    return {
        items: items,
        storageStatuses:
            Object.keys(storageMap),
        logisticsLocations:
            Object.keys(logisticsMap),
        searchItems:
            getBasicSearchDatasetForSidebar_()
    };
}


function processNewItemReviewAction(
    payload
) {
    payload = payload || {};

    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var inputSheet =
        ss.getSheetByName('입력시트');

    var basicSheet =
        ss.getSheetByName('기초');

    if (
        !inputSheet ||
        !basicSheet
    ) {
        throw new Error(
            '입력시트 또는 기초시트를 찾을 수 없습니다.'
        );
    }

    var itemCode =
        String(
            payload.code || ''
        ).trim();

    var inputName =
        String(
            payload.name || ''
        ).trim();

    var action =
        String(
            payload.action || ''
        ).trim();

    var normalizedCode =
        normalizeItemCode_(
            itemCode
        );

    if (
        normalizedCode === '' ||
        inputName === ''
    ) {
        throw new Error(
            '물품코드 또는 물품명이 비어 있습니다.'
        );
    }

    var basicLastRow =
        basicSheet.getLastRow();

    var matchedRows = [];

    if (basicLastRow >= 3) {
        var codeValues =
            basicSheet
            .getRange(
                3,
                1,
                basicLastRow - 2,
                1
            )
            .getDisplayValues();

        for (
            var i = 0;
            i < codeValues.length;
            i++
        ) {
            if (
                normalizeItemCode_(
                    codeValues[i][0]
                ) === normalizedCode
            ) {
                matchedRows.push(
                    i + 3
                );
            }
        }
    }

    if (action === 'register_new') {
        if (matchedRows.length > 0) {
            throw new Error(
                '이미 기초시트에 같은 물품코드가 있습니다. 목록을 새로고침해 주세요.'
            );
        }

        var amount =
            Number(
                String(
                    payload.amount || '0'
                )
                .replace(/,/g, '')
                .replace(/원/g, '')
            );

        if (
            !isFinite(amount) ||
            amount < 0
        ) {
            throw new Error(
                '금액을 올바르게 입력해 주세요.'
            );
        }

        var storageStatus =
            String(
                payload.storageStatus || ''
            ).trim();

        var logistics =
            String(
                payload.logistics || ''
            ).trim();

        var pickOrder =
            String(
                payload.pickOrder || ''
            ).trim();

        if (storageStatus === '') {
            throw new Error(
                '저장상태를 선택해 주세요.'
            );
        }

        if (logistics === '') {
            throw new Error(
                '물류지를 선택해 주세요.'
            );
        }

        if (pickOrder === '') {
            throw new Error(
                '집품순서를 입력해 주세요.'
            );
        }

        var destinationRow =
            Number(
                payload.destinationRow
            );

        var lastBasicRow =
            getLastBasicDataRow_(
                basicSheet
            );

        if (
            !destinationRow ||
            destinationRow < 3 ||
            destinationRow > lastBasicRow
        ) {
            throw new Error(
                '기초 검색에서 신규물품을 삽입할 위치를 선택해 주세요.'
            );
        }

        /*
         * 사용자가 선택한 기존 물품 행의 위쪽에 신규 행을 삽입합니다.
         */
        basicSheet.insertRowBefore(
            destinationRow
        );

        var newRow =
            destinationRow;

        basicSheet
            .getRange(
                newRow,
                1,
                1,
                7
            )
            .setValues([[
                itemCode,
                inputName,
                amount,
                storageStatus,
                '',
                logistics,
                pickOrder
            ]]);

        basicSheet
            .getRange(
                newRow,
                3
            )
            .setNumberFormat(
                '#,##0"원"'
            );

        updateBasicCombinedColumn_(
            basicSheet,
            newRow,
            1
        );

    } else if (
        action === 'keep_existing_name'
    ) {
        if (matchedRows.length === 0) {
            throw new Error(
                '기초시트의 기존 물품코드를 찾을 수 없습니다.'
            );
        }

        var pairKey =
            normalizedCode +
            '\u0001' +
            normalizeItemName_(
                inputName
            );

        addIgnoredMismatchForCurrentInput_(
            inputSheet,
            pairKey
        );

    } else if (
        action === 'replace_name'
    ) {
        if (matchedRows.length === 0) {
            throw new Error(
                '변경할 기존 물품코드를 찾을 수 없습니다.'
            );
        }

        if (matchedRows.length > 1) {
            throw new Error(
                '기초시트에 같은 물품코드가 여러 행 있습니다. 자동 변경하지 않고 직접 확인해 주세요.'
            );
        }

        basicSheet
            .getRange(
                matchedRows[0],
                2
            )
            .setValue(
                inputName
            );

    } else if (
        action === 'postpone'
    ) {
        return {
            success: true,
            postponed: true,
            state:
                getNewItemReviewDialogState()
        };

    } else {
        throw new Error(
            '처리 방법을 선택해 주세요.'
        );
    }

    SpreadsheetApp.flush();

    refreshUnregisteredItems_(ss);

    return {
        success: true,
        state:
            getNewItemReviewDialogState()
    };
}


// =====================================================
// 물품명 불일치 선택 항목 일괄 처리
// 신규물품은 위치 선택이 필요하므로 일괄처리 대상에서 제외합니다.
// =====================================================
function processItemNameMismatchBatch(
    payloads
) {
    payloads = Array.isArray(payloads)
        ? payloads
        : [];

    if (payloads.length === 0) {
        throw new Error(
            '일괄 처리할 물품명 확인 항목을 선택해 주세요.'
        );
    }

    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var inputSheet =
        ss.getSheetByName('입력시트');

    var basicSheet =
        ss.getSheetByName('기초');

    if (
        !inputSheet ||
        !basicSheet
    ) {
        throw new Error(
            '입력시트 또는 기초시트를 찾을 수 없습니다.'
        );
    }

    var lastRow =
        getLastBasicDataRow_(
            basicSheet
        );

    var basicValues =
        lastRow >= 3
            ? basicSheet
                .getRange(
                    3,
                    1,
                    lastRow - 2,
                    2
                )
                .getDisplayValues()
            : [];

    var rowsByCode = {};

    for (
        var i = 0;
        i < basicValues.length;
        i++
    ) {
        var code =
            normalizeItemCode_(
                basicValues[i][0]
            );

        if (code === '') {
            continue;
        }

        if (!rowsByCode[code]) {
            rowsByCode[code] = [];
        }

        rowsByCode[code].push(
            i + 3
        );
    }

    var changedCount = 0;
    var keptCount = 0;
    var postponedCount = 0;

    for (
        var p = 0;
        p < payloads.length;
        p++
    ) {
        var payload =
            payloads[p] || {};

        var itemCode =
            String(
                payload.code || ''
            ).trim();

        var inputName =
            String(
                payload.name || ''
            ).trim();

        var action =
            String(
                payload.action || ''
            ).trim();

        var normalizedCode =
            normalizeItemCode_(
                itemCode
            );

        var matchedRows =
            rowsByCode[
                normalizedCode
            ] || [];

        if (matchedRows.length === 0) {
            throw new Error(
                itemCode +
                ': 기초시트의 기존 물품코드를 찾을 수 없습니다.'
            );
        }

        if (
            action ===
            'keep_existing_name'
        ) {
            var pairKey =
                normalizedCode +
                '\u0001' +
                normalizeItemName_(
                    inputName
                );

            addIgnoredMismatchForCurrentInput_(
                inputSheet,
                pairKey
            );

            keptCount++;

        } else if (
            action === 'replace_name'
        ) {
            if (
                matchedRows.length > 1
            ) {
                throw new Error(
                    itemCode +
                    ': 같은 물품코드가 기초시트에 여러 행 있어 자동 변경할 수 없습니다.'
                );
            }

            basicSheet
                .getRange(
                    matchedRows[0],
                    2
                )
                .setValue(
                    inputName
                );

            changedCount++;

        } else if (
            action === 'postpone'
        ) {
            postponedCount++;

        } else {
            throw new Error(
                itemCode +
                ': 처리 방법을 선택해 주세요.'
            );
        }
    }

    SpreadsheetApp.flush();
    refreshUnregisteredItems_(ss);

    return {
        success: true,
        changedCount: changedCount,
        keptCount: keptCount,
        postponedCount:
            postponedCount,
        state:
            getNewItemReviewDialogState()
    };
}


// =====================================================
// 기초 통합 모델리스 창
// 물품 검색 + 미등록 물품 + 행 이동
// =====================================================
function showBasicToolsDialog() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    /*
     * 모델리스 창을 열기 전에 H1을 선택해
     * 시트 화면이 H열·I열 부근을 기준으로 보이게 합니다.
     */
    ss.setActiveSheet(sheet);
    sheet.setActiveRange(
        sheet.getRange('H1')
    );
    SpreadsheetApp.flush();

    var html = HtmlService
        .createHtmlOutputFromFile('기초통합검색')
        .setWidth(900)
        .setHeight(650);

    SpreadsheetApp
        .getUi()
        .showModelessDialog(
            html,
            '기초 물품 검색 · 미등록 물품'
        );
}


function getBasicToolsDialogState() {
    return {
        searchItems:
            getBasicSearchDatasetForSidebar_(),
        unregistered:
            getBasicUnregisteredItemsForSidebar(),
        destination:
            getBasicMoveDestinationForSidebar_()
    };
}


// =====================================================
// 기초시트 I2 위치의 검색하기 이미지 버튼
// =====================================================
function setupBasicToolLauncher() {
    var sheet =
        SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (!sheet) {
        throw new Error(
            '기초시트를 찾을 수 없습니다.'
        );
    }

    setupBasicToolLauncher_(sheet);

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            'I2 위치에 검색하기 버튼을 만들었습니다.',
            '✅ 검색 버튼 준비 완료',
            5
        );
}




var BASIC_TOOL_BUTTON_IMAGE_BASE64_ = 'iVBORw0KGgoAAAANSUhEUgAAAUoAAABOCAYAAABGz1+nAAAQeUlEQVR4nO3dd3wU1d7H8c+W9IQkdEFpggRFqY8QcuVRQUFBmqIELChXQXhAQGlBmkggFAvVSInSQVp8MEpRL2AEC4goHRUjRWIoSSAhZXfvH0uGTXY32zch+3vzz2TKOTPDK9+cM+WMqu3oOwwIIYSwSuvshpeP5bhzP4QQwuMio4Kd2s6hoJRwFELcykwzzJHQtCsoLQWks8kshBBlxTTLiqbtyTKbQelsAgshRHljmmFF2Xb5WI7NbLMalBKQQoiKrCjXLh/Lsdm6VFuaKSEphPAVllqZJVkMSksFCCFERWUr68yC0pELnEIIUVGYdsVLKhaUEpJCCF9mLSxL7XoLIYQwCUppTQohhOVWpbQohRDCBglKIYSwQQ3S7RZCCFMlu9/SohRCCBskKIUQwgYJSiGEsEGCsgw1rduKvQlp7E1IY0yv6S6XV7VSDVJnnGZvQhrDn5gMQO3Kdfh2xp/sTUhjSuxcl+sAuL/RA8p+D+3yplvKLKnVne2UOkZ0m+KROoSwl9MjnAujLq1782bvOaWuU6gr5PcLxxm57HkuZv+jzPfX+N+c1gbYrEut1rBj8i8AfHdiN3ErBxVb7qfxQ60y/u0L8DOWp9X4oVKpbiz3x5K3+y2kw31dLS7T6Qt5fGpLsnKu3KxHa7Lffrb32xnF6tBa3m8hvEWC0kUGg+1PDmk1Wu6qdQ/N67fhy0Nbna4rIjiS4IBQAEIDKzldTkkqVE4ts6XhbU1YMXybzfVy8q6S9OU8Vu5a5HRdQnhSuQnKvQlpVpdFj6njxT1xTMr+DaTs32BxmVqlZvvkXwkJNIbbuUvWj9EeEaFVlOns61kulWVq/KpXYZXbinNYcEAoj7XsJUEpyq0yDcrSwtHaeuU5NEtqckczJSQzstM5fvZXl8q7LaK2Mn0m4w+XyvKGU+ePlvr/1aDGXawauROAzJzL3totIRxWZkFpb0ha2u5WCcsn2z6vTO84mIzeoHepvBYN2irTGrXG6XL8tQHsnHK42HVAew1dHOt0vSVVqVRdmf7rFgh+4bvKJCidDUnT7ct7WDau3ZROLXoAUKAr4PP9G0mdcVq52eIorUZLpxY9lZ97tn2WNXsWF7s5ZKpHm370aNPPqbpKZcc1WXs1r99GmT557ojbyhXC3bwelNZCsrTgs7RNeQ7LkMBQJj3zPuobrb41uz8kPfO8S2U+HfMSVSvVUH4ODgjl7X6LGLq4D4W6QofKyi/Mo/34hk7vS0yTDk5va+rhe7so03uPf+2WMoXwBK8+R2kp8KLH1LEZeNbWcbVl6gmBfkHMeG4x9Ws0AozX6ZbsfJfMnMvEjK2nHEv0mDoMSXzGrjIb127KwE6jALiam8XnBzYB0Lz+/SQ8v4QAv0CzbbZ8t4roMXXoM/shNx2ZezWt24p61Y1h/dvfxzjr4o0uITzJa0FpLSQdUd7DsnJoVea+vJrWDWMAyMi6wBsfvUhBYb7TZTaocRfvvLRcec5yfko8CZvGcvTMzwC0i3qYxYM3U7fanU7XoVKpeLR5D+a9vIbtk39hT/zvbBm3j0l93qPJ7fc5XW5pXuowTJn+JPUjj9QhhLt4JSjdEZKlbVcewjKmSQeWD9/GvXVbAXD24p8MWvQkF66cc7rMB5s+RuLgzVQOrQrAp9+vIfn71eQVXGfE0uc5euYQAI1q3cOQx+OcqsNP68+s/klMiZ1L64YxhAWFo9VoqRFRi84terFkSDJPtetvdfunol9Q3qDZm5BmV7e8zV3tiW5sbOlezP6Hzw9sdGrfhfCWMnmF0dVri+Xp2mTD25ow84WlzO6fRJWwagDsObKDAfO7udSdrBQcwbR+CwkNDANg6w/rSNh8Mwwzcy4z+IPebP1xPdm5mbzz6USn6hnceSwxUQ8D8M3RncTOeZgOE+/mtSX9OH/5DGq1hpHdptC0Tkunj8VUaGAY455MUH5+f+tb5BfmuaVsITyl3DxwfisKDghl2dCt+Gn8AOOzkgtT4pVriK7IyrnCB9tm8vIjrzM/ZRrrU5PM1rlekMu0T95g1ubx5BfmcVvk7Q7V4af1p3ubvgCcv3yGuJWDlMsE35/cw4TVQ1gyJBmVSkXvmP78mnbArIwNez9mzpYJdtWnVmuY2ncBNW48D7rv+H/YcTDZoX0Woix4vEVZslvsrtZgyXLKovudk3eVbQc2kZGdzvyUeJ6e+b8OhaRpS8pSq2rFfxbRaUoziyFpqZwCXYHyrGZeQdG8fOU1y5J11K5chyB/4wClP5zcY3Yt9XDaT8qD4A1vu9vu47JErVIz7skE2jZ+EIBzl/5i8trXXCpTCG+RFqWLZmwahwEDer3O4W1/TTtg8w9Hbv41u8vLyLpAzNh6xeadu/QX7cbWtbi+Xm//A/A6vWOPIJny0/gR13sWnVv0Aoyt5dEfD5C3ccQtQ4LSRaYBolZrmN1/Gf/T8AG0GvtOrcFgID3zHHErX+XIXwdLXbd3zIuMdHLIsezcTN5aN4Jvju5U5p29lEZ2biZhQeHc36g9flr/Yq3KpnVaEh4cCcDhtNL3zZqqYdWJfy5Rucl15dolhi6O5be/jzlVnhBlQcajdKN61RsS3fghu0MSjI/m1IioTcdmT3hwzyAsKJwOzYoPpabTF7I+dRkANSNrE//sB9StdidB/iHc3+gBpsTOA4zDxK37ZonDdXa4rysrR+5QQvJ0+ikGLuzFqfNHXTwaIbxLWpRuFOwfokxvP7iFSWuGlbK28TGZ9wasBFCuFZbmk9QkPrFxvbKklg2iWTBwHQABWvMH05O+nMedNaN4sOlj/KtJR/7VpGOx5fmFeUxdP5LT6accqrdGRG2m9l2gjIX51aHPmLZhFDl5Vx0qR4jyQILSQ+x5rbCgsMDj+2HrGqdOX0jcykF0bNaNbvfHElWrKYH+wWRkXeC7k7tYvetD0jJ+d7jeC1fOsnp3Il1aP82c5Ans/Pn/nT0EIcqcBKXAYDCw42Cy2x/VmZ8ST+K2WRToPP8HQQhP8vg1Sk89xuOpx46Ee0lIiopAbuZ4iD03dBy56SOEKDtlNh6lKy3A8vButyV5BdeV6Ueb9+DR5j3s3vZ6fq4H9kgI4Q5eaVG6cyALdw6w4W5/pJ9g/2/fOtzdTM88z85DnrnZcb0gV3kzx11hbPqspSsjI9lbR76H6hDCXqq2o+8wXD6WA0BklO1HVFzhasiV55AUQlQsprno1WuU1lqWtlqX1taJHlOn3HbDhRAVh1dblEXcEW4lQ1JalkIIdyqzFmURd4xHWTJspWUphPCUMns8yNURzsvrSOdCiIqnTLrelpQWco5+oVG64UIIV5nmYrkJSldIWAoh3K3Mr1G6m3TDhRCeVCGCEiQshRCeU2GCEiQshRCeUeFGZbD26JCnrlmqVCreH7Sc6hE1zZbp9IWMWzaYtH/+AKBqperMH7LKalnzPp1O6uGvLC4bH5vAvfVufjJWp9cxe+Mkfjr1Hd2j+9C5dQ9enddHWV4zshZzXlnK6CUDOXsxjTZR7RncdRQvzH6CZSO3sOqrD/nyYIpDx/rGU1No3ahdsXlbv9vAyq8S6REdS8cWXfi/hc8CxvOyYMhqKodVtVjWjPXjOfjb98rPK0anKF+zNKXT65i0Yjinzln+dIS3zr/wbRUuKMG7YanV+FE9oiZzk+P59sjXyvwqlaqxYMhqwkMi4cYvakZWOn2mP0LCgEQOnNrHul1J3FuvJeNjExjwbk+uXbc++ve0NWOU6fvqtyKuzwxlfY1ag1pVvHNQOawqGrWW7Nysm+uoNVbXt0e18Jp8/sNmPt65EIBRT71Fzcq1AFCr1Ur5ReelclhVElPm8PXPX9gs+7mZj5vNCw0KY8nwTYTc+La5Jd46/8K3VcigBO+FZaGugKycKwzrHsew7nHFll3Pz+VSdoZb61Oh4om2T3P6wilOnDlsdb376rcGoGqlamTlXHHrPhQxYLC5jj1felShYtHQtUSEVjZbptPruHY92+q23j7/wjdV2KAE74SlwWDglfd727VuzN0PMfTGL3Pd6g3o2a6vsmzpiM188eMWPtqxwOr2apWaFx4ZzF2172HC8mHEv7iQBjUbAZB57eanXyNDq9CpVXeu5mYT+9C/iV87FjB+NnbtuB0OH6MzCgsLyMi8wKtdR/Fq11Fmyxd9Notdh7YDxtZoRGhl5iXHk2rSKrSHN8+/8F0VOijBs2E5oe8s7qnb3OZ6eoOe52Z2IfXI1w4HQZGo25vS9+GXqR5Rk+nrxpGW/jtxSYMB6BXTj06tugPGLve4Z6Zz5dol4teOZcZLH/DvzsM5/OdBCnQFPDfzcT5+w/KQbiGBobw7MIlNqav44sctTu1nEQMG5XqlLXq93vgZ2+5xSpCZ2rBnORu+WWE235vnX/i2Ch+U4LmwnLq6eEspJDCUpSM2M2fjZH44kVps2cR+s7m7TjObZeoNep6f1aXYx8n8NH4M6xHHvqO7mb1hIlk5mcW30evRG4xd3JYN26LTFzJjfRwXs/5hzsZJvPLYSE6cPax0g/V6PTq9zqxu7Y2bKUVfTnSWI8faL6EzBoOBQXOfAUo/hyV56/wLUSHezLGXJ0YbCvIPJul1yx/l0hv0xK8dy6+nfzJb5kgggPE6nj3XBMEYdEWD9Vr62VkJAxI5mvYzH+24eTPHgIHZGybRK6YfHVt0ZfD8WIfKdCZUTXnr/AvfY5qLPtGiLFLUsnTnNcrc/Bz6TH/EbL5apWb12G1UCo5Q5mnUWt4dmFTsUZbXn5wMGD/CNXH5a/zx90mL9RgwUC28BgkDEgkOCDFbfuLMYSauGG5c12CgbVR7hvecYLksg4E5Gyfz48lv7TxKo/Qr5+ncuiedW/dU5n26b53V9RvVbkKP6L40rNWY0KAwcvJyOHfxL7btT1buUL+16g2H9qEkb51/4dt8KijB/e+Aq1VqEl9bT1hQuNkyg8FAtkk3OdA/kOoRNXln0xS+P/6NMj88JJLEYeuJDK3CH1j/Ra0SVo3ggBCGJ/bn70tnlfm9Yp6lY4suxdbdd2y3xQBRoWLF6BQiLdxhtmXOxsl2rxvgF8CbsbPY/ct24j6ay5WrlwkOCKZNVHuGdY/jYlY6x2/ctW/VqC2jnppqsRy9Qc/kFSM4cfaIxeXePP/Cd/lcULqbv18AYUHhZr98pSnZfTQYbD9CU2KDkjPs3/TGP89TKfUV1Qzmxw6w/+Q+i6Fe1D0OD4m0WkuZnH/hcyQoXZRfkEdWTiYje02yuHzXoe0s+mwWYPxKY3ZuptLdM5Wbl0NGVnqpdWXlZlJQmM97gz42W2bpOpw1pjd/3EWv16M3uUGUV3Cdt9eMome7vsT3X0BoUBi5ebmcvZjG3OR4pTVZapk39lFvML/xVMSb51/4Lp+6mSOEEPYyG2atKCCLFgghhC8r2XisUKMHCSGEJ0hQCiGEDUpQSvdbCCHMu90gLUohhLCpWFBKq1II4cusPQFk1qKUsBRC+KLSHpMstestYSmE8AW2ss5iUJomqoSlEKIiM804ay/dWH2F0bQLLm/uCCEqGnsCsojNd70jo4KVAh0pWAghyhtLPWR7ssyuQTEs3eCRLrkQ4lbmSGPPodGD5NqlEOJW5mxP2Olh1qTrLYTwFf8F3ZHtReaNswoAAAAASUVORK5CYII=';
function setupBasicToolLauncher_(sheet) {
    /*
     * 검색 버튼 이미지는 고정행 I1에 직접 배치합니다.
     * 이미지가 보이지 않는 원인이 될 수 있는 병합과
     * setAnchorCell 재지정을 사용하지 않습니다.
     */
    var targetRange = sheet.getRange('I1:M34');
    var mergedRanges = targetRange.getMergedRanges();

    for (var i = 0; i < mergedRanges.length; i++) {
        mergedRanges[i].breakApart();
    }

    targetRange
        .clearContent()
        .clearDataValidations()
        .clearFormat();

    sheet.getRange('I1:M1')
        .setBackground('#D9EAD3')
        .setBorder(
            true,
            true,
            true,
            true,
            false,
            false,
            '#93C47D',
            SpreadsheetApp.BorderStyle.SOLID
        );

    sheet.getRange('I2:M2')
        .merge()
        .setValue(
            '검색 버튼을 눌러 물품을 찾거나 미등록 물품을 확인·이동할 수 있습니다.'
        )
        .setBackground('#F7FBF4')
        .setFontColor('#555555')
        .setFontSize(10)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setWrap(true)
        .setBorder(
            false,
            true,
            true,
            true,
            false,
            false,
            '#D9EAD3',
            SpreadsheetApp.BorderStyle.SOLID
        );

    sheet.setRowHeight(1, 58);
    sheet.setRowHeight(2, 32);

    /*
     * 기존 검색 버튼 이미지를 모두 제거합니다.
     */
    var images = sheet.getImages();

    for (var j = images.length - 1; j >= 0; j--) {
        try {
            var anchor = images[j].getAnchorCell();
            var title = '';

            try {
                title = images[j].getAltTextTitle() || '';
            } catch (ignoreTitle) {}

            if (
                title === '검색하기' ||
                (
                    anchor &&
                    anchor.getRow() >= 1 &&
                    anchor.getRow() <= 6 &&
                    anchor.getColumn() >= 9 &&
                    anchor.getColumn() <= 13
                )
            ) {
                images[j].remove();
            }
        } catch (ignore) {
            // 다른 이미지 처리 중 오류는 무시합니다.
        }
    }

    SpreadsheetApp.flush();

    var bytes = Utilities.base64Decode(
        BASIC_TOOL_BUTTON_IMAGE_BASE64_
    );

    var blob = Utilities.newBlob(
        bytes,
        'image/png',
        '기초관리_검색하기_버튼.png'
    );

    /*
     * 병합되지 않은 I1 셀에 직접 삽입합니다.
     * insertImage의 행·열 인수를 그대로 사용합니다.
     */
    var image = sheet.insertImage(
        blob,
        9,
        1,
        4,
        2
    );

    image
        .setWidth(330)
        .setHeight(54)
        .setAltTextTitle('검색하기')
        .setAltTextDescription(
            '물품 검색과 미등록 물품 관리 창 열기'
        )
        .assignScript('showBasicToolsDialog');

    SpreadsheetApp.flush();
}


// =====================================================
// 기초시트 예전 검색·미등록 보조영역 정리
// Q:U 미등록 표시 및 V열 원본행 보조값을 사용하지 않습니다.
// =====================================================
function cleanupLegacyBasicHelperArea_(sheet) {
    if (!sheet || sheet.getName() !== '기초') {
        return;
    }

    var maxColumns = sheet.getMaxColumns();

    if (maxColumns >= 17) {
        var endColumn = Math.min(22, maxColumns);

        sheet.getRange(
            1,
            17,
            sheet.getMaxRows(),
            endColumn - 16
        )
            .breakApart()
            .clearContent()
            .clearDataValidations()
            .clearFormat();

        try {
            sheet.showColumns(
                17,
                endColumn - 16
            );
        } catch (ignore) {
            // 이미 표시 중이면 무시합니다.
        }
    }
}


function cleanupLegacyBasicHelperArea() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('기초');

    if (!sheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    cleanupLegacyBasicHelperArea_(sheet);

    ss.toast(
        'Q:V 예전 보조영역을 삭제했습니다.',
        '✅ 기초시트 정리 완료',
        5
    );
}


// =====================================================
// 기초 관리 메뉴 수동 복구
// Apps Script 편집기에서 한 번 실행할 수 있습니다.
// =====================================================
function rebuildBasicManagementMenu() {
    onOpen();

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            '기초 관리 메뉴를 다시 만들었습니다.',
            '✅ 메뉴 복구 완료',
            5
        );
}


function checkBasicSearchButtonImage() {
    var sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName('기초');

    if (!sheet) {
        throw new Error('기초시트를 찾을 수 없습니다.');
    }

    var images = sheet.getImages();
    var count = 0;

    for (var i = 0; i < images.length; i++) {
        try {
            var title = images[i].getAltTextTitle() || '';

            if (title === '검색하기') {
                count++;
            }
        } catch (ignore) {}
    }

    SpreadsheetApp
        .getActiveSpreadsheet()
        .toast(
            '검색하기 이미지 수: ' + count + '개',
            '🔎 이미지 점검',
            5
        );

    return count;


















}







// 전체 실행 파이프라인 성능 최적화 v11.11
// IMP-028 신규물품 금액을 합계금액이 아닌 개당 단가로 환산
// IMP-027 미등록 팝업 설치형 onEdit 분리 / 고속판정 유지
// IMP-026 삭제→전체붙여넣기 미등록 증분검사 / 기초맵·FG 재사용
// IMP-025 입력 직후 미등록 확인 유지 + S:V 일괄처리 고속화
// IMP-024 입력 즉시처리: 미등록확인/강제 flush 비동기 분리
// IMP-023 입력 삭제 즉시화 + 붙여넣기 자동채우기 고속화
// IMP-022 물품코드 9자리 통일 / 총수량 중복 방지 / 통계 복합키 정상화
// IMP-021D 새로고침 물품점검 중복 제거 + 변경시만 재검사
// IMP-021C 설치형 onOpen 트리거로 고정 알림 자동 표시
// IMP-021B 고정 알림 모달 + 기초 검색 행보기/시트작업 연계
// IMP-021A 신규물품 점검 창 모달 고정
// IMP-021 신규물품 위치선택 삽입 + 입력금액 자동반영 + 물품명 일괄처리
// IMP-020B 새로고침 시 미등록 점검 + V열 체크박스 마이그레이션
// IMP-020A V열 기존 체크박스 검증 충돌 방지
// IMP-020 신규물품 점검 팝업 + 물품명 불일치 사용자 선택 처리
// IMP-019 총수량·코스 시트 셀 크기 통일
// IMP-018 표본 기반 열 확장 및 일괄 행 높이 조정
// IMP-017 출력 시트 고정 레이아웃 및 기존 폭 보존형 수동 맞춤
// IMP-016 자동 맞춤 대상 제한 및 수동 셀 서식 일괄 정렬 메뉴
// IMP-015 관내·신규 빈 행 자동 정리 및 셀 크기 자동 맞춤
// IMP-014 총수량·코스 출력 행 자동 확보 및 실제 데이터 행까지 축소
// IMP-012 통계 저장 고속 교체 유지
// IMP-013 반복 테두리 처리 및 전체행 초기화 제거
// 동일 날짜 제자리 교체 + 신규 저장 범위 검증 + 신규 행 서식만 적용
// 통계 J2 기록 저장 개선본
// 1) 기존 onEdit(e)의 통계 J2 저장 구간을 아래 블록으로 교체
// 2) 보조 함수 전체를 Code.gs 맨 아래에 추가

// =====================================================
// v11.14 통계 저장 진행상태 기록
//
// Apps Script가 시간초과/강제종료되어 finally까지 못 가더라도
// 마지막 완료 지점을 DocumentProperties에 남깁니다.
// =====================================================
function setStatisticsSaveProgressV11_14_(
    stage,
    detail
) {
    var payload = {
        stage:
            String(stage || ''),
        detail:
            detail || {},
        updatedAt:
            Date.now()
    };

    PropertiesService
        .getDocumentProperties()
        .setProperty(
            'STATISTICS_SAVE_PROGRESS_V1114',
            JSON.stringify(
                payload
            )
        );

    console.log(
        '[통계저장] ' +
        payload.stage +
        ' / ' +
        JSON.stringify(
            payload.detail
        )
    );
}


function clearStatisticsSaveProgressV11_14_() {
    PropertiesService
        .getDocumentProperties()
        .deleteProperty(
            'STATISTICS_SAVE_PROGRESS_V1114'
        );
}


// 사용자가 실행해서 마지막 저장단계를 확인하는 함수
// 저장 전 현재 규모만 확인하는 안전한 진단(기록시트 쓰기 없음)
function diagnoseStatisticsSaveScaleV11_14() {
    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var input =
        ss.getSheetByName(
            '입력시트'
        );

    var stats =
        ss.getSheetByName(
            '통계'
        );

    var sheets = [
        '통계_기록',
        '통계_코스기록',
        '통계_지역기록',
        '통계_저장상태기록',
        '통계_관내기록',
        '통계_품목기록',
        '통계_조합원기록'
    ];

    var result = {
        inputLastRow:
            input
                ? input.getLastRow()
                : 0,
        recordDate:
            stats
                ? stats.getRange('E2')
                    .getDisplayValue()
                : '',
        recordSheets:
            {}
    };

    sheets.forEach(function(name) {
        var sheet =
            ss.getSheetByName(
                name
            );

        result.recordSheets[name] =
            sheet
                ? {
                    lastRow:
                        sheet.getLastRow(),
                    maxRows:
                        sheet.getMaxRows()
                }
                : null;
    });

    console.log(
        JSON.stringify(
            result
        )
    );

    ss.toast(
        '입력 ' +
        result.inputLastRow +
        '행 / 기준일 ' +
        result.recordDate,
        '통계 저장 규모 진단',
        7
    );

    return result;
}


function checkStatisticsSaveProgressV11_14() {
    var raw =
        PropertiesService
        .getDocumentProperties()
        .getProperty(
            'STATISTICS_SAVE_PROGRESS_V1114'
        );

    var result;

    if (!raw) {
        result = {
            stage:
                '저장 진행정보 없음',
            detail:
                {},
            updatedAt:
                0
        };
    } else {
        result =
            JSON.parse(
                raw
            );
    }

    console.log(
        JSON.stringify(
            result
        )
    );

    var ss =
        SpreadsheetApp
        .getActiveSpreadsheet();

    var timeText =
        result.updatedAt
            ? Utilities.formatDate(
                new Date(
                    result.updatedAt
                ),
                Session.getScriptTimeZone(),
                'yyyy-MM-dd HH:mm:ss'
            )
            : '';

    ss.toast(
        result.stage +
        (
            timeText
                ? ' / ' + timeText
                : ''
        ),
        '통계 저장 마지막 단계',
        8
    );

    return result;
}


// overwrite된 기존행은 이미 서식이 있으므로
// 동일 날짜 단순 덮어쓰기라면 서식 재호출을 생략합니다.
function needsStatisticsFormatV11_14_(
    writeResult
) {
    return !!(
        writeResult &&
        writeResult.rowCount > 0 &&
        writeResult.mode !== 'overwrite'
    );
}


function saveStatisticsSnapshot_(ss, statisticsSheet) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) {
    throw new Error('다른 통계 저장 작업이 실행 중입니다. 잠시 후 다시 시도하세요.');
  }

  try {
    setStatisticsSaveProgressV11_14_(
      '8-0 저장 준비',
      {}
    );

    var inputSheet = ss.getSheetByName('입력시트');
    var summarySheet = ss.getSheetByName('통계_기록');
    var courseSheet = ss.getSheetByName('통계_코스기록');
    var districtSheet = ss.getSheetByName('통계_지역기록');
    var storageSheet = ss.getSheetByName('통계_저장상태기록');
    var localMemberSheet = ss.getSheetByName('통계_관내기록');
    var itemHistorySheet = ss.getSheetByName('통계_품목기록');
    var memberHistorySheet = ss.getSheetByName('통계_조합원기록');

    if (!inputSheet || !summarySheet || !courseSheet || !districtSheet || !storageSheet || !localMemberSheet || !itemHistorySheet || !memberHistorySheet) {
      throw new Error('통계 기록용 시트 중 일부를 찾을 수 없습니다.');
    }

    setStatisticsSaveProgressV11_14_(
      '8-1 계산값 확정',
      {}
    );

    SpreadsheetApp.flush();

    var recordDate = normalizeStatisticsDate_(statisticsSheet.getRange('E2').getValue());
    if (!recordDate) throw new Error('통계 시트 E2의 데이터 수집 날짜를 확인하세요.');

    var lastRow = inputSheet.getLastRow();
    if (lastRow < 2) throw new Error('입력시트에 저장할 주문자료가 없습니다.');

    var inputValues = inputSheet.getRange(2, 1, lastRow - 1, 21).getValues();
    var itemMap = {};
    var courseMap = {};
    var districtMap = {};
    var storageMap = {};
    var localMemberMap = {};
    var itemHistoryMap = {};
    var memberHistoryMap = {};
    var uniqueItems = {};
    var uniqueCourses = {};
    var unregisteredItems = {};

    // IMP-005 저장 전 무결성 검증용 원본 합계
    var sourceTotalAmount = 0;
    var sourceTotalQuantity = 0;
    var sourceMembers = {};

    for (var i = 0; i < inputValues.length; i++) {
      var row = inputValues[i];
      /*
통계 저장 수량 불일치 수정

적용 위치:
saveStatisticsSnapshot_ 함수 안의 for문에서

    var row = inputValues[i];

바로 아래에 붙여넣습니다.
*/

// 통계 화면과 같은 기준으로,
// 입력시트 C열이 비어 있는 행은 기록에서 제외합니다.
var validRowValue = String(row[2] || '').trim();

if (validRowValue === '') {
    continue;
}
// 통계 저장 수량 불일치 수정 종료








      var course = normalizeCourseName_(row[0]);
      var member = String(row[3] || '').trim();

      /*
       * v11.5:
       * 통계 복합키 생성 전에 물품코드를 반드시 9자리로 통일합니다.
       * 숫자형 60203010 과 문자열 060203010 이 별도 품목으로
       * 기록되는 문제를 차단합니다.
       */
      var itemCode =
          formatItemCode9_(
              row[5]
          );

      var itemName = String(row[6] || '').trim();
      var quantity = toNumber_(row[9]);
      var amount = toNumber_(row[10]);
      var address = String(row[11] || '').trim();
      var storage = normalizeStorageStatus_(row[12]);
      var registrationStatus = String(row[20] || '').trim();
      var deliveryOrder = toNumber_(row[1]);
      var supplySerial = String(row[2] || '').trim();
      var memberName = String(row[4] || '').trim();

      if (course === '' && member === '' && itemCode === '' && itemName === '' && quantity === 0 && amount === 0) continue;

      sourceTotalAmount += amount;
      sourceTotalQuantity += quantity;
      if (member !== '') sourceMembers[member] = true;

      var itemKey = itemCode || itemName;
      if (itemKey !== '') uniqueItems[itemKey] = true;
      if (registrationStatus === '미등록' && itemKey !== '') unregisteredItems[itemKey] = true;

      if (itemName !== '') {
        if (!itemMap[itemName]) itemMap[itemName] = { quantity: 0, amount: 0 };
        itemMap[itemName].quantity += quantity;
        itemMap[itemName].amount += amount;
      }

      var historyItemKey = storage + '|' + (itemCode || itemName);
      if (itemName !== '' && (itemCode !== '' || itemName !== '')) {
        if (!itemHistoryMap[historyItemKey]) {
          itemHistoryMap[historyItemKey] = {
            storage: storage,
            itemCode: itemCode,
            itemName: itemName,
            quantity: 0,
            amount: 0,
            members: {},
            supplySerials: {}
          };
        }
        var itemHistory = itemHistoryMap[historyItemKey];
        itemHistory.quantity += quantity;
        itemHistory.amount += amount;
        if (member !== '') itemHistory.members[member] = true;
        if (supplySerial !== '') itemHistory.supplySerials[supplySerial] = true;
      }

      if (member !== '') {
        if (!memberHistoryMap[member]) {
          memberHistoryMap[member] = {
            memberName: memberName,
            district: extractDistrict_(address),
            amount: 0,
            quantity: 0,
            supplySerials: {},
            courses: {},
            address: address,
            localUse: false
          };
        }
        var memberHistory = memberHistoryMap[member];
        if (memberHistory.memberName === '' && memberName !== '') memberHistory.memberName = memberName;
        if (memberHistory.district === '' && address !== '') memberHistory.district = extractDistrict_(address);
        if (memberHistory.address === '' && address !== '') memberHistory.address = address;
        memberHistory.amount += amount;
        memberHistory.quantity += quantity;
        if (supplySerial !== '') memberHistory.supplySerials[supplySerial] = true;
        if (course !== '') memberHistory.courses[course] = true;
        if (deliveryOrder === 0 && supplySerial.indexOf('121') === 0) memberHistory.localUse = true;
      }

      if (course !== '') {
        uniqueCourses[course] = true;
        if (!courseMap[course]) courseMap[course] = { amount: 0, quantity: 0, members: {} };
        courseMap[course].amount += amount;
        courseMap[course].quantity += quantity;
        if (member !== '') courseMap[course].members[member] = true;
      }

      var district = extractDistrict_(address);
      if (district !== '') {
        if (!districtMap[district]) districtMap[district] = { amount: 0, members: {} };
        districtMap[district].amount += amount;
        if (member !== '') districtMap[district].members[member] = true;
      }

      if (storage !== '') {
        if (!storageMap[storage]) storageMap[storage] = { quantity: 0, amount: 0, items: {} };
        storageMap[storage].quantity += quantity;
        storageMap[storage].amount += amount;
        if (itemKey !== '') storageMap[storage].items[itemKey] = true;
      }


      // 관내 기준: 배송순서가 0이고 공급일련번호가 121로 시작하는 주문
      if (deliveryOrder === 0 && supplySerial.indexOf('121') === 0 && member !== '') {
        if (!localMemberMap[member]) {
          localMemberMap[member] = {
            memberName: memberName,
            district: extractDistrict_(address),
            amount: 0,
            quantity: 0,
            supplySerials: {},
            courses: {},
            address: address
          };
        }
        var localData = localMemberMap[member];
        if (localData.memberName === '' && memberName !== '') localData.memberName = memberName;
        if (localData.district === '' && address !== '') localData.district = extractDistrict_(address);
        if (localData.address === '' && address !== '') localData.address = address;
        localData.amount += amount;
        localData.quantity += quantity;
        if (supplySerial !== '') localData.supplySerials[supplySerial] = true;
        if (course !== '') localData.courses[course] = true;
      }
    }

    var topQuantityItem = getTopItem_(itemMap, 'quantity');
    var topAmountItem = getTopItem_(itemMap, 'amount');

    var totalAmount = toNumber_(statisticsSheet.getRange('A25').getValue());
    var totalQuantity = toNumber_(statisticsSheet.getRange('C25').getValue());
    var totalMembers = toNumber_(statisticsSheet.getRange('E25').getValue());
    var averageAmount = toNumber_(statisticsSheet.getRange('G25').getValue());

    if (totalAmount === 0 && totalQuantity === 0 && totalMembers === 0) {
      throw new Error('통계 총계가 모두 0입니다. 입력자료와 통계 계산 상태를 확인하세요.');
    }

    // IMP-005: 기록 삭제·저장 전에 화면 통계와 원본자료 합계를 대조합니다.
    setStatisticsSaveProgressV11_14_(
      '8-2 저장 전 무결성 검증',
      {
        inputRows:
          inputValues.length
      }
    );

    validateStatisticsSnapshotBeforeSave_({
      recordDate: recordDate,
      sourceTotalAmount: sourceTotalAmount,
      sourceTotalQuantity: sourceTotalQuantity,
      sourceMemberCount: Object.keys(sourceMembers).length,
      statisticsTotalAmount: totalAmount,
      statisticsTotalQuantity: totalQuantity,
      statisticsMemberCount: totalMembers
    });

    var dateKey = makeDateKey_(recordDate);

    setStatisticsSaveProgressV11_14_(
      '8-3 통계_기록 저장',
      {
        dateKey:
          dateKey
      }
    );

    var summaryAppend = upsertRowsByDateKey_(
      summarySheet,
      dateKey,
      [[
        recordDate, new Date(), totalAmount, totalQuantity, totalMembers, averageAmount,
        Object.keys(uniqueItems).length, Object.keys(uniqueCourses).length,
        topQuantityItem.name, topQuantityItem.value,
        topAmountItem.name, topAmountItem.value,
        Object.keys(unregisteredItems).length, 'J2 체크 저장'
      ]]
    );

    var courseRows = Object.keys(courseMap).sort().map(function(courseName) {
      var data = courseMap[courseName];
      var memberCount = Object.keys(data.members).length;
      return [recordDate, courseName, Math.round(data.amount), data.quantity, memberCount,
        memberCount > 0 ? Math.round(data.amount / memberCount) : 0];
    });
    setStatisticsSaveProgressV11_14_(
      '8-4 통계_코스기록 저장',
      {
        rows:
          courseRows.length
      }
    );

    var courseAppend = upsertRowsByDateKey_(
      courseSheet,
      dateKey,
      courseRows
    );

    var districtRows = Object.keys(districtMap).sort().map(function(districtName) {
      var data = districtMap[districtName];
      return [recordDate, districtName, Math.round(data.amount), Object.keys(data.members).length];
    });
    setStatisticsSaveProgressV11_14_(
      '8-5 통계_지역기록 저장',
      {
        rows:
          districtRows.length
      }
    );

    var districtAppend = upsertRowsByDateKey_(
      districtSheet,
      dateKey,
      districtRows
    );

    var storageOrder = { '상온': 1, '냉장(가공)': 2, '냉장': 3, '냉동': 4, '빵': 5, '기타': 6 };
    var storageRows = Object.keys(storageMap).sort(function(a, b) {
      return (storageOrder[a] || 999) - (storageOrder[b] || 999) || a.localeCompare(b, 'ko');
    }).map(function(storageName) {
      var data = storageMap[storageName];
      return [recordDate, storageName, data.quantity, Math.round(data.amount), Object.keys(data.items).length];
    });
    setStatisticsSaveProgressV11_14_(
      '8-6 통계_저장상태기록 저장',
      {
        rows:
          storageRows.length
      }
    );

    var storageAppend = upsertRowsByDateKey_(
      storageSheet,
      dateKey,
      storageRows
    );

    var localMemberRows = Object.keys(localMemberMap).sort().map(function(memberNo) {
      var data = localMemberMap[memberNo];
      var supplyCount = Object.keys(data.supplySerials).length;
      var courseNames = Object.keys(data.courses).sort().join(', ');
      return [
        recordDate,
        memberNo,
        data.memberName,
        data.district,
        Math.round(data.amount),
        data.quantity,
        supplyCount,
        supplyCount,
        courseNames,
        data.address,
        new Date(),
        'J2 체크 저장'
      ];
    });
    setStatisticsSaveProgressV11_14_(
      '8-7 통계_관내기록 저장',
      {
        rows:
          localMemberRows.length
      }
    );

    var localMemberAppend = upsertRowsByDateKey_(
      localMemberSheet,
      dateKey,
      localMemberRows
    );

    var itemHistoryRows = Object.keys(itemHistoryMap).sort().map(function(key) {
      var data = itemHistoryMap[key];
      return [
        recordDate,
        data.storage,
        data.itemCode,
        data.itemName,
        data.quantity,
        Math.round(data.amount),
        Object.keys(data.members).length,
        Object.keys(data.supplySerials).length,
        new Date(),
        'J2 체크 저장'
      ];
    });
    setStatisticsSaveProgressV11_14_(
      '8-8 통계_품목기록 저장',
      {
        rows:
          itemHistoryRows.length
      }
    );

    var itemHistoryAppend = upsertRowsByDateKey_(
      itemHistorySheet,
      dateKey,
      itemHistoryRows
    );

    var memberHistoryRows = Object.keys(memberHistoryMap).sort().map(function(memberNo) {
      var data = memberHistoryMap[memberNo];
      return [
        recordDate,
        memberNo,
        data.memberName,
        data.district,
        Math.round(data.amount),
        data.quantity,
        Object.keys(data.supplySerials).length,
        Object.keys(data.courses).sort().join(', '),
        data.address,
        data.localUse ? '관내' : '일반',
        new Date(),
        'J2 체크 저장'
      ];
    });
    setStatisticsSaveProgressV11_14_(
      '8-9 통계_조합원기록 저장',
      {
        rows:
          memberHistoryRows.length
      }
    );

    var memberHistoryAppend = upsertRowsByDateKey_(
      memberHistorySheet,
      dateKey,
      memberHistoryRows
    );

    setStatisticsSaveProgressV11_14_(
      '8-10 신규/교체행 서식',
      {
        summaryMode:
          summaryAppend.mode,
        courseMode:
          courseAppend.mode,
        districtMode:
          districtAppend.mode,
        storageMode:
          storageAppend.mode,
        localMode:
          localMemberAppend.mode,
        itemMode:
          itemHistoryAppend.mode,
        memberMode:
          memberHistoryAppend.mode
      }
    );

    /*
     * v11.14:
     * 기존 날짜 행을 같은 위치에 overwrite한 경우는
     * 이미 서식이 있으므로 반복 서식 API 호출을 생략합니다.
     */
    if (
      needsStatisticsFormatV11_14_(summaryAppend) ||
      needsStatisticsFormatV11_14_(courseAppend) ||
      needsStatisticsFormatV11_14_(districtAppend) ||
      needsStatisticsFormatV11_14_(storageAppend)
    ) {
      applyStatisticsRecordFormats_(
        summarySheet,
        summaryAppend.mode === 'overwrite' ? null : summaryAppend,
        courseSheet,
        courseAppend.mode === 'overwrite' ? null : courseAppend,
        districtSheet,
        districtAppend.mode === 'overwrite' ? null : districtAppend,
        storageSheet,
        storageAppend.mode === 'overwrite' ? null : storageAppend
      );
    }

    if (
      needsStatisticsFormatV11_14_(
        localMemberAppend
      )
    ) {
      applyLocalMemberRecordFormat_(
        localMemberSheet,
        localMemberAppend
      );
    }

    if (
      needsStatisticsFormatV11_14_(
        itemHistoryAppend
      ) ||
      needsStatisticsFormatV11_14_(
        memberHistoryAppend
      )
    ) {
      applyItemAndMemberHistoryFormats_(
        itemHistorySheet,
        itemHistoryAppend.mode === 'overwrite'
          ? null
          : itemHistoryAppend,
        memberHistorySheet,
        memberHistoryAppend.mode === 'overwrite'
          ? null
          : memberHistoryAppend
      );
    }

    setStatisticsSaveProgressV11_14_(
      '8-11 저장 반영 대기',
      {}
    );

    SpreadsheetApp.flush();

    setStatisticsSaveProgressV11_14_(
      '8-12 저장 후 무결성 검증',
      {}
    );

    // IMP-005: 저장 후 날짜별 행 수·중복키·요약 합계를 다시 확인합니다.
    validateStatisticsSnapshotAfterSave_({
      dateKey: dateKey,
      summarySheet: summarySheet,
      courseSheet: courseSheet,
      districtSheet: districtSheet,
      storageSheet: storageSheet,
      itemHistorySheet: itemHistorySheet,
      memberHistorySheet: memberHistorySheet,
      summaryWrite: summaryAppend,
      courseWrite: courseAppend,
      districtWrite: districtAppend,
      storageWrite: storageAppend,
      itemHistoryWrite: itemHistoryAppend,
      memberHistoryWrite: memberHistoryAppend,
      expectedCourseRows: courseRows.length,
      expectedDistrictRows: districtRows.length,
      expectedStorageRows: storageRows.length,
      expectedItemHistoryRows: itemHistoryRows.length,
      expectedMemberHistoryRows: memberHistoryRows.length,
      totalAmount: totalAmount,
      totalQuantity: totalQuantity,
      totalMembers: totalMembers
    });

    setStatisticsSaveProgressV11_14_(
      '8-13 통계 저장 완료',
      {
        dateKey:
          dateKey
      }
    );

  } finally {
    lock.releaseLock();
  }
}


// =====================================================
// IMP-005 통계 스냅샷 저장 전 무결성 검증
// =====================================================
function validateStatisticsSnapshotBeforeSave_(data) {
  var errors = [];

  if (!(data.recordDate instanceof Date) || isNaN(data.recordDate.getTime())) {
    errors.push('기준일이 올바른 날짜가 아닙니다.');
  }

  var sourceAmount = Math.round(toNumber_(data.sourceTotalAmount));
  var sourceQuantity = Math.round(toNumber_(data.sourceTotalQuantity));
  var sourceMembers = Math.round(toNumber_(data.sourceMemberCount));

  var statisticsAmount = Math.round(toNumber_(data.statisticsTotalAmount));
  var statisticsQuantity = Math.round(toNumber_(data.statisticsTotalQuantity));
  var statisticsMembers = Math.round(toNumber_(data.statisticsMemberCount));

  if (sourceAmount !== statisticsAmount) {
    errors.push(
      '총 공급금액 불일치: 입력자료 ' +
      sourceAmount.toLocaleString('ko-KR') +
      '원 / 통계 ' +
      statisticsAmount.toLocaleString('ko-KR') +
      '원'
    );
  }

  if (sourceQuantity !== statisticsQuantity) {
    errors.push(
      '총 주문수량 불일치: 입력자료 ' +
      sourceQuantity.toLocaleString('ko-KR') +
      '개 / 통계 ' +
      statisticsQuantity.toLocaleString('ko-KR') +
      '개'
    );
  }

  if (sourceMembers !== statisticsMembers) {
    errors.push(
      '조합원 수 불일치: 입력자료 ' +
      sourceMembers.toLocaleString('ko-KR') +
      '명 / 통계 ' +
      statisticsMembers.toLocaleString('ko-KR') +
      '명'
    );
  }

  if (errors.length > 0) {
    throw new Error(
      '통계 저장 전 무결성 검증 실패\n\n' +
      errors.join('\n')
    );
  }

  return true;
}


// =====================================================
// IMP-005 통계 스냅샷 저장 후 무결성 검증
// =====================================================
function validateStatisticsSnapshotAfterSave_(data) {
  var errors = [];

  var summaryRows = getRowsFromWriteResult_(data.summarySheet, data.summaryWrite, 14);
  var courseRows = getRowsFromWriteResult_(data.courseSheet, data.courseWrite, 6);
  var districtRows = getRowsFromWriteResult_(data.districtSheet, data.districtWrite, 4);
  var storageRows = getRowsFromWriteResult_(data.storageSheet, data.storageWrite, 5);
  var itemHistoryRows = getRowsFromWriteResult_(data.itemHistorySheet, data.itemHistoryWrite, 10);
  var memberHistoryRows = getRowsFromWriteResult_(data.memberHistorySheet, data.memberHistoryWrite, 12);

  if (summaryRows.length !== 1) {
    errors.push('통계_기록의 해당 기준일 행이 ' + summaryRows.length + '건입니다. 정상값은 1건입니다.');
  }
  if (courseRows.length !== data.expectedCourseRows) {
    errors.push('통계_코스기록 행 수 불일치: 저장 ' + courseRows.length + '건 / 예상 ' + data.expectedCourseRows + '건');
  }
  if (districtRows.length !== data.expectedDistrictRows) {
    errors.push('통계_지역기록 행 수 불일치: 저장 ' + districtRows.length + '건 / 예상 ' + data.expectedDistrictRows + '건');
  }
  if (storageRows.length !== data.expectedStorageRows) {
    errors.push('통계_저장상태기록 행 수 불일치: 저장 ' + storageRows.length + '건 / 예상 ' + data.expectedStorageRows + '건');
  }
  if (itemHistoryRows.length !== data.expectedItemHistoryRows) {
    errors.push('통계_품목기록 행 수 불일치: 저장 ' + itemHistoryRows.length + '건 / 예상 ' + data.expectedItemHistoryRows + '건');
  }
  if (memberHistoryRows.length !== data.expectedMemberHistoryRows) {
    errors.push('통계_조합원기록 행 수 불일치: 저장 ' + memberHistoryRows.length + '건 / 예상 ' + data.expectedMemberHistoryRows + '건');
  }

  validateRowsDateKey_(summaryRows, data.dateKey, '통계_기록', errors);
  validateRowsDateKey_(courseRows, data.dateKey, '통계_코스기록', errors);
  validateRowsDateKey_(districtRows, data.dateKey, '통계_지역기록', errors);
  validateRowsDateKey_(storageRows, data.dateKey, '통계_저장상태기록', errors);
  validateRowsDateKey_(itemHistoryRows, data.dateKey, '통계_품목기록', errors);
  validateRowsDateKey_(memberHistoryRows, data.dateKey, '통계_조합원기록', errors);

  checkDuplicateSnapshotKeys_(courseRows, 1, '통계_코스기록', errors);
  checkDuplicateSnapshotKeys_(districtRows, 1, '통계_지역기록', errors);
  checkDuplicateSnapshotKeys_(storageRows, 1, '통계_저장상태기록', errors);
  checkDuplicateCompositeKeys_(itemHistoryRows, [1, 2, 3], '통계_품목기록', errors);
  checkDuplicateSnapshotKeys_(memberHistoryRows, 1, '통계_조합원기록', errors);

  if (summaryRows.length === 1) {
    var summary = summaryRows[0];
    if (Math.round(toNumber_(summary[2])) !== Math.round(toNumber_(data.totalAmount))) {
      errors.push('통계_기록의 총 공급금액이 저장 전 값과 다릅니다.');
    }
    if (Math.round(toNumber_(summary[3])) !== Math.round(toNumber_(data.totalQuantity))) {
      errors.push('통계_기록의 총 주문수량이 저장 전 값과 다릅니다.');
    }
    if (Math.round(toNumber_(summary[4])) !== Math.round(toNumber_(data.totalMembers))) {
      errors.push('통계_기록의 조합원 수가 저장 전 값과 다릅니다.');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '통계 저장 후 무결성 검증 실패\n\n' +
      errors.join('\n')
    );
  }

  return true;
}

function getRowsFromWriteResult_(sheet, writeResult, columnCount) {
  if (!sheet || !writeResult || writeResult.rowCount <= 0) return [];
  return sheet
    .getRange(writeResult.startRow, 1, writeResult.rowCount, columnCount)
    .getValues();
}

function validateRowsDateKey_(rows, expectedDateKey, sheetName, errors) {
  rows.forEach(function(row, index) {
    var value = row[0];
    if (
      !(value instanceof Date) ||
      isNaN(value.getTime()) ||
      makeDateKey_(value) !== expectedDateKey
    ) {
      errors.push(
        sheetName + ' 저장 범위 ' + (index + 1) +
        '번째 행의 기준일이 올바르지 않습니다.'
      );
    }
  });
}


// =====================================================
// 지정 기준일의 기록 행 조회
// =====================================================
function getRowsByDateKey_(sheet, dateKey, columnCount) {
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var values = sheet
    .getRange(2, 1, lastRow - 1, columnCount)
    .getValues();

  return values.filter(function(row) {
    var value = row[0];

    return (
      value instanceof Date &&
      !isNaN(value.getTime()) &&
      makeDateKey_(value) === dateKey
    );
  });
}


// =====================================================
// 날짜 안에서 코스·지역·저장상태 키 중복 확인
// =====================================================
function checkDuplicateSnapshotKeys_(rows, keyIndex, sheetName, errors) {
  var seen = {};

  rows.forEach(function(row) {
    var key = String(row[keyIndex] || '').trim();

    if (key === '') {
      errors.push(sheetName + '에 빈 분류키가 있습니다.');
      return;
    }

    if (seen[key]) {
      errors.push(
        sheetName + '에 중복 분류키가 있습니다: ' + key
      );
      return;
    }

    seen[key] = true;
  });
}


function checkDuplicateCompositeKeys_(rows, keyIndexes, sheetName, errors) {
  var seen = {};
  rows.forEach(function(row) {
    var key = keyIndexes.map(function(index) {
      return String(row[index] || '').trim();
    }).join('|');
    if (key.replace(/\|/g, '') === '') {
      errors.push(sheetName + '에 빈 복합키가 있습니다.');
      return;
    }
    if (seen[key]) {
      errors.push(sheetName + '에 중복 복합키가 있습니다: ' + key);
      return;
    }
    seen[key] = true;
  });
}

function applyItemAndMemberHistoryFormats_(
  itemHistorySheet,
  itemAppend,
  memberHistorySheet,
  memberAppend
) {
  if (
    itemHistorySheet &&
    itemAppend &&
    itemAppend.rowCount > 0
  ) {
    itemHistorySheet
      .getRange(itemAppend.startRow, 1, itemAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd');

    itemHistorySheet
      .getRange(itemAppend.startRow, 6, itemAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');

    itemHistorySheet
      .getRange(itemAppend.startRow, 9, itemAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }

  if (
    memberHistorySheet &&
    memberAppend &&
    memberAppend.rowCount > 0
  ) {
    memberHistorySheet
      .getRange(memberAppend.startRow, 1, memberAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd');

    memberHistorySheet
      .getRange(memberAppend.startRow, 5, memberAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');

    memberHistorySheet
      .getRange(memberAppend.startRow, 11, memberAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
}


function normalizeStatisticsDate_(value) {
  var date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!value || isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function makeDateKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// IMP-006 성능 최적화: 날짜별 기록 일괄 삭제
function deleteRowsByDateKey_(sheet, dateKey) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var dates = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues();

  var matchingRows = [];

  for (var i = 0; i < dates.length; i++) {
    var value = dates[i][0];

    if (
      value instanceof Date &&
      !isNaN(value.getTime()) &&
      makeDateKey_(value) === dateKey
    ) {
      matchingRows.push(i + 2);
    }
  }

  if (matchingRows.length === 0) {
    return 0;
  }

  /*
   * 한 행씩 deleteRow()하지 않고 연속된 행을 묶어서
   * 아래쪽부터 deleteRows()로 삭제합니다.
   * 같은 날짜 기록을 교체할 때 API 호출 횟수를 줄입니다.
   */
  var groups = [];
  var startRow = matchingRows[0];
  var previousRow = matchingRows[0];

  for (var j = 1; j < matchingRows.length; j++) {
    var currentRow = matchingRows[j];

    if (currentRow === previousRow + 1) {
      previousRow = currentRow;
      continue;
    }

    groups.push({
      startRow: startRow,
      rowCount: previousRow - startRow + 1
    });

    startRow = currentRow;
    previousRow = currentRow;
  }

  groups.push({
    startRow: startRow,
    rowCount: previousRow - startRow + 1
  });

  for (var g = groups.length - 1; g >= 0; g--) {
    sheet.deleteRows(
      groups[g].startRow,
      groups[g].rowCount
    );
  }

  return matchingRows.length;
}

// =====================================================
// IMP-012 동일 날짜 기록 고속 교체
// =====================================================
function upsertRowsByDateKey_(sheet, dateKey, rows) {
  rows = rows || [];
  var existingRows = findRowsByDateKeyFast_(sheet, dateKey);

  if (rows.length === 0) {
    if (existingRows.length > 0) {
      deleteRowNumbersInGroups_(sheet, existingRows);
    }
    return {
      startRow: 0,
      rowCount: 0,
      columnCount: 0,
      mode: existingRows.length > 0 ? 'deleted' : 'none'
    };
  }

  var columnCount = rows[0].length;
  var canOverwrite =
    existingRows.length === rows.length &&
    areContinuousRows_(existingRows);

  if (canOverwrite) {
    var overwriteStartRow = existingRows[0];
    sheet
      .getRange(overwriteStartRow, 1, rows.length, columnCount)
      .setValues(rows);

    return {
      startRow: overwriteStartRow,
      rowCount: rows.length,
      columnCount: columnCount,
      mode: 'overwrite'
    };
  }

  if (existingRows.length > 0) {
    deleteRowNumbersInGroups_(sheet, existingRows);
  }

  var startRow = sheet.getLastRow() + 1;
  sheet
    .getRange(startRow, 1, rows.length, columnCount)
    .setValues(rows);

  return {
    startRow: startRow,
    rowCount: rows.length,
    columnCount: columnCount,
    mode: existingRows.length > 0 ? 'replace' : 'append'
  };
}

function findRowsByDateKeyFast_(sheet, dateKey) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(dateKey)
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findAll()
    .map(function(range) {
      return range.getRow();
    })
    .sort(function(a, b) {
      return a - b;
    });
}

function areContinuousRows_(rowNumbers) {
  if (!rowNumbers || rowNumbers.length === 0) return false;
  for (var i = 1; i < rowNumbers.length; i++) {
    if (rowNumbers[i] !== rowNumbers[i - 1] + 1) return false;
  }
  return true;
}

function deleteRowNumbersInGroups_(sheet, rowNumbers) {
  if (!rowNumbers || rowNumbers.length === 0) return 0;

  var groups = [];
  var startRow = rowNumbers[0];
  var previousRow = rowNumbers[0];

  for (var i = 1; i < rowNumbers.length; i++) {
    var currentRow = rowNumbers[i];

    if (currentRow === previousRow + 1) {
      previousRow = currentRow;
      continue;
    }

    groups.push({
      startRow: startRow,
      rowCount: previousRow - startRow + 1
    });

    startRow = currentRow;
    previousRow = currentRow;
  }

  groups.push({
    startRow: startRow,
    rowCount: previousRow - startRow + 1
  });

  for (var g = groups.length - 1; g >= 0; g--) {
    sheet.deleteRows(groups[g].startRow, groups[g].rowCount);
  }

  return rowNumbers.length;
}


function appendRows_(sheet, rows) {
  if (!rows || rows.length === 0) {
    return {
      startRow: 0,
      rowCount: 0,
      columnCount: 0
    };
  }

  var startRow = sheet.getLastRow() + 1;
  var rowCount = rows.length;
  var columnCount = rows[0].length;

  sheet
    .getRange(startRow, 1, rowCount, columnCount)
    .setValues(rows);

  return {
    startRow: startRow,
    rowCount: rowCount,
    columnCount: columnCount
  };
}

function toNumber_(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (value === '' || value == null) return 0;
  var number = Number(String(value).replace(/[₩원만원,\s]/g, ''));
  return isNaN(number) ? 0 : number;
}

function normalizeCourseName_(value) {
  var text = String(value || '').trim();
  if (text === '') return '';
  var match = text.match(/(\d{2})\s*(?:코스)?$/);
  return match ? match[1] + '코스' : text;
}

function extractDistrict_(address) {
  var match = String(address || '').match(/[가-힣]+(?:구|군|시)/);
  return match ? match[0] : '';
}

function normalizeStorageStatus_(value) {
  var text = String(value || '').trim();
  if (text === '') return '기타';
  if (text.indexOf('냉장(가공)') !== -1) return '냉장(가공)';
  if (text.indexOf('냉장') !== -1) return '냉장';
  if (text.indexOf('냉동') !== -1) return '냉동';
  if (text.indexOf('상온') !== -1) return '상온';
  if (text.indexOf('빵') !== -1) return '빵';
  return text;
}

function getTopItem_(itemMap, fieldName) {
  var result = { name: '', value: 0 };
  Object.keys(itemMap).forEach(function(itemName) {
    var value = toNumber_(itemMap[itemName][fieldName]);
    if (value > result.value) result = { name: itemName, value: value };
  });
  result.value = Math.round(result.value);
  return result;
}

function applyStatisticsRecordFormats_(
  summarySheet,
  summaryAppend,
  courseSheet,
  courseAppend,
  districtSheet,
  districtAppend,
  storageSheet,
  storageAppend
) {
  if (
    summarySheet &&
    summaryAppend &&
    summaryAppend.rowCount > 0
  ) {
    summarySheet
      .getRange(summaryAppend.startRow, 1, summaryAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd');

    summarySheet
      .getRange(summaryAppend.startRow, 2, summaryAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');

    summarySheet
      .getRange(summaryAppend.startRow, 3, summaryAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');

    summarySheet
      .getRange(summaryAppend.startRow, 6, summaryAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');

    summarySheet
      .getRange(summaryAppend.startRow, 12, summaryAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');
  }

  if (
    courseSheet &&
    courseAppend &&
    courseAppend.rowCount > 0
  ) {
    courseSheet
      .getRange(courseAppend.startRow, 1, courseAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd');

    courseSheet
      .getRange(courseAppend.startRow, 3, courseAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');

    courseSheet
      .getRange(courseAppend.startRow, 6, courseAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');
  }

  if (
    districtSheet &&
    districtAppend &&
    districtAppend.rowCount > 0
  ) {
    districtSheet
      .getRange(districtAppend.startRow, 1, districtAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd');

    districtSheet
      .getRange(districtAppend.startRow, 3, districtAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');
  }

  if (
    storageSheet &&
    storageAppend &&
    storageAppend.rowCount > 0
  ) {
    storageSheet
      .getRange(storageAppend.startRow, 1, storageAppend.rowCount, 1)
      .setNumberFormat('yyyy-mm-dd');

    storageSheet
      .getRange(storageAppend.startRow, 4, storageAppend.rowCount, 1)
      .setNumberFormat('#,##0"원"');
  }
}



// =====================================================
// IMP-011 관내 이용 기록 시트 서식
// =====================================================
function applyLocalMemberRecordFormat_(
  localMemberSheet,
  localMemberAppend
) {
  if (
    !localMemberSheet ||
    !localMemberAppend ||
    localMemberAppend.rowCount <= 0
  ) {
    return;
  }

  localMemberSheet
    .getRange(
      localMemberAppend.startRow,
      1,
      localMemberAppend.rowCount,
      1
    )
    .setNumberFormat('yyyy-mm-dd');

  localMemberSheet
    .getRange(
      localMemberAppend.startRow,
      5,
      localMemberAppend.rowCount,
      1
    )
    .setNumberFormat('#,##0"원"');

  localMemberSheet
    .getRange(
      localMemberAppend.startRow,
      6,
      localMemberAppend.rowCount,
      3
    )
    .setNumberFormat('#,##0');

  localMemberSheet
    .getRange(
      localMemberAppend.startRow,
      11,
      localMemberAppend.rowCount,
      1
    )
    .setNumberFormat('yyyy-mm-dd hh:mm:ss');
}



// =====================================================
// IMP-003 환경설정 시트 분리
// 시트명·핵심 범위·대기시간·통계 저장방식을 한 곳에서 관리
// =====================================================
function setupOperationConfigSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureOperationConfigSheet_(ss);

  ss.setActiveSheet(sheet);
  sheet.setActiveSelection('A1');

  ss.toast(
    '환경설정 시트를 준비했습니다. B열의 설정값만 변경하세요.',
    '✅ 환경설정 준비 완료',
    6
  );
}


function ensureOperationConfigSheet_(ss) {
  var sheetName = '환경설정';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var defaults = [
    ['설정항목', '설정값', '설명'],
    ['입력시트명', '입력시트', '주문자료를 붙여넣는 시트'],
    ['총수량시트명', '총수량', '전체 물품 집계 시트'],
    ['통계시트명', '통계', '통계 결과와 저장 확인 시트'],
    ['실행이력시트명', '자동화실행이력', '자동화 실행 결과 기록 시트'],
    ['통계기록시트명', '통계_기록', '일자별 통계 기록 시트'],
    ['코스시트목록', '31코스,32코스,33코스,34코스,35코스,36코스', '쉼표로 구분'],
    ['추가필수시트목록', '주문내역,기초,관내,신규,통계_데이터,통계_코스기록,통계_지역기록,통계_저장상태기록,통계_관내기록,통계_품목기록,통계_조합원기록', '쉼표로 구분'],
    ['지역목록', '중구,서구,동구,영도구,부산진구,동래구,남구,북구,해운대구,사하구,금정구,강서구,연제구,수영구,사상구,기장군', '지역 관련 확장 기능의 기준 목록'],
    ['기준일셀', 'E2', '통계 시트 기준일 셀'],
    ['총공급금액셀', 'A25', '통계 시트 총 공급금액 셀'],
    ['총주문수량셀', 'C25', '통계 시트 총 주문수량 셀'],
    ['총수량핵심수식셀', 'A3', '총수량 시트 핵심 배열수식 셀'],
    ['총수량제목범위', 'A2:K2', '총수량 시트 제목 검사 범위'],
    ['통계오류검사범위', 'A1:J25', '통계 시트 오류값 검사 범위'],
    ['계산대기시간ms', 1200, '통계 계산 완료 대기시간(밀리초)'],
    ['잠금대기시간ms', 1000, '중복 실행 잠금 대기시간(밀리초)'],
    ['통계저장방식', '확인', '확인 / 항상저장 / 저장안함 중 하나']
  ];

  if (sheet.getLastRow() === 0 || String(sheet.getRange('A1').getDisplayValue()).trim() === '') {
    sheet.getRange(1, 1, defaults.length, 3).setValues(defaults);
  } else {
    var existing = sheet
      .getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), 2)
      .getDisplayValues();

    var existingKeys = {};
    existing.forEach(function(row) {
      var key = String(row[0] || '').trim();
      if (key !== '') existingKeys[key] = true;
    });

    var appendRows = [];
    for (var i = 1; i < defaults.length; i++) {
      if (!existingKeys[defaults[i][0]]) {
        appendRows.push(defaults[i]);
      }
    }

    if (appendRows.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, appendRows.length, 3)
        .setValues(appendRows);
    }
  }

  sheet
    .getRange('A1:C1')
    .setBackground('#1F4E78')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 330);
  sheet.getRange('A:C').setVerticalAlignment('middle');
  sheet.getRange('B:B').setBackground('#FFF2CC');
  sheet.getRange('C:C').setWrap(true);

  var saveModeRule = SpreadsheetApp
    .newDataValidation()
    .requireValueInList(
      ['확인', '항상저장', '저장안함'],
      true
    )
    .setAllowInvalid(false)
    .build();

  var lastRow = sheet.getLastRow();
  var keyValues = sheet.getRange(2, 1, Math.max(1, lastRow - 1), 1).getDisplayValues();

  for (var r = 0; r < keyValues.length; r++) {
    if (String(keyValues[r][0] || '').trim() === '통계저장방식') {
      sheet.getRange(r + 2, 2).setDataValidation(saveModeRule);
      break;
    }
  }

  return sheet;
}


function getOperationConfig_(ss) {
  var sheet = ensureOperationConfigSheet_(ss);
  var lastRow = sheet.getLastRow();
  var values = sheet
    .getRange(2, 1, Math.max(1, lastRow - 1), 2)
    .getDisplayValues();

  var map = {};

  values.forEach(function(row) {
    var key = String(row[0] || '').trim();
    if (key !== '') map[key] = String(row[1] || '').trim();
  });

  function value_(key, defaultValue) {
    return map[key] !== undefined && map[key] !== ''
      ? map[key]
      : defaultValue;
  }

  function list_(key, defaultValue) {
    return value_(key, defaultValue)
      .split(',')
      .map(function(item) { return item.trim(); })
      .filter(function(item) { return item !== ''; });
  }

  function number_(key, defaultValue, minValue, maxValue) {
    var number = Number(value_(key, defaultValue));

    if (!isFinite(number)) number = defaultValue;
    if (minValue !== undefined) number = Math.max(minValue, number);
    if (maxValue !== undefined) number = Math.min(maxValue, number);

    return Math.round(number);
  }

  var saveMode = value_('통계저장방식', '확인');

  if (['확인', '항상저장', '저장안함'].indexOf(saveMode) === -1) {
    throw new Error(
      '환경설정의 통계저장방식은 확인, 항상저장, 저장안함 중 하나여야 합니다.'
    );
  }

  return {
    configSheetName: '환경설정',
    inputSheetName: value_('입력시트명', '입력시트'),
    totalSheetName: value_('총수량시트명', '총수량'),
    statisticsSheetName: value_('통계시트명', '통계'),
    historySheetName: value_('실행이력시트명', '자동화실행이력'),
    statisticsRecordSheetName: value_('통계기록시트명', '통계_기록'),
    courseSheetNames: list_('코스시트목록', '31코스,32코스,33코스,34코스,35코스,36코스'),
    extraRequiredSheetNames: list_('추가필수시트목록', '주문내역,기초,관내,신규,통계_데이터,통계_코스기록,통계_지역기록,통계_저장상태기록,통계_관내기록,통계_품목기록,통계_조합원기록'),
    regionNames: list_('지역목록', ''),
    recordDateCell: value_('기준일셀', 'E2'),
    totalAmountCell: value_('총공급금액셀', 'A25'),
    totalQuantityCell: value_('총주문수량셀', 'C25'),
    totalMainFormulaCell: value_('총수량핵심수식셀', 'A3'),
    totalHeaderRange: value_('총수량제목범위', 'A2:K2'),
    statisticsErrorRange: value_('통계오류검사범위', 'A1:J25'),
    calculationWaitMs: number_('계산대기시간ms', 1200, 0, 10000),
    lockWaitMs: number_('잠금대기시간ms', 1000, 0, 30000),
    statisticsSaveMode: saveMode
  };
}


function getRequiredSheetNamesFromConfig_(config) {
  var names = [
    config.inputSheetName,
    config.totalSheetName,
    config.statisticsSheetName,
    config.historySheetName,
    config.statisticsRecordSheetName
  ]
    .concat(config.courseSheetNames)
    .concat(config.extraRequiredSheetNames);

  var seen = {};

  return names.filter(function(name) {
    var normalized = String(name || '').trim();

    if (normalized === '' || seen[normalized]) {
      return false;
    }

    seen[normalized] = true;
    return true;
  });
}

// =====================================================
// 총수량 시트 이미지 버튼용
// 이미지에 연결할 함수 이름: onImageClick
// =====================================================
function onImageClick() {
  runAllUpdatesWithConfirm_();
}


// =====================================================
// 전체 로딩 완료 후 통계 기록 저장 여부 확인
// 실행 단계와 오류 이력 자동 기록
// =====================================================
function runAllUpdatesWithConfirm_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var lock = LockService.getDocumentLock();
  var config = getOperationConfig_(ss);

  var startTime = new Date();
  var endTime = null;

  var executionId =
    Utilities.formatDate(
      startTime,
      ss.getSpreadsheetTimeZone(),
      'yyyyMMdd-HHmmss'
    ) +
    '-' +
    Utilities.getUuid().substring(0, 8);

  var currentStage = '실행 준비';
  var result = '실행중';
  var statisticsSaved = '미선택';
  var errorMessage = '';

  var recordDate = '';
  var totalAmount = 0;
  var totalQuantity = 0;
  var userEmail = '';
  var shouldOfferItemReview = false;

  /*
   * IMP-006 성능 측정
   * 각 단계의 실제 실행시간을 초 단위로 기록합니다.
   */
  var stageTimings = {
    preValidation: 0,
    inputAutoFill: 0,
    unregisteredRefresh: 0,
    aggregateRefresh: 0,
    statisticsRefresh: 0,
    postValidation: 0,
    statisticsSave: 0
  };

  function measureStage_(timingKey, callback) {
    var measuredStart = new Date();

    try {
      return callback();
    } finally {
      var measuredEnd = new Date();

      stageTimings[timingKey] =
        Math.round(
          (measuredEnd.getTime() - measuredStart.getTime()) / 100
        ) / 10;
    }
  }

  try {
    userEmail =
      Session.getActiveUser().getEmail() ||
      Session.getEffectiveUser().getEmail() ||
      '';
  } catch (userError) {
    userEmail = '';
  }

  if (!lock.tryLock(config.lockWaitMs)) {
    endTime = new Date();

    appendAutomationHistory_(ss, {
      executionId: executionId,
      startTime: startTime,
      endTime: endTime,
      elapsedSeconds:
        Math.round((endTime.getTime() - startTime.getTime()) / 100) / 10,
      result: '중단',
      stage: '중복 실행 확인',
      statisticsSaved: '미선택',
      recordDate: '',
      totalAmount: 0,
      totalQuantity: 0,
      errorMessage: '이미 전체 로딩이 실행 중입니다.',
      userEmail: userEmail,
      historySheetName: config.historySheetName,
      stageTimings: stageTimings
    });

    ss.toast(
      '이미 전체 로딩이 실행 중입니다.',
      '안내',
      4
    );

    return;
  }

  try {
    currentStage = '전체 로딩 시작';

    ss.toast(
      '전체 데이터를 로딩하고 있습니다. 잠시 기다려 주세요.',
      '전체 로딩',
      5
    );

    currentStage = '0단계 - 전체 로딩 사전검증';

    var preValidation = measureStage_(
      'preValidation',
      function() {
        return validateSystemBeforeLoad_(ss, config);
      }
    );

    ss.toast(
      '필수 시트 ' +
      preValidation.checkedSheetCount +
      '개, 입력자료 ' +
      preValidation.inputRowCount +
      '행을 확인했습니다.',
      '✅ 사전검증 완료',
      4
    );

    currentStage = '1단계 - 입력시트 확인';

    var inputSheet = ss.getSheetByName(config.inputSheetName);

    if (!inputSheet) {
      throw new Error(
        config.inputSheetName + ' 시트를 찾을 수 없습니다.'
      );
    }

    /*
     * IMP-014
     * 이전 실행에서 출력 시트를 실제 데이터 행까지 줄였더라도
     * 이번 입력자료가 더 많으면 배열 수식이 펼쳐질 공간을 먼저 확보합니다.
     */
    ensureAggregateOutputCapacity_(
      ss,
      Math.max(
        preValidation.inputRowCount + 10,
        30
      )
    );

    currentStage = '2단계 - 입력시트 자동 채우기';

    measureStage_(
      'inputAutoFill',
      function() {
        autoFillInputSheet(inputSheet, ss);
      }
    );

    currentStage = '3단계 - 미등록 물품 갱신';

    measureStage_(
      'unregisteredRefresh',
      function() {
        refreshUnregisteredItemsIfChanged_(ss);
        SpreadsheetApp.flush();
      }
    );

    currentStage = '4단계 - 전체 집계 갱신';

    measureStage_(
      'aggregateRefresh',
      function() {
        sortAndRefreshAll(ss);
      }
    );

    currentStage = '5단계 - 통계 갱신';

    measureStage_(
      'statisticsRefresh',
      function() {
        updateInsights(ss);
        SpreadsheetApp.flush();

        if (config.calculationWaitMs > 0) {
          Utilities.sleep(config.calculationWaitMs);
        }

        SpreadsheetApp.flush();
      }
    );

    currentStage = '6단계 - 전체 로딩 결과검증';

    var postValidation = measureStage_(
      'postValidation',
      function() {
        return validateSystemAfterLoad_(ss, config);
      }
    );

    recordDate = postValidation.recordDate;
    totalAmount = postValidation.totalAmount;
    totalQuantity = postValidation.totalQuantity;

    var statisticsSheet = ss.getSheetByName(
      config.statisticsSheetName
    );

    if (!statisticsSheet) {
      throw new Error(
        config.statisticsSheetName + ' 시트를 찾을 수 없습니다.'
      );
    }

    var dateText = Utilities.formatDate(
      new Date(recordDate),
      ss.getSpreadsheetTimeZone(),
      'yyyy-MM-dd'
    );

    var shouldSave = false;

    if (config.statisticsSaveMode === '항상저장') {
      currentStage = '7단계 - 통계 자동 저장 결정';
      shouldSave = true;

    } else if (config.statisticsSaveMode === '저장안함') {
      currentStage = '7단계 - 통계 저장 생략 결정';
      shouldSave = false;

    } else {
      currentStage = '7단계 - 통계 저장 확인';

      var response = ui.alert(
        '통계 기록 저장',
        '전체 데이터 로딩과 결과검증이 완료되었습니다.\n\n' +
        '기준일: ' + dateText + '\n' +
        '총 공급금액: ' +
        Math.round(totalAmount).toLocaleString('ko-KR') +
        '원\n' +
        '총 주문수량: ' +
        Math.round(totalQuantity).toLocaleString('ko-KR') +
        '개\n\n' +
        '통계 기록을 저장하시겠습니까?',
        ui.ButtonSet.YES_NO
      );

      shouldSave = response === ui.Button.YES;
    }

    if (shouldSave) {
      currentStage = '8단계 - 통계 기록 저장';

      measureStage_(
        'statisticsSave',
        function() {
          saveStatisticsSnapshot_(
            ss,
            statisticsSheet
          );
        }
      );

      statisticsSaved = '저장';
      result = '성공';
      currentStage = '전체 로딩 및 통계 저장 완료';
      shouldOfferItemReview = true;

      ss.toast(
        dateText + ' 통계 기록을 저장했습니다.',
        '✅ 저장 완료',
        5
      );
    } else {
      statisticsSaved = '저장 안 함';
      result = '성공';
      currentStage = '전체 로딩 완료';
      shouldOfferItemReview = true;

      ss.toast(
        '통계 기록은 저장하지 않고 전체 로딩만 완료했습니다.',
        '저장 안 함',
        5
      );
    }
  } catch (err) {
    result = '오류';
    errorMessage =
      err && err.message
        ? err.message
        : String(err);

    ui.alert(
      '전체 로딩 오류',
      currentStage + '\n\n' + errorMessage,
      ui.ButtonSet.OK
    );
  } finally {
    endTime = new Date();

    var elapsedSeconds =
      Math.round(
        (endTime.getTime() - startTime.getTime()) / 100
      ) / 10;

    appendAutomationHistory_(ss, {
      executionId: executionId,
      startTime: startTime,
      endTime: endTime,
      elapsedSeconds: elapsedSeconds,
      result: result,
      stage: currentStage,
      statisticsSaved: statisticsSaved,
      recordDate: recordDate,
      totalAmount: totalAmount,
      totalQuantity: totalQuantity,
      errorMessage: errorMessage,
      userEmail: userEmail,
      historySheetName: config.historySheetName,
      stageTimings: stageTimings
    });

    lock.releaseLock();
  }

  /*
   * 실행 잠금을 해제한 뒤 사용자에게 미등록/불일치 안내를 표시합니다.
   * 팝업 대기시간은 자동화 실행시간 기록에 포함하지 않습니다.
   */
  if (shouldOfferItemReview) {
    try {
      offerPendingItemReviewAfterRun_();
    } catch (reviewError) {
      ss.toast(
        '물품 점검 안내를 열지 못했습니다: ' +
        reviewError.message,
        '물품 점검 안내',
        6
      );
    }
  }
}


// =====================================================
// 전체 로딩 자동화 실행이력
// =====================================================
function prepareAutomationHistorySheet_(ss, requestedSheetName) {
  var sheetName = String(
    requestedSheetName || '자동화실행이력'
  ).trim() || '자동화실행이력';

  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var headers = [
    '실행ID',
    '실행 시작',
    '실행 종료',
    '소요시간(초)',
    '실행 결과',
    '마지막 실행단계',
    '통계 저장 여부',
    '기준일',
    '총 공급금액',
    '총 주문수량',
    '오류 내용',
    '실행 사용자',
    '사전검증(초)',
    '입력 자동채우기(초)',
    '미등록 갱신(초)',
    '전체 집계(초)',
    '통계 갱신(초)',
    '사후검증(초)',
    '통계 저장(초)'
  ];

  var currentHeaders = sheet
    .getRange(1, 1, 1, headers.length)
    .getDisplayValues()[0];

  var needsHeader = false;

  for (var i = 0; i < headers.length; i++) {
    if (currentHeaders[i] !== headers[i]) {
      needsHeader = true;
      break;
    }
  }

  if (needsHeader) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground('#1F4E78')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(6, 180);
    sheet.setColumnWidth(7, 110);
    sheet.setColumnWidth(8, 110);
    sheet.setColumnWidth(9, 130);
    sheet.setColumnWidth(10, 110);
    sheet.setColumnWidth(11, 350);
    sheet.setColumnWidth(12, 200);

    for (var column = 13; column <= 19; column++) {
      sheet.setColumnWidth(column, 120);
    }
  }

  return sheet;
}


// =====================================================
// 전체 로딩 실행이력 한 줄 저장
// =====================================================
function appendAutomationHistory_(ss, history) {
  try {
    var sheet = prepareAutomationHistorySheet_(
      ss,
      history.historySheetName
    );

    var nextRow = Math.max(2, sheet.getLastRow() + 1);
    var timings = history.stageTimings || {};

    sheet
      .getRange(nextRow, 1, 1, 19)
      .setValues([[
        history.executionId || '',
        history.startTime || '',
        history.endTime || '',
        history.elapsedSeconds || 0,
        history.result || '',
        history.stage || '',
        history.statisticsSaved || '미선택',
        history.recordDate || '',
        history.totalAmount || 0,
        history.totalQuantity || 0,
        history.errorMessage || '',
        history.userEmail || '',
        Number(timings.preValidation || 0),
        Number(timings.inputAutoFill || 0),
        Number(timings.unregisteredRefresh || 0),
        Number(timings.aggregateRefresh || 0),
        Number(timings.statisticsRefresh || 0),
        Number(timings.postValidation || 0),
        Number(timings.statisticsSave || 0)
      ]]);

    sheet
      .getRange(nextRow, 2, 1, 2)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');

    sheet
      .getRange(nextRow, 8)
      .setNumberFormat('yyyy-mm-dd');

    sheet
      .getRange(nextRow, 9)
      .setNumberFormat('#,##0"원"');

    sheet
      .getRange(nextRow, 10)
      .setNumberFormat('#,##0"개"');

    sheet
      .getRange(nextRow, 13, 1, 7)
      .setNumberFormat('0.0');

    sheet
      .getRange(nextRow, 11)
      .setWrap(true);

    var resultCell = sheet.getRange(nextRow, 5);

    if (history.result === '성공') {
      resultCell
        .setBackground('#E2F0D9')
        .setFontColor('#006100')
        .setFontWeight('bold');

    } else if (history.result === '오류') {
      resultCell
        .setBackground('#FCE4D6')
        .setFontColor('#9C0006')
        .setFontWeight('bold');

    } else {
      resultCell
        .setBackground('#FFF2CC')
        .setFontColor('#7F6000')
        .setFontWeight('bold');
    }

  } catch (historyError) {
    console.error(
      '자동화 실행이력 저장 실패:',
      historyError
    );
  }
}



// =====================================================
// IMP-002 전체 로딩 전 사전검증
// =====================================================
function validateSystemBeforeLoad_(ss, config) {
  var errors = [];
  config = config || getOperationConfig_(ss);

  var requiredSheets =
    getRequiredSheetNamesFromConfig_(config);

  requiredSheets.forEach(function(sheetName) {
    if (!ss.getSheetByName(sheetName)) {
      errors.push('필수 시트 없음: ' + sheetName);
    }
  });

  if (errors.length > 0) {
    throw new Error(
      '전체 로딩 사전검증 실패\n\n' +
      errors.join('\n')
    );
  }

  var inputSheet = ss.getSheetByName(
    config.inputSheetName
  );

  var requiredInputHeaders = [
    '배송코드',
    '배송순서',
    '공급일련번호',
    '조합원번호',
    '조합원명',
    '물품코드',
    '물품명',
    '예정수량',
    '예정금액',
    '결과수량',
    '결과금액',
    '주소',
    '저장상태',
    '물류지',
    '집품순서'
  ];

  var currentInputHeaders = inputSheet
    .getRange(1, 1, 1, requiredInputHeaders.length)
    .getDisplayValues()[0];

  for (var i = 0; i < requiredInputHeaders.length; i++) {
    if (currentInputHeaders[i] !== requiredInputHeaders[i]) {
      errors.push(
        config.inputSheetName + ' ' +
        columnNumberToLetter_(i + 1) +
        '1 제목 오류: "' +
        requiredInputHeaders[i] +
        '" 필요'
      );
    }
  }

  var inputLastRow = getRealLastRow(inputSheet);

  if (inputLastRow < 2) {
    errors.push(
      config.inputSheetName +
      '에 주문자료가 없습니다. A2부터 자료를 붙여넣으세요.'
    );
  }

  var totalSheet = ss.getSheetByName(
    config.totalSheetName
  );

  var totalHeaders = totalSheet
    .getRange(config.totalHeaderRange)
    .getDisplayValues()[0];

  var requiredTotalHeaders = [
    '물품코드',
    '물품명',
    '31코스',
    '32코스',
    '33코스',
    '34코스',
    '35코스',
    '36코스',
    '합계',
    '저장상태',
    '특이사항'
  ];

  for (var t = 0; t < requiredTotalHeaders.length; t++) {
    if (totalHeaders[t] !== requiredTotalHeaders[t]) {
      errors.push(
        config.totalSheetName + ' ' +
        columnNumberToLetter_(t + 1) +
        '2 제목 오류: "' +
        requiredTotalHeaders[t] +
        '" 필요'
      );
    }
  }

  var totalMainFormula = totalSheet
    .getRange(config.totalMainFormulaCell)
    .getFormula();

  if (!totalMainFormula) {
    errors.push(
      config.totalSheetName + ' ' +
      config.totalMainFormulaCell +
      ' 핵심 집계 수식이 없습니다.'
    );
  }

  var statisticsSheet = ss.getSheetByName(
    config.statisticsSheetName
  );

  var statisticsFormulaChecks = [
    {
      cell: config.recordDateCell,
      description: '기준일 연결 수식'
    },
    {
      cell: config.totalAmountCell,
      description: '총 공급금액 수식'
    },
    {
      cell: config.totalQuantityCell,
      description: '총 주문수량 수식'
    }
  ];

  statisticsFormulaChecks.forEach(function(check) {
    var formula = statisticsSheet
      .getRange(check.cell)
      .getFormula();

    if (!formula) {
      errors.push(
        config.statisticsSheetName + ' ' +
        check.cell +
        '의 ' +
        check.description +
        '이 없습니다.'
      );
    }
  });

  var recordSheet = ss.getSheetByName(
    config.statisticsRecordSheetName
  );

  if (
    recordSheet.getLastColumn() < 6 ||
    recordSheet.getLastRow() < 1
  ) {
    errors.push(
      config.statisticsRecordSheetName +
      ' 시트의 기록 구조가 올바르지 않습니다.'
    );
  }

  if (errors.length > 0) {
    throw new Error(
      '전체 로딩 사전검증 실패\n\n' +
      errors.join('\n')
    );
  }

  return {
    success: true,
    inputRowCount: inputLastRow - 1,
    checkedSheetCount: requiredSheets.length
  };
}


// =====================================================
// IMP-002 전체 로딩 후 결과검증
// =====================================================
function validateSystemAfterLoad_(ss, config) {
  var errors = [];
  config = config || getOperationConfig_(ss);

  var totalSheet = ss.getSheetByName(
    config.totalSheetName
  );

  var statisticsSheet = ss.getSheetByName(
    config.statisticsSheetName
  );

  var firstTotalItemCode = String(
    totalSheet
      .getRange(config.totalMainFormulaCell)
      .getDisplayValue() || ''
  ).trim();

  if (firstTotalItemCode === '') {
    errors.push(
      config.totalSheetName +
      ' 시트에 집계 결과가 생성되지 않았습니다.'
    );
  }

  config.courseSheetNames.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      errors.push(
        sheetName + ' 시트를 찾을 수 없습니다.'
      );
      return;
    }

    if (sheet.getLastRow() < 3) {
      errors.push(
        sheetName + ' 시트에 계산 결과가 없습니다.'
      );
    }
  });

  var recordDate = statisticsSheet
    .getRange(config.recordDateCell)
    .getValue();

  var totalAmount = Number(
    statisticsSheet
      .getRange(config.totalAmountCell)
      .getValue()
  );

  var totalQuantity = Number(
    statisticsSheet
      .getRange(config.totalQuantityCell)
      .getValue()
  );

  if (!recordDate) {
    errors.push(
      config.statisticsSheetName + ' ' +
      config.recordDateCell +
      ' 기준일이 비어 있습니다.'
    );
  }

  if (!isFinite(totalAmount) || totalAmount <= 0) {
    errors.push(
      config.statisticsSheetName + ' ' +
      config.totalAmountCell +
      ' 총 공급금액이 올바르지 않습니다.'
    );
  }

  if (!isFinite(totalQuantity) || totalQuantity <= 0) {
    errors.push(
      config.statisticsSheetName + ' ' +
      config.totalQuantityCell +
      ' 총 주문수량이 올바르지 않습니다.'
    );
  }

  var totalErrorRange =
    'A3:K' + Math.max(3, totalSheet.getLastRow());

  var errorRanges = [
    {
      sheet: totalSheet,
      range: totalErrorRange,
      name: config.totalSheetName,
      startRow: 3
    },
    {
      sheet: statisticsSheet,
      range: config.statisticsErrorRange,
      name: config.statisticsSheetName,
      startRow: getA1StartRow_(config.statisticsErrorRange)
    }
  ];

  var errorPattern =
    /#REF!|#VALUE!|#N\/A|#DIV\/0!|#NAME\?|#ERROR!/;

  errorRanges.forEach(function(target) {
    var displayValues = target.sheet
      .getRange(target.range)
      .getDisplayValues();

    for (var r = 0; r < displayValues.length; r++) {
      for (var c = 0; c < displayValues[r].length; c++) {
        var value = String(
          displayValues[r][c] || ''
        );

        if (errorPattern.test(value)) {
          errors.push(
            target.name +
            ' ' +
            columnNumberToLetter_(c + 1) +
            (r + (target.startRow || 1)) +
            ' 오류값: ' +
            value
          );
        }
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(
      '전체 로딩 결과검증 실패\n\n' +
      errors.slice(0, 15).join('\n') +
      (
        errors.length > 15
          ? '\n외 ' + (errors.length - 15) + '건'
          : ''
      )
    );
  }

  return {
    success: true,
    recordDate: recordDate,
    totalAmount: totalAmount,
    totalQuantity: totalQuantity
  };
}




// =====================================================
// A1 범위의 시작 행 번호 확인
// 예: A1:J25 → 1, C7:F20 → 7
// =====================================================
function getA1StartRow_(a1Notation) {
  var text = String(a1Notation || '').trim();
  var firstCell = text.split(':')[0];
  var match = firstCell.match(/(\d+)$/);

  return match ? Number(match[1]) : 1;
}

// =====================================================
// 열 번호를 A, B, C 형태로 변환
// =====================================================
function columnNumberToLetter_(columnNumber) {
  var result = '';
  var number = columnNumber;

  while (number > 0) {
    var remainder = (number - 1) % 26;

    result =
      String.fromCharCode(65 + remainder) +
      result;

    number = Math.floor(
      (number - 1) / 26
    );
  }

  return result;
}


// =====================================================
// IMP-004 핵심 영역 보호 및 병합셀 점검
//
// 보호는 모두 '경고만 표시' 방식입니다.
// 사용자가 편집 권한을 잃지 않으면서 실수로 수식이나 기록을
// 덮어쓰는 상황을 줄이기 위한 안전장치입니다.
// =====================================================
function setupSystemProtections() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = getOperationConfig_(ss);

  removeManagedProtections_(ss);

  var applied = [];

  // 입력시트 제목행 보호
  addWarningProtection_(
    ss.getSheetByName(config.inputSheetName),
    '1:1',
    'IMP004_입력시트_제목행',
    applied
  );

  // 총수량 제목과 핵심 스필 수식 셀 보호
  addWarningProtection_(
    ss.getSheetByName(config.totalSheetName),
    'A1:K2',
    'IMP004_총수량_제목영역',
    applied
  );

  addWarningProtection_(
    ss.getSheetByName(config.totalSheetName),
    'A3',
    'IMP004_총수량_핵심수식',
    applied
  );

  // 통계 핵심 계산 셀 보호
  var statisticsSheet = ss.getSheetByName(config.statisticsSheetName);

  [
    config.recordDateCell,
    config.totalAmountCell,
    config.totalQuantityCell,
    'E25',
    'G25'
  ].forEach(function(a1) {
    addWarningProtection_(
      statisticsSheet,
      a1,
      'IMP004_통계_핵심수식_' + a1,
      applied
    );
  });

  // 통계 기록 시트 전체를 경고 보호
  [
    '통계_기록',
    '통계_코스기록',
    '통계_지역기록',
    '통계_저장상태기록'
  ].forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) return;

    addWarningSheetProtection_(
      sheet,
      'IMP004_기록시트_' + sheetName,
      applied
    );
  });

  // 자동화 실행이력 전체 보호
  var historySheet = ss.getSheetByName(
    config.historySheetName || '자동화실행이력'
  );

  if (historySheet) {
    addWarningSheetProtection_(
      historySheet,
      'IMP004_자동화실행이력',
      applied
    );
  }

  // 환경설정 시트는 A열·C열만 보호하고 B열 설정값은 편집 허용
  var configSheet = ss.getSheetByName(
    config.configSheetName || '환경설정'
  );

  if (configSheet) {
    addWarningProtection_(
      configSheet,
      'A:A',
      'IMP004_환경설정_항목명',
      applied
    );

    addWarningProtection_(
      configSheet,
      'C:C',
      'IMP004_환경설정_설명',
      applied
    );
  }

  var mergeAudit = auditMergedCells_(ss);

  ss.toast(
    '보호설정 ' + applied.length + '건을 적용했습니다.\n' +
    '병합영역 ' + mergeAudit.totalMergedRanges + '건을 점검했습니다.',
    '✅ IMP-004 적용 완료',
    8
  );

  return {
    success: true,
    protectionCount: applied.length,
    mergeAudit: mergeAudit
  };
}


// =====================================================
// IMP-004가 만든 기존 보호만 제거
// 다른 사용자가 만든 보호는 건드리지 않습니다.
// =====================================================
function removeManagedProtections_(ss) {
  var prefix = 'IMP004_';

  ss.getSheets().forEach(function(sheet) {
    var protections = [];

    protections = protections.concat(
      sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE)
    );

    protections = protections.concat(
      sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)
    );

    protections.forEach(function(protection) {
      var description = String(
        protection.getDescription() || ''
      );

      if (description.indexOf(prefix) === 0) {
        protection.remove();
      }
    });
  });
}


// =====================================================
// 범위 경고 보호 추가
// =====================================================
function addWarningProtection_(
  sheet,
  a1Notation,
  description,
  applied
) {
  if (!sheet) return;

  var protection = sheet
    .getRange(a1Notation)
    .protect()
    .setDescription(description)
    .setWarningOnly(true);

  applied.push({
    sheet: sheet.getName(),
    range: a1Notation,
    description: protection.getDescription()
  });
}


// =====================================================
// 시트 전체 경고 보호 추가
// =====================================================
function addWarningSheetProtection_(
  sheet,
  description,
  applied
) {
  if (!sheet) return;

  var protection = sheet
    .protect()
    .setDescription(description)
    .setWarningOnly(true);

  applied.push({
    sheet: sheet.getName(),
    range: '시트 전체',
    description: protection.getDescription()
  });
}


// =====================================================
// 병합셀 현황 점검
// 병합을 자동 해제하지 않고, 구조상 위험한 병합만 기록합니다.
// =====================================================
function auditMergedCells_(ss) {
  var totalMergedRanges = 0;
  var riskyMergedRanges = [];

  ss.getSheets().forEach(function(sheet) {
    var mergedRanges = sheet
      .getDataRange()
      .getMergedRanges();

    totalMergedRanges += mergedRanges.length;

    mergedRanges.forEach(function(range) {
      var row = range.getRow();
      var numRows = range.getNumRows();
      var numColumns = range.getNumColumns();

      /*
       * 제목·설명용 병합은 허용합니다.
       * 데이터 행(3행 이하)에서 여러 행을 세로로 병합하거나,
       * 5열 이상 넓게 병합된 경우만 위험 대상으로 봅니다.
       */
      var isRisky =
        row >= 3 &&
        (
          numRows > 1 ||
          numColumns >= 5
        );

      if (isRisky) {
        riskyMergedRanges.push(
          sheet.getName() + '!' + range.getA1Notation()
        );
      }
    });
  });

  if (riskyMergedRanges.length > 0) {
    console.warn(
      'IMP-004 병합셀 점검: 구조 확인이 필요한 병합영역',
      riskyMergedRanges
    );
  }

  return {
    totalMergedRanges: totalMergedRanges,
    riskyCount: riskyMergedRanges.length,
    riskyMergedRanges: riskyMergedRanges
  };
}


// =====================================================
// 병합셀 점검만 수동 실행
// =====================================================
function auditMergedCells() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = auditMergedCells_(ss);

  var message =
    '전체 병합영역: ' + result.totalMergedRanges + '건\n' +
    '구조 확인 필요: ' + result.riskyCount + '건';

  if (result.riskyCount > 0) {
    message +=
      '\n\n' +
      result.riskyMergedRanges.slice(0, 15).join('\n');

    if (result.riskyCount > 15) {
      message +=
        '\n외 ' + (result.riskyCount - 15) + '건';
    }
  }

  SpreadsheetApp.getUi().alert(
    '병합셀 점검 결과',
    message,
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return result;
}
