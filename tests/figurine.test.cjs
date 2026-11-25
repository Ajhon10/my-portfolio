const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFile } = require('node:fs/promises')
test('Blender figurine bundles its deform rig, six skeletal clips and shirt artwork without external resources', async () => {
	const glb = await readFile('public/seed/models/jhon-figurine.glb')
	assert.equal(glb.toString('ascii', 0, 4), 'glTF')
	assert.equal(glb.readUInt32LE(4), 2)
	assert.equal(glb.readUInt32LE(8), glb.length)
	assert.ok(glb.length < 5 * 1024 * 1024, 'Keep the character within the 5 MiB mobile asset budget')
	assert.equal(glb.readUInt32LE(16), 0x4e4f534a)
	const size = glb.readUInt32LE(12),
		model = JSON.parse(glb.toString('utf8', 20, 20 + size))
	assert.equal(model.buffers.length, 1)
	assert.equal(model.buffers[0].uri, undefined)
	assert.equal(glb.readUInt32LE(24 + size), 0x004e4942)
	assert.ok(model.nodes.length > 40)
	assert.equal(model.skins.length, 1)
	assert.ok(model.skins[0].joints.length >= 40)
	assert.deepEqual(model.animations.map((a) => a.name).sort(), [
		'Celebrate',
		'Idle',
		'Point',
		'Salute',
		'ThumbsUp',
		'Wave',
	])
	for (const animation of model.animations) {
		assert.ok(animation.channels.every((channel) => model.skins[0].joints.includes(channel.target.node)))
		assert.ok(animation.samplers.every((sampler) => model.accessors[sampler.input].max[0] >= 2))
	}
	for (const name of ['thumb0.R', 'thumb1.R', 'index0.R', 'middle1.R', 'head']) {
		const joint = model.nodes.findIndex((node) => node.name === name)
		assert.ok(model.skins[0].joints.includes(joint), 'Missing deform joint ' + name)
		assert.ok(
			model.animations
				.find((a) => a.name === 'ThumbsUp')
				.channels.some((c) => c.target.node === joint && c.target.path === 'rotation'),
		)
	}
	for (const primitive of model.meshes[0].primitives) {
		assert.notEqual(primitive.attributes.JOINTS_0, undefined)
		assert.notEqual(primitive.attributes.WEIGHTS_0, undefined)
	}
	for (const image of model.images || []) {
		assert.equal(image.uri, undefined)
		assert.equal(typeof image.bufferView, 'number')
	}
	for (const view of model.bufferViews) assert.ok(view.byteOffset + view.byteLength <= model.buffers[0].byteLength)
	assert.equal((await readFile('assets/figurine/jhon-figurine.blend')).toString('ascii', 0, 7), 'BLENDER')
})
