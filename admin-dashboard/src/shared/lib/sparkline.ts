/** Draws a filled line sparkline (faint baseline grid, gradient fill, emphasized endpoint) onto a canvas sized to its own CSS box. */
export function drawSparkline(canvas: HTMLCanvasElement, data: number[], color: string): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 220;
  const height = rect.height || 32;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points: Array<[number, number]> = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  // Faint baseline grid.
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 3);
  ctx.lineTo(width, height - 3);
  ctx.stroke();

  // Gradient area fill under the line.
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  ctx.beginPath();
  ctx.moveTo(points[0][0], height);
  points.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(points[points.length - 1][0], height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // The line itself.
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.75;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Emphasized endpoint.
  const [lastX, lastY] = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
