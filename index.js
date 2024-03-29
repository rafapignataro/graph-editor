// Constants
const MOUSE_BUTTONS = {
  LEFT_CLICK: 0,
  SCROLL_CLICK: 1,
  RIGHT_CLICK: 2
};

const ZOOM = {
  from: 0.1,
  to: 2.5,
  step: 0.1
}

const COLORS = {
  selected: '#e74c3c',
  hovered: '#e74c3c',
  default: '#1d1d1d',
  idle: '#b5b5b5'
}

// Primitives
class Point {
  x;

  y;

  selected;

  hovered;

  visible;

  constructor({ x, y }) {
    this.x = x;

    this.y = y;

    this.selected = false;

    this.hovered = false;

    this.visible = true;
  }

  draw(ctx, { color = null }) {
    if (!this.visible) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color || (this.hovered ? COLORS.selected : this.selected ? COLORS.hovered : COLORS.default);
    ctx.fill();
  }

  isEqual(point) {
    return this.x === point.x && this.y === point.y;
  }

  setPosition({ x, y }) {
    this.x = x;
    this.y = y;
  }

  getPosition() {
    return {
      x: this.x,
      y: this.y
    }
  }
}

class Segment {
  point1;

  point2;

  selected;

  hovered;

  constructor({ point1, point2 }) {
    this.point1 = point1;

    this.point2 = point2;

    this.selected = false;

    this.hovered = false;
  }

  draw(ctx, { dashed = null, color = null }) {
    ctx.beginPath();
    ctx.setLineDash(dashed || []);
    ctx.moveTo(this.point1.x, this.point1.y);
    ctx.lineTo(this.point2.x, this.point2.y);
    ctx.strokeStyle = color || (this.hovered ? COLORS.selected : this.selected ? COLORS.hovered : COLORS.default);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = COLORS.default;
  }

  isEqual(point1, point2) {
    return (this.point1.isEqual(point1) && this.point2.isEqual(point2)) || this.point2.isEqual(point1) && this.point1.isEqual(point2)
  }

  hasPoint(point) {
    return this.point1.isEqual(point) || this.point2.isEqual(point);
  }
}

class Graph {
  points;

  segments;

  constructor(points = [], segments = []) {
    this.points = points;

    this.segments = segments;
  }

  draw(ctx, viewport) {
    this.segments.forEach(segment => segment.draw(ctx, viewport));
    this.points.forEach(point => point.draw(ctx, viewport));
  }

  reset() {
    this.segments.length = 0;
    this.points.length = 0;
  }

  #hasPoint(point) {
    return this.points.find(p => p.isEqual(point));
  }

  addPoint(p) {
    if (this.#hasPoint(p)) return null;

    const point = new Point(p);

    this.points.push(point);

    return point;
  }

  removePoint(point) {
    this.points = this.points.filter(p => p !== point);
    this.segments = this.segments.filter(s => !s.hasPoint(point));
  }

  #hasSegment(point1, point2) {
    return this.segments.find(segment => segment.isEqual(point1, point2))
  }

  addSegment(point1, point2) {
    if (this.#hasSegment(point1, point2)) return null;

    const segment = new Segment({ point1, point2 });

    this.segments.push(segment);

    return segment;
  }

  removeSegment(segment) {
    this.segments = this.segments.filter(s => s !== segment);
  }
}

class GraphEditor {
  container;

  canvas;

  ctx;

  graph;

  viewport;

  drawingPoint;

  hoveredElement;

  selectedElement;

  draggingPoint;

  alignMode;

  constructor(container) {
    this.container = container;

    const canvas = document.createElement('canvas');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.canvas = canvas;

    this.container.appendChild(this.canvas);

    const context = canvas.getContext('2d');

    this.ctx = context;

    this.graph = new Graph();

    this.viewport = new ViewPort(this.canvas, this.ctx);

    this.drawingPoint = new Point({ x: 0, y: 0 });

    this.hoveredElement = null;

    this.selectedElement = null;

    this.draggingPoint = null;

    this.alignMode = false;

    this.#registerEvents();
  }

