/*
 * xyMap
 * @author Maxim Petrichuk
 * @version 0.2.2
 * @date Apr 18th, 2019
 * @repo https://github.com/MaximPetrichuk/xyMap
 *
 *   - Dependencies: https://github.com/mourner/rbush
 * 
 * sample usage in index.html
 */


/**
 * Class Viewport
 */
class Viewport {
  /**
   * @param  {object}: {
                          update: updateCallback, //function ({ x1, x2, y1, y2, zX, zY})
                          size = { w: 0, h: 0},
                          map = { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
                          oneZoom = true
                        }
   * @return {Viewport object}
   */
  constructor(param) {
    this.updateCallback = param.update;
    if (typeof this.updateCallback !== 'function') {
      throw new Error('VIEWPORT: update function not defined.');
    };
    this.size = param.size;
    this.map = param.map;
    this.oneZoom = param.oneZoom;
    this.zoomMax = {x: null, y: null};
    this.zoom = {x: null, y: null};
    this.center = {x: null, y: null};
    this.calcMaxZoom();
    this.zoom = this.zoomMax;
    this.calcCenter();
    this.caclViewPort();
  };
  
  set Center(koordXY) {
    this.center.x = koordXY.x;
    this.center.y = koordXY.y;
    this.caclViewPort();
  };

  get Center() { return this.center; };

  set Zoom(zoomShift) {
    let oldZoom = {x: this.zoom.x, y: this.zoom.y};
    this.zoom.x = this.zoom.x + this.zoom.x * zoomShift.x;
    this.zoom.y = this.zoom.y + this.zoom.y * zoomShift.y;
    this.caclViewPort();
  };

  get Zoom() { return this.zoom; };

  set Size(sizeWH) {
    this.size = sizeWH;
    this.caclViewPort();
  };

  get Size() { return this.size; };
  // koords of start viewport
  get startX() { return this.vX; };
  get startY() { return this.vY; };

  show() {
    this.vp = {
      x1: this.vX,
      x2: this.vX + this.size.w / this.zoom.x,
      y1: this.vY,
      y2: this.vY + this.size.h / this.zoom.y,
      zX: this.zoom.x,
      zY: this.zoom.y
    };
    this.updateCallback(this.vp);
  };

  caclViewPort() {
    this.vX = this.center.x - this.size.w / 2 / this.zoom.x;
    this.vY = this.center.y - this.size.h / 2 / this.zoom.y;
  };

  calcCenter() {
    this.center.x = this.map.xMin + (this.map.xMax - this.map.xMin) / 2;
    this.center.y = this.map.yMin + (this.map.yMax - this.map.yMin) / 2;
  };

  calcMaxZoom() {
    if (this.oneZoom) {
      let modX = this.map.xMax - this.map.xMin, modY = this.map.yMax - this.map.yMin, 
          size = Math.min(this.size.w,this.size.h);
      if (modX>modY) { 
        this.zoomMax.x = size / modX;
      } else { 
        this.zoomMax.x = size / modY;
      }
      this.zoomMax.y =this.zoomMax.x;
    } else {
      this.zoomMax.x = this.size.w / (this.map.xMax - this.map.xMin);
      this.zoomMax.y = this.size.h / (this.map.yMax - this.map.yMin);
    };
  };
};

/**
 * Class XyMap
 */
