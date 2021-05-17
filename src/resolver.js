import { lexMetadata } from './lexer';
import { setOrAppendValue, mergeInto } from './utility';

export function resolve(tokens) {
  let result = [];

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (token.type === 'html') {
      let metadata = resolveMetadata(token.raw);
      if (metadata != null) {
        let obj = Object.assign({ 'type': 'metadata' }, metadata);
        if (obj.type !== 'metadata') {
          mergeInto(obj, 'type', 'is');
          obj.type = 'metadata';
        }
        result.push(obj);
      }
    }
    if ('tokens' in token) {
      token.tokens = resolve(token.tokens);
    }
    if ('items' in token) {
      token.items = resolve(token.items);
    }
    
    result.push(token);
  }
  return result;
}

// [{ subject: x, y: [z] }, { subject: g1, ... }]}
export function resolveMetadata(html) {
  // empty / null claim could be used to indicate nesting level... 
  // ...keep explicit for now, and ignore empty claims

  let ra = lexMetadata(html);
  if (!ra || ra.length === 0)
    return null;

  let sbj = {};
  for (let claim of ra) {

    // remove sequences of more than one null:
    claim = removeNullRuns(claim);

    // replace nulls with explicit subject
    setDefaults(claim, '@this');

    // resolve claim:
    resolveClaim(sbj, claim);
  }
  if (Object.keys(sbj).length === 0)
    return null;
  return sbj;
}


function resolveClaim(sbj, claim) {

  // empty or null array is trivial
    if (!claim || claim.length === 0 || (claim.length === 1 && claim[0] === '@this')) {
      return;
    }

    // remove implicit subject from front
    // all claims are either about subject or in "claims" made by subject
    while (claim.length > 0 && claim[0] === '@this') {
      claim = [...claim.slice(1)];
    }
    
    if (claim.length === 0) {
      return;
    } else if (claim.length === 1) { // single clause 'Z' => 'subject is Z'
      claim = ['is', claim[0]];
    } else if (claim.length === 2) { // two clause 'X Z' => 'subject X Z'
      claim = [...claim];
    } else {
      if (claim.length === 3 && claim[0] === '@claims') {
        claim = ['@claims', claim[1], 'is', claim[2]];
      } else {
        if (claim[0] !== '@claims') {
          claim = ['@claims', ...claim];
        } else {
          claim = [...claim];
        }
      }
    }

    // claim :== triple|quad|sclaim
    // triple = s p o ...c
    // quad   = 'ns:c': s p o ...c
    // sclaim  = s claims [claim*]
    if (claim[0] === '@claims') {
      resolveClaimBy(sbj, ...claim.slice(1));
    } else {
      resolveClaimAbout(sbj, ...claim);
    }

}

function resolveClaimBy(claimant, sbj, ...claim) {
  // make sure we have a set of claims
  let claims = claimant['@claims'];
  if (typeof claims === 'undefined') {
    claimant['@claims'] = {};
  } else if (Array.isArray(claims) || !(claims instanceof Object)) {
    claimant['@claims'] = { value: claims };
  }
  claims = claimant['@claims'];

  // add sbj to claims if needed:
  if (sbj in claims) {
    if (!(claims[sbj] instanceof Object)){
      claims[sbj] = { value: claims[sbj] };
    }
  } else {
    claims[sbj] = {};
  }
  sbj = claims[sbj];

  // recursively traverse down,
  // now the subject is the named subject of the claim
  // made _by_ the original subject
  resolveClaimAbout(sbj, ...claim)
  //resolveClaim(sbj, claim);
}

// resolve claim sbj predicate obj ...ctx
function resolveClaimAbout(sbj, predicate, obj, ...ctx) {

  setOrAppendValue(sbj, predicate, obj);

  if (ctx && ctx.length > 0) {
    let namespace = `@ns:${ctx[0]}`;
    let namespaced = sbj[namespace];
    if (!namespaced || !(namespaced instanceof Object)) {
      namespaced = !!namespaced ? { value: namespaced } : {};
      sbj[namespace] = namespaced;
    }

    resolveClaimAbout(namespaced, predicate, obj, ...ctx.slice(1));
  }
}

export function setDefaults(cc, defaultValue) {
  for (let i = 0; i < cc.length; i++) {
    if (cc[i] === null || cc[i] === undefined) {
      cc[i] = defaultValue;
    }
  }
  return cc;
}

export function removeNullRuns(cc) {
  let lastC = undefined;
  let ccr = [];
  for (let c of cc) {
    if (c !== null || lastC !== null) {
      ccr.push(c);
    }
    lastC = c;
  }
  return ccr;
}