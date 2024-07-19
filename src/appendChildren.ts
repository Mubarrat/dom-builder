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
 * Helper method to recursively append children to an HTML element.
 * @param parent The parent element where the children will be appended.
 * @param children The children to be appended in the parent element.
 */
function appendChildren(parent: HTMLElement | DocumentFragment, ...children: ChildrenType[]) {

  // Validate children
  if (!isChildrenType(children))

    // let's throw an error.
    throw new Error("Invalid children provided");

  // Iterate child over children
  for (const child of children)

    // Compare type of child
    switch (typeof child) {

      // Text node
      case "string":
      case "number":
      case "boolean":

        // Append the text node
        parent.appendChild(document.createTextNode(child.toString()));
        break;

      // An object
      case "object":

        // Check if child is an array
        if (Array.isArray(child))

          // Array of children, recursively append
          appendChildren(parent, ...child);

        // Otherwise, The only scope for that child is HtmlItem
        else

          // Append child to the parent element
          parent.appendChild(child.build());

        break;

      // If anything else
      default:

        // Convert other types to string and append as text node
        parent.appendChild(document.createTextNode(String(child)));
        break;
    }
}
