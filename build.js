const fs = require('fs');
const path = require('path');
const terser = require('terser');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const outputFile = path.join(distDir, 'dom.js');
const minifiedFile = path.join(distDir, 'dom.min.js');

if (!fs.existsSync(distDir)) {
	fs.mkdirSync(distDir);
}

const files = fs.readdirSync(srcDir)
	.filter(file => file.endsWith('.js'))
	.sort();

let output = '';

for (const file of files) {
	const fullPath = path.join(srcDir, file);
	const lines = fs.readFileSync(fullPath, 'utf8').split('\n');

	// Remove the first 24 lines if they are comments or license headers
	output += lines.slice(24).join('\n') + '\n';
}

const pkg = require('./package.json');
const licenseComment = `/*!
 * Dom-Builder JavaScript Library v${pkg.version || '1.0.0'}
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */
`;

const finalCode = licenseComment + '\n' + output.trim() + '\n';

fs.writeFileSync(outputFile, finalCode, 'utf8');
console.log(`Built successfully: ${outputFile}`);

(async () => {
	try {
		const minified = await terser.minify(finalCode, {
			format: {
				comments: 'all'
			}
		});
		if (minified.error) throw minified.error;
		fs.writeFileSync(minifiedFile, minified.code, 'utf8');
		console.log(`Minified successfully: ${minifiedFile}`);
	} catch (err) {
		console.error('Terser minification error:', err);
		process.exit(1);
	}
})();
