/*!
 * Html-Builder JavaScript Library v2.1.0
 * https://github.com/Mubarrat/html-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/html-builder/blob/main/LICENSE
 */
"use strict";
function appendChildren(parent, ...children) {
    if (!isChildrenType(children))
        throw new Error("Invalid children provided");
    for (const child of children)
        switch (typeof child) {
            case "string":
            case "number":
            case "boolean":
                parent.appendChild(document.createTextNode(child.toString()));
                break;
            case "object":
                if (Array.isArray(child))
                    appendChildren(parent, ...child);
                else
                    parent.appendChild(child.build());
                break;
            default:
                parent.appendChild(document.createTextNode(String(child)));
                break;
        }
}
class Html {
    constructor(...elements) {
        if (!isChildrenType(elements)) {
            throw new Error("Invalid elements provided");
        }
        this.elements = elements;
    }
    build() {
        const fragment = document.createDocumentFragment();
        appendChildren(fragment, ...this.elements);
        return fragment;
    }
}
class HtmlAttributes {
    constructor(attributes = {}) {
        this.attributes = {};
        if (!isAttributesType(attributes))
            throw new Error("Invalid attributes provided");
        Object.assign(this.attributes, attributes instanceof HtmlAttributes
            ? attributes.attributes
            : attributes);
    }
    get(attributeName) {
        return this.attributes[attributeName];
    }
    set(attributeName, attributeValue) {
        this.attributes[attributeName] = attributeValue;
    }
    build(element) {
        for (const attr of Object.keys(this.attributes)) {
            const value = this.get(attr);
            if (attr === 'class' && typeof value === 'string')
                element.classList.add(...value.split(' '));
            else if (attr === 'class' && Array.isArray(value))
                element.classList.add(...value);
            else if (attr === 'style' && typeof value === 'object')
                Object.assign(element.style, value);
            else if (attr === 'on' && typeof value === 'object')
                for (const eventName in value)
                    this.addEvents(element, eventName.toLowerCase(), value[eventName]);
            else if (attr.startsWith('on'))
                this.addEvents(element, attr.toLowerCase().substring(2), value);
            else if (attr === 'data' && typeof value === 'object') {
                for (const name in value) {
                    const data = value[name];
                    element.setAttribute(`data-${name}`, typeof data === 'object'
                        ? JSON.stringify(data)
                        : data);
                }
            }
            else
                element.setAttribute(attr, typeof value === 'object'
                    ? JSON.stringify(value)
                    : value);
        }
        return element;
    }
    addEvents(element, eventName, ...events) {
        for (const event of events)
            if (typeof event === 'function')
                element.addEventListener(eventName, event);
            else if (isEventWithBubbleType(event))
                element.addEventListener(eventName, event[0], event[1]);
            else if (Array.isArray(event))
                this.addEvents(element, eventName, ...event);
        return this;
    }
}
class HtmlItem {
    constructor(tagName, attributes = {}, ...children) {
        this.tagName = tagName;
        if (!tagName || typeof tagName !== "string") {
            throw new Error("Invalid tagName provided");
        }
        if (!(attributes instanceof HtmlAttributes || (attributes && Object.getPrototypeOf(attributes) === Object.prototype))) {
            throw new Error("Invalid attributes provided");
        }
        if (!isChildrenType(children)) {
            throw new Error("Invalid children provided");
        }
        tagName = tagName.trim();
        this.attributes =
            attributes instanceof HtmlAttributes
                ? attributes
                : new HtmlAttributes(attributes);
        this.children = children;
    }
    build() {
        const element = document.createElement(this.tagName);
        this.attributes.build(element);
        appendChildren(element, ...this.children);
        return element;
    }
}
(function (globals) {
    "use strict";
    Object.defineProperty(globals, '$html', {
        value: new Proxy(Html, {
            get(target, prop) {
                if (prop in target) {
                    return target[prop];
                }
                else {
                    const tagName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                    return function (attributes, ...children) {
                        if (!(attributes instanceof HtmlAttributes || (attributes && Object.getPrototypeOf(attributes) === Object.prototype))) {
                            return new HtmlItem(tagName, {}, attributes, ...children);
                        }
                        return new HtmlItem(tagName, attributes, ...children);
                    };
                }
            },
            apply(_target, _thisArg, argArray) {
                return new Html(...argArray);
            },
        }),
        writable: false,
        configurable: false,
        enumerable: true
    });
}((eval)("this")));
function isChildrenType(obj) {
    return (Array.isArray(obj)
        ? obj.every(isChildrenType)
        : obj instanceof HtmlItem ||
            obj instanceof String ||
            obj instanceof Number ||
            obj instanceof Boolean);
}
function isEventWithBubbleType(obj) {
    return (Array.isArray(obj) &&
        obj.length === 2 &&
        obj[0] instanceof Function &&
        (obj[1] instanceof Boolean || isAddEventListenerOptions(obj[1])));
}
function isAddEventListenerOptions(arg) {
    return arg && typeof arg === 'object' && 'capture' in arg;
}
function isEventType(obj) {
    return (Array.isArray(obj)
        ? obj.every(isEventType)
        : obj instanceof Function
            || isEventWithBubbleType(obj));
}
function isAttributesType(obj) {
    return (obj instanceof HtmlAttributes
        || typeof obj == "object");
}
//# sourceMappingURL=html.js.map