"""Chibi portfolio figurine with the owner's portrait and polo as references.

Run Blender 4.5 LTS --background --python scripts/figurine/build.py.
Creates editable mesh, deform rig, embedded clips and studio inspection renders.
No portrait is uploaded. Lower-body clothing is an illustrative neutral choice.
This is an editable likeness study, not a claim of professional likeness approval.
"""
import bpy
import math
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
bpy.context.preferences.filepaths.save_version = 0
parts = []

def material(name, rgb, roughness=.42):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = roughness
    return m

skin = material('Warm tan vinyl skin', (.59, .32, .18), .49)
ear_inner = material('Warm ear and lip shadows', (.36, .13, .095), .5)
lips = material('Natural muted lips', (.39, .19, .14), .48)
hair = material('Soft black hair', (.039, .021, .016), .52)
hair_hi = material('Hair lock variation', (.052, .028, .021), .54)
nail = material('Natural fingernails', (.46, .28, .18), .58)
white = material('Ivory white polo fabric', (.91, .91, .87), .72)
red = material('WWC red polo panels', (.66, .012, .025), .62)
seam = material('Polo seams', (.63, .62, .58), .8)
dark = material('Charcoal trousers', (.035, .047, .062), .74)
shoe = material('Off-white sneakers', (.80, .79, .72), .56)
sole = material('Rubber soles', (.56, .55, .50), .82)
eye_white = material('Warm eye whites', (.87, .83, .74), .22)

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
            faces.append((a+segments,b+segments,b,a))
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
        uv=ob.data.uv_layers.new(name='UVMap')
        for p in ob.data.polygons:
            values=[]
            for index in p.loop_indices:
                c=ob.data.vertices[ob.data.loops[index].vertex_index].co
                values.append(((math.atan2(c.y,c.x)/math.tau)%1,max(.001,min(.999,(c.z-1.64)/1.09))))
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

# The low, broad jaw and full upper cranium give the miniature its silhouette.
head_profiles = [
    (2.77,.03,.08,-.02),(2.80,.24,.27,-.04),(2.88,.47,.41,-.03),
    (3.03,.66,.52,-.02),(3.23,.77,.585,0),(3.42,.79,.60,.01),
    (3.67,.785,.605,.025),(3.94,.77,.60,.04),(4.17,.71,.55,.05),
    (4.38,.53,.43,.06),(4.52,.25,.22,.06),(4.56,.008,.012,.06)
]
face = loft('Rounded cheeks and tapered chin',head_profiles,skin.copy(),'head',80)
# Bake the blush into the head material so studio and web shading agree.
def face_uv(co):
    return (.5+math.atan2(co.x,-co.y)/math.tau,(co.z-2.77)/1.79)

def paint_material(ob, name, uv_at, shade, size=256):
    image=bpy.data.images.new(name,size,size,alpha=False)
    image.pixels=[channel for j in range(size) for i in range(size)
                  for channel in (*shade((i+.5)/size,(j+.5)/size),1)]
    image.pack()
    tex=ob.data.materials[0].node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=image
    shader=ob.data.materials[0].node_tree.nodes.get('Principled BSDF')
    ob.data.materials[0].node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    uv=ob.data.uv_layers.new(name='UVMap')
    for poly in ob.data.polygons:
        coords=[uv_at(ob.data.vertices[ob.data.loops[i].vertex_index].co) for i in poly.loop_indices]
        crosses=max(u for u,v in coords)-min(u for u,v in coords)>.5
        for i,(u,v) in zip(poly.loop_indices,coords):
            uv.data[i].uv=(u+1 if crosses and u<.5 else u,v)

def complexion(u,v):
    blush=math.exp(-((abs(u-.5)-.117)/.060)**2-((v-.255)/.096)**2)
    return (.795+.087*blush,.606-.104*blush,.461-.066*blush)

paint_material(face,'Soft cheek color',face_uv,complexion)
ellipsoid('Neck',(0,0,2.75),(.17,.16,.18),skin,'spine')

def face_y(x,z):
    for lower, upper in zip(head_profiles, head_profiles[1:]):
        if z <= upper[0]:
            t = max(0,(z-lower[0])/(upper[0]-lower[0]))
            width,depth,cy = [lo+(hi-lo)*t for lo,hi in zip(lower[1:],upper[1:])]
            return cy-depth*math.sqrt(max(.01,1-(x/width)**2))
    return head_profiles[-1][3]

