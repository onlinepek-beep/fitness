import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const host = document.getElementById("model3d");
const status = document.getElementById("modelStatus");
if (host) {
  let renderer, camera, scene, controls, frameId;
  let running = false, phase = 0, speed = 0.75;
  const animated = [];
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf0f5);
    camera = new THREE.PerspectiveCamera(32, Math.max(host.clientWidth,1)/Math.max(host.clientHeight,1), 0.1, 80);
    // Side view is the most informative for observing lumbar flexion/extension.
    camera.position.set(0.25, 2.35, 6.8);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(host.clientWidth || 640, host.clientHeight || 340);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.05, 0);
    controls.minDistance = 3.5;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.48;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8795a3, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-2, 6, 5); key.castShadow = true; scene.add(key);
    const fill = new THREE.DirectionalLight(0xd6e8ff, 0.8);
    fill.position.set(4, 3, -4); scene.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(10,10), new THREE.MeshStandardMaterial({color:0xe0e7ed,roughness:1}));
    ground.rotation.x=-Math.PI/2; ground.position.y=0.015; ground.receiveShadow=true; scene.add(ground);
    const mat=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness});
    const skin=mat(0xb98260), skinLight=mat(0xc99370), shirt=mat(0x29465f), shirtLight=mat(0x3d607d), shorts=mat(0x24394b), shoe=mat(0x303b45), hair=mat(0x3b302b), eye=mat(0x272727,.35);
    const human=new THREE.Group(); scene.add(human);

    function sphere(parent, pos, scale, material, segments=28) {
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,segments,Math.max(16,segments>>1)),material);
      mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    }
    function link(parent,a,b,r1,r2,material) {
      const va=new THREE.Vector3(...a), vb=new THREE.Vector3(...b), d=vb.clone().sub(va);
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,d.length(),20,1),material);
      mesh.position.copy(va).add(vb).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
      mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    }
    function limb(parent,a,b,rA,rB,material) {
      link(parent,a,b,rA,rB,material);
      sphere(parent,a,[rA,rA,rA],material,20); sphere(parent,b,[rB,rB,rB],material,20);
    }

    // Torso is a smooth custom surface with a controllable lumbar curve.
    const torsoGroup=new THREE.Group(); human.add(torsoGroup);
    const N=48, R=32, verts=[], indices=[], base=[];
    for(let i=0;i<=N;i++){
      const t=i/N, x=-0.68+1.36*t;
      const profile=Math.sin(Math.PI*t);
      const ry=0.20+0.19*Math.pow(profile,.65);
      const rz=0.18+0.13*Math.pow(profile,.65);
      for(let j=0;j<=R;j++){
        const a=j/R*Math.PI*2;
        const y=1.15+Math.cos(a)*ry;
        const z=Math.sin(a)*rz;
        verts.push(x,y,z); base.push(x,y,z);
        if(i<N&&j<R){const p=i*(R+1)+j;indices.push(p,p+R+1,p+1,p+1,p+R+1,p+R+2);}
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(indices); geo.computeVertexNormals();
    const torsoMesh=new THREE.Mesh(geo,shirt); torsoMesh.castShadow=true; torsoMesh.receiveShadow=true; torsoGroup.add(torsoMesh);
    const torsoPositions=geo.attributes.position;
    // Clothing seams suggest shoulders, waist and back muscles without claiming exact anatomy.
    const seam=sphere(torsoGroup,[-.52,1.15,0],[.17,.245,.205],shirtLight);
    const hip=sphere(torsoGroup,[-.72,1.10,0],[.20,.23,.24],shorts);
    const shoulder=sphere(torsoGroup,[.59,1.16,0],[.17,.22,.21],shirtLight);

    // Head, neck and subtle facial profile oriented toward the left.
    const headPivot=new THREE.Group(); headPivot.position.set(.78,1.18,0); human.add(headPivot);
    sphere(headPivot,[0,.08,0],[.205,.245,.19],skinLight);
    sphere(headPivot,[.015,.255,0],[.205,.105,.19],hair);
    sphere(headPivot,[-.15,.065,.125],[.035,.05,.025],skin);
    sphere(headPivot,[-.17,.13,.14],[.018,.018,.012],eye,16);
    sphere(headPivot,[-.20,.015,.02],[.075,.055,.065],skinLight,20);
    link(human,[.64,1.18,0],[.79,1.20,0],.09,.085,skin);

    // Arms: shoulder -> elbow -> wrist -> hand, with clear human joints.
    for(const z of [-.17,.17]){
      sphere(human,[.48,1.04,z],[.13,.14,.13],shirtLight);
      limb(human,[.48,1.03,z],[.62,.61,z],.09,.072,shirt);
      sphere(human,[.62,.61,z],[.075,.075,.075],skin);
      limb(human,[.62,.61,z],[.78,.16,z],.068,.047,skin);
      sphere(human,[.80,.105,z],[.10,.055,.075],skinLight);
      // Fingers are grouped into a natural palm silhouette.
      for(let k=0;k<4;k++) link(human,[.84,.10,z-.045+k*.03],[.91,.075,z-.05+k*.03],.013,.009,skinLight);
    }
    // Thighs, shins and feet; knee joints are visible but anatomically restrained.
    for(const z of [-.16,.16]){
      sphere(human,[-.68,1.05,z],[.20,.20,.16],shorts);
      limb(human,[-.70,1.02,z],[-.78,.56,z],.12,.085,shorts);
      sphere(human,[-.78,.56,z],[.09,.09,.09],skin);
      limb(human,[-.78,.56,z],[-.72,.14,z],.075,.052,skin);
      sphere(human,[-.65,.095,z],[.16,.055,.075],shoe);
    }

    // A subtle lumbar guide follows the back contour; it is a visual aid, not a muscle map.
    const guideMat=new THREE.MeshBasicMaterial({color:0x1b9db3});
    const guideCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.45,1.38,.205),new THREE.Vector3(-.12,1.43,.205),new THREE.Vector3(.18,1.40,.205),new THREE.Vector3(.43,1.35,.19)]);
    const guide=new THREE.Mesh(new THREE.TubeGeometry(guideCurve,40,.018,8,false),guideMat);
    torsoGroup.add(guide);

    function updatePose(v){
      // v=-1: gently rounded spine; v=+1: gently extended spine.
      for(let i=0;i<=N;i++){
        const t=i/N, x=-.68+1.36*t, center=1.15;
        const lumbar=Math.exp(-Math.pow((t-.43)/.24,2));
        const arch=v*.115*lumbar;
        for(let j=0;j<=R;j++){
          const idx=i*(R+1)+j;
          const y=base[idx*3+1], z=base[idx*3+2];
          torsoPositions.setY(idx,y+arch);
          torsoPositions.setZ(idx,z);
        }
      }
      torsoPositions.needsUpdate=true; geo.computeVertexNormals();
      headPivot.rotation.z=-v*.12;
      // Subtle pelvic counter-rotation makes the movement legible as a spinal wave.
      hip.position.y=1.10-v*.025;
      guide.visible=true;
    }

    const play=document.getElementById("modelPlay");
    const reset=document.getElementById("modelReset");
    const side=document.getElementById("modelSide");
    if(play) play.onclick=()=>{running=!running;play.textContent=running?"Ⅱ Пауза":"▶ Показать движение";};
    if(reset) reset.onclick=()=>{running=false;phase=0;updatePose(0);if(play)play.textContent="▶ Показать движение";};
    if(side) side.onclick=()=>{camera.position.set(0.25,2.35,6.8);controls.target.set(0,1.05,0);controls.update();};
    const speedControl=document.getElementById("modelSpeed");
    if(speedControl) speedControl.oninput=()=>{speed=Number(speedControl.value);};
    const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);});
    resize.observe(host);
    function animate(){
      frameId=requestAnimationFrame(animate);
      if(running){phase+=.018*speed;updatePose(Math.sin(phase));}
      controls.update();renderer.render(scene,camera);
    }
    updatePose(0); animate();
    if(status)status.textContent="Реалистичный стилизованный прототип · №21";
  } catch(err){
    host.innerHTML='<div class="model-loading">3D не загрузился: '+String(err.message||err)+'</div>';
    if(status)status.textContent="Ошибка 3D";
  }
}
