/**
 * MIT License
 *
 * Copyright (c) 2023 Mubarrat
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

/**
 * Recursive type definition for type
 */
type RecuriveType<T> = T | RecuriveType<T>[];

/**
 * Children type definition from recursive type
 */
type ChildrenType = RecuriveType<HtmlItem | string | number | boolean>;

/**
 * Checks that `obj` is children type
 * @param obj The object
 * @returns obj is ChildrenType
 */
function isChildrenType(obj: any): obj is ChildrenType {

  // Returns obj is ChildrenType
  return (

    // Is `obj` an array
    Array.isArray(obj)

    // If true, check it's item
    ? obj.every(isChildrenType)

    // If not, then check obj is an instance of HtmlItem or String or Number or Boolean
    : obj instanceof HtmlItem ||
      obj instanceof String ||
      obj instanceof Number ||
      obj instanceof Boolean
  );
}

/**
 * Event type definition from recursive type
 */
type EventWithBubbleType = [EventListener, boolean | AddEventListenerOptions];

/**
 * Checks that `obj` is EventWithBubbleType
 * @param obj The object
 * @returns obj is EventWithBubbleType
 */
function isEventWithBubbleType(obj: any): obj is EventWithBubbleType {

  // Returns obj is EventWithBubbleType
  return (

    // Check if obj is an array
    Array.isArray(obj) &&

    // Check if obj has 2 lengths
    obj.length === 2 &&

    // Check if the first item is an instance of Function
    obj[0] instanceof Function &&

    // Check if the second item is a boolean or a AddEventListenerOptions
    (obj[1] instanceof Boolean || isAddEventListenerOptions(obj[1]))
  );
}

/**
 * Check that arg is an AddEventListenerOptions
 * @param arg The object to check
 * @returns arg is AddEventListenerOptions
 */
function isAddEventListenerOptions(arg: any): arg is AddEventListenerOptions {

  // Returns arg is AddEventListenerOptions
  return arg && typeof arg === 'object' && 'capture' in arg;
}

/**
 * Event type definition from recursive type
 */
type EventType = RecuriveType<EventListener | EventWithBubbleType>;

/**
 * Check that obj is an EventType
 * @param obj The object to check
 * @returns obj is EventType
 */
function isEventType(obj: any): obj is EventType {

  // Returns obj is EventType
  return (

    // Is obj an array?
    Array.isArray(obj)

    // If true, check it's every item
    ? obj.every(isEventType)

    // If not, is it a instance of function
    : obj instanceof Function

    // or a function with a event option
    || isEventWithBubbleType(obj)
  );
}

/**
 * Attributes type definition
 */
type AttributesType = HtmlAttributes | { [attributeName: string]: any };

/**
 * Check that obj is an AttributesType
 * @param obj The object to check
 * @returns obj is AttributesType
 */
function isAttributesType(obj: any): obj is AttributesType {

  // Returns obj is AttributesType
  return (

    // Check if obj is instance of HtmlAttrbiutes
    obj instanceof HtmlAttributes

    // or object
    || typeof obj == "object"
  );
}
