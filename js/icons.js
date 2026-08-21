/* Inline SVG icons -- stroked, currentColor, no icon font, no network. */
(function (global) {
  'use strict';

  var P = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    map: '<path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    star: '<path d="M12 2l3 6.5 7 .9-5 4.8 1.2 7L12 18l-6.2 3.2L7 14.2l-5-4.8 7-.9z"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 000-9 6 6 0 00-11.7 1.7A3.7 3.7 0 006.5 19z"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h13"/>',
    ear: '<path d="M6 10a6 6 0 1112 0c0 3-2 4-3.5 5S13 17 13 19a2.5 2.5 0 01-5 0"/><path d="M9.5 10a2.5 2.5 0 015 0"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    flag: '<path d="M4 22V4M4 4h11l-1.5 4L15 12H4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    card: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>',
    save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0113 0"/><path d="M16 5.5a3.5 3.5 0 010 7M17.5 21a6.5 6.5 0 00-2.2-4.9"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 6-2 6s4.5-.5 6-2c.9-.9.9-2.3 0-3.2a2.3 2.3 0 00-4 0z"/><path d="M14.5 12.5L18 9a6 6 0 001.5-6A6 6 0 0013.5 4.5L10 8"/><path d="M9 11l4 4"/><path d="M15 4l5 5"/>'
  };

  function svg(name, size) {
    var d = P[name] || '';
    return '<svg viewBox="0 0 24 24" width="' + (size || '1.4rem') + '" height="' + (size || '1.4rem') +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  }

  global.Icons = { svg: svg, names: Object.keys(P) };
})(window);
