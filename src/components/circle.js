export function drawCircle(ctx, shape, highlight = false) {
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
    ctx.strokeStyle = highlight ? 'blue' : 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (highlight) {
        // Draw resize handle on the right edge of the circle
        const handleX = shape.x + shape.radius;
        const handleY = shape.y;

        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.rect(handleX - 5, handleY - 5, 10, 10);
        ctx.fill();
        ctx.stroke();
    }
}

export function isInResizeHandleCircle(pos, shape) {
    const handleX = shape.x + shape.radius;
    const handleY = shape.y;
    return Math.abs(pos.x - handleX) < 10 && Math.abs(pos.y - handleY) < 10;
}

export function isInsideCircle(pos, shape) {
    const dx = pos.x - shape.x;
    const dy = pos.y - shape.y;
    return Math.sqrt(dx * dx + dy * dy) <= shape.radius;
}