  render() {
    this.viewport.reset();

    this.graph.draw(this.ctx, this.viewport);

    this.drawingPoint.draw(this.ctx, {});

    const boundaries = getGraphBoundaries(this.graph, 50);

    if (boundaries) {
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeStyle = COLORS.idle;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(boundaries.x, boundaries.y, boundaries.width, boundaries.height);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = COLORS.default;
    }

    document.getElementById('zoom-value').innerHTML = `${100 - ((this.viewport.zoom - ZOOM.from) / (ZOOM.to - ZOOM.from) * 100).toFixed(0)}%`;
  }

  #registerEvents() {
    window.addEventListener('resize', this.#handleResize.bind(this));
    this.canvas.addEventListener('mousedown', this.#handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.#handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.#handleMouseMove.bind(this));
    this.canvas.addEventListener('contextmenu', this.#handleContextMenu.bind(this));
    this.canvas.addEventListener('wheel', this.#handleScroll.bind(this));

    document.addEventListener('keydown', this.#handleKeyDown.bind(this));
    document.addEventListener('keyup', this.#handleKeyUp.bind(this));

    document.getElementById('reset-graph')?.addEventListener('click', _ => {
      this.graph.reset();

      this.render();
    });

    document.getElementById('increase-zoom')?.addEventListener('click', _ => {
      this.viewport.zoom += 0.1;
      this.viewport.zoom = limitZoomRange(this.viewport.zoom);

      this.render();
    });

    document.getElementById('decrease-zoom')?.addEventListener('click', _ => {
      this.viewport.zoom -= 0.1;
      this.viewport.zoom = limitZoomRange(this.viewport.zoom);

      this.render();
    });

    document.getElementById('export-graph-svg')?.addEventListener('click', _ => {
      this.exportToSvg();
    });
  }

  #unregisterEvents() {
    this.canvas.removeEventListener('mousedown', this.#handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.#handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.#handleMouseMove);
    this.canvas.removeEventListener('contextmenu', this.#handleContextMenu);
    this.canvas.removeEventListener('wheel', this.#handleScroll);

    document.removeEventListener('keydown', this.#handleKeyDown);

    window.removeEventListener('resize', this.#handleResize);
  }

  exportToSvg() {
    let svgContent = '';

    const boundaries = getGraphBoundaries(this.graph, 50);

    if (!boundaries) return;

    this.graph.points.forEach(point => svgContent += `<circle cx="${point.x - boundaries.x}" cy="${point.y - boundaries.y}" r="1" fill="${COLORS.default}" />`);
    this.graph.segments.forEach(segment => svgContent += `<line x1="${segment.point1.x - boundaries.x}" y1="${segment.point1.y - boundaries.y}" x2="${segment.point2.x - boundaries.x}" y2="${segment.point2.y - boundaries.y}" stroke="${COLORS.default}" stroke-width="3" />`);

    const svgString = `
      <svg width="${boundaries.width}" height="${boundaries.height}" viewBox="0 0 ${boundaries.width} ${boundaries.height}" xmlns="http://www.w3.org/2000/svg">
        ${svgContent}
      </svg>
    `
    downloadSvg(svgString);
  }

  drawGuideLine(from, to) {
    new Segment({
      point1: from,
      point2: to
    }).draw(this.ctx, { color: COLORS.selected });
  }

  drawHelperLine(from, to) {
    new Segment({
      point1: from,
      point2: to
    }).draw(this.ctx, { dashed: [5, 5], color: COLORS.selected });
  }

  // Events
  #handleMouseDown(event) {
    const { x: mouseX, y: mouseY } = this.viewport.getMousePosition(event);

    switch (event.button) {
      case MOUSE_BUTTONS.LEFT_CLICK:
        if (!this.hoveredElement) {
          const createdPoint = this.graph.addPoint(this.drawingPoint.getPosition());

          if (this.selectedElement) {
            this.selectedElement.selected = false;

            this.graph.addSegment(this.selectedElement, createdPoint);
          }

          createdPoint.selected = true;
          this.selectedElement = createdPoint;

          this.render();

          return;
        }

        if (this.hoveredElement instanceof Point) {
          this.draggingPoint = this.hoveredElement;

          if (!this.selectedElement) {
            this.selectedElement = this.hoveredElement;

            this.selectedElement.selected = true;

            this.render();

            return;
          }

          if (this.selectedElement === this.hoveredElement) {
            this.selectedElement.selected = false;
            this.selectedElement = null;

            this.render();

            return;
          }

          if (this.alignMode) {
            this.selectedElement.selected = false;

            let point = this.graph.points.find(point => point.isEqual(this.drawingPoint));

            if (point) {

            } else {
              point = this.graph.addPoint({ x: this.drawingPoint.x, y: this.drawingPoint.y });
            }

            this.graph.addSegment(this.selectedElement, point);

            point.selected = true;
            this.selectedElement = point;

            this.render();

            return;
          }

          this.selectedElement.selected = false;
          this.hoveredElement.selected = true;

          const segmentAlreadyExists = this.graph.segments.find(segment => segment.isEqual(this.selectedElement, this.hoveredElement))

          if (!segmentAlreadyExists) this.graph.addSegment(this.selectedElement, this.hoveredElement);

          this.selectedElement = this.hoveredElement

          this.render();

          return;
        }

        if (this.hoveredElement instanceof Segment) {
          const segment = this.hoveredElement;

          const inlinePoint = this.graph.addPoint(this.drawingPoint.getPosition());

          this.graph.addSegment(segment.point1, inlinePoint);
          this.graph.addSegment(segment.point2, inlinePoint);

          this.graph.removeSegment(segment);

          if (this.selectedElement) {
            this.selectedElement.selected = false;

            this.graph.addSegment(this.selectedElement, inlinePoint);
          }

          inlinePoint.selected = true;

          this.selectedElement = inlinePoint;
          this.hoveredElement = inlinePoint;

          this.render();

          return;
        }

        break;
      case MOUSE_BUTTONS.RIGHT_CLICK:
        if (!this.hoveredElement) return;

        if (this.hoveredElement instanceof Point) {
          this.graph.removePoint(this.hoveredElement);

          if (this.selectedElement === this.hoveredElement) this.selectedElement = null;

          this.hoveredElement = null;

          this.render();

          return;
        }

        if (this.hoveredElement instanceof Segment) {
          this.graph.removeSegment(this.hoveredElement);

          if (this.selectedElement === this.hoveredElement) this.selectedElement = null;

          this.hoveredElement = null;

          this.render();

          return;
        }

        break;
      case MOUSE_BUTTONS.SCROLL_CLICK:
        break;
      default:
        break;
    }
  }

  #handleMouseMove(event) {
    this.render();

    const { x: mouseX, y: mouseY } = this.viewport.getMousePosition(event, true);

    this.drawingPoint.x = mouseX;
    this.drawingPoint.y = mouseY;
    this.drawingPoint.selected = false;

    this.canvas.style.cursor = 'inherit';

    this.hoveredElement = null;

    for (const point of this.graph.points) {
      if (point.hovered) point.hovered = false;
    }

    for (const segment of this.graph.segments) {
      if (segment.hovered) segment.hovered = false;
    }

    // IS DRAGGING POINT
    if (this.draggingPoint) {
      this.canvas.style.cursor = 'grabbing';

      this.draggingPoint.setPosition(this.drawingPoint);

      this.render();
      return;
    };

    // IS HOVERING POINT
    const [hoveredPoint] = getClosestPoint(this.drawingPoint, this.graph.points, 8 * this.viewport.zoom);

    if (hoveredPoint) {
      this.canvas.style.cursor = 'pointer';

      this.hoveredElement = hoveredPoint;
      this.hoveredElement.hovered = true;
      this.drawingPoint.selected = true;
      this.drawingPoint.setPosition(this.hoveredElement);

      this.render();

      if (!this.selectedElement) return;

      if (this.alignMode) {
        const from = this.selectedElement.getPosition();
        const to = this.drawingPoint.getPosition();

        const xDifference = Math.abs(to.x - from.x);
        const yDifference = Math.abs(to.y - from.y);

        if (xDifference > yDifference) {
          to.y = from.y;

          this.drawingPoint.y = to.y;
          this.drawingPoint.x = to.x;
        } else {
          to.x = from.x;

          this.drawingPoint.x = to.x;
          this.drawingPoint.y = to.y;
        }

        this.render();

        this.drawGuideLine(this.selectedElement, this.drawingPoint);

        this.drawHelperLine(this.hoveredElement, this.drawingPoint);

        return;
      }

      this.drawGuideLine(this.selectedElement, this.drawingPoint);

      return;
    }

    // IS HOVERING SEGMENT
    const [hoveredSegment, hoveredSegmentDistance, segmentPoint] = getClosestSegment(this.drawingPoint, this.graph.segments, 8 * this.viewport.zoom);

    if (hoveredSegment) {
      this.canvas.style.cursor = 'pointer';

      this.hoveredElement = hoveredSegment;
      this.hoveredElement.hovered = true;
      this.drawingPoint.selected = true;
      this.drawingPoint.setPosition(segmentPoint);

      this.render();

      if (!this.selectedElement) return;

      if (this.alignMode) {
        const direction =
          Math.abs(this.drawingPoint.x - this.selectedElement.x) > Math.abs(this.drawingPoint.y - this.selectedElement.y) ?
            'x' : 'y';

        if (direction === 'x') {
          this.drawingPoint.y = this.selectedElement.y;
        } else {
          this.drawingPoint.x = this.selectedElement.x;
        }

        this.render();

        this.drawGuideLine(this.selectedElement, this.drawingPoint);

        return;
      }

      this.drawGuideLine(this.selectedElement, this.drawingPoint);

      return;
    }

    if (!this.selectedElement) return;

    if (this.alignMode) {
      const from = this.selectedElement.getPosition();
      const to = this.drawingPoint.getPosition();

      const xDifference = Math.abs(to.x - from.x);
      const yDifference = Math.abs(to.y - from.y);

      if (xDifference > yDifference) {
        to.y = from.y;

        this.drawingPoint.y = to.y;
      } else {
        to.x = from.x;

        this.drawingPoint.x = to.x;
      }

      this.drawGuideLine(from, to);

      return;
    }

    this.drawGuideLine(this.selectedElement, this.drawingPoint);

    return;
  }

  #handleMouseUp() {
    this.draggingPoint = null;
    this.canvas.style.cursor = 'inherit';
  }

  #handleKeyDown(event) {
    switch (event.key) {
      case 'Escape':
        if (this.selectedElement) {
          this.selectedElement.selected = false;
          this.selectedElement = null;

          this.render();
        }

        break;
      case 'Shift':
        this.alignMode = true;

        this.render();
        break;
      default:
        break;
    }
  }

  #handleKeyUp(event) {
    switch (event.key) {
      case 'Shift':
        this.alignMode = false;

        this.render();
        break;
      default:
        break;
    }
  }

  #handleContextMenu(event) {
    event.preventDefault();
  }

  #handleScroll(event) {
    event.preventDefault();

    const direction = Math.sign(event.deltaY);

    this.viewport.zoom += direction * 0.1;
    this.viewport.zoom = limitZoomRange(this.viewport.zoom);

    this.render();
  }

  #handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.render();
  }
}

class ViewPort {
  canvas;

