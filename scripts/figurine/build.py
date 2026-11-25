"""Original Blender character study referenced to the owner's bundled portrait.

Run Blender 4.5 LTS --background --python scripts/figurine/build.py.
Creates editable mesh, deform rig, embedded clips and studio inspection renders.
No portrait is uploaded. Lower-body clothing is an illustrative neutral choice.
This is an editable likeness study, not a claim of professional likeness approval.
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/seed/models'
SOURCE = ROOT / 'assets/figurine'
QA = ROOT / '.test-artifacts/figurine'
for directory in (OUT, SOURCE, QA):
    directory.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(41)
parts = []

def material(name, rgb, roughness=.42):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = roughness
    return m

skin = material('Warm tan vinyl skin', (.39, .205, .105), .53)
ear_inner = material('Warm ear and lip shadows', (.36, .13, .095), .5)
lips = material('Natural muted lips', (.39, .19, .14), .48)
hair = material('Soft black hair', (.010, .008, .009), .64)
hair_hi = material('Hair lock variation', (.020, .014, .013), .65)
nail = material('Natural fingernails', (.46, .28, .18), .58)
white = material('Ivory white polo fabric', (.91, .91, .87), .72)
red = material('WWC red polo panels', (.66, .012, .025), .62)
seam = material('Polo seams', (.63, .62, .58), .8)
dark = material('Charcoal trousers', (.035, .047, .062), .74)
shoe = material('Off-white sneakers', (.80, .79, .72), .56)
sole = material('Rubber soles', (.56, .55, .50), .82)
iris = material('Deep brown iris', (.085, .035, .016), .25)
eye_white = material('Warm eye whites', (.87, .83, .74), .22)
black = material('Pupil', (.003, .002, .002), .2)

def mesh(name, vertices, faces, mat, weights=None, subdivision=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = True
    if weights:
        groups = {}
        for index, weighted in enumerate(weights):
            for bone, weight in weighted.items():
                if bone not in groups:
                    groups[bone] = ob.vertex_groups.new(name=bone)
                groups[bone].add([index], weight, 'REPLACE')
    if subdivision:
        mod = ob.modifiers.new('Surface refinement', 'SUBSURF')
        mod.levels = subdivision
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.append(ob)
    return ob

def ellipsoid(name, center, scale, mat, bone='head', segments=32, rings=20):
    verts, faces = [], []
    for i in range(rings + 1):
        t = math.pi * i / rings
        for j in range(segments):
            a = 2 * math.pi * j / segments
            verts.append(tuple(center[k] + scale[k] * v for k, v in enumerate((math.sin(t)*math.cos(a), math.sin(t)*math.sin(a), math.cos(t)))))
    for i in range(rings):
        for j in range(segments):
            a = i*segments+j; b = i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh(name, verts, faces, mat, [{bone:1} for _ in verts])

def loft(name, profiles, mat, bone='spine', segments=48, fold=0, panel=False):
    # Profile = z, half-width, half-depth, y-center. A tailored surface, not a box.
    verts, faces, weights = [], [], []
    for z, width, depth, cy in profiles:
        for j in range(segments):
            a = 2 * math.pi * j / segments
            wrinkle = fold * math.sin(a*7 + z*31) * math.sin(a*3-z*19)
            verts.append(((width+wrinkle)*math.cos(a), cy+(depth+wrinkle*.7)*math.sin(a), z))
            weights.append({bone:1})
    for i in range(len(profiles)-1):
        for j in range(segments):
            a = i*segments+j; b = i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    ob = mesh(name, verts, faces, mat, weights, 1)
    if panel:
        # UV-authored continuous panel edges avoid polygon-sized staircase boundaries.
        image=bpy.data.images.new('White red polo panel artwork',width=512,height=512)
        pixels=[]
        for row in range(512):
            z=1.64+1.09*row/511
            for col in range(512):
                angle=math.tau*col/511;x=.43*math.cos(angle)
                selected=(x<-.14 and z>2.35+x*.65) or (math.sin(angle)<0 and x<.06 and 2.35+x*.6<z<2.47+x*.6)
                pixels.extend((.66,.012,.025,1) if selected else (.91,.91,.87,1))
        image.pixels=pixels;image.filepath_raw=str(SOURCE/'polo-panels.png');image.file_format='PNG';image.save();image.pack()
        fabric=white.copy();fabric.name='UV tailored polo artwork'
        tex=fabric.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        fabric.node_tree.links.new(tex.outputs['Color'],fabric.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        ob.data.materials.clear();ob.data.materials.append(fabric)
        uv=ob.data.uv_layers.new(name='Polo tailoring')
        for p in ob.data.polygons:
            values=[]
            for index in p.loop_indices:
                c=ob.data.vertices[ob.data.loops[index].vertex_index].co
                values.append(((math.atan2(c.y,c.x)/math.tau)%1,(c.z-1.64)/1.09))
            crosses=max(a[0] for a in values)-min(a[0] for a in values)>.5
            for index,(u,v) in zip(p.loop_indices,values):uv.data[index].uv=(u+1 if crosses and u<.5 else u,v)
    return ob

def tube(name, points, radii, mat, bones, segments=16):
    # Smooth surface along an authored curve with per-ring joint weights.
    verts, faces, weights = [], [], []
    for i, point in enumerate(points):
        c = Vector(point)
        tangent = Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize()
        axis = tangent.cross(Vector((0,1,0)))
        if axis.length < .01: axis = tangent.cross(Vector((1,0,0)))
        axis.normalize(); second = tangent.cross(axis).normalized()
        for j in range(segments):
            a = math.tau*j/segments
            verts.append(tuple(c+radii[i]*(math.cos(a)*axis+math.sin(a)*second)))
            weights.append(bones[i] if isinstance(bones[i],dict) else {bones[i]:1})
    for i in range(len(points)-1):
        for j in range(segments):
            a=i*segments+j; b=i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.extend([tuple(range(segments-1,-1,-1)),tuple((len(points)-1)*segments+j for j in range(segments))])
    return mesh(name,verts,faces,mat,weights,1)

def line(name, points, radius, mat, bone='head'):
    return tube(name,points,[radius]*len(points),mat,[bone]*len(points),8)

# Face profile: tapered chin, broad cheeks, temples and rounded crown.
head_profiles = [(2.91,.08,.12,-.01),(2.96,.25,.24,-.01),(3.04,.37,.33,0),(3.17,.48,.39,0),
 (3.34,.54,.425,0),(3.52,.55,.425,.015),(3.70,.53,.415,.025),(3.87,.47,.37,.045),(4.00,.33,.27,.05),(4.07,.07,.08,.05)]
loft('Sculpted jaw cheeks and cranium',head_profiles,skin,'head')
ellipsoid('Neck',(0,0,2.84),(.19,.19,.27),skin,'spine')
for side in (-1,1):
    ellipsoid('Ear outer '+str(side),(side*.54,.015,3.40),(.105,.078,.17),skin)
    ellipsoid('Ear concha '+str(side),(side*.592,-.05,3.40),(.041,.025,.105),ear_inner)
    line('Ear helix '+str(side),[(side*.60,-.047,3.32),(side*.625,-.045,3.43),(side*.60,-.03,3.51)],.019,skin)
    # Almond silhouette is shaped by lids around smaller eyeballs.
    ellipsoid('Eye socket '+str(side),(side*.205,-.383,3.49),(.166,.036,.095),skin)
    ellipsoid('Eye whites '+str(side),(side*.205,-.414,3.49),(.148,.05,.084),eye_white,'head',32,16)
    ellipsoid('Brown iris '+str(side),(side*.193,-.459,3.49),(.061,.018,.069),iris,'head',24,14)
    ellipsoid('Pupil '+str(side),(side*.193,-.475,3.49),(.031,.009,.040),black,'head',20,12)
    ellipsoid('Catchlight '+str(side),(side*.193-.018,-.484,3.515),(.014,.005,.016),eye_white,'head',12,8)
    lid_x = [side*.205+u for u in (-.148,-.10,0,.10,.148)]
    line('Upper eyelid '+str(side),[(x,-.450,3.49+h) for x,h in zip(lid_x,(0,.065,.085,.055,0))],.024,skin)
    line('Lower eyelid '+str(side),[(x,-.441,3.49+h) for x,h in zip(lid_x,(0,-.045,-.066,-.046,0))],.009,skin)
    line('Lash '+str(side),[(x,-.468,3.49+h) for x,h in zip(lid_x,(0,.06,.078,.05,0))],.009,hair)
    line('Brow '+str(side),[(side*.065,-.424,3.675),(side*.18,-.44,3.70),(side*.30,-.409,3.68),(side*.36,-.37,3.64)],.027,hair)
    # Skin-colored lid cover is a deform-bone blink, embedded in Idle.
    ellipsoid('Blink lid '+str(side),(side*.205,-.493,3.575),(.15,.012,.004),skin,'lid.'+str(side),24,12)
ellipsoid('Nose bridge',(0,-.414,3.40),(.073,.085,.17),skin)
ellipsoid('Nose tip',(0,-.486,3.335),(.105,.10,.071),skin)
for side in (-1,1):
    ellipsoid('Nose wing '+str(side),(side*.077,-.466,3.31),(.052,.055,.041),skin)
    ellipsoid('Nostril '+str(side),(side*.061,-.507,3.29),(.024,.009,.012),ear_inner,'head',16,10)
line('Upper lip',[(-.15,-.374,3.185),(-.07,-.414,3.207),(0,-.423,3.198),(.07,-.414,3.207),(.15,-.374,3.185)],.021,lips)
line('Lower lip',[(-.13,-.386,3.177),(0,-.430,3.162),(.13,-.386,3.177)],.026,lips)
line('Mouth line',[(-.14,-.401,3.186),(0,-.445,3.184),(.14,-.401,3.186)],.007,ear_inner)
# Fine, sparse facial hair rather than a solid cartoon moustache.
for i in range(31):
    x=(i-15)*.0075
    y=-.42+.045*(abs(x)/.12)**2
    line('Moustache strand '+str(i),[(x,y,3.247),(x+.004,y-.003,3.225)],.0025,hair)
for i in range(20):
    x=(i-10)*.006
    line('Chin hair '+str(i),[(x,-.379,3.073),(x+.002,-.387,3.055)],.0025,hair)

# Hair cap plus individually curved, tapered locks following the portrait fringe.
loft('Hair fitted crown',[(3.68,.49,.39,.055),(3.82,.54,.43,.06),(3.99,.45,.36,.07),(4.13,.26,.23,.07),(4.18,.02,.02,.07)],hair,'head')
for i in range(62):
    a=math.tau*i/62
    top=Vector((.41*math.cos(a),.31*math.sin(a)+.055,3.99+random.uniform(-.03,.07)))
    front=math.sin(a)<0
    end=Vector((.49*math.cos(a)+.03,.38*math.sin(a)+.04,3.68+random.uniform(-.06,.12) if front else 3.64+random.uniform(0,.15)))
    middle=top.lerp(end,.38)+Vector((-.05,-.035,.09))
    points=[tuple(top),tuple(middle),tuple(top.lerp(end,.7)+Vector((.02,-.025,.025))),tuple(end)]
    tube('Swept hair lock %02d'%i,points,[.026,.045,.033,.003],hair_hi if i%5==0 else hair,['head']*4,10)
for i in range(72):
    # Staggered crown locks follow irregular swept arcs over the scalp.
    angle=random.uniform(0,math.tau);r=random.uniform(.02,.93)
    x=.46*r*math.cos(angle);y=.35*r*math.sin(angle)+.055
    z=3.80+.37*math.sqrt(max(0,1-r*r))
    start=(x+.09,y+.08,z-.04)
    middle=(x-.015,y-.01,z+.085+random.uniform(-.02,.03))
    end=(x-.14,y-.13,z-.005)
    tube('Tousled crown lock %02d'%i,[start,middle,end],[.025,.052,.003],hair_hi if i%9==0 else hair,['head']*3,10)

# Tailored polo, collar, placket, buttons, chest print and hem stitching.
loft('Tailored white and red polo',[(1.64,.37,.23,.015),(1.68,.40,.25,0),(1.78,.39,.25,0),(1.95,.37,.25,0),
 (2.17,.39,.26,0),(2.40,.45,.26,0),(2.56,.49,.23,0),(2.68,.40,.20,0),(2.73,.21,.17,0)],white,fold=.007,panel=True)
for side in (-1,1):
    mesh('Folded red collar '+str(side),[(side*.025,-.195,2.78),(side*.19,-.17,2.79),(side*.31,-.21,2.65),(side*.13,-.29,2.55)],[(0,1,2,3)],red,[{'spine':1}]*4,1)
loft('Collar back',[(2.71,.21,.185,0),(2.79,.20,.18,0)],red,'spine',32)
mesh('Button placket',[(-.033,-.271,2.64),(.033,-.271,2.64),(.033,-.271,2.30),(-.033,-.271,2.30)],[(0,1,2,3)],white,[{'spine':1}]*4)
for z in (2.58,2.46,2.34):
    ellipsoid('Polo button',(0,-.285,z),(.016,.009,.016),shoe,'spine',12,8)
line('Placket seam',[(-.026,-.279,2.63),(-.026,-.282,2.31)],.003,seam,'spine')
for side in (-1,1):
    line('Side shirt stitching '+str(side),[(side*.39,0,1.68),(side*.37,0,1.95),(side*.40,0,2.26)],.003,seam,'spine')
line('Polo hem',[(-.35,-.15,1.69),(0,-.252,1.69),(.35,-.15,1.69)],.005,seam,'spine')
# Editable font is converted to mesh before skinning/export.
def print_text(text, location, size, mat):
    data=bpy.data.curves.new('Chest print','FONT');data.body=text;data.size=size;data.extrude=.0004
    ob=bpy.data.objects.new('Chest branding '+text,data);bpy.context.collection.objects.link(ob)
    ob.location=location;ob.rotation_euler=(math.pi/2,0,0);data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.object.convert(target='MESH')
    group=ob.vertex_groups.new(name='spine');group.add(list(range(len(ob.data.vertices))),1,'REPLACE');parts.append(ob)
print_text('WWC',(.13,-.268,2.48),.062,red)
print_text('YELLOW BUMBLEBEE',(.10,-.271,2.435),.014,red)

# Skeleton is authored before limbs so every hand has real independent phalanges.
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
rig=bpy.context.object;rig.name='Jhon collectible deform rig';rig.data.name='Jhon humanoid skeleton'
edit=rig.data.edit_bones
for b in list(edit):edit.remove(b)
def bone(name,head,tail,parent=None):
    b=edit.new(name);b.head=head;b.tail=tail;b.align_roll(Vector((0,-1,0)))
    if parent:b.parent=edit[parent]
    return b
bone('root',(0,0,.08),(0,0,.5))
bone('pelvis',(0,0,1.35),(0,0,1.8),'root')
bone('spine',(0,0,1.8),(0,0,2.7),'pelvis')
bone('head',(0,0,2.78),(0,0,3.85),'spine')
for s in (-1,1):
    bone('lid.'+str(s),(s*.205,-.493,3.575),(s*.205,-.493,3.65),'head')
    side='R' if s==1 else 'L'
    shoulder=(s*.46,0,2.59); elbow=(s*.66,-.015,2.10);wrist=(s*.71,-.04,1.68)
    bone('upper_arm.'+side,shoulder,elbow,'spine')
    bone('forearm.'+side,elbow,wrist,'upper_arm.'+side)
    bone('hand.'+side,wrist,(s*.73,-.04,1.46),'forearm.'+side)
    for j,label in enumerate(('index','middle','ring','little')):
        x=s*(.62+j*.065);length=(.19,.22,.20,.16)[j]
        start=(x,-.047,1.48)
        for k in range(3):
            a=(x,-.047,1.48-k*length/3);b=(x,-.047,1.48-(k+1)*length/3)
            bone(label+str(k)+'.'+side,a,b,'hand.'+side if k==0 else label+str(k-1)+'.'+side)
    bone('thumb_base.'+side,(s*.62,-.085,1.60),(s*.55,-.085,1.56),'hand.'+side)
    for k in range(2):
        a=(s*(.55-k*.05),-.085,1.56-k*.07);b=(s*(.50-k*.05),-.085,1.49-k*.07)
        bone('thumb'+str(k)+'.'+side,a,b,'thumb_base.'+side if k==0 else 'thumb0.'+side)
    bone('thigh.'+side,(s*.22,0,1.63),(s*.23,0,.94),'pelvis')
    bone('shin.'+side,(s*.23,0,.94),(s*.24,0,.25),'thigh.'+side)
    bone('foot.'+side,(s*.24,0,.25),(s*.24,-.29,.15),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')

for s in (-1,1):
    side='R' if s==1 else 'L'; upper='upper_arm.'+side; fore='forearm.'+side;hand='hand.'+side
    points=[(s*.46,0,2.59),(s*.53,0,2.43),(s*.61,-.01,2.24),(s*.66,-.015,2.1),(s*.68,-.02,1.98),(s*.71,-.04,1.73),(s*.72,-.04,1.60)]
    tube('Continuous arm and wrist '+side,points,[.14,.14,.125,.11,.105,.078,.069],skin,[upper,upper,upper,{upper:.5,fore:.5},fore,{fore:.7,hand:.3},hand],20)
    tube('Polo sleeve '+side,points[:3],[.18,.175,.15],red if s==-1 else white,[upper]*3,24)
    tube('Sleeve cuff '+side,[points[2],(s*.616,-.011,2.218)],[.154,.151],red if s==-1 else seam,[upper]*2,24)
    ellipsoid('Sculpted palm '+side,(s*.72,-.04,1.55),(.127,.067,.17),skin,hand,24,16)
    for j,label in enumerate(('index','middle','ring','little')):
        x=s*(.62+j*.065);length=(.19,.22,.20,.16)[j]
        points=[(x,-.047,1.50),(x,-.047,1.48),(x,-.047,1.48-length/3),(x,-.047,1.48-length*2/3),(x,-.047,1.48-length)]
        b0=label+'0.'+side;b1=label+'1.'+side;b2=label+'2.'+side
        tube('Articulated '+label+' '+side,points,[.029,.030,.027,.024,.010],skin,[hand,b0,{b0:.5,b1:.5},{b1:.5,b2:.5},b2],12)
        ellipsoid(label+' nail '+side,(x,-.071,1.50-length),(.014,.003,.016),nail,b2,12,8)
    tube('Articulated thumb '+side,[(s*.62,-.085,1.60),(s*.55,-.085,1.56),(s*.50,-.085,1.49),(s*.45,-.085,1.42)],[.045,.038,.030,.012],skin,['thumb_base.'+side,{'thumb_base.'+side:.5,'thumb0.'+side:.5},{'thumb0.'+side:.5,'thumb1.'+side:.5},'thumb1.'+side],14)
    # Trousers: authored tapered leg profiles, knee fabric and stitched pocket.
    leg=loft('Tailored trouser '+side,[(.27,.13,.14,0),(.34,.15,.16,0),(.63,.16,.17,0),(.91,.17,.18,0),(1.03,.175,.18,0),(1.30,.19,.20,0),(1.65,.205,.22,0)],dark,'thigh.'+side,32,.004)
    # Position in mesh space (not object transform) so bind matrices stay identity.
    for v in leg.data.vertices:v.co.x+=s*.23
    leg.vertex_groups.clear()
    thigh=leg.vertex_groups.new(name='thigh.'+side);shin=leg.vertex_groups.new(name='shin.'+side)
    for v in leg.data.vertices:
        w=max(0,min(1,(v.co.z-.82)/.24));thigh.add([v.index],w,'REPLACE');shin.add([v.index],1-w,'REPLACE')
    line('Pocket stitching '+side,[(s*.36,-.13,1.53),(s*.30,-.205,1.41),(s*.20,-.22,1.38)],.004,seam,'pelvis')
    ellipsoid('Sneaker upper '+side,(s*.24,-.13,.20),(.17,.32,.16),shoe,'foot.'+side,32,18)
    ellipsoid('Sneaker sole '+side,(s*.24,-.13,.092),(.18,.33,.065),sole,'foot.'+side,32,12)
    for z in range(4):
        y=-.20+z*.04
        line('Sneaker lace '+side+str(z),[(s*.24-.07,y,.31),(s*.24+.07,y-.015,.31)],.009,white,'foot.'+side)
loft('Trouser waistband',[(1.57,.41,.24,0),(1.68,.40,.24,0)],dark,'pelvis',40)

# Fuse arm/palm/finger surfaces so bending cannot reveal intersecting wrist caps.
skin_parts=[ob for ob in parts if ob.name.startswith(('Continuous arm','Sculpted palm','Articulated'))]
bpy.ops.object.select_all(action='DESELECT')
for ob in skin_parts:ob.select_set(True)
bpy.context.view_layer.objects.active=skin_parts[0]
bpy.ops.object.join();unified=bpy.context.object
for ob in skin_parts:parts.remove(ob)
reference=unified.copy();reference.data=unified.data.copy();bpy.context.collection.objects.link(reference)
remesh=unified.modifiers.new('Continuous sculpted skin','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.012;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=unified.modifiers.new('Soften sculpted joins','SMOOTH');smooth.factor=.6;smooth.iterations=3
bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=unified.modifiers.new('Mobile mesh budget','DECIMATE');decimate.ratio=.35
bpy.ops.object.modifier_apply(modifier=decimate.name)
transfer=unified.modifiers.new('Transfer authored joint weights','DATA_TRANSFER');transfer.object=reference
transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST'
transfer.layers_vgroup_select_src='ALL';transfer.layers_vgroup_select_dst='NAME'
bpy.ops.object.datalayout_transfer(modifier=transfer.name)
bpy.ops.object.modifier_apply(modifier=transfer.name)
bpy.data.objects.remove(reference,do_unlink=True);parts.append(unified)

# Join authored surfaces into one deform mesh. Materials and named vertex groups survive.
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
character=bpy.context.object;character.name='Jhon reference character study'
modifier=character.modifiers.new('Humanoid skin deformation','ARMATURE');modifier.object=rig
character.parent=rig
rig.show_in_front=True

# Each clip is baked into skeletal channels. No browser mesh manipulation.
for b in rig.pose.bones:b.rotation_mode='XYZ'
fps=24
bpy.context.scene.render.fps=fps
def pose_key(frame, values, blink=0):
    for b in rig.pose.bones:
        b.rotation_euler=(0,0,0);b.scale=(1,1,1);b.location=(0,0,0)
    for name,rot in values.items():rig.pose.bones[name].rotation_euler=tuple(math.radians(v) for v in rot)
    for side in (-1,1):
        b=rig.pose.bones['lid.'+str(side)];b.scale=(max(.001,blink),1+blink*20,1);b.location=(0,-blink*.08,0)
    for b in rig.pose.bones:
        b.keyframe_insert('rotation_euler',frame=frame,group=b.name)
        if b.name.startswith('lid.'):
            b.keyframe_insert('scale',frame=frame,group=b.name);b.keyframe_insert('location',frame=frame,group=b.name)
def curl(side,amount,index=None):
    result={}
    for label in ('index','middle','ring','little'):
        for k in range(3):result[label+str(k)+'.'+side]=(amount if index is None or label!='index' else index,0,0)
    return result
def action(name, frames):
    rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new(name)
    for frame,values,blink in frames:pose_key(frame,values,blink)
    clip=rig.animation_data.action
    for fc in clip.fcurves:
        for key in fc.keyframe_points:key.interpolation='BEZIER'
    track=rig.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,1,clip);strip.name=name;strip.action_frame_start=1;strip.action_frame_end=frames[-1][0]
    rig.animation_data.action=None
    track.mute=True
action('Idle',[(1,{},0),(20,{'spine':(1,0,0),'head':(0,2,1)},0),(45,{},0),(46,{},1),(48,{},0),(70,{'spine':(-.6,0,0),'head':(0,-2,-1)},0),(96,{},0)])
def oriented(direction):
    y=Vector(direction).normalized();z=Vector((0,-1,0));z-=y*y.dot(z)
    if z.length<.05:z=Vector((0,0,1));z-=y*y.dot(z)
    z.normalize();x=y.cross(z).normalized();z=x.cross(y).normalized()
    return Matrix((x,y,z)).transposed().to_quaternion()
def arm_pose(side, wrist, hand_direction):
    s=1 if side=='R' else -1
    names=['upper_arm.'+side,'forearm.'+side,'hand.'+side]
    bones=[rig.data.bones[name] for name in names]
    shoulder=bones[0].head_local.copy();wrist=Vector(wrist)
    axis=wrist-shoulder;distance=min(axis.length,bones[0].length+bones[1].length-.005);axis.normalize()
    bend=Vector((s,0,0));bend-=axis*bend.dot(axis);bend.normalize()
    a=(bones[0].length**2-bones[1].length**2+distance**2)/(2*distance)
    elbow=shoulder+axis*a+bend*math.sqrt(max(0,bones[0].length**2-a*a))
    directions=[elbow-shoulder,wrist-elbow,Vector(hand_direction)]
    result={};previous_pose=None;previous_rest=None
    for b,d in zip(bones,directions):
        rest=b.matrix_local.to_quaternion();desired=oriented(d)
        base=rest if previous_pose is None else previous_pose@previous_rest.inverted()@rest
        result[b.name]=tuple(math.degrees(v) for v in (base.inverted()@desired).to_euler('XYZ'))
        previous_pose=desired;previous_rest=rest
    return result
wave={**arm_pose('R',(.78,-.10,3.37),(0,0,1)),'head':(0,-6,-4)}
action('Wave',[(1,{},0),(18,wave,0),(25,{**wave,'hand.R':(0,0,-22)},0),(33,{**wave,'hand.R':(0,0,24)},0),(41,{**wave,'hand.R':(0,0,-22)},0),(49,{**wave,'hand.R':(0,0,18)},0),(65,{},0)])
def thumb_pose(side):
    parent_pose=oriented((0,0,1));parent_rest=rig.data.bones['hand.'+side].matrix_local.to_quaternion();result={}
    for name in ('thumb_base.'+side,'thumb0.'+side,'thumb1.'+side):
        rest=rig.data.bones[name].matrix_local.to_quaternion();desired=oriented((.5,0,.86) if name.startswith('thumb_base') else (0,0,1))
        base=parent_pose@parent_rest.inverted()@rest
        result[name]=tuple(math.degrees(v) for v in (base.inverted()@desired).to_euler('XYZ'))
        parent_pose=desired;parent_rest=rest
    return result
thumb={**arm_pose('R',(.82,-.40,2.70),(0,0,1)),**curl('R',90),**thumb_pose('R'),'head':(0,-3,-2)}
action('ThumbsUp',[(1,{},0),(20,thumb,0),(50,thumb,0),(68,{},0)])
salute={**arm_pose('R',(.55,-.36,3.43),(-.5,0,.5)),'head':(0,0,-3)}
action('Salute',[(1,{},0),(22,salute,0),(47,salute,0),(66,{},0)])
point={**arm_pose('R',(.70,-.78,2.52),(0,-1,0)),**curl('R',72,0),'thumb0.R':(40,0,0),'head':(0,-4,0)}
action('Point',[(1,{},0),(20,point,0),(48,point,0),(66,{},0)])
celebrate={**arm_pose('R',(.79,0,3.42),(0,0,1)),**arm_pose('L',(-.79,0,3.42),(0,0,1)),'head':(-4,0,0)}
action('Celebrate',[(1,{},0),(20,celebrate,0),(30,{**celebrate,'spine':(0,0,5)},0),(40,{**celebrate,'spine':(0,0,-5)},0),(50,celebrate,0),(70,{},0)])
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.scale=(.001,1,1) if b.name.startswith('lid.') else (1,1,1);b.location=(0,0,0)

# Export only the character/rig; cameras and studio stay editable in .blend.
bpy.ops.object.select_all(action='DESELECT');character.select_set(True);rig.select_set(True)
bpy.context.view_layer.objects.active=rig
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(OUT/'jhon-figurine.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_optimize_animation_size=True)
for track in rig.animation_data.nla_tracks:track.mute=True

scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=720;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.24,.24,.24)
scene.view_settings.view_transform='AgX'
def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
for name,pos,power,size in [('Key',(-3,-5,7),650,4),('Fill',(4,-2,5),420,4),('Rim',(1,4,6),750,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,0,2.3))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.015));floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(material('Studio blue-white',(.82,.87,.94),.9))
bpy.ops.object.camera_add(location=(0,-10,4.1));camera=bpy.context.object;camera.name='Inspection camera';camera.data.type='ORTHO';camera.data.ortho_scale=4.9;scene.camera=camera
rig['reference']='Bundled portrait. Editable stylized likeness study; requires owner visual approval.'
rig['clips']='Idle, Wave, ThumbsUp, Salute, Point, Celebrate'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'jhon-figurine.blend'))
for label,pos in [('front',(0,-10,3.9)),('three-quarter',(7,-9,4.2)),('left',(-10,0,3.9)),('right',(10,0,3.9)),('back',(0,10,3.9))]:
    camera.location=pos;aim(camera,(0,0,2.14));scene.render.filepath=str(QA/(label+'.png'));bpy.ops.render.render(write_still=True)
for track in rig.animation_data.nla_tracks:
    if track.name=='Idle':continue
    rig.animation_data.action=track.strips[0].action;scene.frame_set(30)
    camera.location=(0,-10,3.9);aim(camera,(0,0,2.14));scene.render.filepath=str(QA/(track.name+'.png'));bpy.ops.render.render(write_still=True)
    rig.animation_data.action=None
print('Figurine source, rigged GLB and inspection renders complete.')
