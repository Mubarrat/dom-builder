import { writeFileSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { minify } from 'terser';
import pkg from './package.json' with { type: 'json' };

const distDir = './dist';
const outputFile = join(distDir, 'dom.js');
const sourceMapFile = join(distDir, 'dom.js.map');
const minifiedFile = join(distDir, 'dom.min.js');
const minifiedMapFile = join(distDir, 'dom.min.js.map');
const declarationFile = join(distDir, 'dom.d.ts');

const licenseComment = `/*!
 * Dom-Builder JavaScript Library v${pkg.version || '1.0.0'}
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */`;

writeFileSync(outputFile, `${licenseComment}
/// <reference path="./dom.d.ts" />
${readFileSync(outputFile, 'utf8').trim()}`, 'utf8');

writeFileSync(declarationFile, `${licenseComment}
${readFileSync(declarationFile, 'utf8').trim()}`, 'utf8');

console.log('Prepended license and declaration reference.');

const code = readFileSync(outputFile, 'utf8');
const map = readFileSync(sourceMapFile, 'utf8');
try {
	const minified = await minify(code, {
		sourceMap: {
			content: map,
			url: basename(minifiedMapFile),
		},
		format: {
			comments: (_, comment) =>
				comment.value.startsWith('!') ||
				comment.value.trim().startsWith('/ <reference path="./dom.d.ts" />')
		}
	});
	if (minified.error) throw minified.error;

	writeFileSync(minifiedFile, minified.code, 'utf8');
	writeFileSync(minifiedMapFile, minified.map, 'utf8');
	console.log(`Minified successfully: ${minifiedFile} and ${minifiedMapFile}`);
} catch (err) {
	console.error('Terser minification error:', err);
	process.exit(1);
}