class XyMap {
  /**
   * @param  {object or string} - Container or id of container
   * @return {[type]}
   */
  constructor(container) {
    this.container = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!this.container) {
      throw new Error('xyMap: container not found.');
    };
    this.limit = { xMin: null, yMin: null, xMax: null, yMax: null },
    this.viewPort = null;
    this.layers = [{tree: rbush(), visible: true, visibleCaption: false, caption: null, selectable: false, onSelect: false, alpha: 1}];
    this.objMap = new Map();
    this.selectedId = null;
    this.pi2 = Math.PI*2;
    this.protoObj = {
      layer: 0, 
      type: 'circe', 
      r: 2, 
      colorFill: 'blue', 
      colorStroke: 'black',
      widthStroke: 1      
    };
    this.mouseWheelZoom = true;
  };

  // add layer and returned his id (number);
  // TODO: add example
  // }
  addLayer(layer) {
    if (typeof layer.onSelect !== 'function') {
      layer.onSelect = null;
    };

    this.layers.push({ 
                  tree: rbush(), 
                  alpha: layer.alpha, 
                  visible: layer.visible,
                  visibleCaption: layer.visibleCaption,
                  caption: layer.caption,
                  selectable: layer.selectable, 
                  selectChangeStoke: layer.selectChangeStoke,
                  selectStrokeWidth: layer.selectStrokeWidth,
                  selectStrokeColor: layer.selectStrokeColor,
                  selectChangeFill: layer.selectChangeFill,
                  selectFillColor: layer.selectFillColor,
                  onSelect: layer.onSelect });
    return this.layers.length-1;
  };

  //add object for draw to array
  // TODO: add example
  //}
  add(pObj) {
    let obj = Object.assign({}, this.protoObj, pObj);
    if (this.layers.length-1 < obj.layer) { obj.layer = 0; };
    let bBox = this.calcBBox(obj);
    if (!this.limit.xMin) {
      this.limit.xMin = bBox.xMin;
      this.limit.xMax = bBox.xMax;
      this.limit.yMin = bBox.yMin;
      this.limit.yMax = bBox.yMax;
    } else {
      this.limit.xMin = Math.min(this.limit.xMin, bBox.xMin);
      this.limit.xMax = Math.max(this.limit.xMax, bBox.xMax);
      this.limit.yMin = Math.min(this.limit.yMin, bBox.yMin);
      this.limit.yMax = Math.max(this.limit.yMax, bBox.yMax);
    };
    this.layers[obj.layer].tree.insert({minX: bBox.xMin, minY: bBox.yMin, maxX: bBox.xMax, maxY: bBox.yMax, id: obj.id });
    this.objMap.set(obj.id, obj);
  };

  calcBBox(obj) {
    let rez ={xMin: null, xMax: null, yMin: null, yMax: null};
    if (obj.type === 'shape') { 
      for (let i = 0; i < obj.koords.length; i++) {
        if (!rez.xMin) {
          rez.xMin = obj.koords[i].x;
          rez.xMax = obj.koords[i].x;
          rez.yMin = obj.koords[i].y;
          rez.yMax = obj.koords[i].y;
        } else {
          rez.xMin = Math.min(rez.xMin, obj.koords[i].x);
          rez.xMax = Math.max(rez.xMax, obj.koords[i].x);
          rez.yMin = Math.min(rez.yMin, obj.koords[i].y);
          rez.yMax = Math.max(rez.yMax, obj.koords[i].y);
        };
      };
      obj.x = (rez.xMax - rez.xMin) / 2;      
      obj.y = (rez.yMax - rez.yMin) / 2;      
    } else if (obj.type === 'circe') {
      rez.xMin = obj.x - obj.r;
      rez.xMax = obj.x + obj.r;
      rez.yMin = obj.y - obj.r;
      rez.yMax = obj.y + obj.r;
    };
    return rez;
  };

  init() {
    let id = this.container.id +'_canvas';
    this.container.innerHTML = `<canvas id="${id}" width="${this.container.offsetWidth-1}" height="${this.container.offsetHeight-1}"></canvas>`;
    this.canvas = document.getElementById(id);
    this.ctx = this.canvas.getContext('2d');
    this.viewPort = new Viewport({
      update: (vp) => { this.drawViewport(vp); },
      size: { w: this.container.offsetWidth-1, h: this.container.offsetHeight-1},
      map: this.limit,
      oneZoom: true
    });
    this.handleEvent = function(ev) {
      switch(ev.type) {
        case 'mousedown':
          document.addEventListener('mousemove', this);
          document.addEventListener('mouseup', this);
          this.startMove = { x: ev.clientX, y: ev.clientY };
          this.startCenter = this.viewPort.Center;
          this.imageData = this.ctx.getImageData(0,0,this.canvas.clientWidth, this.canvas.clientHeight);
          break;
        case 'touchstart':
          this.startCenter = this.viewPort.Center;
          if (ev.targetTouches.length == 1) {
            let touch = ev.targetTouches[0];
            this.selectOnClick(touch.pageX,touch.pageY);
            this.startMove = { x: touch.pageX, y: touch.pageY };
            this.startCenter.x = this.startMove.x / this.viewPort.Zoom.x;
            this.startCenter.y = this.startMove.y / this.viewPort.Zoom.y;
            this.viewPort.Center = this.startCenter;
            this.viewPort.show();
           };
          break;
        case 'mousemove':
          this.scroll(ev.clientX, ev.clientY);
          break;
        case 'mouseup':
          document.removeEventListener('mouseup', this);
          document.removeEventListener('mousemove', this);
          this.imageData = null;
          this.startMove = { x: this.startMove.x - ev.clientX, y: this.startMove.y - ev.clientY };
          this.startCenter.x = this.startCenter.x + this.startMove.x / this.viewPort.Zoom.x;
          this.startCenter.y = this.startCenter.y + this.startMove.y / this.viewPort.Zoom.y;
          this.viewPort.Center = this.startCenter;
          this.viewPort.show();
          break;
        case 'wheel':
          if (mouseWheelZoom) {(ev.deltaY < 0) ? this.zoom(0.2) : this.zoom(-0.2);}
          break;
        case 'click':
          this.selectOnClick(ev.offsetX,ev.offsetY);
          break;
      }
    };
    document.addEventListener('mousedown', this);
    this.canvas.addEventListener('touchstart', this);  
    document.addEventListener('wheel', this);    
    this.canvas.addEventListener('click', this);    
  };

  selectOnClick(mX,mY) {
    let size = 5,
//        mX = ev.offsetX==undefined?ev.layerX:ev.offsetX,
//        mY = ev.offsetY==undefined?ev.layerY:ev.offsetY,
        x1 = this.viewPort.startX + (mX - size) / this.viewPort.Zoom.x,
        x2 = this.viewPort.startX + (mX + size) / this.viewPort.Zoom.x,
        y1 = this.viewPort.startY + (mY - size) / this.viewPort.Zoom.y,
        y2 = this.viewPort.startY + (mY + size) / this.viewPort.Zoom.y;
    for (let i = this.layers.length-1; i >= 0; i--) { 
      if (this.layers[i].visible && this.layers[i].selectable) {
        let rez = this.layers[i].tree.search({ minX: x1, minY: y1, maxX: x2, maxY: y2 });
        if (rez.length > 0) {
          if (this.selectedId && this.selectedId === rez[rez.length-1].id) {
            this.selectedId = null; break;
          } else {
            this.selectedId = rez[rez.length-1].id; 
            if (this.layers[i].onSelect) { this.layers[i].onSelect(this.objMap.get(this.selectedId)); };
            break;
          };
        };
      };
    };
    this.viewPort.show();
  };

  select(id) {
    let obj = this.objMap.get(id);
    if (obj !== undefined) {
      let i = obj.layer;
      if (this.layers[i].visible && this.layers[i].selectable) {
        this.selectedId = id;
        this.viewPort.Center = {x: obj.x, y: obj.y};
        this.show();
        if (this.layers[i].onSelect) { this.layers[i].onSelect(obj); };
      };
    };
  };

  scroll(x, y) {
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.ctx.putImageData(this.imageData, x - this.startMove.x, y -this.startMove.y);
  };

  show() { this.viewPort.show(); };

  zoom(value) {
    this.viewPort.Zoom = {x: value, y: value};
    this.viewPort.show();    
  };

  //callback for viewport vp = { x1, x2, y1, y2, zX, zY }
  drawViewport(vp) {
    let d;
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    for (let i = 0; i < this.layers.length; i++) { 
      if (this.layers[i].visible) {
        let result = this.layers[i].tree.search({ minX: vp.x1, minY: vp.y1, maxX: vp.x2, maxY: vp.y2 });
        this.ctx.globalAlpha = this.layers[i].alpha;
        for (let j = 0; j < result.length; j++) { 
          d = this.objMap.get(result[j].id);
          switch (d.type) {
            case 'circe': this.drawCircle(vp, d, i); break;
            case 'shape': this.drawShape(vp, d, i); break;
          };      
        };
      };
    };
  };

  drawCircle(vp, d, layerId) {
    let x,y,obj,objT;
    let colorFill, colorStroke, widthStroke;
    colorFill = d.colorFill;
    colorStroke = d.colorStroke;
    widthStroke = d.widthStroke;
    if (this.layers[layerId].selectable && this.selectedId && this.selectedId === d.id) {
      if (this.layers[layerId].selectChangeFill) { colorFill = this.layers[layerId].selectFillColor; };
      if (this.layers[layerId].selectChangeStoke) {
        colorStroke = this.layers[layerId].selectStrokeColor;
        widthStroke = this.layers[layerId].selectStrokeWidth;
      };
    };
    x = (d.x - vp.x1) * vp.zX; y = (d.y - vp.y1) * vp.zY;
    this.ctx.beginPath();
    this.ctx.arc(x,y,d.r,0,this.pi2);
    this.ctx.fillStyle = colorFill;
    this.ctx.fill();
    this.ctx.lineWidth = widthStroke;
    this.ctx.strokeStyle = colorStroke;        
    this.ctx.stroke();
    if (this.layers[layerId].visibleCaption) {
      this.ctx.fillStyle = this.layers[layerId].caption.color;
      this.ctx.font = this.layers[layerId].caption.font;
      this.ctx.fillText(d.caption, x + this.layers[layerId].caption.offsetX, y + this.layers[layerId].caption.offsetY);
    };
  };

  drawShape(vp, d, layerId) {
    let x,y,obj,objT;
    let colorFill, colorStroke, widthStroke;
    colorFill = d.colorFill;
    colorStroke = d.colorStroke;
    widthStroke = d.widthStroke;
    if (this.layers[layerId].selectable && this.selectedId && this.selectedId === d.id) {
      if (this.layers[layerId].selectChangeFill) { colorFill = this.layers[layerId].selectFillColor; };
      if (this.layers[layerId].selectChangeStoke) {
        colorStroke = this.layers[layerId].selectStrokeColor;
        widthStroke = this.layers[layerId].selectStrokeWidth;
      };
    };
    this.ctx.beginPath();
    x = (d.koords[0].x - vp.x1) * vp.zX; y = (d.koords[0].y - vp.y1) * vp.zY;
    this.ctx.moveTo(x,y);
    for (let j = 1; j < d.koords.length; j++) {
      x = (d.koords[j].x - vp.x1) * vp.zX; y = (d.koords[j].y - vp.y1) * vp.zY;
      this.ctx.lineTo(x,y);
    };
    this.ctx.closePath();
    this.ctx.fillStyle = colorFill;
    this.ctx.fill();
    this.ctx.lineWidth = widthStroke;
    this.ctx.strokeStyle = colorStroke;       
    this.ctx.stroke();
    //TODO: add draw caption for shapes
  };

  // TODO: adapt and connect pointInPolygon function for correct select shape objects
  // function from
  // https://github.com/substack/point-in-polygon
  pointInPolygon(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    
    var x = point[0], y = point[1];
    
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = vs[i][0], yi = vs[i][1];
      var xj = vs[j][0], yj = vs[j][1];
      
      var intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

};
