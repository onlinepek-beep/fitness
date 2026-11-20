import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/controls/OrbitControls.js";

const host = document.getElementById("model3d");
const status = document.getElementById("modelStatus");
if (host) {
  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe5edf4);
    const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(3.9, 2.9, 5.7);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.9, 0);
    controls.maxPolarAngle = Math.PI * 0.48;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8295a8, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(3, 6, 4);
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 64),
      new THREE.MeshStandardMaterial({ color: 0xd6e0e9, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    scene.add(floor);

    const skin = 0xd5a47f, shirt = 0x263f59, shorts = 0x34495e;
    const body = new THREE.Group();
    scene.add(body);
    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 1.12, 0);
    body.add(torsoPivot);

    function capsule(parent, radius, length, color, position, rotationZ = 0) {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, length, 6, 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.78 })
      );
      mesh.position.set(...position);
      mesh.rotation.z = rotationZ;
      parent.add(mesh);
      return mesh;
    }
    function segment(parent, start, end, radius, color) {
      const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
      const direction = b.clone().sub(a);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.82 })
      );
      mesh.position.copy(a.add(b).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      parent.add(mesh);
      return mesh;
    }
    function ball(parent, position, radius, color) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 18, 14),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
      );
      mesh.position.set(...position);
      parent.add(mesh);
      return mesh;
    }

    capsule(torsoPivot, 0.24, 0.95, shirt, [0, 0, 0], Math.PI / 2);
    capsule(torsoPivot, 0.19, 0.32, shorts, [-0.55, -0.06, 0], Math.PI / 2);
    const headPivot = new THREE.Group();
    headPivot.position.set(0.72, 0.07, 0);
    torsoPivot.add(headPivot);
    const skull = ball(headPivot, [0, 0, 0], 0.19, skin);
    skull.scale.set(1.1, 1.15, 0.95);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.192, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
      new THREE.MeshStandardMaterial({ color: 0x40352f })
    );
    hair.position.y = 0.055;
    headPivot.add(hair);
    capsule(torsoPivot, 0.09, 0.17, skin, [0.56, 0.02, 0], -0.7);

    // Simplified four-point support pose. This is a technical mannequin, not a medical-grade rig.
    for (const z of [-0.19, 0.19]) {
      segment(body, [0.48, 0.94, z], [0.58, 0.48, z], 0.075, skin);
      ball(body, [0.58, 0.48, z], 0.08, skin);
      segment(body, [0.58, 0.48, z], [0.83, 0.12, z], 0.065, skin);
      ball(body, [0.83, 0.12, z], 0.065, skin);
      segment(body, [-0.48, 0.93, z], [-0.64, 0.5, z], 0.085, shorts);
      ball(body, [-0.64, 0.5, z], 0.085, skin);
      segment(body, [-0.64, 0.5, z], [-0.82, 0.12, z], 0.07, skin);
      ball(body, [-0.82, 0.12, z], 0.07, skin);
      const palm = ball(body, [0.83, 0.09, z], 0.105, skin);
      palm.scale.set(1.2, 0.45, 0.85);
      const foot = ball(body, [-0.82, 0.08, z], 0.11, skin);
      foot.scale.set(1.2, 0.5, 0.8);
    }

    let playing = false, phase = 0;
    const play = document.getElementById("modelPlay");
    const reset = document.getElementById("modelReset");
    const side = document.getElementById("modelSide");
    if (play) play.addEventListener("click", () => {
      playing = !playing;
      play.textContent = playing ? "Ⅱ Пауза" : "▶ Показать движение";
    });
    if (reset) reset.addEventListener("click", () => {
      playing = false;
      phase = 0;
      torsoPivot.rotation.z = 0;
      headPivot.rotation.z = 0;
      if (play) play.textContent = "▶ Показать движение";
    });
    if (side) side.addEventListener("click", () => {
      camera.position.set(0, 2.2, 6.5);
      controls.target.set(0, 0.9, 0);
      controls.update();
    });

    const resize = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resize.observe(host);
    function animate() {
      requestAnimationFrame(animate);
      if (playing) {
        phase += 0.018;
        torsoPivot.rotation.z = Math.sin(phase) * 0.18;
        headPivot.rotation.z = -Math.sin(phase) * 0.08;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    status.textContent = "Технический 3D-манекен";
  } catch (error) {
    host.textContent = "Не удалось запустить 3D-просмотрщик. Проверь подключение к интернету.";
    if (status) status.textContent = "Ошибка загрузки";
  }
}