  ctx;

  zoom;

  offset;

  center;

  drag;

  constructor(canvas, ctx) {
    this.canvas = canvas;

    this.ctx = ctx;

    this.zoom = 1;

    this.center = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2
    }

    this.offset = {
      x: -this.center.x,
      y: -this.center.y
    }

    this.drag = {
      start: {
        x: 0,
        y: 0
      },
      end: {
        x: 0,
        y: 0
      },
      offset: {
        x: 0,
        y: 0
      },
      active: false
    }

    this.#registerEvents();
  }

  getMousePosition(event, dragging = false) {
    const position = {
      x: (event.offsetX - this.center.x) * this.zoom - this.offset.x,
      y: (event.offsetY - this.center.y) * this.zoom - this.offset.y,
    };

    if (!dragging) return position;

    return {
      x: position.x - this.drag.offset.x,
      y: position.y - this.drag.offset.y
    }
  }

  reset() {
    this.ctx.restore();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();

    this.ctx.translate(this.center.x, this.center.y);

    this.ctx.scale(1 / this.zoom, 1 / this.zoom);

    this.ctx.translate(this.offset.x + this.drag.offset.x, this.offset.y + this.drag.offset.y);
  }

  #registerEvents() {
    this.canvas.addEventListener('mousedown', this.#handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.#handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.#handleMouseUp.bind(this));
  }

