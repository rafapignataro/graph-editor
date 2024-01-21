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
    ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
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
    ctx.stroke();
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

  #hasPoint(point) {
    return this.points.find(p => p.isEqual(point));
  }

  addPoint(p) {
    if (this.#hasPoint(p)) return null;

    const point = new Point(p);

    this.points.push(point);

    return point;
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
}

class GraphEditor {
  container;

  canvas;

  ctx;

  graph;

  hoveredElement;

  selectedElement;

  draggedElement;

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
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.graph.draw(this.ctx);
  }
}

// Events
function handleMouseDown(event) {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  if (graphEditor.hoveredElement) {
    graphEditor.draggedElement = graphEditor.hoveredElement;

    if (!graphEditor.selectedElement) {
      graphEditor.selectedElement = graphEditor.hoveredElement;

      graphEditor.selectedElement.selected = true;

      graphEditor.render();
    } else {
      if (graphEditor.selectedElement !== graphEditor.hoveredElement) {
        graphEditor.selectedElement.selected = false;
        graphEditor.hoveredElement.selected = true;

        const segmentAlreadyExists = graphEditor.graph.segments.find(segment => segment.isEqual(graphEditor.selectedElement, graphEditor.hoveredElement))

        if (!segmentAlreadyExists) {
          graphEditor.graph.addSegment(graphEditor.selectedElement, graphEditor.hoveredElement);
        }

        graphEditor.selectedElement = graphEditor.hoveredElement
      } else {
        graphEditor.selectedElement.selected = false;
        graphEditor.selectedElement = null;
      }
    }

    return;
  }

  const createdPoint = graphEditor.graph.addPoint({ x: mouseX, y: mouseY });

  if (graphEditor.selectedElement) {
    graphEditor.selectedElement.selected = false;

    graphEditor.graph.addSegment(graphEditor.selectedElement, createdPoint)
  }

  createdPoint.selected = true;
  graphEditor.selectedElement = createdPoint;

  graphEditor.render();
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

  const [hoveredPoint] = getClosestPoint(mouseX, mouseY, graphEditor.graph.points, 5);

  if (hoveredPoint) {
    graphEditor.hoveredElement = hoveredPoint;

    graphEditor.hoveredElement.hovered = true;

    graphEditor.canvas.style.cursor = 'pointer';
  } else {
    graphEditor.hoveredElement = null;
    graphEditor.canvas.style.cursor = 'inherit';

    for (const point of graphEditor.graph.points) {
      if (point.hovered) point.hovered = false;
    }
  }

  graphEditor.render();

  if (graphEditor.selectedElement) {
    graphEditor.render();

    graphEditor.ctx.beginPath();
    graphEditor.ctx.setLineDash([5, 5]);
    graphEditor.ctx.moveTo(graphEditor.selectedElement.x, graphEditor.selectedElement.y);
    graphEditor.ctx.lineTo(mouseX, mouseY);
    graphEditor.ctx.stroke();
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

// Application
const container = document.getElementById('container');

const graphEditor = new GraphEditor(container);

graphEditor.canvas.addEventListener('mousedown', handleMouseDown);
graphEditor.canvas.addEventListener('mouseup', handleMouseUp);
graphEditor.canvas.addEventListener('mousemove', handleMouseMove);
document.addEventListener('keydown', handleKeyDown);