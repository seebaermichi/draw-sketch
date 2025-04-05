export function drawFreehand(ctx, shape) {
    const pts = shape.points;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  }

  export function isInsideFreehand(pos, shape) {
    return shape.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 10);
  }
