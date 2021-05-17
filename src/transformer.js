import { hasValue, mergeInto, removeCycles, setOrAppendValue } from './utility';


// transform marked tokens to remarkable format with metadata, 
// structure, and simplified content.
// usage: transformTokens(tokens, options, container, containers)
//   tokens - the marked token tree root
//   options -
//      nameCycles: true (default) - replace cyclical references with jsonPath to ancestor occurrence
//                  false - remove cycles without any indicators
//      
export function transform(tokens, options, container, containers) {

  container = container || [];
  containers = containers || { '$': container };
  let uid = 777;
  containers['#uniqueName'] = () => {
    let n = uid;
    let m = '';
    while (n >= 25) {
      let c = n % 26;
      m = String.fromCharCode(c + 97) + m;
      n = Math.floor(n / 26);
    }
    m = String.fromCharCode(n + 97) + m;
    uid += 11;
    return "##" + m;
  };
  
  transformNodeTokens(tokens, [container], containers, options);

  // go through all nodes and
  // 1. remove from containers as they are found
  // 2. remove empty children collections
  delete containers['$'];
  cleanNodes(container, containers);

  // if containers has any non-empty named containers remaining,
  // add them to the top level container
  for (let key in containers) {
    let cn = containers[key];
    if (cn && cn.value) {
      let orphan = null;
      if (Array.isArray(cn.value) && cn.value.length > 0) {
        orphan = {};
        orphan[key] = cn.value;
      } else if (typeof cn.value === 'object' && Object.keys(cn.value).length > 0) {
        orphan = {};
        orphan[key] = cn.value;
      }
      if (orphan) container.push(orphan);
    }
  }

  let cycles = [];
  removeCycles(['$'], container, cycles, options.nameCycles);

  // custom transforms:
  if (options.contentTransforms) {
    for (let t of options.contentTransforms) {
      contentTransforms(t, container);
    }
  }

  return container;
}


function moveToMetadata(node, key) {
  if (key in node) {
    if (!('metadata' in node)) {
      node.metadata = {};
    }
    // move md[key] to md.metadata[key]
    setOrAppendValue(node.metadata, key, node[key]);
  }
}

// "@claims": { "resume": { "contact": "@this" } }
function getParent(md) {
  let claims = md['@claims'];
  let parent = null;
  if (claims) {
    for (let sbj in claims) {
      if (sbj === '@this') continue;
      let so = claims[sbj];
      for (let prd in so) {
        if (prd === '@this') continue;
        if (so[prd] === '@this') {
          parent = [sbj, prd];
          delete so[prd];
        }
      }
      if (parent && Object.keys(so).length === 0) delete claims[sbj];
    }
    if (Object.keys(claims).length === 0) delete md['@claims'];
    if (parent) {
      delete md['@parent'];
      return parent;
    }
  }

  if (md['@parent']) {
    let pName = md['@parent'];
    delete md['@parent'];
    return [pName];
  }

  return null;
}

function getName(md, parent, containers) {
  let name = md.name ? md.name : null;
  if (!name && parent && parent.length > 1) {
    name = parent;
  }
  if (!name) {
    name = md.type ? md.type : null;
    if (!name) name = containers['#uniqueName']();
    if (parent && parent.length > 0) {
      name = [parent[0], name];
    }
  }
  if (Array.isArray(name)) name = name.join('.');

  return name.normalize();
}

  // The children of a node is a collection accessible by the name/key of this node
  // The nodes themselves are accessible by the name/key as well to a list of nodes with that name
  // Allow duplicates by making all entries arrays
  // When accessing by name, get the last one in the list
  function addToContainer(key, parentName, value, containers) {
    if (!(key in containers)) {
      containers[key] = { parent: parentName, value: value };
    } else {
      let cn = containers[key];
      let _values = cn._values || [];
      if (Array.isArray(cn.value)) {
        cn.value.push(value);
      } else if (typeof cn.value === 'object') {
        if ((typeof value === 'object')) {
          Object.assign(cn.value, value);
        } else {
          Object.assign(cn.value, { _values: [..._values, value] });
        }
      } else {
        if ((typeof value === 'object')) {
          cn.value = Object.assign(value, { _values: [cn.value] });
        } else {
          cn.value = { _values: [cn.value, value]};
        }
      }
    }
    return containers[key].value;
  }

