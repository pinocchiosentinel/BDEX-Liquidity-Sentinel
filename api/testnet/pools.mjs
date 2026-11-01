import catchAll from '../[...path].mjs';
export default function handler(request, response) { return catchAll(request, response); }