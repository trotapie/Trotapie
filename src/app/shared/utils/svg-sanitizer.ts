const SVG_EVENT_ATTR_RE = /\bon\w+="[^"]*"/gi;
const SVG_EVENT_ATTR_RE_SINGLE = /\bon\w+='[^']*'/gi;
const SVG_SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;
const JAVASCRIPT_URL_RE = /(?:href|xlink:href)\s*=\s*"(?:javascript|data):[^"]*"/gi;
const JAVASCRIPT_URL_RE_SINGLE = /(?:href|xlink:href)\s*=\s*'(?:javascript|data):[^']*'/gi;

export function sanitizeSvg(svg: string): string {
  return svg
    .replace(SVG_SCRIPT_RE, '')
    .replace(SVG_EVENT_ATTR_RE, '')
    .replace(SVG_EVENT_ATTR_RE_SINGLE, '')
    .replace(JAVASCRIPT_URL_RE, '')
    .replace(JAVASCRIPT_URL_RE_SINGLE, '');
}
