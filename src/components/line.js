export function drawLine(ctx, shape, highlight = false) {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.angle || 0);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shape.length, 0);
    ctx.strokeStyle = highlight ? 'blue' : 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Resize handle
    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.rect(shape.length - 5, -5, 10, 10);
    ctx.fill();
    ctx.stroke();

    // Rotate handle
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'green';
    ctx.strokeStyle = 'black';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  export function isInsideLine(pos, shape) {
    const dx = pos.x - shape.x;
    const dy = pos.y - shape.y;
    const rx = Math.cos(-shape.angle) * dx - Math.sin(-shape.angle) * dy;
    const ry = Math.sin(-shape.angle) * dx + Math.cos(-shape.angle) * dy;
    return rx >= 0 && rx <= shape.length && Math.abs(ry) < 6;
  }

  export function isInResizeHandleLine(pos, shape) {
    const dx = pos.x - shape.x;
    const dy = pos.y - shape.y;
    const rx = Math.cos(-shape.angle) * dx - Math.sin(-shape.angle) * dy;
    const ry = Math.sin(-shape.angle) * dx + Math.cos(-shape.angle) * dy;
    return Math.abs(rx - shape.length) < 10 && Math.abs(ry) < 10;
  }

  export function isInRotateHandleLine(pos, shape) {
    const dx = pos.x - shape.x;
    const dy = pos.y - shape.y;
    return Math.hypot(dx, dy) < 8;
  }
