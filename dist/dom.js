/*!
 * Dom-Builder JavaScript Library v1.0.0
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */

Function.prototype.computed = function(...observables) {
    let value = this();
    const subscriptions = new Set(), elements = new Set();
    function obs() {
        return value;
    }
    obs.notify = () => (subscriptions.forEach(fn => fn(value)), elements.forEach(element => element.value = value));
    obs.subscribe = fn => { subscriptions.add(fn); return () => subscriptions.delete(fn); };
    obs.bind = () => ({
        value: obs(),
        refMVVM() {
            obs.elements.add(this);
        }
    });
    observables.forEach(observable => observable.subscribe(() => { value = this(); obs.notify(); }));
    return obs;
};

Object.defineProperties(Document.prototype, {
	$dom: {
		value(namespace) {
			return new Proxy({}, {
				get: (_, prop) => {
					const tagName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
					return (...args) => {
						const element = this.createElementNS(namespace, tagName);
						for (const arg of args.flat(Infinity)) {
							if (arg === null || arg === undefined || arg === false) {
								continue;
							}
							if (arg.constructor === Object) {
								for (const [attr, value] of Object.entries(arg)) {
									if (attr === 'class') {
										element.className = value;
									} else if (attr === 'style' && typeof value === 'object') {
										Object.assign(element.style, value);
									} else if (attr === 'on' && typeof value === 'object') {
										for (const [eventName, handler] of Object.entries(value)) {
											for (const event of [handler].flat(Infinity)) {
												if (typeof event === 'function') {
													element.addEventListener(eventName.toLowerCase(), event);
												}
											}
										}
									} else if (attr.startsWith('on')) {
										for (const event of [value].flat(Infinity)) {
											if (typeof event === 'function') {
												element.addEventListener(attr.slice(2).toLowerCase(), event);
											}
										}
									} else if (attr === 'data' && typeof value === 'object') {
										for (const name in value) {
											const data = value[name];
											element.setAttribute(`data-${name}`, typeof data === 'object' ? JSON.stringify(data) : data);
										}
									} else if (attr.toLowerCase().startsWith('ref')) {
										for (const event of [value].flat(Infinity)) {
											if (typeof event === 'function') {
												event.bind(element, element);
											}
										}
									} else if (value != null && value !== false) {
										element.setAttribute(attr, typeof value === 'object' ? JSON.stringify(value) : value);
									}
								}
							} else {
								const stack = [arg];
								while (stack.length) {
									let current = stack.pop();
									if (current == null || current === false) continue;
									while (typeof current === "function") current = current();
									if (Array.isArray(current)) {
										stack.push(...current.reverse());
										continue;
									}
									if (current instanceof Node) {
										element.append(current);
									} else {
										element.append(this.createTextNode(String(current)));
									}
								}
							}
						}
						return element;
					};
				}
			});
		},
		configurable: false,
		enumerable: true
	},
	$html: {
		get() { return this.$html = this.$dom("http://www.w3.org/1999/xhtml"); },
		configurable: false,
		enumerable: true
	},
	$svg: {
		get() { return this.$svg = this.$dom("http://www.w3.org/2000/svg"); },
		configurable: false,
		enumerable: true
	},
	$mml: {
		get() { return this.$mml = this.$dom("http://www.w3.org/1998/Math/MathML"); },
		configurable: false,
		enumerable: true
	}
});

function observable(initialValue = null) {
	let value = initialValue;
	const subscriptions = new Set(), elements = new Set();
	function obs(newVal) {
		if (arguments.length !== 0 && value !== newVal) {
			value = newVal;
			obs.notify();
		}
		return value;
	}
	obs.notify = () => (subscriptions.forEach(fn => fn(value)), elements.forEach(element => element.value = value));
	obs.subscribe = fn => { subscriptions.add(fn); return () => subscriptions.delete(fn); };
	obs.bind = () => ({
		value: obs(),
		refMVVM() { obs.elements.add(this) }
	});
	obs.bindToSource = (listener = 'oninput') => ({
		value: obs(),
		[listener]() { obs(this.value) }
	});
	obs.bindTwoWay = (listener = 'oninput') => ({
		value: obs(),
		[listener]() { obs(this.value) },
		refMVVM() { obs.elements.add(this) }
	});
	return obs;
}

Function.prototype.recreate = function(...observables) {
	const fn = this;
	let el = [fn(update)].flat(Infinity);
	function update() {
		const newEl = [fn(update)].flat(Infinity);
		if (!el[0]) return;
		el[0].before(...newEl);
		el.forEach(node => node.remove());
		el = newEl;
		el.update = update;
	}
	observables.flat(Infinity).forEach(obs => obs.subscribe(update));
	el.update = update;
	return el;
};

