import React from 'react';
export default function Image(props) {
  return React.createElement('img', { src: props.src, alt: props.alt });
}
