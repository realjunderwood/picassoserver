/**
 * @license
 * Copyright Dan Munro
 * Released under Expat license <https://directory.fsf.org/wiki/License:Expat>
 */

"use strict";

/**
 * @ngdoc function
 * @name pbnApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the pbnApp
 */
angular.module("pbnApp").controller("MainCtrl", function ($scope, $http) {
  $scope.step = "load";
  $scope.view = "";
  $scope.status = "";
  $scope.loaderStyle = {
    border: "4px dashed #777777",
  };
  $scope.palette = [];
  $scope.colorInfoVisible = false;

  $scope.imageLoaded = function (imgSrc) {
    var img = new Image();
    img.src = imgSrc;
    img.onload = function () {
      var c = document.getElementById("img-canvas");
      // c.width = 800;
      c.width = document.getElementById("widthSlider").value;
      var scale = c.width / img.naturalWidth;
      c.height = img.naturalHeight * scale;
      document.getElementById("canvases").style.height = c.height + 20 + "px";
      $scope.c = c;
      $scope.ctx = c.getContext("2d");
      $scope.ctx.drawImage(img, 0, 0, c.width, c.height);
      $scope.step = "select";
      $scope.$apply();
    };
  };

  $scope.addColor = function (color) {
    $scope.palette.push(color);
  };

  $scope.removeColor = function (color) {
    _.pull($scope.palette, color);
  };

  var getNearest = function (palette, col) {
    var nearest;
    var nearestDistsq = 1000000;
    for (var i = 0; i < palette.length; i++) {
      var pcol = palette[i];
      var distsq =
        Math.pow(pcol.r - col.r, 2) +
        Math.pow(pcol.g - col.g, 2) +
        Math.pow(pcol.b - col.b, 2);
      if (distsq < nearestDistsq) {
        nearest = i;
        nearestDistsq = distsq;
      }
    }
    return nearest;
  };

  var imageDataToSimpMat = function (imgData, palette) {
    var mat = [];
    for (var i = 0; i < imgData.height; i++) {
      mat[i] = new Array(imgData.width);
    }
    for (var i = 0; i < imgData.data.length; i += 4) {
      var nearestI = getNearest(palette, {
        r: imgData.data[i],
        g: imgData.data[i + 1],
        b: imgData.data[i + 2],
      });
      var x = (i / 4) % imgData.width;
      var y = Math.floor(i / 4 / imgData.width);
      mat[y][x] = nearestI;
    }
    return mat;
  };

  var matToImageData = function (mat, palette, context) {
    var imgData = context.createImageData(mat[0].length, mat.length);
    for (var y = 0; y < mat.length; y++) {
      for (var x = 0; x < mat[0].length; x++) {
        var i = (y * mat[0].length + x) * 4;
        var col = palette[mat[y][x]];
        imgData.data[i] = col.r;
        imgData.data[i + 1] = col.g;
        imgData.data[i + 2] = col.b;
        imgData.data[i + 3] = 255;
      }
    }
    return imgData;
  };

  var displayResults = function (matSmooth, matLine, labelLocs) {
    var c2 = document.getElementById("filled-canvas");
    c2.width = $scope.c.width;
    c2.height = $scope.c.height;

    // draw filled
    var ctx2 = c2.getContext("2d");
    var imgData = matToImageData(matSmooth, $scope.palette, ctx2);
    ctx2.putImageData(imgData, 0, 0);

    var c3 = document.getElementById("outline-canvas");
    c3.width = c2.width;
    c3.height = c2.height;

    // draw outlines
    var gray = Math.round(
      255 * (1 - document.getElementById("darknessSlider").value / 100)
    );
    var bw = [
      { r: 255, g: 255, b: 255 },
      { r: gray, g: gray, b: gray },
    ];
    var ctx3 = c3.getContext("2d");
    var imgData = matToImageData(matLine, bw, ctx3);
    ctx3.putImageData(imgData, 0, 0);

    // draw numbers
    ctx3.font = "12px Georgia";
    ctx3.fillStyle = "rgb(" + gray + ", " + gray + ", " + gray + ")";
    for (var i = 0; i < labelLocs.length; i++) {
      ctx3.fillText(
        labelLocs[i].value + 1,
        labelLocs[i].x - 3,
        labelLocs[i].y + 4
      );
    }

    $scope.c2 = c2;
    $scope.c3 = c3;
  };

  var rgbToHex = function (r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  var rgbToCmyk = function (r, g, b) {
    var k = 1 - Math.max(r / 255, g / 255, b / 255);
    if (k == 1) {
      var c = 0;
      var m = 0;
      var y = 0;
    } else {
      var c = (1 - r / 255 - k) / (1 - k);
      var m = (1 - g / 255 - k) / (1 - k);
      var y = (1 - b / 255 - k) / (1 - k);
    }

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  };

  var rgbToHsl = function (r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    var M = Math.max(r, g, b);
    var m = Math.min(r, g, b);

    if (M == m) {
      var h = 0;
    } else if (M == r) {
      var h = (60 * (g - b)) / (M - m);
    } else if (M == g) {
      var h = (60 * (b - r)) / (M - m) + 120;
    } else {
      var h = (60 * (r - g)) / (M - m) + 240;
    }

    var l = (M + m) / 2;
    if (l == 0 || l == 1) {
      var s = 0; // So it isn't NaN for black or white.
    } else {
      var s = (M - m) / (1 - Math.abs(2 * l - 1));
    }

    return {
      h: ((Math.round(h) % 360) + 360) % 360, // js modulo isn't always positive
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  var rgbToHsv = function (r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    var M = Math.max(r, g, b);
    var m = Math.min(r, g, b);

    if (M == m) {
      var h = 0;
    } else if (M == r) {
      var h = (60 * (g - b)) / (M - m);
    } else if (M == g) {
      var h = (60 * (b - r)) / (M - m) + 120;
    } else {
      var h = (60 * (r - g)) / (M - m) + 240;
    }

    if (M == 0) {
      var s = 0; // So it isn't NaN for black.
    } else {
      var s = (M - m) / M;
    }

    return {
      h: ((Math.round(h) % 360) + 360) % 360,
      s: Math.round(s * 100),
      v: Math.round(M * 100),
    };
  };

  var getColorInfo = function (palette) {
    for (var i = 0; i < palette.length; i++) {
      var col = palette[i];
      col.hex = rgbToHex(col.r, col.g, col.b);
      col.cmyk = rgbToCmyk(col.r, col.g, col.b);
      col.hsl = rgbToHsl(col.r, col.g, col.b);
      col.hsv = rgbToHsv(col.r, col.g, col.b);
    }
  };

  var buildContour = function (startingEdge, edges, usedEdges) {
    var contour = [];
    var curEdge = startingEdge;
    usedEdges.add(startingEdge);

    // Helper to get direction vector as a normalized string
    function getDirection(edge) {
      var dx = edge.x2 - edge.x1;
      var dy = edge.y2 - edge.y1;
      var length = Math.sqrt(dx * dx + dy * dy);
      return length === 0
        ? "0,0"
        : (dx / length).toFixed(3) + "," + (dy / length).toFixed(3);
    }

    var mergedEdge = { ...curEdge };
    var curDir = getDirection(curEdge);

    while (true) {
      var nextEdge = null;
      var nextEdgeIndex = -1;
      var reverse = false;

      for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        if (usedEdges.has(edge)) continue;

        if (edge.x1 === curEdge.x2 && edge.y1 === curEdge.y2) {
          nextEdge = edge;
          nextEdgeIndex = i;
          break;
        } else if (edge.x2 === curEdge.x2 && edge.y2 === curEdge.y2) {
          nextEdge = { x1: edge.x2, y1: edge.y2, x2: edge.x1, y2: edge.y1 };
          nextEdgeIndex = i;
          reverse = true;
          break;
        }
      }

      if (!nextEdge) break;

      var nextDir = getDirection(nextEdge);

      if (nextDir === curDir) {
        // Extend the current merged edge
        mergedEdge.x2 = nextEdge.x2;
        mergedEdge.y2 = nextEdge.y2;
      } else {
        // Push current and start new merged edge
        contour.push({ ...mergedEdge });
        mergedEdge = { ...nextEdge };
        curDir = nextDir;
      }

      usedEdges.add(edges[nextEdgeIndex]);
      curEdge = nextEdge;
    }

    // Push the final merged edge
    contour.push(mergedEdge);
    return contour;
  };

  $scope.pbnify = function () {
    $scope.step = "process";
    var width = $scope.c.width;
    var height = $scope.c.height;
    var imgData = $scope.ctx.getImageData(0, 0, width, height);
    var mat = imageDataToSimpMat(imgData, $scope.palette);

    var worker = new Worker("scripts/processImage.js");
    worker.addEventListener(
      "message",
      function (e) {
        if (e.data.cmd == "status") {
          $scope.status = e.data.status;
          $scope.$apply();
        } else {
          var matSmooth = e.data.matSmooth;
          var labelLocs = e.data.labelLocs;
          var matLine = e.data.matLine;
          worker.terminate();

          displayResults(matSmooth, matLine, labelLocs);

          // CUSTOM JAMES CODE TO PROCESS MATSMOOTH
          var edges = [];
          for (var i = 0; i < matSmooth.length - 1; i++) {
            for (var j = 0; j < matSmooth[i].length - 1; j++) {
              if (matSmooth[i][j] === undefined) {
                matSmooth[i][j] = 0;
              }

              // Check right neighbor
              if (matSmooth[i][j] != matSmooth[i][j + 1]) {
                edges.push({
                  x1: j + 0.5, // Between columns j and j+1
                  y1: i, // At row i
                  x2: j + 0.5,
                  y2: i + 1, // Spans to next row
                });
              }

              // Check below neighbor
              if (matSmooth[i][j] != matSmooth[i + 1][j]) {
                edges.push({
                  x1: j, // At column j
                  y1: i + 0.5, // Between rows i and i+1
                  x2: j + 1, // Spans to next column
                  y2: i + 0.5,
                });
              }
            }
          }

          console.log(edges);
          console.log("that was edges");

          var usedEdges = new Set();
          var allContours = [];

          for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            if (usedEdges.has(edge)) {
              continue;
            }
            var myContour = buildContour(edge, edges, usedEdges);
            allContours.push(myContour);
            console.log("contour length:", myContour);
          }

          console.log("total contours:", allContours.length);

          var commandString = "";
          for (i = 0; i < allContours.length; i++) {
            commandString += "D ";
            commandString += allContours[i][0].x1 + " " + allContours[i][0].y1;
            for (var j = 0; j < allContours[i].length; j++) {
              commandString +=
                allContours[i][0].x2 + " " + allContours[i][0].y2;
              // console.log(
              //   allContours[i][j].x1 +
              //     "," +
              //     allContours[i][j].y1 +
              //     " to " +
              //     allContours[i][j].x2 +
              //     "," +
              //     allContours[i][j].y2
              // );
            }
            commandString += " U ";
          }
          console.log(commandString);
          $http
            .post("/api/upload", { text: commandString })
            .then((response) => console.log(response.data))
            .catch((err) => console.error(err));

          getColorInfo($scope.palette); // adds hex and CMYK values for display
          $scope.step = "result";
          $scope.view = "filled";
          $scope.$apply();
        }
      },
      false
    );
    worker.postMessage({ mat: mat });
  };

  $scope.newImage = function () {
    $scope.palette = [];
    document.getElementById("canvases").style.height = "0px";
    $scope.step = "load";
  };

  $scope.recolor = function () {
    $scope.step = "select";
  };

  $scope.clearPalette = function () {
    $scope.palette = [];
  };

  $scope.showColorInfo = function () {
    $scope.colorInfoVisible = true;
  };

  $scope.hideColorInfo = function () {
    $scope.colorInfoVisible = false;
  };

  $scope.viewFilled = function () {
    $scope.view = "filled";
  };

  $scope.viewOutline = function () {
    $scope.view = "outline";
  };

  $scope.saveFilled = function () {
    var win = window.open();
    win.document.write(
      '<html><head><title>PBN filled</title></head><body><img src="' +
        $scope.c2.toDataURL() +
        '"></body></html>'
    );
    // win.print();
  };

  $scope.saveOutline = function () {
    var win = window.open();
    win.document.write(
      '<html><head><title>PBN outline</title></head><body><img src="' +
        $scope.c3.toDataURL() +
        '"></body></html>'
    );
    // win.print();
  };

  $scope.savePalette = function () {
    var canvas = document.createElement("canvas");
    canvas.width = 80 * Math.min($scope.palette.length, 10);
    canvas.height = 80 * (Math.floor(($scope.palette.length - 1) / 10) + 1);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    for (var i = 0; i < $scope.palette.length; i++) {
      var col = $scope.palette[i];
      ctx.fillStyle = "rgba(" + col.r + ", " + col.g + ", " + col.b + ", 255)";
      var x = 80 * (i % 10);
      var y = 80 * Math.floor(i / 10);
      ctx.fillRect(x + 10, y + 10, 60, 60);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 10, y + 10, 20, 20);
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(i + 1, x + 20, y + 26);
      ctx.strokeRect(x + 10, y + 10, 60, 60);
    }

    var win = window.open();
    win.document.write(
      '<html><head><title>PBN palette</title></head><body><img src="' +
        canvas.toDataURL() +
        '"></body></html>'
    );
    // win.print();
  };
});
