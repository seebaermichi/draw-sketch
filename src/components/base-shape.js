export function rotatePoint(x, y, angle) {
    return {
      x: Math.cos(angle) * x - Math.sin(angle) * y,
      y: Math.sin(angle) * x + Math.cos(angle) * y
    };
  }
