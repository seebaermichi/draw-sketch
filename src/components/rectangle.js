import { rotatePoint } from './base-shape.js'

export function drawRectangle(ctx, s, highlight = false) {
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.rotation || 0)

    // Main shape
    ctx.beginPath()
    ctx.rect(0, 0, s.width, s.height)
    ctx.strokeStyle = highlight ? 'blue' : 'black'
    ctx.lineWidth = highlight ? 2 : 1
    ctx.stroke()

    if (highlight) {
        // Resize handle (bottom-right)
        ctx.beginPath()
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.rect(s.width - 5, s.height - 5, 10, 10)
        ctx.fill()
        ctx.stroke()

        // Rotation handle (center)
        ctx.beginPath()
        ctx.arc(0, 0, 6, 0, Math.PI * 2)
        ctx.fillStyle = 'green'
        ctx.strokeStyle = 'black'
        ctx.fill()
        ctx.stroke()
    }

    ctx.restore()
}

export function isInsideRectangle(pos, shape) {
    const dx = pos.x - shape.x
    const dy = pos.y - shape.y
    const rotated = rotatePoint(dx, dy, -(shape.rotation || 0))

    return rotated.x >= 0 && rotated.x <= shape.width &&
        rotated.y >= 0 && rotated.y <= shape.height
}

export function isInResizeHandle(pos, shape) {
    const dx = pos.x - shape.x
    const dy = pos.y - shape.y
    const rotated = rotatePoint(dx, dy, -(shape.rotation || 0))

    return Math.abs(rotated.x - shape.width) < 10 && Math.abs(rotated.y - shape.height) < 10
}

export function isInRotateHandle(pos, shape) {
    const dx = pos.x - shape.x
    const dy = pos.y - shape.y

    return Math.hypot(dx, dy) < 8
}
