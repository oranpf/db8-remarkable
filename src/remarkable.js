import marked from 'marked';
import { resolve } from './resolver';
import { transform } from './transformer';

const defaultOptions = {
  retainSpace: false,
  allowHtml: false,
  nameCycles: true,
}

export function remarkable(src, options) {

  options = {...defaultOptions, ...options};

  const markdown = () => fetch(src)
    .then(response => response.text());

  const lexed = () => markdown()
    .then(md => marked.lexer(md));

  const rawHtml = () => lexed()
    .then(ta => marked.parser(ta));

  const rawTokens = () => lexed()
    .then(ta => resolve(ta));

  const tokens = () => rawTokens()
    .then(r => transform(r, options));

  return {
    markdown,
    lexed,
    rawHtml,
    rawTokens,
    tokens,
  };
}