function processMetadata(metadata, container, containers) {
  let md = {...metadata};
  
  mergeInto(md, 'type', 'className');
  let type = mergeInto(md, 'is', 'className');
  type = Array.isArray(type) ? type[0] : type;
  md.type = type ? type : 'metadata';

  // replace className array with string value
  // TODO: sanitize className
  if (md.className && Array.isArray(md.className)) {
    md.className = md.className.join(' ');
  }

  // get parent name(s) and this name, etc.
  let parent = getParent(md);
  let name = getName(md, parent, containers);
  let parentName = (parent && parent.length > 0) ? parent[0] : '$'

  // make collections named keys
  if ('collections' in md) {
    let collections = Array.isArray(md.collections) 
                 ? md.collections
                 : [md.collections];
    delete md.collections;

    for (const key of collections) {
      if (key === 'children') continue;

      moveToMetadata(md, key);

      // make collection a named key in md
      if (key in containers) {
        let cn = containers[key];
        if (!Array.isArray(cn.value)) cn.value = [cn.value];
        md[key] = cn.value;
      } else {
        let cn = { parent: name, value: [] };
        containers[key] = cn;
        md[key] = cn.value;
      }
    }
  }

  md.children = [];

  addToContainer(`${name}.children`, name, md.children, containers);
  addToContainer(name, parentName, md, containers);

  if (parent && parent.length > 1) {
    let rel = {};
    rel[parent[1]] = md;
    let pv = addToContainer(parent[0], '$', rel, containers);
    if (!('children' in pv)) {
      pv.children = [];
    } else if (!Array.isArray(pv.children)) {
      pv.children = [pv.children];
    }
    container = pv.children;
  } else if (parent && parent.length > 0) {
    if (parentName in containers) {
      let cn = containers[parentName];
      if (Array.isArray(cn.value)) {
        container = addToContainer(parentName, '$', md, containers);
      } else if (`${parentName}.children` in containers) {
        container = addToContainer(`${parentName}.children`, parentName, md, containers);
      } else {
        if (!('children' in cn.value)) {
          cn.value.children = [md];
        } else if (!Array.isArray(cn.value.children)) {
          cn.value.children = [cn.value.children, md];
        } else {
          cn.value.children.push(md);
        }
        container = addToContainer(`${parentName}.children`, parentName, cn.value.children, containers);
      }
    } else {
      container = addToContainer(parentName, '$', [md], containers);
    }
  } else {
    container.push(md);
  }
  
  return [md, container];
}

function processMarkedToken(token, container) {
  if ('children' in token) {
    moveToMetadata(token, 'children');
  }
  token.children = [];

  if (token.type && token.type === 'text') {
    if ('raw' in token) {
      token['text'] = token['raw'];
      delete token['raw'];
    }
    if ('tokens' in token || 'items' in token) {
      if ('text' in token) {
        delete token['text']
      }
    }
  } else {
    if ('raw' in token) {
      delete token['raw'];
    }
    if ('tokens' in token || 'items' in token) {
      if ('text' in token) {
        delete token['text']
      }
    }
  }

  // tokens | items => children
  let children = [];
  function addChildren(key) {
    if (key in token) {
      for (let c of token[key]) {
        children.push(c);
      }
      delete token[key];
    }
  };

  addChildren('tokens');
  addChildren('items');

  if (container && container.indexOf(token) === -1)
    container.push(token);
  
  return [token, children];
}

