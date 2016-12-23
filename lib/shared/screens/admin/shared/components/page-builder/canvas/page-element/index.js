import Droppable from 'components/dnd/droppable';
import Portal from 'components/portal';
import bind from 'decorators/bind';
import calculateElement from 'helpers/element/calculate';
import get from 'lodash/get';
import getElement from 'helpers/page-builder/get-element';
import stylesManager from 'helpers/styles-manager';
import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';

import Element from './element';
import ElementText from './element-text';
import Empty from './empty';

const defaultStyleClassMap = {};

class PageElement extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,              // element id
    contextDoc: PropTypes.string.isRequired,      // element doc context
    contextProperty: PropTypes.string.isRequired, // element property context
    element: PropTypes.object.isRequired,         // element object
    display: PropTypes.string.isRequired,         // current display
    editing: PropTypes.bool.isRequired,           // true if page builder is in edit mode
    links: PropTypes.object,                      // links map [elementID] -> links
    linksData: PropTypes.oneOfType([
      PropTypes.string,                           // doc identifier for current data object
      PropTypes.object                            // current data object
    ])
  };

  static contextTypes = {
    store: PropTypes.object.isRequired
  };

  render () {
    const {element} = this.props;
    let result;

    if (element) {
      const {display, links, contextDoc, contextProperty, linksData} = this.props;
      const {store} = this.context;
      const context = {
        doc: contextDoc,
        property: contextProperty
      };

      // Process element
      this.processedElement = calculateElement({
        element,
        context,
        display,
        links,
        linksData
      });

      // Generate element style
      const styleMap = stylesManager.processElement({
        element,
        context,
        styles: store.getState().styles,
        display
      });

      const {
        ElementClass,
        props,
        displayElement
      } = this.processedElement;

      if (displayElement) {
        // render element
        result = (
          <ElementClass
            {...props}
            styleClassMap={styleMap && styleMap.classMap || defaultStyleClassMap}
            Element={Element}
            ElementText={ElementText}
            renderChildren={this.renderChildren}
            relax={{
              element,
              context
            }}
          />
        );

        // render fixed elements out of the context
        const isFixed = get(styleMap, 'resultValues.position.position', 'static') === 'fixed';
        if (isFixed) {
          result = (
            <Portal attachTo='pb-canvas'>
              {result}
            </Portal>
          );
        }
      }
    }

    return result;
  }

  @bind
  renderChildren (options = {}) {
    const {customDropProps, disableSelection} = options;
    const {element, editing} = this.props;
    const {
      ElementClass,
      children,
      childrenContext
    } = this.processedElement;

    let result;

    if (children) {
      if (editing && !disableSelection) {
        const droppableProps = Object.assign({
          dropInfo: {
            id: element.id,
            context: childrenContext
          },
          type: element.tag,
          placeholder: true,
          placeholderRender: this.renderPlaceholder
        }, ElementClass.settings.drop, customDropProps);

        result = (
          <Droppable {...droppableProps}>
            {children.map(this.renderChild, this)}
          </Droppable>
        );
      } else {
        result = children;
      }
    }

    return result;
  }

  renderChild (childId) {
    const {links, linksData} = this.props; // XXX this needs change
    const {childrenContext} = this.processedElement;

    return (
      <ConnectedPageElement
        key={childId}
        id={childId}
        contextDoc={childrenContext.doc}
        contextProperty={childrenContext.property}
        links={links}
        linksData={linksData}
      />
    );
  }

  @bind
  renderPlaceholder (options) {
    const {element} = this.props;
    const {ElementClass} = this.processedElement;

    return (
      <Empty {...options} settings={ElementClass.settings} element={element} />
    );
  }
}

// Redux map state to props
const mapStateToProps = (state, props) => {
  const {id, contextDoc, contextProperty, links} = props;
  const result = {
    display: state.display,
    editing: state.pageBuilder.editing
  };

  // element
  result.element = getElement({
    state: state.pageBuilder,
    id,
    context: {
      doc: contextDoc,
      property: contextProperty
    }
  });

  // linked properties
  const elementLinks = links && links[id];
  if (elementLinks) {
    // need to "listen" for attributes

  }

  return result;
};

// Connected element
const ConnectedPageElement = connect(mapStateToProps)(PageElement);

export default ConnectedPageElement;