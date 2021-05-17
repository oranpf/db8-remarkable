const comment = /<!--[\s\S]*?-->/g;  // comments
const beginMeta = /^<!---*\s+:(?=\s)/g;
const endComment = /-*-->$/g;

export function cross(arrays, crossed = [[]], i = 0) {
  if (i >= arrays.length) {
    return arrays.length === 0 ? [] : crossed;
  }

  let a = arrays[i];
  if (a.length < 1) {
    return [];
  }

  let c = [];
  for (let ia = 0; ia < a.length; ia++) {
    for (let ic = 0; ic < crossed.length; ic++) {
      c.push([...crossed[ic], a[ia]]);
    }
  }

  return cross(arrays, c, i + 1);
  // problematic due to depth recursion and non-array types, so use simpler/controlled recursion:
  //   return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
}


export function lexMetadata(html) {

  try {
    let comments = html.match(comment);
    let raw = [];
  
    for (let comment of comments) {
      let begin = comment.match(beginMeta);
      if (!begin || !begin[0]) continue;
      comment = comment.substr(begin[0].length)
  
      let end = comment.match(endComment);
      if (!end || !end[0]) continue;
      comment = comment.substr(0, comment.length - end[0].length);
  
      
      // parse contents of METADATA in <!-- : METADATA -->
      // into raw as:
      // a : b1 = b2 : c1 = c2 = c3 : = x = : x = : = x  
      // => [[a], [b1, b2], [c1, c2, c3], [null, x, null], [x, null], [null, x]]
      // claims   :== <!-- : claim [: claim] --> .. <!-- : claim [: claim] -->
      // claim    :== clause [= clause]*
      // clause   :== word*
      // word     :== "word" | 'word' | \s*
  
      let context = {
        buffer: '',
        word: null,
        words: [],
        clauses: [],
        claims: []
      };
      let state = '';
      for (let c of comment) {
        state = lex(state, context, c);
      }
      endContext(context);
  
      raw.push(...context.claims);
    }
  
    //return context;
    return raw;
  } catch (e) {
    console.error(e);
    return [];
  }
}

// lexer for metadata language in comment
// initial state at ' ' after '<!-- :' is ':'
// state: { char|class : (c) => [state, fn, arg] }

function lex(state, context, c) {
  let rl = null;
  if (state in lexd) {
    let lexr = lexd[state];
    if (c in lexr) {
      rl = lexr[c];
    } else {
      for (let key in lexr) {
        if (key && key.length > 1 && new RegExp(key).test(c)) {
          rl = lexr[key];
          break;
        }
      }
      if (!rl && lexr['']) {
        rl = lexr[''];
      }
    }
  }
  if (!rl) {
    rl = lexd[''][''];
  }

  state = rl[0];
  if (rl) {
    let ri = 1;
    while (ri < rl.length) {
      rl[ri++](context, c);
    }
  }
  return state;
}

function buffer(context, c) {
  context.buffer += c;
}
function clearBuffer(context) {
  context.buffer = '';
}
function appendWord(context, c) {
  beginWord(context);
  context.word += c;
}
function escapeSeq(context, c) {
  c = (context.buffer || '') + c;
  context.buffer = '';

  // b|f|n|r|t
  if (c === 'b') appendWord(context, '\b')
  else if (c === 'f') appendWord(context, '\f')
  else if (c === 'n') appendWord(context, '\n')
  else if (c === 'r') appendWord(context, '\r')
  else if (c === 't') appendWord(context, '\t')
  else if (c[0] === 'x' || c[0] === 'u') {
    c = String.fromCharCode(parseInt(c.substr(1), 16));
    appendWord(context, c);
  }
}
function beginWord(context) {
  context.word = (context.word || '') + context.buffer;
  context.buffer = '';
}
function endWord(context) {
  context.words.push(context.word);
  context.word = null;
}
function nextClause(context) {
  if (context.word !== null)
    endWord(context);
  if (context.words.length === 0)
    context.words = [null];
  context.clauses.push(context.words);
  context.words = [];
}
function nextClaim(context, c) {
  nextClause(context);
  let claimed = cross(context.clauses);
  context.claims.push(...claimed);
  context.clauses = [];
}
function endContext(context) {
  nextClaim(context);
}


const lexd = {
  ''    : {
        '\\s'       : [''],
        '='         : ['=', buffer],
        ':'         : [':', buffer],
        '"'         : ['"', beginWord],
        ''          : ['w', appendWord]
  },
  '='   : {
        '\\s'       : ['', clearBuffer, nextClause],
        ''          : ['w', appendWord]
  },
  ':'   : {
        '\\s'       : ['', clearBuffer, nextClaim],
        ''          : ['w', appendWord]
  },
  // " strings
  '"'   : {
        '\\'        : ['\\'],
        '"'         : ['', endWord],
        ''          : ['"', appendWord],
  },
  '\\'  : {
    '"'             : ['"', appendWord], // simply escaped characters ", \, and /
    '\\'            : ['"', appendWord], 
    '/'             : ['"', appendWord],
    'b|f|n|r|t'     : ['"', escapeSeq], // single escape sequences
    'x'             : ['x', buffer], // hex
    'u'             : ['u', buffer], // unicode
    ''              : ['"', appendWord], // anything else fails back to literal, ignoring the \
  },
  'x'   : {
    '[0-9a-fA-F]'   : ['x1', buffer],
    ''              : ['"', appendWord],
  },
  'x1'   : {
    '[0-9a-fA-F]'   : ['"', escapeSeq],
    ''              : ['"', appendWord],
  },
  'u'   : {
    '[0-9a-fA-F]'   : ['u1', buffer],
    ''              : ['"', appendWord],
  },
  'u1'   : {
    '[0-9a-fA-F]'   : ['u2', buffer],
    ''              : ['"', appendWord],
  },
  'u2'   : {
    '[0-9a-fA-F]'   : ['u3', buffer],
    ''              : ['"', appendWord],
  },
  'u3'   : {
    '[0-9a-fA-F]'   : ['"', escapeSeq],
    ''              : ['"', appendWord],
  },
  'w'   : {
        '\\s'       : ['', endWord],
        ''          : ['w', appendWord]
  },
  
}