  #unregisterEvents() {
    this.canvas.removeEventListener('mousedown', this.#handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.#handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.#handleMouseUp.bind(this));
  }

  #handleMouseDown(event) {
    if (event.button !== MOUSE_BUTTONS.SCROLL_CLICK) return;

    this.canvas.style.cursor = 'grabbing';

    this.drag.start = this.getMousePosition(event);
    this.drag.active = true;
  }

  #handleMouseMove(event) {
    if (!this.drag.active) return;

    this.canvas.style.cursor = 'grabbing';

    this.drag.end = this.getMousePosition(event);
    this.drag.offset = {
      x: this.drag.end.x - this.drag.start.x,
      y: this.drag.end.y - this.drag.start.y,
    }
  }

  #handleMouseUp() {
    if (!this.drag.active) return;

    this.canvas.style.cursor = 'inherit';

    this.offset = {
      x: this.offset.x + this.drag.offset.x,
      y: this.offset.y + this.drag.offset.y,
    };
    this.drag = {
      start: {
        x: 0,
        y: 0
      },
      end: {
        x: 0,
        y: 0
      },
      offset: {
        x: 0,
        y: 0
      },
      active: false
    }
  }
}

// Utils
function getClosestPoint(from, points, limit = Number.MAX_SAFE_INTEGER) {
  let min_distance = Number.MAX_SAFE_INTEGER;
  let closestPoint = null;

  for (const point of points) {
    const distance = getPointToPointDistance(from, point);

    if (distance < min_distance && distance !== 0 && distance < limit) {
      min_distance = distance;
      closestPoint = point;
    };
  }

  return [closestPoint, min_distance];
}

