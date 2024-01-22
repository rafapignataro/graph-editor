// Constants
const MOUSE_BUTTONS = {
  LEFT_CLICK: 0,
  SCROLL_CLICK: 1,
  RIGHT_CLICK: 2
};

// Primitives
class Point {
  x;

  y;

  selected;

  hovered;

  constructor({ x, y }) {
    this.x = x;

    this.y = y;

    this.selected = false;

    this.hovered = false;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = this.hovered ? 'red' : this.selected ? 'green' : 'black';
    ctx.fill();
  }

  isEqual(point) {
    return this.x === point.x && this.y === point.y;
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

  draw(ctx) {
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(this.point1.x, this.point1.y);
    ctx.lineTo(this.point2.x, this.point2.y);
    ctx.strokeStyle = this.hovered ? 'red' : this.selected ? 'green' : 'black';
    ctx.stroke();
    ctx.strokeStyle = 'black';
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

  draw(ctx) {
    this.segments.forEach(segment => segment.draw(ctx));
    this.points.forEach(point => point.draw(ctx));
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

  hoveredElement;

  selectedElement;

  draggedElement;

  inlineElement;

  constructor(container) {
    this.container = container;

    const canvas = document.createElement('canvas');

    canvas.width = 600;
    canvas.height = 600;

    this.canvas = canvas;

    this.container.appendChild(this.canvas);

    const context = canvas.getContext('2d');

    this.ctx = context;

    this.graph = new Graph();

    this.hoveredElement = null;

    this.selectedElement = null;

    this.draggedElement = null;

    this.inlineElement = null

    this.#registerEvents();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.graph.draw(this.ctx);
  }

  #registerEvents() {
    this.canvas.addEventListener('mousedown', handleMouseDown);
    this.canvas.addEventListener('mouseup', handleMouseUp);
    this.canvas.addEventListener('mousemove', handleMouseMove);
    this.canvas.addEventListener('contextmenu', handleContextMenu);

    document.addEventListener('keydown', handleKeyDown);

    document.getElementById('reset-graph').addEventListener('click', _ => {
      this.graph.reset();

      this.render();
    });
  }

  #unregisterEvents() {
    this.canvas.removeEventListener('mousedown', handleMouseDown);
    this.canvas.removeEventListener('mouseup', handleMouseUp);
    this.canvas.removeEventListener('mousemove', handleMouseMove);
    this.canvas.removeEventListener('contextmenu', handleContextMenu);

    document.removeEventListener('keydown', handleKeyDown);
  }
}

// Events
function handleMouseDown(event) {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  switch (event.button) {
    case MOUSE_BUTTONS.LEFT_CLICK:
      if (!graphEditor.hoveredElement) {
        const createdPoint = graphEditor.graph.addPoint({ x: mouseX, y: mouseY });

        if (graphEditor.selectedElement) {
          graphEditor.selectedElement.selected = false;

          graphEditor.graph.addSegment(graphEditor.selectedElement, createdPoint);
        }

        createdPoint.selected = true;
        graphEditor.selectedElement = createdPoint;

        graphEditor.render();
      }

      if (graphEditor.hoveredElement instanceof Point) {
        graphEditor.draggedElement = graphEditor.hoveredElement;

        if (!graphEditor.selectedElement) {
          graphEditor.selectedElement = graphEditor.hoveredElement;

          graphEditor.selectedElement.selected = true;

          graphEditor.render();

          return;
        }

        if (graphEditor.selectedElement !== graphEditor.hoveredElement) {
          graphEditor.selectedElement.selected = false;
          graphEditor.hoveredElement.selected = true;

          const segmentAlreadyExists = graphEditor.graph.segments.find(segment => segment.isEqual(graphEditor.selectedElement, graphEditor.hoveredElement))

          if (!segmentAlreadyExists) graphEditor.graph.addSegment(graphEditor.selectedElement, graphEditor.hoveredElement);

          graphEditor.selectedElement = graphEditor.hoveredElement

          graphEditor.render();

          return;
        }

        graphEditor.selectedElement.selected = false;
        graphEditor.selectedElement = null;

        graphEditor.render();

        return;
      }

      if (graphEditor.hoveredElement instanceof Segment) {
        const segment = graphEditor.hoveredElement;
        const inlinePointPosition = graphEditor.inlineElement;

        const inlinePoint = graphEditor.graph.addPoint({ x: inlinePointPosition.x, y: inlinePointPosition.y });

        graphEditor.graph.addSegment(segment.point1, inlinePoint);
        graphEditor.graph.addSegment(segment.point2, inlinePoint);

        graphEditor.graph.removeSegment(segment);

        if (graphEditor.selectedElement) {
          graphEditor.selectedElement.selected = false;

          graphEditor.graph.addSegment(graphEditor.selectedElement, inlinePoint);
        }


        inlinePoint.selected = true;

        graphEditor.selectedElement = inlinePoint;
        graphEditor.hoveredElement = inlinePoint;

        graphEditor.render();

        return;
      }

      break;
    case MOUSE_BUTTONS.RIGHT_CLICK:
      if (!graphEditor.hoveredElement) return;

      if (graphEditor.hoveredElement instanceof Point) {
        graphEditor.graph.removePoint(graphEditor.hoveredElement);

        if (graphEditor.selectedElement === graphEditor.hoveredElement) graphEditor.selectedElement = null;

        graphEditor.hoveredElement = null;

        graphEditor.render();

        return;
      }

      if (graphEditor.hoveredElement instanceof Segment) {
        graphEditor.graph.removeSegment(graphEditor.hoveredElement);

        if (graphEditor.selectedElement === graphEditor.hoveredElement) graphEditor.selectedElement = null;

        graphEditor.hoveredElement = null;

        graphEditor.render();

        return;
      }

      break;
    case MOUSE_BUTTONS.SCROLL_CLICK:
      break;
    default:
      break;
  }
}

function handleMouseUp() {
  graphEditor.draggedElement = null;
}

function handleMouseMove(event) {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  if (graphEditor.draggedElement) {
    graphEditor.canvas.style.cursor = 'grabbing';

    graphEditor.draggedElement.x = mouseX;
    graphEditor.draggedElement.y = mouseY;

    graphEditor.render();
    return;
  };

  for (const point of graphEditor.graph.points) {
    if (point.hovered) point.hovered = false;
  }

  for (const segment of graphEditor.graph.segments) {
    if (segment.hovered) segment.hovered = false;
  }

  const [hoveredPoint] = getClosestPoint(mouseX, mouseY, graphEditor.graph.points, 4);
  const [hoveredSegment, distanceToSegment, segmentPoint] = getClosestSegment(mouseX, mouseY, graphEditor.graph.segments, 4);

  graphEditor.inlineElement = segmentPoint && !(graphEditor.hoveredElement instanceof Point) ? segmentPoint : null;

  graphEditor.hoveredElement = hoveredPoint || hoveredSegment || null;
  graphEditor.canvas.style.cursor = graphEditor.hoveredElement ? 'pointer' : 'inherit';

  if (graphEditor.hoveredElement) graphEditor.hoveredElement.hovered = true;

  graphEditor.render();

  if (graphEditor.selectedElement) {
    graphEditor.ctx.beginPath();
    graphEditor.ctx.setLineDash([5, 5]);
    graphEditor.ctx.moveTo(graphEditor.selectedElement.x, graphEditor.selectedElement.y);
    graphEditor.ctx.lineTo(mouseX, mouseY);
    graphEditor.ctx.stroke();
  }

  if (graphEditor.inlineElement) {
    graphEditor.ctx.beginPath();
    graphEditor.ctx.arc(graphEditor.inlineElement.x, graphEditor.inlineElement.y, 4, 0, 2 * Math.PI);
    graphEditor.ctx.fillStyle = 'red';
    graphEditor.ctx.fill();
  }
}

function handleKeyDown(event) {
  switch (event.key) {
    case 'Escape':
      graphEditor.selectedElement.selected = false;
      graphEditor.selectedElement = null;

      graphEditor.render();
      break;
    default:
      break;
  }
}

function handleContextMenu(event) {
  event.preventDefault();
}

// Utils
function getClosestPoint(x, y, points, limit = Number.MAX_SAFE_INTEGER) {
  let min_distance = Number.MAX_SAFE_INTEGER;
  let closestPoint = null;

  for (const point of points) {
    const distance = Math.hypot(x - point.x, y - point.y);

    if (distance < min_distance && distance !== 0 && distance < limit) {
      min_distance = distance;
      closestPoint = point;
    };
  }

  return [closestPoint, min_distance];
}

function getClosestSegment(x, y, segments, limit = Number.MAX_SAFE_INTEGER) {
  let min_distance = Number.MAX_SAFE_INTEGER;
  let closestSegment = null;
  let closestSegmentPoint = null;

  for (const segment of segments) {
    const [distance, segmentPoint] = getPointDistanceToSegment({ x, y }, segment);

    if (distance < min_distance && distance !== 0 && distance < limit) {
      min_distance = distance;
      closestSegment = segment;
      closestSegmentPoint = segmentPoint;
    }
  }

  return [closestSegment, min_distance, closestSegmentPoint]
}

function getPointDistanceToSegment(point, segment) {
  // const numerator = Math.abs((segment.point2.x - segment.point1.x) * (segment.point1.y - point.y) - (segment.point1.x - point.x) * (segment.point2.y - segment.point1.y));
  // const denominator = Math.sqrt((segment.point2.x - segment.point1.x) ** 2 + (segment.point2.y - segment.point1.y) ** 2);

  // return numerator / denominator;
  const lineLength = Math.hypot(segment.point2.x - segment.point1.x, segment.point2.y - segment.point1.y);
  const dot = ((point.x - segment.point1.x) * (segment.point2.x - segment.point1.x) + (point.y - segment.point1.y) * (segment.point2.y - segment.point1.y)) / (lineLength ** 2);

  // Verificação adicional para limitar ao segmento
  if (dot < 0 || dot > 1) {
    // O ponto mais próximo está fora do segmento
    return [Infinity, null];
  }

  const closestX = segment.point1.x + dot * (segment.point2.x - segment.point1.x);
  const closestY = segment.point1.y + dot * (segment.point2.y - segment.point1.y);

  return [Math.hypot(closestX - point.x, closestY - point.y), { x: closestX, y: closestY }];
}

// Application
const container = document.getElementById('container');

const graphEditor = new GraphEditor(container);