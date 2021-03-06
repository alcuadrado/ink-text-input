import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Color, StdinContext} from 'ink';
import chalk from 'chalk';

const ARROW_UP = '\u001B[A';
const ARROW_DOWN = '\u001B[B';
const ARROW_LEFT = '\u001B[D';
const ARROW_RIGHT = '\u001B[C';
const ENTER = '\r';
const CTRL_C = '\x03';

class TextInput extends PureComponent {
	static propTypes = {
		value: PropTypes.string.isRequired,
		placeholder: PropTypes.string,
		focus: PropTypes.bool,
		mask: PropTypes.string,
		showCursor: PropTypes.bool,
		stdin: PropTypes.object.isRequired,
		setRawMode: PropTypes.func.isRequired,
		onChange: PropTypes.func.isRequired
	}

	static defaultProps = {
		placeholder: '',
		showCursor: true,
		focus: true,
		mask: undefined
	};

	state = {
		cursorOffset: 0
	}

	render() {
		const {value, placeholder, showCursor, focus, mask} = this.props;
		const {cursorOffset} = this.state;
		const hasValue = value.length > 0;
		let renderedValue = value;

		// Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
		if (showCursor && !mask && focus) {
			renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

			let i = 0;
			for (const char of value) {
				if (i++ === cursorOffset) {
					renderedValue += chalk.inverse(char);
				} else {
					renderedValue += char;
				}
			}

			if (value.length > 0 && cursorOffset === value.length) {
				renderedValue += chalk.inverse(' ');
			}
		}

		if (mask) {
			renderedValue = mask.repeat(renderedValue.length);
		}

		return (
			<Color dim={!hasValue && placeholder}>
				{placeholder ? (hasValue ? renderedValue : placeholder) : renderedValue}
			</Color>
		);
	}

	componentDidMount() {
		const {stdin, setRawMode} = this.props;

		setRawMode(true);
		stdin.on('data', this.handleInput);
	}

	componentWillUnmount() {
		const {stdin, setRawMode} = this.props;

		stdin.removeListener('data', this.handleInput);
		setRawMode(false);
	}

	handleInput = data => {
		const {value: originalValue, focus, showCursor, mask} = this.props;
		const {cursorOffset: originalCursorOffset} = this.state;

		if (focus === false) {
			return;
		}

		const s = String(data);

		if (s === ARROW_UP || s === ARROW_DOWN || s === ENTER || s === CTRL_C) {
			return;
		}

		let cursorOffset = originalCursorOffset;
		let value = originalValue;

		if (s === ARROW_LEFT) {
			if (showCursor && !mask) {
				cursorOffset--;
			}
		} else if (s === ARROW_RIGHT) {
			if (showCursor && !mask) {
				cursorOffset++;
			}
		} else if (s === '\x08' || s === '\x7F') {
			value = value.substr(0, cursorOffset - 1) + value.substr(cursorOffset, value.length);
			cursorOffset--;
		} else {
			value = value.substr(0, cursorOffset) + s + value.substr(cursorOffset, value.length);
			cursorOffset++;
		}

		if (cursorOffset < 0) {
			cursorOffset = 0;
		}

		if (cursorOffset > value.length) {
			cursorOffset = value.length;
		}

		this.setState({cursorOffset});

		if (value !== originalValue) {
			this.props.onChange(value);
		}
	}
}

export default class TextInputWithStdin extends PureComponent {
	render() {
		return (
			<StdinContext.Consumer>
				{({stdin, setRawMode}) => (
					<TextInput {...this.props} stdin={stdin} setRawMode={setRawMode}/>
				)}
			</StdinContext.Consumer>
		);
	}
}