function transformNodeTokens(tokens, stack, containers, options) {
  let node = null;
  let parent = stack[stack.length - 1];

  for (let token of tokens) {
    // if metadata, it is now the container for tokens that follow
    // until the end of this loop, or a new container is set
    //   - new container replaces top of container stack
    //   - end of loop pops this container off the stack
    
    if (hasValue(token, 'type', 'metadata')) {
      [node, parent] = processMetadata(token, parent, containers);
      // this metadata node has a children collection...
      // parent is where this node landed

      // consecutive metadata nodes will default to the same parent unless they specify a new parent
      stack[stack.length - 1] = parent;

      // non-metadata nodes that follow will land inside of this metadata node 
      // (or the main container if before metadata) until the end of this scope
    } else if (token.type === 'space' && options.retainSpace !== true) {
      continue;
    } else if (token.type === 'html' && options.allowHtml !== true) {
      continue;
    } else {

      let container = (node && node.children)
                    ? node.children
                    : parent;
      let tNode = null, tChildren = null;
      [tNode, tChildren] = processMarkedToken(token, container);
      if (tChildren && tChildren.length > 0) {
        stack.push(tNode.children);
        transformNodeTokens(tChildren, stack, containers, options);
        stack.pop();
      }
    }
  }
}

function removeContainerByValue(value, containers) {
  for (let key in containers) {
    let cn = containers[key];
    if (cn.value === value) {
      delete containers[key];
    }
  }
}

function isTrivial(token) {
  if (token === null || token === undefined) return true;
  if (Array.isArray(token) && token.length === 0) return true;
  if (token instanceof Object && Object.keys(token).length === 0) return true;
}

function cleanArrayNodes(tokens, containers) {
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    removeContainerByValue(token, containers);
    if (isTrivial(token)) {
      tokens.splice(i--, 1);
    } else {
      cleanNode(token, containers);
    }
  }
}

function cleanObjectNodes(tokens, containers) {
  for (let key in tokens) {
    let token = tokens[key];
    removeContainerByValue(token, containers);
    if (isTrivial(token)) {
      delete tokens[key];
    } else {
      cleanNode(token, containers);
    }
  }
}

function cleanNode(tokens, containers) {
  removeContainerByValue(tokens, containers);
  if (Array.isArray(tokens)) {
    cleanArrayNodes(tokens, containers);
  } else if (typeof tokens === 'object') {
    cleanObjectNodes(tokens, containers);
  }
}


// 1. remove from containers as they are found (so we know if they are orphaned)
// 2. remove empty children collections (so we know they are leaf nodes)
// 3. collapse nodes of type X where there is only one child node of type text,
//    and no other properties of this and the child node (other than type) conflict
function cleanNodes(tokens, containers) {
  cleanNode(tokens, containers);
  collapseText(tokens, containers);
}

function collapseText(tokens, containers) {
  
  if (Array.isArray(tokens)) {
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      collapseText(token, containers);
    }
  } else if (typeof tokens === 'object') {
    for (let key in tokens) {
      let token = tokens[key];
      collapseText(token, containers);
    }
  }

  // collapse text:
  if (tokens.children && tokens.children.length === 1) {
    // 3. collapse nodes of type X where there is only one child node of type text,
    //    and no other properties of this and the child node (other than type) conflict
    let child = tokens.children[0];
    if (child.type === 'text' && (!child.children || child.children.length === 0)) {
      let merge = true;
      for (const key in child) {
        if (key === 'type') continue;
        if (key === 'children') continue;
        if (key in tokens && tokens[key] !== child[key]) {
          merge = false;
        }
      }
      if (merge) {
        for (const key in child) {
          if (key === 'type') continue;
          if (key === 'children') continue;
          tokens[key] = child[key];
        }
        delete tokens.children;
      }
    }
  }
  
}





function contentTransforms(transform, node, stack) {
  // maintain a context consisting of:
  //   - current token index in the node
  //   - stack of tokens with this node at the top
  // pass context to transforms for modification
  // transform(node, key or index, stack)

  if (typeof node === 'undefined' || typeof node === 'string') return;
  if (node instanceof String) return;
  if (!(node instanceof Object) && !Array.isArray(node)) return;

  // made sure parent exists
  stack = stack || [];
  stack.push(node);
  
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      transform(stack, i);
      contentTransforms(transform, node[i], stack);
    }
  } else {
    for (let key in node) {
      transform(stack, key);
      contentTransforms(transform, node[key], stack);
    }
  }
  
  stack.pop();
}

