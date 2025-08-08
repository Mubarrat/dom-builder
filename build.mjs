import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { minify } from 'terser';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import pkg from './package.json' with { type: 'json' };

const distDir = './dist';

// JS files
const outputFile = join(distDir, 'dom.js');
const sourceMapFile = join(distDir, 'dom.js.map');
const minifiedFile = join(distDir, 'dom.min.js');
const minifiedMapFile = join(distDir, 'dom.min.js.map');

// DTS files
const declarationFile = join(distDir, 'dom.d.ts');
const declarationMapFile = join(distDir, 'dom.d.ts.map');

const licenseComment = `/*!
 * Dom-Builder JavaScript Library v${pkg.version || '1.0.0'}
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */`;

const licenseLines = licenseComment.split('\n').length;

// Utility to prepend license (and optional reference comment) to a file
function prependLicense(path, license, reference) {
	const original = readFileSync(path, 'utf8').trim();
	const ref = reference ? `\n${reference}` : '';
	writeFileSync(path, `${license}${ref}\n${original}`, 'utf8');
}

// Offset source map line mappings by lineOffset
async function offsetSourceMap(inputMapPath, outputMapPath, lineOffset) {
	if (!existsSync(inputMapPath)) {
		console.warn(`Source map file not found: ${inputMapPath}, skipping offset`);
		return;
	}
	const rawMap = JSON.parse(readFileSync(inputMapPath, 'utf8'));
	const consumer = await new SourceMapConsumer(rawMap);
	const generator = new SourceMapGenerator({
		file: rawMap.file,
		sourceRoot: rawMap.sourceRoot,
	});

	consumer.eachMapping(mapping => {
		const hasOriginal = typeof mapping.originalLine === 'number' && typeof mapping.originalColumn === 'number';
		generator.addMapping({
			generated: {
				line: mapping.generatedLine + lineOffset,
				column: mapping.generatedColumn,
			},
			original: hasOriginal ? { line: mapping.originalLine, column: mapping.originalColumn } : null,
			source: hasOriginal ? mapping.source : null,
			name: hasOriginal ? mapping.name : null,
		});
	});

	if (rawMap.sourcesContent) {
		rawMap.sources.forEach((source, i) => {
			generator.setSourceContent(source, rawMap.sourcesContent[i]);
		});
	}

	const newMap = generator.toJSON();
	writeFileSync(outputMapPath, JSON.stringify(newMap), 'utf8');
	console.log(`Shifted source map by ${lineOffset} lines and saved to ${outputMapPath}`);
}

// 1. Prepend license + reference to dom.js
prependLicense(outputFile, licenseComment, '/// <reference path="./dom.d.ts" />');

// 2. Prepend license only to dom.d.ts
prependLicense(declarationFile, licenseComment, '');

// 3. Adjust source maps with offset for added license lines
await offsetSourceMap(sourceMapFile, sourceMapFile, licenseLines + 1);
await offsetSourceMap(declarationMapFile, declarationMapFile, licenseLines);

// 4. Minify dom.js with updated source map
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
				comment.value.trim().startsWith('/ <reference path="./dom.d.ts" />'),
		},
	});
	if (minified.error) throw minified.error;

	writeFileSync(minifiedFile, minified.code, 'utf8');
	writeFileSync(minifiedMapFile, minified.map, 'utf8');
	console.log(`Minified successfully: ${minifiedFile} and ${minifiedMapFile}`);
} catch (err) {
	console.error('Terser minification error:', err);
	process.exit(1);
}