function getClosestSegment(from, segments, limit = Number.MAX_SAFE_INTEGER) {
  let min_distance = Number.MAX_SAFE_INTEGER;
  let closestSegment = null;
  let closestSegmentPoint = null;

  for (const segment of segments) {
    const [distance, segmentPoint] = getPointToSegmentDistance(from, segment);

    if (distance < min_distance && distance !== 0 && distance < limit) {
      min_distance = distance;
      closestSegment = segment;
      closestSegmentPoint = segmentPoint;
    }
  }

  return [closestSegment, min_distance, closestSegmentPoint]
}

function limitZoomRange(zoom) {
  return Math.max(ZOOM.from, Math.min(ZOOM.to, zoom))
}

function getGraphBoundaries(graph, padding = 0) {
  if (!graph.segments.length) return null;

  let minX = Number.MAX_SAFE_INTEGER;
  let maxX = Number.MIN_SAFE_INTEGER;
  let minY = Number.MAX_SAFE_INTEGER;
  let maxY = Number.MIN_SAFE_INTEGER;

  for (const segment of graph.segments) {
    const point1 = segment.point1;

    if (point1.x < minX) minX = point1.x;
    if (point1.x > maxX) maxX = point1.x;
    if (point1.y < minY) minY = point1.y;
    if (point1.y > maxY) maxY = point1.y;

    const point2 = segment.point2;

    if (point2.x < minX) minX = point2.x;
    if (point2.x > maxX) maxX = point2.x;
    if (point2.y < minY) minY = point2.y;
    if (point2.y > maxY) maxY = point2.y;
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: (maxX - minX) + (padding * 2),
    height: (maxY - minY) + (padding * 2),
  }
}

function downloadSvg(svgString, fileName = 'graph') {
  const blob = new Blob([svgString.trim()], { type: 'image/svg+xml;charset=utf-8' });

  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Math
function getPointToPointDistance(from, to) {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

function getPointToSegmentDistance(point, segment) {
  const lineLength = Math.hypot(segment.point2.x - segment.point1.x, segment.point2.y - segment.point1.y);
  const dot = ((point.x - segment.point1.x) * (segment.point2.x - segment.point1.x) + (point.y - segment.point1.y) * (segment.point2.y - segment.point1.y)) / (lineLength ** 2);

  if (dot < 0 || dot > 1) return [Infinity, null];

  const closestX = segment.point1.x + dot * (segment.point2.x - segment.point1.x);
  const closestY = segment.point1.y + dot * (segment.point2.y - segment.point1.y);

  return [Math.hypot(closestX - point.x, closestY - point.y), { x: closestX, y: closestY }];
}

// Application
const container = document.getElementById('container');

const graphEditor = new GraphEditor(container);

window.graphEditor = graphEditor;