amber = material('Honey brown iris',(.28,.12,.042),.28)
glint = material('Porcelain catchlights',(.99,.97,.93),.18)
smile = material('Warm smile crease',(.23,.071,.041),.56)
eye_z = 3.47
for side in (-1,1):
    ellipsoid('Rounded ear',(side*.759,.005,3.30),(.137,.096,.186),skin)
    ellipsoid('Ear bowl',(side*.812,-.070,3.31),(.063,.027,.105),ear_inner)
    cx = side*.319
    rx,rz = .217,.203
    eye_bone = 'lid.'+str(side)

    # All eye layers follow the cheek and a single convex corneal surface.
    def cornea(x,z):
        radius=((x-cx)/rx)**2+((z-eye_z)/rz)**2
        return face_y(x,z)-.018-.076*math.sqrt(max(0,1-radius))

    def eye_disc(name, dx, dz, width, height, offset, mat):
        verts=[(cx+dx,cornea(cx+dx,eye_z+dz)-offset,eye_z+dz)]
        faces=[]
        count=48
        for ring in range(1,9):
            for j in range(count):
                angle=math.tau*j/count
                x=cx+dx+width*ring/8*math.cos(angle)
                z=eye_z+dz+height*ring/8*math.sin(angle)
                verts.append((x,cornea(x,z)-offset,z))
                v=1+(ring-1)*count+j
                nxt=1+(ring-1)*count+(j+1)%count
                faces.append((0,v,nxt) if ring==1 else (v-count,v,nxt,nxt-count))
        return mesh(name,verts,faces,mat,[{eye_bone:1} for _ in verts])

    eye_disc('Ivory sclera',0,0,rx,rz,0,eye_white)
    ix=-side*.018
    disk=eye_disc('Brown iris',ix,.003,.171,.187,.005,amber)
    if side == -1:
        def iris_color(u,v):
            x=2*u-1; z=2*v-1
            r=math.hypot(x,z); angle=math.atan2(z,x)
            light=(1-.52*z)*(.92+.055*math.sin(47*angle+3*r)+.025*math.sin(91*angle-r))
            rim=min(1,max(0,(1-r)/.19))
            pupil=min(1,max(0,(math.hypot(x,z-.065)-.55)/.075))
            return tuple(dark+(base*light-dark)*rim*pupil for dark,base in
                         zip((.105,.075,.067),(.59,.382,.235)))
        def iris_uv(co):
            return (.5+(co.x-cx-ix)/.342,.5+(co.z-eye_z-.003)/.374)
        paint_material(disk,'Amber iris fibers',iris_uv,iris_color,128)
    else:
        uv=disk.data.uv_layers.new(name='UVMap')
        for loop in disk.data.loops:
            co=disk.data.vertices[loop.vertex_index].co
            uv.data[loop.index].uv=(.5+(co.x-cx-ix)/.342,.5+(co.z-eye_z-.003)/.374)
    eye_disc('Large eye reflection',ix-.049,.093,.036,.041,.013,glint)
    eye_disc('Small eye reflection',ix+.060,.059,.015,.019,.015,glint)
    for upper in (True,False):
        points=[]; radii=[]
        for j in range(15):
            t=j/14
            angle=math.pi*t*(1 if upper else -1)
            x=cx+rx*math.cos(angle)
            z=eye_z+rz*math.sin(angle)
            points.append((x,cornea(x,z)-.003,z))
            radii.append(.003+(.017 if upper else .006)*math.sin(math.pi*t))
        tube('Upper lash' if upper else 'Lower lid',points,radii,hair if upper else lips,[eye_bone]*15,10)
    brow_points=[]
    for x,z in [(.127,3.78),(.182,3.816),(.29,3.853),(.405,3.846),(.502,3.799)]:
        brow_points.append((side*x,face_y(x,z)-.031,z))
    tube('Soft arched brow',brow_points,[.016,.041,.047,.033,.006],hair,['head']*5,14)
ellipsoid('Button nose',(0,face_y(0,3.225)+.049,3.225),(.098,.103,.077),skin)
smile_points=[]
for j in range(15):
    t=(j-7)/7
    x=t*.199
    z=3.034+.055*t*t+.008*t
    smile_points.append((x,face_y(x,z)-.008,z))
