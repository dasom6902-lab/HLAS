/**
 * @fileoverview HLAS Inventory Manager
 *
 * Cache Policy Standard 적용
 *
 * Architecture:
 *
 * InventoryManager
 *
 * ↓
 *
 * CacheManager
 *
 * ↓
 *
 * BatchProcessor
 *
 * ↓
 *
 * Spreadsheet
 */


const InventoryManager = {


  _inventoryCache:null,


  CACHE_DOMAIN:
    'INVENTORY',


  CACHE_KEY:
    'LIST',



  /**
   * 재고 등록
   */
  createInventory:function(
    inventoryData
  ){


    if(
      !inventoryData
    ){

      throw new Error(
        '[InventoryManager] Inventory data required'
      );

    }



    const sheet =
      _getInventorySheet();



    const now =
      new Date();



    const row = [

      inventoryData.itemCode || '',

      inventoryData.itemName || '',

      inventoryData.quantity || 0,

      inventoryData.location || '',

      _resolveInventoryStatus(
        inventoryData.quantity || 0
      ),

      now,

      now

    ];



    if(
      typeof BatchProcessor !== 'undefined'
    ){

      BatchProcessor.appendRows(
        sheet,
        [
          row
        ]
      );

    }
    else{

      sheet.appendRow(
        row
      );

    }



    this._onInventoryStructureChanged();



    if(
      typeof writeInfo === 'function'
    ){

      writeInfo(
        'InventoryManager',
        `Inventory created : ${inventoryData.itemCode}`
      );

    }



    return inventoryData.itemCode;


  },



  /**
   * 재고 조회
   */
  getInventory:function(
    itemCode
  ){


    const values =
      this._loadInventoryData();



    for(
      let i = 1;
      i < values.length;
      i++
    ){


      if(
        values[i][0] === itemCode
      ){

        return {

          itemCode:
            values[i][0],

          itemName:
            values[i][1],

          quantity:
            values[i][2],

          location:
            values[i][3],

          status:
            values[i][4]

        };

      }

    }



    return null;


  },



  /**
   * 수량 변경
   */
  updateQuantity:function(
    itemCode,
    quantity
  ){


    const sheet =
      _getInventorySheet();



    const values =
      this._loadInventoryData();



    for(
      let i = 1;
      i < values.length;
      i++
    ){


      if(
        values[i][0] === itemCode
      ){


        values[i][2] =
          quantity;


        values[i][4] =
          _resolveInventoryStatus(
            quantity
          );


        values[i][6] =
          new Date();



        const writeData =
          values.slice(1);



        if(
          typeof BatchProcessor !== 'undefined'
        ){

          BatchProcessor.write(

            sheet,

            2,

            1,

            writeData

          );

        }
        else{


          sheet
          .getRange(
            2,
            1,
            writeData.length,
            writeData[0].length
          )
          .setValues(
            writeData
          );

        }



        this._inventoryCache =
          null;


        this._onInventoryQuantityChanged();



        return true;


      }

    }



    return false;


  },



  /**
   * 재고 증감
   */
  adjustStock:function(
    itemCode,
    amount
  ){


    const inventory =
      this.getInventory(
        itemCode
      );



    if(
      !inventory
    ){

      throw new Error(
        '[InventoryManager] Item not found'
      );

    }



    return this.updateQuantity(

      itemCode,

      Number(
        inventory.quantity
      )
      +
      Number(
        amount
      )

    );


  },



  /**
   * Inventory Data Load
   */
  _loadInventoryData:function(){


    if(
      this._inventoryCache !== null
    ){

      return this._inventoryCache;

    }



    let cacheData = null;



    if(
      typeof CacheManager !== 'undefined'
    ){

      cacheData =
        CacheManager.get(

          this.CACHE_DOMAIN,

          this.CACHE_KEY

        );

    }



    if(
      cacheData
    ){

      this._inventoryCache =
        cacheData;


      return cacheData;

    }



    const sheet =
      _getInventorySheet();



    let data;



    if(
      typeof BatchProcessor !== 'undefined'
    ){

      data =
        BatchProcessor.read(

          sheet,

          1,

          1,

          sheet.getLastRow(),

          7

        );

    }
    else{


      data =
        sheet
        .getDataRange()
        .getValues();

    }



    this._inventoryCache =
      data;



    if(
      typeof CacheManager !== 'undefined'
    ){

      CacheManager.set(

        this.CACHE_DOMAIN,

        this.CACHE_KEY,

        data,

        300

      );

    }



    return data;


  },




  /**
   * Analytics Memory Cache 초기화
   */
  _clearAnalyticsMemoryCache:function(){


    if(
      typeof InventoryAnalyticsManager === 'undefined'
    ){

      return;

    }


    if(
      typeof InventoryAnalyticsManager._clearMemoryCache === 'function'
    ){

      InventoryAnalyticsManager
      ._clearMemoryCache();

      return;

    }


    InventoryAnalyticsManager
    ._inventoryCache =
      null;


  },



  /**
   * Quantity Change Event 전달
   */
  _onInventoryQuantityChanged:function(){


    this._inventoryCache =
      null;


    this._clearAnalyticsMemoryCache();


    if(
      typeof CacheInvalidationManager !== 'undefined'
      &&
      typeof CacheInvalidationManager.onInventoryQuantityChanged === 'function'
    ){

      CacheInvalidationManager
      .onInventoryQuantityChanged();

      return;

    }


    this.invalidateCache();
    this.invalidateAnalyticsCache();


  },



  /**
   * Structure Change Event 전달
   */
  _onInventoryStructureChanged:function(){


    this._inventoryCache =
      null;


    this._clearAnalyticsMemoryCache();


    if(
      typeof CacheInvalidationManager !== 'undefined'
      &&
      typeof CacheInvalidationManager.onInventoryStructureChanged === 'function'
    ){

      CacheInvalidationManager
      .onInventoryStructureChanged();

      return;

    }


    this.invalidateCache();
    this.invalidateAnalyticsCache();


  },



  /**
   * Cache Invalidation
   */
  invalidateCache:function(){


    this._inventoryCache =
      null;



    if(
      typeof CacheManager !== 'undefined'
    ){

      CacheManager.remove(

        this.CACHE_DOMAIN,

        this.CACHE_KEY

      );

    }


  },



  /**
   * Analytics Cache 삭제
   */
  invalidateAnalyticsCache:function(){


    if(
      typeof InventoryAnalyticsManager !== 'undefined'
    ){

      InventoryAnalyticsManager
      .clearCache();

    }


  }


};





/**
 * INVENTORY Sheet 반환
 *
 * 누락 복원
 */
function _getInventorySheet(){


  const ss =
    SpreadsheetApp
    .getActiveSpreadsheet();



  let sheet =
    ss.getSheetByName(
      INVENTORY_SHEETS.INVENTORY
    );



  if(
    !sheet
  ){


    sheet =
      ss.insertSheet(
        INVENTORY_SHEETS.INVENTORY
      );



    sheet
    .getRange(

      1,

      1,

      1,

      7

    )
    .setValues([

      [

        'ITEM_CODE',

        'ITEM_NAME',

        'QUANTITY',

        'LOCATION',

        'STATUS',

        'CREATED_AT',

        'UPDATED_AT'

      ]

    ]);

  }



  return sheet;


}





/**
 * 재고 상태 결정
 */
function _resolveInventoryStatus(
  quantity
){


  if(
    quantity <= 0
  ){

    return INVENTORY_STATUS.OUT_OF_STOCK;

  }



  if(
    quantity <= 10
  ){

    return INVENTORY_STATUS.LOW_STOCK;

  }



  return INVENTORY_STATUS.IN_STOCK;


}




