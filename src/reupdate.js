/**
 * MIT License
 *
 * Copyright (c) 2025 Mubarrat
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
