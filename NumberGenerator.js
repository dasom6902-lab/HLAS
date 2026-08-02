/**
 * @fileoverview HLAS Number Generator
 * 번호 생성 전담 Module
 */


const NumberGenerator = {


  /**
   * 번호 생성
   *
   * @param {string} type
   * @returns {string}
   */
  generateNumber: function(type) {

    if (!type) {
      throw new Error(
        '[NumberGenerator] Type is required'
      );
    }


    const sequence =
      SequenceManager.getNextSequence(type);


    return _formatNumber(
      type,
      sequence
    );

  }


};


/**
 * 번호 포맷 생성
 *
 * @param {string} type
 * @param {number} sequence
 * @returns {string}
 */
function _formatNumber(type, sequence) {

  const date =
    Utilities.formatDate(
      new Date(),
      'Asia/Seoul',
      'yyyyMMdd'
    );


  const number =
    String(sequence)
      .padStart(4, '0');


  return `${type}-${date}-${number}`;

}