tube('Small upturned smile',smile_points,[.004+.010*math.sin(math.pi*j/14) for j in range(15)],smile,['head']*15,10)

# The cap wraps the nape. Curved, lens-shaped locks overlap from a side part.
def scalp(longitude,latitude,lift=0):
    lat=math.radians(latitude); lon=math.radians(longitude)
    return Vector(((.816+lift)*math.cos(lat)*math.sin(lon),
                   .055-(.651+lift)*math.cos(lat)*math.cos(lon),
                   3.735+(.87+lift)*math.sin(lat)))

def hairline(lon):
    front=(1+math.cos(math.radians(lon)))/2
    return -41+61*front**2

verts=[]; faces=[]; count=80
for row in range(22):
    for j in range(count):
        lon=360*j/count
        lat=hairline(lon)+(90-hairline(lon))*row/21
        verts.append(tuple(scalp(lon,lat)))
        if row:
            i=(row-1)*count+j; n=(row-1)*count+(j+1)%count
            faces.append((i,n,n+count,i+count))
mesh('Hair crown and nape',verts,faces,hair,[{'head':1} for _ in verts])

def hair_lock(name,start_lon,start_lat,end_lon,end_lat,width,lift,mat):
    centers=[]
    for j in range(19):
        t=j/18
        lon=start_lon+(end_lon-start_lon)*t
        lat=start_lat+(end_lat-start_lat)*t+12*math.sin(math.pi*t)
        centers.append(scalp(lon,lat,.011+lift*math.sin(math.pi*t)))
    verts=[]; faces=[]; sides=14
    for j,c in enumerate(centers):
        t=j/18
        tangent=(centers[min(18,j+1)]-centers[max(0,j-1)]).normalized()
        normal=(c-Vector((0,.055,3.735))).normalized()
        across=tangent.cross(normal).normalized()
        outward=across.cross(tangent).normalized()
        radius=width*(.018+math.sin(math.pi*t)**.66)
        for k in range(sides):
            a=math.tau*k/sides
            verts.append(tuple(c+across*(radius*math.cos(a))+outward*(radius*.53*math.sin(a))))
            if j:
                i=(j-1)*sides+k; n=(j-1)*sides+(k+1)%sides
                faces.append((i,n,n+sides,i+sides))
    mesh(name,verts,faces,mat,[{'head':1} for _ in verts])

for j in range(15):
    lon=68+16*j
    hair_lock('Swept side and back',lon-35,65,lon,hairline(lon)-5,.161,.047,hair_hi if j%4==1 else hair)
for j,(start,lat,end,tip,width) in enumerate([
    (48,62,-79,-5,.205),(47,60,-63,0,.207),(42,59,-47,6,.202),
    (38,60,-32,10,.193),(36,61,-16,16,.180),(36,59,0,19,.159),
    (37,54,19,17,.125),(41,58,48,15,.138),(43,60,66,6,.154),
    (49,66,82,-5,.162)
]):
    hair_lock('Side-parted fringe',start,lat,end,tip,width,.084,hair_hi if j in (1,5,8) else hair)

# Tailored polo, collar, placket, buttons, chest print and hem stitching.
loft('Tailored white and red polo',[(1.57,.447,.285,.015),(1.61,.452,.286,0),(1.80,.438,.27,0),(1.95,.423,.26,0),
 (2.17,.39,.26,0),(2.40,.45,.26,0),(2.56,.49,.23,0),(2.68,.40,.20,0),(2.73,.21,.17,0)],white,fold=.011,panel=True)
for side in (-1,1):
    mesh('Folded red collar '+str(side),[(side*.025,-.195,2.78),(side*.19,-.17,2.79),(side*.31,-.21,2.65),(side*.13,-.29,2.55)],[(0,1,2,3)],red,[{'spine':1}]*4,1)
loft('Collar back',[(2.71,.21,.185,0),(2.79,.20,.18,0)],red,'spine',32)
mesh('Button placket',[(-.033,-.271,2.64),(.033,-.271,2.64),(.033,-.271,2.30),(-.033,-.271,2.30)],[(0,1,2,3)],white,[{'spine':1}]*4)
for z in (2.58,2.46,2.34):
    ellipsoid('Polo button',(0,-.285,z),(.016,.009,.016),shoe,'spine',12,8)