Function.prototype.reupdate = function(...observables) {
	const fn = this;
	let el = fn(update);

	function isSameNode(a, b) {
		if (!a || !b) return false;
		if (a.nodeType !== b.nodeType) return false;
		if (a.nodeType === 3) // Text node
			return a.textContent === b.textContent;
		if (a.tagName !== b.tagName) return false;
		const aId = a.id || undefined;
		const bId = b.id || undefined;
		if (aId !== bId) return false;
		const aName = a.getAttribute('name') || undefined;
		const bName = b.getAttribute('name') || undefined;
		if (aName !== bName) return false;
		return true;
	}

	function patchAttributes(oldEl, newEl) {
		const oldAttrs = oldEl.attributes;
		const newAttrs = newEl.attributes;

		for (let i = oldAttrs.length - 1; i >= 0; i--) {
			const attr = oldAttrs[i];
			if (!newEl.hasAttribute(attr.name)) {
				oldEl.removeAttribute(attr.name);
			}
		}

		for (let i = 0; i < newAttrs.length; i++) {
			const attr = newAttrs[i];
			if (oldEl.getAttribute(attr.name) !== attr.value) {
				oldEl.setAttribute(attr.name, attr.value);
			}
		}

		if (oldEl instanceof HTMLInputElement || oldEl instanceof HTMLTextAreaElement || oldEl instanceof HTMLSelectElement) {
			if ('value' in oldEl && oldEl.value !== newEl.value) {
				oldEl.value = newEl.value;
			}
			if ('checked' in oldEl && oldEl.checked !== newEl.checked) {
				oldEl.checked = newEl.checked;
			}
			if ('selected' in oldEl && oldEl.selected !== newEl.selected) {
				oldEl.selected = newEl.selected;
			}
		}
	}

	function recursiveDiffPatch(parent, oldChildren, newChildren) {
		oldChildren = Array.from(oldChildren);
		newChildren = Array.from(newChildren);

		const oldMap = oldChildren.map(node => ({ node, checked: false }));

		let lastInsertedNode = null;

		for (const newNode of newChildren) {
			let found = oldMap.find(({ node, checked }) => !checked && isSameNode(node, newNode));
			if (!found) {
				if (lastInsertedNode) {
					lastInsertedNode.after(newNode);
				} else {
					parent.prepend(newNode);
				}
				lastInsertedNode = newNode;
			} else {
				found.checked = true;
				lastInsertedNode = found.node;
				if (found.node.nodeType === 1) {
					patchAttributes(found.node, newNode);
					recursiveDiffPatch(found.node, found.node.childNodes, newNode.childNodes);
				} else if (found.node.nodeType === 3) {
					if (found.node.textContent !== newNode.textContent) {
						found.node.textContent = newNode.textContent;
					}
				}
			}
		}

		for (const { node, checked } of oldMap) {
			if (!checked) {
				node.remove();
			}
		}
	}

	function update() {
		const newEl = fn(update);
		const doc = (Array.isArray(el) ? el[0]?.ownerDocument : el?.ownerDocument) || document;

		if (Array.isArray(el) && Array.isArray(newEl)) {
			const parent = el[0]?.parentNode;
			if (!parent) return;

			recursiveDiffPatch(parent, el, newEl);

		} else if (!Array.isArray(el) && !Array.isArray(newEl)) {
			const parent = el.parentNode;
			if (!parent) return;

			if (!isSameNode(el, newEl)) {
				parent.replaceChild(newEl, el);
				el = newEl;
			} else {
				patchAttributes(el, newEl);
				recursiveDiffPatch(parent, el.childNodes, newEl.childNodes);
			}

		} else {
			if (Array.isArray(el)) {
				const parent = el[0]?.parentNode;
				if (!parent) return;
				const anchor = doc.createComment('');
				parent.insertBefore(anchor, el[0]);
				el.flat(Infinity).forEach(node => parent.removeChild(node));
				newEl.flat(Infinity).forEach(node => parent.insertBefore(node, anchor));
				parent.removeChild(anchor);
			} else {
				const parent = el.parentNode;
				if (!parent) return;
				parent.replaceChild(newEl, el);
			}
			el = newEl;
		}

		el.update = update;
	}

	observables.flat(Infinity).forEach(obs => obs.subscribe(update));
	el.update = update;
	return el;
};

function validatable(validator = () => true, initialValue = null) {
	const obs = observable(initialValue);
	obs.isValid = (() => validator(obs())).computed(obs);
	return obs;
}

Object.defineProperties(Window.prototype, {
    $dom: {
        get() { return this.document.$dom; },
        configurable: false,
        enumerable: true
    },
    $html: {
        get() { return this.document.$html; },
        configurable: false,
        enumerable: true
    },
    $svg: {
        get() { return this.document.$svg; },
        configurable: false,
        enumerable: true
    },
    $mml: {
        get() { return this.document.$mml; },
        configurable: false,
        enumerable: true
    }
});
