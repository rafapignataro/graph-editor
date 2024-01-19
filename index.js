const { container, canvas, ctx } = init();

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mousemove', handleMouseMove);
document.addEventListener('keydown', handleKeyDown);

const graph = {
  points: [],
  segments: []
};

const editor = {
  hovered: null,
  selected: null,
  dragged: null
}

// Core
function init() {
  const container = document.getElementById('container');

  const canvas = document.getElementById('canvas');

  canvas.width = 600;
  canvas.height = 600;

  const context = canvas.getContext('2d');

  return { container, canvas, ctx: context };
}

function render(canvas, ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  graph.segments.forEach(segment => segment.draw(ctx));
  graph.points.forEach(point => point.draw(ctx));
}

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

let isDragging = false;

// Events
function handleMouseDown(event) {
  isDragging = true;

  const { offsetX: mouseX, offsetY: mouseY } = event;

  if (editor.hovered) {
    editor.dragged = editor.hovered;

    if (!editor.selected) {
      editor.selected = editor.hovered;

      editor.selected.selected = true;

      render(canvas, ctx);
    } else {
      if (editor.selected !== editor.hovered) {
        editor.selected.selected = false;
        editor.hovered.selected = true;

        const segmentAlreadyExists = graph.segments.find(segment => segment.isEqual(editor.selected, editor.hovered))

        if (!segmentAlreadyExists) {
          const segment = new Segment({ point1: editor.selected, point2: editor.hovered });
          graph.segments.push(segment);
        }

        editor.selected = editor.hovered;
      } else {
        editor.selected.selected = false;
        editor.selected = null;
      }
    }

    return;
  }

  const point = new Point({ x: mouseX, y: mouseY });
  graph.points.push(point);

  if (editor.selected) {
    editor.selected.selected = false;

    const segment = new Segment({ point1: editor.selected, point2: point });
    graph.segments.push(segment);
  }

  point.selected = true;
  editor.selected = point;

  render(canvas, ctx);
}

function handleMouseUp() {
  isDragging = false;
  editor.hovered = null;
}

function handleMouseMove(event) {
  const { offsetX: mouseX, offsetY: mouseY } = event;

  const [hoveredPoint] = getClosestPoint(mouseX, mouseY, graph.points, 5);

  if (editor.dragged && isDragging) {
    editor.dragged.x = mouseX;
    editor.dragged.y = mouseY;

    render(canvas, ctx);
    return;
  };

  if (hoveredPoint) {
    editor.hovered = hoveredPoint;
    hoveredPoint.hovered = true;
    canvas.style.cursor = 'pointer';
  } else {
    editor.hovered = false;
    for (const point of graph.points) {
      if (point.hovered) {
        point.hovered = false;
        canvas.style.cursor = 'inherit';
      }
    }
  }

  render(canvas, ctx);

  if (editor.selected) {
    render(canvas, ctx);

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(editor.selected.x, editor.selected.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
  }
}

function handleKeyDown(event) {
  switch (event.key) {
    case 'Escape':
      editor.selected.selected = false;
      editor.selected = null;

      render(canvas, ctx);
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