
export function hasValue(obj, key, value) {
  if (obj && obj[key]) {
    if (obj[key] === value) {
      return true;
    }
    if (Array.isArray(obj[key])) {
      if (obj[key].indexOf(value) > -1)
        return true;
    }
  }
  return false;
}

export function setOrAppendValue(obj, key, value) {
  let current = obj[key];
  if (typeof current === 'undefined') {
    obj[key] = value;
  } else if (key === '@claims') {
    if (Array.isArray(current) || !(current instanceof Object)) {
      obj[key] = { value: current };
      current = obj[key];
    }
    setOrAppendValue(current, 'value', value);
  } else if (!Array.isArray(current)) {
    obj[key] = [current, value];
  } else {
    obj[key] = [...current, value];
  }
}

export function mergeInto(node, key, newKey) {
  if (key in node) {
    let previous = node[key];
    if (Array.isArray(previous)) {
      for (const value of previous) {
        setOrAppendValue(node, newKey, value);
      }
    } else {
      setOrAppendValue(node, newKey, node[key]);
    }
    delete node[key];
    return previous;
  }
  return undefined;
}

export function removeCycles(names, stack, cycles, replaceWithName) {
  const top = stack[stack.length - 1];

  if (typeof top === 'undefined' || typeof top === 'string') return;
  if (top instanceof String) return;
  if (!(top instanceof Object) && !Array.isArray(top)) return;

  for (let i = 0; i < stack.length - 2; i++) {
    if (stack[i] === top) {
      const start = names.slice(0, i + 1).join('');
      cycles.push(`${start} === ${names.join('')}`);
      return start;
    }
  }

  if (Array.isArray(top)) {
    for (let i = 0; i < top.length; i++) {
      names.push(`[${i}]`);
      stack.push(top[i]);
      const start = removeCycles(names, stack, cycles, replaceWithName);
      names.pop();
      stack.pop();
      if (start) {
        if (replaceWithName) top[i] = start;
        else top.splice(i--, 1);
      }
    }
  } else {
    for (const key in top) {
      names.push(`.${key}`);
      stack.push(top[key]);
      const start = removeCycles(names, stack, cycles, replaceWithName);
      names.pop();
      stack.pop();
      if (start) {
        if (replaceWithName) top[key] = start;
        else delete top[key];
      }
    }
  }
  return undefined;
}