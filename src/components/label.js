export function drawLabel(ctx, shape) {
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(shape.text, shape.x, shape.y);
  }

  export function isInsideLabel(ctx, pos, shape) {
    const textWidth = ctx.measureText(shape.text).width;
    return (
      pos.x >= shape.x &&
      pos.x <= shape.x + textWidth &&
      pos.y >= shape.y - 16 &&
      pos.y <= shape.y
    );
  }
