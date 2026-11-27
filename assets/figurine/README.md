# Editable personal figurine study

The character follows the supplied chibi references with a rounded head,
oversized brown eyes, softly tinted cheeks, a small smile and swept dark hair.
The white-and-red polo comes from the owner's bundled portrait. The charcoal
trousers and sneakers are illustrative. Both the editable Blender scene and
the web model include the face, iris and shirt artwork.

## Files and reproducibility

- `jhon-figurine.blend`: editable Blender 4.5 LTS mesh, 48-joint humanoid rig,
  materials, action/NLA clips and inspection studio.
- `polo-panels.png`: original shirt panel artwork, packed into the blend/GLB.
- `../../public/seed/models/jhon-figurine.glb`: self-contained web asset.
- `../../scripts/figurine/build.py`: local Blender construction/export workflow.

Run from the repository root with Blender 4.5 LTS:

```powershell
& 'YOUR-BLENDER-PATH/blender.exe' --background --python scripts/figurine/build.py
```

The script overwrites its generated blend, artwork and GLB. Preserve manual
artist edits before regenerating. The previous `scripts/generate-figurine.py`
is the retired unrigged sample generator and must not overwrite this asset.
Blender is only an asset-authoring dependency; npm builds do not download or run
it. Studio inspection renders are written into ignored `.test-artifacts/figurine/`.

The mesh uses tailored surfaces, curved hair locks and articulated fingers.
Hand/wrist surfaces are fused in Blender with transferred joint weights.
Three.js does not construct or independently move body-part meshes at runtime.

## Viewer contract

The Vue `ModelPortrait` component lazily loads pinned `@google/model-viewer`
(Three.js/AnimationMixer internally). The model should contain skeletal clips
named exactly `Idle`, `Wave`, `ThumbsUp`, `Salute`, `Point`, `Celebrate`.
Each action begins/ends in the resting pose. Unavailable actions are hidden;
the viewer never pretends an unanimated replacement asset supports gestures.
One primary clip plays at a time, crossfades for 300 ms and returns to Idle.
Reduced motion stops automatic idle/rotation; deliberate gesture clicks still
play once. Pointer/keyboard interaction stops auto-rotation. Dragging the stage
captures touch rotation; users can scroll from outside the stage.

The admin controls visibility in **Site Content → Hero Section → Home visual**.
The current saved mode is preserved. Select **3D model** and save that setting
to publish it. Replacement GLBs can use the existing public HTTPS URL setting.
Keep all buffers, textures and animations embedded; do not include external
resource references. Provide a portrait poster as the unavailable/WebGL fallback.

## Replacing the character or adding gestures

1. Refine the native source in Blender, maintaining a deform rig and independent
   finger/thumb joints. Correct the silhouette and inspect deformation before
   optimizing. Do not substitute a different person's stock model.
2. Author/rename the actions above, with an Idle/rest entry and exit. Add a
   matching entry in `ModelPortrait.vue`'s `actions` list for additional clips.
3. Export only the character and rig as GLB, with skins and NLA tracks enabled.
   Keep the mobile asset under 5 MiB and avoid unnecessary material slots.
4. Replace the bundled GLB or save its public HTTPS URL in Site Content.
   Run the Node, Worker and browser checks before releasing.
5. Inspect front, back, both sides, three-quarter views and every action at
   multiple times, including finger curl, thumb silhouette, blink, shoulder/
   wrist intersections, fast switching and return to Idle. Test drag/touch,
   reduced motion, fallback and framing on mobile and desktop.

Loading successfully and passing structural tests do not prove visual likeness
or premium quality. Those remain separate visual acceptance criteria.
