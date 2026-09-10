(() => {
  const holder = document.querySelector('#locality-chart');
  if (!holder) return;

  const data = [
    { label: 'Pharmaceutical products', y2017: 6201, y2025: 6355 },
    { label: 'Machinery and parts', y2017: 7864, y2025: 10477 },
    { label: 'Electrical machinery', y2017: 10699, y2025: 11447 },
    { label: 'Medical and optical instruments', y2017: 8987, y2025: 7909 },
    { label: 'Tools and cutlery', y2017: 7968, y2025: 8289 },
    { label: 'Organic chemicals', y2017: 5833, y2025: 7337 },
    { label: 'Articles of iron or steel', y2017: 8069, y2025: 9093 },
    { label: 'Stone, plaster and cement articles', y2017: 7064, y2025: 6815 }
  ];

  const svgNode = (tag, attrs = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };

  const svgText = (x, y, value, className, anchor) => {
    const element = svgNode('text', { x, y, class: className, 'text-anchor': anchor });
    element.textContent = value;
    return element;
  };

  const width = 1040;
  const height = 390;
  const margin = { top: 42, right: 70, bottom: 36, left: 255 };
  const innerWidth = width - margin.left - margin.right;
  const rowGap = 39;
  const minimum = 5000;
  const maximum = 12000;
  const x = value => margin.left + (value - minimum) / (maximum - minimum) * innerWidth;
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });

  [6000, 8000, 10000, 12000].forEach(value => {
    const position = x(value);
    svg.append(svgNode('line', {
      x1: position, y1: margin.top - 17,
      x2: position, y2: height - margin.bottom,
      class: 'locality-grid-line'
    }));
    svg.append(svgText(position, 20, `${value / 1000}k km`, 'locality-axis-label', 'middle'));
  });

  data.forEach((item, index) => {
    const y = margin.top + index * rowGap;
    const movedFarther = item.y2025 >= item.y2017;
    svg.append(svgText(margin.left - 18, y + 4, item.label, 'locality-row-label', 'end'));
    svg.append(svgNode('line', {
      x1: x(item.y2017), y1: y,
      x2: x(item.y2025), y2: y,
      class: 'locality-link'
    }));
    svg.append(svgNode('circle', { cx: x(item.y2017), cy: y, r: 6, class: 'locality-old' }));
    svg.append(svgNode('circle', { cx: x(item.y2025), cy: y, r: 7, class: 'locality-current' }));
    svg.append(svgText(
      x(item.y2017) + (movedFarther ? -10 : 10), y - 11,
      item.y2017.toLocaleString('en-US'), 'locality-value', movedFarther ? 'end' : 'start'
    ));
    svg.append(svgText(
      x(item.y2025) + (movedFarther ? 10 : -10), y - 11,
      item.y2025.toLocaleString('en-US'), 'locality-value', movedFarther ? 'start' : 'end'
    ));
  });

  holder.replaceChildren(svg);
})();
