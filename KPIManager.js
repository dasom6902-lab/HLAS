/**
 * @fileoverview HLAS KPI Manager
 * KPI Calculation & Aggregation Module
 *
 * Architecture:
 *
 * UI
 *  ↓
 * KPIManager
 *  ↓
 * InventoryAnalytics
 *  ↓
 * Repository
 *  ↓
 * DataManager
 *  ↓
 * Spreadsheet
 *
 */


const KPIManager = {


  /**
   * KPI Summary 조회
   *
   * @returns {Object}
   */
  getSummary: function(){


    return {


      inventory:
        this.getInventoryKPI(),


      operational:
        this.getOperationalKPI()



    };


  },



  /**
   * Inventory KPI 조회
   *
   * @returns {Object}
   */
  getInventoryKPI: function(){


    const analytics =
      this._getInventoryAnalytics();



    return analytics.getInventoryKPI();


  },



  /**
   * Operational KPI 조회
   *
   * @returns {Object}
   */
  getOperationalKPI: function(){


    return {


      orderCount:
        this._getOrderCount(),


      pickingCount:
        this._getPickingCount(),


      shipmentCount:
        this._getShipmentCount()



    };


  },



  /**
   * InventoryAnalytics 접근
   */
  _getInventoryAnalytics: function(){


    if(
      typeof InventoryAnalyticsManager === 'undefined'
    ){

      throw new Error(
        '[KPIManager] InventoryAnalyticsManager unavailable'
      );

    }


    return InventoryAnalyticsManager;


  },



  /**
   * Order KPI Data
   */
  _getOrderCount: function(){


    if(
      typeof OrderRepository === 'undefined'
    ){

      return 0;

    }


    return OrderRepository.count();


  },



  /**
   * Picking KPI Data
   */
  _getPickingCount: function(){


    if(
      typeof PickingRepository === 'undefined'
    ){

      return 0;

    }


    return PickingRepository.count();


  },



  /**
   * Shipment KPI Data
   */
  _getShipmentCount: function(){


    if(
      typeof ShipmentRepository === 'undefined'
    ){

      return 0;

    }


    return ShipmentRepository.count();


  }


};