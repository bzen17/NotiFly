import React from 'react';
export default function Image(props) {
  // simple mock that renders an img tag
  return React.createElement('img', { src: props.src, alt: props.alt });
}
