import React from 'react';

export function attributeProps(props, ...keys) {
  let p = {...props};
  delete p['text'];
  delete p['type'];
  delete p['children'];
  delete p['#render'];
  delete p['ixRoot'];
  
  // delete additional keys specified
  for (let key of keys) {
    delete p[key];
  }
  return p;
}

const defaultMap = {
  // html: () => "",
  text: Wrapper('span'),
  span: Wrapper('span'),
  escape: Wrapper('span'),
  strong: Wrapper('strong'),
  em: Wrapper('em'),
  del: Wrapper('del'),
  sup: Wrapper('sup'),
  sub: Wrapper('sub'),
  paragraph: Wrapper('p'),
  section: Wrapper('section'),
  div: Wrapper('div'),
  link: Link, //Wrapper('a'),
  codespan: Wrapper('code'),
  blockquote: Wrapper('blockquote'),

  br: Closed('br'),
  hr: Closed('hr'),

  heading: Heading,

  list: List,

  list_item: ListItem,

  // not yet used / implemented
  //table: Element,
  //code: Element,
};

// RemarkableRenderer returns a function that can render supported
// elements parsed and transformed by remarkable.js as React components
// as well as any others function components provided by renderMap.
// In general, remarkable json object nodes have:
//   type - a string (or possibly array indicating the node type)
//          these generally correspond to either simple dom elements
//          representable with markdown (e.g. heading, paragraph, link, etc.)
//          and associated attributes OR a more complex semantic element type 
//          defined in the remarkable metadata which may have its own defined 
//          attributes, named children collections, and/or a generic children
//          collection of remarkable elements
//  children, classNames, and other attributes depending on the type
export function remarkableRenderer(customRenderMap) {
  let map = {...defaultMap, ...customRenderMap};
  return renderer(map);
}

function renderer(map) {

  let ix = 1;
  // define function, which may be called recursively
  // and assign this render function to the props that are passed down
  function render(props) {
    
    if (props.ixRoot) {
      ix = props.ixRoot;
    }

    // if children need to be rendered, the render function can be pulled from props:
    if (!('#render' in props)) {
      props = {...props, ...{'#render': render }};
    }
    props.key = `k${ix}`;
    ix++;

    // render this node
    if (props.type in map) {
      return map[props.type](props);
    } else {
      return map.div(props);
    }
  };

  return render;
}

export function Children(props) {
  if (props.children && props['#render']) {
    return (
      <>
        {props.children.map(c => props['#render'](c))}
      </>
    );
  }
  return "";
}

export function Wrapper(Tag, ...exceptKeys) {
  return (props) => {
    return (
      <Tag {...attributeProps(props, ...exceptKeys)}>
        {props.text}
        {Children(props)}
      </Tag>
    );
  };
}

export function Link(props) {
  let p = attributeProps(props);
  return (
    <a {...p}>
      {props.text}
      {Children(props)}
    </a>
  );
}

export function Closed(Tag, ...exceptKeys) {
  return (props) => <Tag {...attributeProps(props, ...exceptKeys)} />;
}


// heading: Heading,
function Heading(props) {
  let Tag = `h${props.depth}`;
  return (
    <Tag {...attributeProps(props, 'depth')}>
      {props.text}
      {Children(props)}
    </Tag>
  );  
}

// {
//   "type": "list",
//   "ordered": false,
//   "start": "",
//   "loose": false,
//   "children": [
//     {
//       "type": "list_item",
//       "task": false,
//       "loose": false,
//       "text": "Established patterns for customizing and augmenting the capabilities of Microsoft Dynamics CRM based on existing customization hooks, client code injection, web services, and other approaches."
//     },
//     {
//       "type": "list_item",
//       "task": false,
//       "loose": false,
//       "text": "Lead developer in support of integration with legacy systems, document management, and reporting via BizTalk, Seagull Transidiom, batch processes, web services, COM+ services, windows services, and ETL"
//     }
//   ]
// }

// list: List,
function List(props) {
  let Tag = props.ordered ? 'ol' : 'ul';
  if (!props.ordered) {
    let cn = props.className || '';
    props.className = cn + (!cn ? '' : ' ') + 'fa-ul';
  }
  return (
    <Tag {...attributeProps(props, 'ordered', 'loose')}>
      {props.text}
      {Children(props)}
    </Tag>
  );
}

// list_item: ListItem,
function ListItem(props) {
  return (
    <li {...attributeProps(props, 'task', 'loose')}>
      {<svg aria-hidden="true" focusable="false" className="svg-inline--fa fa-caret-right fa-w-6 fa-li bullet-icon" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 512">
        <path className="li-path" fill="currentColor" stroke="currentColor" strokeWidth="20" d="M0 384.662V127.338c0-17.818 21.543-26.741 34.142-14.142l128.662 128.662c7.81 7.81 7.81 20.474 0 28.284L34.142 398.804C21.543 411.404 0 402.48 0 384.662z"></path>
      </svg>
      }
      {props.text}
      {Children(props)}
    </li>
  );
}