line('Placket seam',[(-.026,-.279,2.63),(-.026,-.282,2.31)],.003,seam,'spine')
for side in (-1,1):
    line('Side shirt stitching '+str(side),[(side*.39,0,1.68),(side*.37,0,1.95),(side*.40,0,2.26)],.003,seam,'spine')
line('Polo hem',[(-.35,-.18,1.61),(0,-.294,1.61),(.35,-.18,1.61)],.005,seam,'spine')
# Editable font is converted to mesh before skinning/export.
def print_text(text, location, size, mat):
    data=bpy.data.curves.new('Chest print','FONT');data.body=text;data.size=size;data.extrude=.0004
    ob=bpy.data.objects.new('Chest branding '+text,data);bpy.context.collection.objects.link(ob)
    ob.location=location;ob.rotation_euler=(math.pi/2,0,0);data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.object.convert(target='MESH')
    group=ob.vertex_groups.new(name='spine');group.add(list(range(len(ob.data.vertices))),1,'REPLACE');parts.append(ob)
print_text('WWC',(.105,-.272,2.48),.062,red)
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
    bone('lid.'+str(s),(s*.319,-.53,eye_z),(s*.319,-.53,eye_z+.15),'head')
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
    sleeve_color=red if s==-1 else white
    sleeve=[(s*.36,0,2.59),(s*.45,0,2.57),(s*.51,0,2.49),
            (s*.57,-.005,2.36),(s*.612,-.011,2.24),(s*.615,-.012,2.223)]
    tube('Dropped shoulder and sleeve '+side,sleeve,[.105,.17,.181,.175,.158,.157],
         sleeve_color,[{'spine':.65,upper:.35},upper,upper,upper,upper,upper],24)

    ellipsoid('Sculpted palm '+side,(s*.72,-.04,1.55),(.127,.067,.17),skin,hand,24,16)
    for j,label in enumerate(('index','middle','ring','little')):
        x=s*(.62+j*.065);length=(.19,.22,.20,.16)[j]
        points=[(x,-.047,1.50),(x,-.047,1.48),(x,-.047,1.48-length/3),(x,-.047,1.48-length*2/3),(x,-.047,1.48-length)]
        b0=label+'0.'+side;b1=label+'1.'+side;b2=label+'2.'+side
        tube('Articulated '+label+' '+side,points,[.029,.030,.027,.024,.010],skin,[hand,b0,{b0:.5,b1:.5},{b1:.5,b2:.5},b2],12)
        ellipsoid(label+' nail '+side,(x,-.071,1.50-length),(.014,.003,.016),nail,b2,12,8)
    tube('Articulated thumb '+side,[(s*.62,-.085,1.60),(s*.55,-.085,1.56),(s*.50,-.085,1.49),(s*.45,-.085,1.42)],[.045,.038,.030,.012],skin,['thumb_base.'+side,{'thumb_base.'+side:.5,'thumb0.'+side:.5},{'thumb0.'+side:.5,'thumb1.'+side:.5},'thumb1.'+side],14)
    # Trousers: authored tapered leg profiles, knee fabric and stitched pocket.
    leg=loft('Tailored trouser '+side,[(.26,.159,.163,0),(.30,.176,.175,0),(.35,.171,.17,.005),(.39,.155,.151,.014),(.48,.17,.174,.014),(.68,.166,.162,.014),(.88,.177,.187,-.014),(.96,.183,.192,-.018),(1.08,.18,.185,0),(1.28,.202,.21,0),(1.54,.226,.231,0),(1.65,.21,.221,0)],dark,'thigh.'+side,32,.004)
    # Position in mesh space (not object transform) so bind matrices stay identity.
    for v in leg.data.vertices:v.co.x+=s*(.23-.048*min(1,max(0,(v.co.z-1.18)/.36)))
    leg.vertex_groups.clear()
    thigh=leg.vertex_groups.new(name='thigh.'+side);shin=leg.vertex_groups.new(name='shin.'+side)
    for v in leg.data.vertices:
        w=max(0,min(1,(v.co.z-.82)/.24));thigh.add([v.index],w,'REPLACE');shin.add([v.index],1-w,'REPLACE')
    line('Pocket stitching '+side,[(s*.36,-.13,1.53),(s*.30,-.205,1.41),(s*.20,-.22,1.38)],.004,seam,'pelvis')
    ellipsoid('Sneaker upper '+side,(s*.24,-.13,.20),(.19,.36,.17),shoe,'foot.'+side,32,18)
    ellipsoid('Sneaker sole '+side,(s*.24,-.13,.092),(.195,.369,.057),sole,'foot.'+side,32,12)
    for row in range(4):
        y=-.374+row*.042
        points=[]
        for dx in (-.081,-.04,0,.04,.081):
            yy=y+.010*math.cos(dx/.081*math.pi)
            height=.20+.17*math.sqrt(1-(dx/.19)**2-((yy+.13)/.36)**2)
            points.append((s*.24+dx,yy,height+.006))
        line('Flat woven lace',points,.012,white,'foot.'+side)
