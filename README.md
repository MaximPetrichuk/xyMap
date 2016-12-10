# xyMap
JavaScript small and easy map component for non-earth x-y coordinates data. Based on HTML canvas.

![Online example](https://jsfiddle.net/Petrichuk/qcg1k6ev/)

### How to use
```js
var xyMap = new XyMap('divId');
xyMap.add({ id: 1, caption: 'Obj - 1', type: 'circe', x: 10, y: 10, r: 5, colorFill: 'red' });
xyMap.add({ id: 2, caption: 'Obj - 2', type: 'circe', x: 20, y: 20, r: 5, colorFill: 'green' });
xyMap.add({ id: 3, caption: 'Obj - 3', type: 'circe', x: 15, y: 35, r: 5, colorFill: 'blue' });
xyMap.init();
xyMap.show();
```
### Dependencies
![RBush](https://github.com/mourner/rbush) - for R-tree-based spatial index.

### Screenshot
![Screenshot](https://cloud.githubusercontent.com/assets/20028214/20959367/c7121cea-bc84-11e6-9210-c8420919d0f1.png)

### Licence
MIT.
