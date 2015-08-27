/* @flow */

import React, { Component, PropTypes } from 'react';
import invariant from 'invariant';
import createStoreShape from '../utils/createStoreShape';
import shallowEqual from '../utils/shallowEqual';
import isPlainObject from '../utils/isPlainObject';

import { graphql } from 'graphql';

export default class GraphQLConnector extends Component {
  static contextTypes = {
    store: createStoreShape(PropTypes).isRequired,
  }

  static propTypes = {
    children: PropTypes.func.isRequired,
    select: PropTypes.func.isRequired,
    query: PropTypes.func.isRequired,
    schema: PropTypes.object.isRequired,
  }

  static defaultProps = {
    select: state => state,
  }

  constructor(props, context) {
    super(props, context);
    this.state = this.selectState(props, context);
  }

  componentDidMount() {
    const { store } = this.context;
    this.unsubscribe = store.subscribe(this.handleChange.bind(this));
    this.handleChange();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.select !== this.props.select) {
      this.handleChange(nextProps);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !this.isSliceEqual(this.state.slice, nextState.slice) ||
           !shallowEqual(this.props, nextProps);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  isSliceEqual(slice, nextSlice) {
    const isRefEqual = slice === nextSlice;
    if (isRefEqual) {
      return true;
    } else if (typeof slice !== 'object' || typeof nextSlice !== 'object') {
      return isRefEqual;
    }
    return shallowEqual(slice, nextSlice);
  }

  handleChange(props = this.props) {
    this.selectState(props, this.context)
      .then(nextState => {
        if (!this.isSliceEqual(this.state.slice, nextState.slice)) {
          this.setState(nextState);
        }
      })
      .catch(err => console.error(err));
  }

  selectState(props, context) {
    const { cache, ...state } = context.store.getState();
    const slice = {
      ...props.select(state),
    };
    const { schema, query } = this.props;
    const cacheSlice = graphql(schema, query(), cache);

    invariant(
      isPlainObject(slice),
      'The return value of `select` prop must be an object. Instead received %s.',
      slice
    );

    return Promise.all([slice, cacheSlice])
      .then(([slice, result]) => {
        console.log('result', result);
        return {
          slice: {
            ...slice,
            ...result.data,
          },
        };
      });
  }

  render() {
    const { children } = this.props;
    const { slice } = this.state;
    const { dispatch } = this.context.store;

    return children({ dispatch, ...slice });
  }
}
