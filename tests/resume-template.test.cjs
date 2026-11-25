const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { inflateRawSync } = require('node:zlib')

// The generated archives have complete local headers and no data descriptors.
function entries(bytes) {
	const files = new Map()
	let offset = 0
	while (bytes.readUInt32LE(offset) === 0x04034b50) {
		assert.equal(bytes.readUInt16LE(offset + 6) & 8, 0)
		const method = bytes.readUInt16LE(offset + 8)
		const size = bytes.readUInt32LE(offset + 18)
		const nameSize = bytes.readUInt16LE(offset + 26),
			extraSize = bytes.readUInt16LE(offset + 28)
		const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString('utf8')
		const start = offset + 30 + nameSize + extraSize
		const compressed = bytes.subarray(start, start + size)
		assert.ok(method === 0 || method === 8)
		files.set(name, method === 8 ? inflateRawSync(compressed) : compressed)
		offset = start + size
	}
	assert.equal(bytes.readUInt32LE(offset), 0x02014b50)
	return files
}

test('free resume ZIP contains an editable document, matching plain text and instructions', () => {
	const root = 'public/downloads/'
	const bundle = entries(readFileSync(root + 'ats-friendly-resume-template.zip'))
	assert.deepEqual(
		[...bundle.keys()],
		['ats-friendly-resume-template.docx', 'ats-friendly-resume-template.txt', 'README.txt'],
	)
	assert.deepEqual(
		bundle.get('ats-friendly-resume-template.docx'),
		readFileSync(root + 'ats-friendly-resume-template.docx'),
	)
	assert.deepEqual(
		bundle.get('ats-friendly-resume-template.txt'),
		readFileSync(root + 'ats-friendly-resume-template.txt'),
	)
	assert.match(bundle.get('README.txt').toString('utf8'), /Replace every bracketed placeholder/)
	const docx = entries(bundle.get('ats-friendly-resume-template.docx'))
	assert.ok(docx.has('[Content_Types].xml') && docx.has('_rels/.rels'))
	const xml = docx.get('word/document.xml').toString('utf8')
	const text = [...xml.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g)].map((match) => match[1]).join('\n') + '\n'
	assert.equal(text, bundle.get('ats-friendly-resume-template.txt').toString('utf8'))
	assert.doesNotMatch(xml, /<w:(?:tbl|drawing|pict|txbxContent|headerReference|footerReference)\b/)
	assert.match(xml, /<w:cols w:num="1"/)
	assert.match(xml, /w:ascii="Arial"/)
	assert.match(xml, /w:sz w:val="22"/)
	let previous = -1
	for (const heading of [
		'PROFESSIONAL SUMMARY',
		'SKILLS',
		'WORK EXPERIENCE',
		'PROJECTS',
		'EDUCATION',
		'CERTIFICATIONS',
	]) {
		const index = text.indexOf(heading)
		assert.ok(index > previous, 'Preserve standard heading reading order')
		previous = index
	}
})