loft('Trouser waistband',[(1.37,.29,.19,.018),(1.44,.37,.22,.012),(1.60,.404,.243,0),(1.68,.39,.231,0)],dark,'pelvis',40)

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
        b=rig.pose.bones['lid.'+str(side)];b.scale=(1,1-.976*blink,1)
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
def wave_pose(tilt):
    arm=arm_pose('R',(1.09,-.20,3.17),(math.sin(math.radians(tilt)),0,math.cos(math.radians(tilt))))
    return {**arm,'head':(0,-6,-4)}
action('Wave',[(1,{},0),(18,wave_pose(0),0),(25,wave_pose(-16),0),(33,wave_pose(22),0),
               (41,wave_pose(-16),0),(49,wave_pose(18),0),(65,{},0)])
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
salute={**arm_pose('R',(.80,-.43,3.24),(-.46,-.48,.75)),'head':(0,0,-3)}
action('Salute',[(1,{},0),(22,salute,0),(47,salute,0),(66,{},0)])
point={**arm_pose('R',(.70,-.78,2.52),(0,-1,0)),**curl('R',72,0),'thumb0.R':(40,0,0),'head':(0,-4,0)}
action('Point',[(1,{},0),(20,point,0),(48,point,0),(66,{},0)])
celebrate={**arm_pose('R',(1.04,-.10,3.27),(.42,0,.91)),**arm_pose('L',(-1.04,-.10,3.27),(-.42,0,.91)),'head':(-4,0,0)}
action('Celebrate',[(1,{},0),(20,celebrate,0),(30,{**celebrate,'spine':(0,0,5)},0),(40,{**celebrate,'spine':(0,0,-5)},0),(50,celebrate,0),(70,{},0)])
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.scale=(1,1,1);b.location=(0,0,0)

# Export only the character/rig; cameras and studio stay editable in .blend.
bpy.ops.object.select_all(action='DESELECT');character.select_set(True);rig.select_set(True)
bpy.context.view_layer.objects.active=rig
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(OUT/'jhon-figurine.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_optimize_animation_size=True)
for track in rig.animation_data.nla_tracks:track.mute=True

scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=720;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.24,.24,.24)
scene.view_settings.view_transform='AgX'
def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
for name,pos,power,size in [('Key',(-3,-5,7),650,4),('Fill',(4,-2,5),420,4),('Rim',(1,4,6),750,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,0,2.3))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.015));floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(material('Studio blue-white',(.82,.87,.94),.9))
bpy.ops.object.camera_add(location=(0,-10,4.1));camera=bpy.context.object;camera.name='Inspection camera';camera.data.type='ORTHO';camera.data.ortho_scale=5.1;scene.camera=camera
rig['reference']='Bundled portrait. Editable stylized likeness study; requires owner visual approval.'
rig['clips']='Idle, Wave, ThumbsUp, Salute, Point, Celebrate'
aim(camera,(0,0,2.29))
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'jhon-figurine.blend'))
for label,pos in [('front',(0,-10,3.9)),('three-quarter',(7,-9,4.2)),('left',(-10,0,3.9)),('right',(10,0,3.9)),('back',(0,10,3.9))]:
    camera.location=pos;aim(camera,(0,0,2.29));scene.render.filepath=str(QA/(label+'.png'));bpy.ops.render.render(write_still=True)
for track in rig.animation_data.nla_tracks:
    if track.name=='Idle':continue
    rig.animation_data.action=track.strips[0].action;scene.frame_set(30)
    camera.location=(0,-10,3.9);aim(camera,(0,0,2.29));scene.render.filepath=str(QA/(track.name+'.png'));bpy.ops.render.render(write_still=True)
    rig.animation_data.action=None
print('Figurine source, rigged GLB and inspection renders complete.')
