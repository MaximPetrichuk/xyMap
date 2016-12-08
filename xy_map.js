/*
 * xyMap
 * @author Maxim Petrichuk
 * @version 0.1.2
 * @date Dec 08th, 2016
 * @repo https://github.com/MaximPetrichuk/xyMap

  sample usage in index.html
*/

/*
  class Viewport
  param = {
    update: updateCallback, //function ({ x1, x2, y1, y2, zX, zY})
    size = { w: 0, h: 0},
    map = { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
    oneZoom = true
  }
*/
class Viewport {
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

/*
  class XyMap
    container: 'divId'  
*/
class XyMap {
  constructor(container) {
    this.container = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!this.container) {
      throw new Error('xyMap: container not found.');
    };
    this.limit = { xMin: null, yMin: null, xMax: null, yMax: null },
    this.objects = []; //{ id: 1, caption: 'Obj1', type: 'circe', x: 0, y: 0, r: 5, color: 'red' }
    this.viewPort = null;
  };
  
  //add object for draw to array
  add(obj) {
    if (!this.limit.xMin) {
      this.limit.xMin = obj.x;
      this.limit.xMax = obj.x;
      this.limit.yMin = obj.y;
      this.limit.yMax = obj.y;
    } else {
      this.limit.xMin = Math.min(this.limit.xMin, obj.x);
      this.limit.xMax = Math.max(this.limit.xMax, obj.x);
      this.limit.yMin = Math.min(this.limit.yMin, obj.y);
      this.limit.yMax = Math.max(this.limit.yMax, obj.y);
    };
    this.objects.push(obj);
  };

  init() {
    let id = this.container.id +'_canvas';
    this.container.innerHTML = `<canvas id="${id}" width="${this.container.offsetWidth-1}" height="${this.container.offsetHeight-1}"></canvas>`;
    this.canvas = document.getElementById(id);
    this.viewPort = new Viewport({
      update: (vp) => { this.drawViewport(vp); },
      size: { w: this.container.offsetWidth-1, h: this.container.offsetHeight-1},
      map: this.limit,
      oneZoom: true
    });
    this.handleEvent = function(ev) {
      switch(ev.type) {
        case 'mousedown':
          this.container.addEventListener('mousemove', this);
          this.container.addEventListener('mouseup', this);
          this.startMove = { x: ev.clientX, y: ev.clientY };
          this.startCenter = this.viewPort.Center;
          let ctx = this.canvas.getContext('2d');
          this.imageData = ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
          break;
        case 'mousemove':
          this.scroll(ev.clientX, ev.clientY);
          break;
        case 'mouseup':
          this.container.removeEventListener('mouseup', this);
          this.container.removeEventListener('mousemove', this);
          this.imageData = null;
          this.startMove = { x: this.startMove.x - ev.clientX, y: this.startMove.y - ev.clientY };
          this.startCenter.x = this.startCenter.x + this.startMove.x / this.viewPort.Zoom.x;
          this.startCenter.y = this.startCenter.y + this.startMove.y / this.viewPort.Zoom.y;
          this.viewPort.Center = this.startCenter;
          this.viewPort.show();
          break;
        case 'wheel':
          (ev.deltaY < 0) ? this.zoom(0.2) : this.zoom(-0.2);
          break;
      }
    };
    this.container.addEventListener('mousedown', this);    
    this.container.addEventListener('wheel', this);    
  };

  scroll(x, y) {
    let ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.putImageData(this.imageData, x - this.startMove.x, y -this.startMove.y);

  };

  show() { this.viewPort.show(); };

  zoom(value) {
    this.viewPort.Zoom = {x: value, y: value};
    this.viewPort.show();    
  };

  //callback for viewport vp = { x1, x2, y1, y2, zX, zY }
  drawViewport(vp) {
    let x,y,obj,objT;
    let other = this;
    let ctx = this.canvas.getContext('2d');
    let pi2 = Math.PI*2;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.objects.filter(d => d.x>=vp.x1 && d.x<=vp.x2 && d.y>=vp.y1 && d.y<=vp.y2).forEach(function(d) {
      x = (d.x - vp.x1) * vp.zX; y = (d.y - vp.y1) * vp.zY;
      if (d.type === 'circe') {
        ctx.beginPath();
        ctx.arc(x,y,d.r,0,pi2);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'black';        
        ctx.stroke();
        ctx.fillStyle = 'black';
        ctx.font = '8pt arial';
        ctx.fillText(d.caption, x-20, y-9);
      };
    });
  };
};
