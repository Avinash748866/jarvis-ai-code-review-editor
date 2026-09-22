/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import "./RobotAvatar.css";

/**
 * Status -> accent colour + behaviour.
 *   color   accent used ONLY for small lit parts (visor, edge lines, rings,
 *           antenna). The metal body is never tinted by emissive, which is
 *           what used to flatten the whole shape into one solid colour.
 *   pulse   how fast the glow breathes
 *   ring    gyro-ring spin speed
 *   bars    visor pattern (see barHeights)
 *   motion  head body-language (see the animate loop)
 */
const STATUS_STYLE = {
  idle: { color: 0xffb000, pulse: 0.5, ring: 0.25, bars: "idle", motion: "sway" },
  analyzing: { color: 0xffb000, pulse: 1.6, ring: 1.6, bars: "scan", motion: "scan" },
  thinking: { color: 0x2dd4bf, pulse: 1.2, ring: 1.0, bars: "wave", motion: "tilt" },
  listening: { color: 0x2dd4bf, pulse: 1.0, ring: 0.5, bars: "listen", motion: "lean" },
  speaking: { color: 0x2dd4bf, pulse: 2.0, ring: 0.6, bars: "talk", motion: "talk" },
  success: { color: 0x3adb7a, pulse: 0.6, ring: 0.3, bars: "smile", motion: "nod" },
  alert: { color: 0xff4545, pulse: 2.4, ring: 0.7, bars: "alarm", motion: "shake" },
};

const BAR_COUNT = 7;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Visor "face": height + vertical offset of each of the 7 scanner bars. */
function barHeights(pattern, i, t) {
  const c = i - (BAR_COUNT - 1) / 2; // -3 .. 3
  switch (pattern) {
    case "scan": {
      // Cylon-style sweep
      const pos = ((Math.sin(t * 3.2) + 1) / 2) * (BAR_COUNT - 1);
      return { h: 0.045 + 0.17 * Math.max(0, 1 - Math.abs(i - pos) / 1.7), y: 0 };
    }
    case "wave":
      return { h: 0.07 + 0.1 * (0.5 + 0.5 * Math.sin(t * 4 - i * 0.8)), y: 0 };
    case "listen":
      return {
        h: 0.06 + 0.11 * (0.5 + 0.5 * Math.sin(t * 6 + i * 1.9)) * (0.6 + 0.4 * Math.sin(t * 1.7)),
        y: 0,
      };
    case "talk":
      return { h: 0.045 + 0.19 * Math.abs(Math.sin(t * 9 + i * 2.3) * Math.sin(t * 5.3 + i * 1.1)), y: 0 };
    case "smile":
      return { h: 0.065, y: 0.055 * (c / 3) * (c / 3) - 0.02 };
    case "alarm": {
      const on = Math.sin(t * 8 + (i % 2) * Math.PI) > 0 ? 1 : 0.2;
      return { h: 0.05 + 0.16 * on, y: 0 };
    }
    default: {
      // idle: slow breathing with an occasional blink
      const blinkPhase = (t % 4.2) / 4.2;
      const blink = blinkPhase > 0.94 ? 0.15 : 1;
      return { h: (0.07 + 0.035 * Math.sin(t * 1.3 + i * 0.7)) * blink, y: 0 };
    }
  }
}

/**
 * Sci-fi sentinel bust rendered with raw Three.js.
 *
 * variant="compact" - head only, framed tight (used in the header)
 * variant="full"    - head + torso + hologram base (used on the Live Comms stage)
 *
 * The camera sits above and to the side of the robot from the very first
 * frame, so the faceted head reads as a 3D object immediately instead of a
 * flat disc. The head then tracks the pointer / sways on its own.
 */
function RobotAvatar({ status = "idle", variant = "compact" }) {
  const mountRef = useRef(null);
  const statusRef = useRef(status);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const full = variant === "full";
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionScale = reduceMotion ? 0.25 : 1;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setWebglFailed(true);
      return undefined;
    }

    const width = mount.clientWidth || 160;
    const height = mount.clientHeight || 160;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Soft neutral reflections so the metal actually has something to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.45;

    // --- camera: elevated three-quarter view from frame one ---
    const camera = new THREE.PerspectiveCamera(full ? 34 : 32, width / height, 0.1, 100);
    if (full) {
      camera.position.set(3.0, 1.45, 7.4);
      camera.lookAt(0, -0.72, 0);
    } else {
      camera.position.set(2.15, 1.25, 4.15);
      camera.lookAt(0, 0.08, 0);
    }

    const accent = new THREE.Color(STATUS_STYLE.idle.color);
    const rig = new THREE.Group();
    scene.add(rig);

    // ---------- materials ----------
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3d4759,
      metalness: 0.5,
      roughness: 0.4,
      flatShading: true,
      emissive: accent.clone(),
      emissiveIntensity: 0.035, // barely there: the accent must never flatten the facets
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1b2334,
      metalness: 0.7,
      roughness: 0.38,
      flatShading: true,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x03060c,
      metalness: 0.9,
      roughness: 0.14,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.6 });
    const glowMat = new THREE.MeshBasicMaterial({ color: accent.clone(), toneMapped: false });
    const ringMat = new THREE.MeshBasicMaterial({
      color: accent.clone(),
      transparent: true,
      opacity: 0.75,
      toneMapped: false,
    });

    // ---------- head ----------
    const head = new THREE.Group();
    rig.add(head);

    const SKULL_R = 0.98;
    const skullGeo = new THREE.DodecahedronGeometry(SKULL_R, 0);
    {
      // Turn the dodecahedron so one pentagon faces +Z (that becomes the face).
      const pos = skullGeo.attributes.position;
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      const n = new THREE.Vector3();
      let best = null;
      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i);
        b.fromBufferAttribute(pos, i + 1);
        c.fromBufferAttribute(pos, i + 2);
        n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
        if (!best || n.y > best.y) best = n.clone(); // any face works; pick a stable one
      }
      skullGeo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(best, new THREE.Vector3(0, 0, 1)));
      skullGeo.rotateZ(Math.PI); // point down = flat "brow" on top, pointed chin
      skullGeo.scale(1.08, 0.94, 0.96);
      skullGeo.computeBoundingBox();
    }
    const skull = new THREE.Mesh(skullGeo, bodyMat);
    head.add(skull);

    const skullEdges = new THREE.LineSegments(new THREE.EdgesGeometry(skullGeo, 5), edgeMat);
    skullEdges.scale.setScalar(1.004);
    head.add(skullEdges);

    const faceZ = skullGeo.boundingBox.max.z; // z of the front pentagon
    const headTop = skullGeo.boundingBox.max.y;
    const headSide = skullGeo.boundingBox.max.x;

    // visor: dark glass plate with scanner bars
    const visorGroup = new THREE.Group();
    visorGroup.position.set(0, 0.1, faceZ + 0.035);
    head.add(visorGroup);

    const plate = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.38, 0.13, 3, 0.055), glassMat);
    visorGroup.add(plate);
    const plateFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new RoundedBoxGeometry(1.02, 0.38, 0.13, 1, 0.05), 20),
      edgeMat
    );
    plateFrame.scale.setScalar(1.01);
    visorGroup.add(plateFrame);

    const bars = [];
    const barGeo = new THREE.BoxGeometry(0.075, 1, 0.02);
    for (let i = 0; i < BAR_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: accent.clone(), toneMapped: false });
      const mesh = new THREE.Mesh(barGeo, mat);
      mesh.position.set((i - (BAR_COUNT - 1) / 2) * 0.125, 0, 0.075);
      visorGroup.add(mesh);
      bars.push(mesh);
    }

    // ear pods
    const podGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
    podGeo.rotateZ(Math.PI / 2);
    const podRingGeo = new THREE.TorusGeometry(0.155, 0.024, 6, 24);
    podRingGeo.rotateY(Math.PI / 2);
    const pods = [-1, 1].map((side) => {
      const pod = new THREE.Mesh(podGeo, darkMat);
      pod.position.set(side * (headSide + 0.02), -0.02, -0.05);
      head.add(pod);
      const podEdges = new THREE.LineSegments(new THREE.EdgesGeometry(podGeo, 20), edgeMat);
      podEdges.position.copy(pod.position);
      head.add(podEdges);
      const ring = new THREE.Mesh(podRingGeo, glowMat);
      ring.position.set(side * (headSide + 0.13), -0.02, -0.05);
      head.add(ring);
      return ring;
    });

    // antenna (offset to one side for character)
    const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.09, 6), darkMat);
    antBase.position.set(0.34, headTop - 0.01, -0.12);
    head.add(antBase);
    const antRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.36, 6), darkMat);
    antRod.position.set(0.34, headTop + 0.2, -0.12);
    head.add(antRod);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), glowMat);
    antTip.position.set(0.34, headTop + 0.4, -0.12);
    head.add(antTip);

    // ---------- gyro rings ----------
    const makeArcRing = (radius, arc, tilt, roll, tube = 0.018) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(tilt, 0, roll);
      const geo = new THREE.TorusGeometry(radius, tube, 8, 96, arc);
      const mesh = new THREE.Mesh(geo, ringMat);
      pivot.add(mesh);
      scene.add(pivot);
      return mesh;
    };
    const ringA = makeArcRing(1.34, Math.PI * 1.55, -1.12, 0.28);
    const ringB = makeArcRing(1.22, Math.PI * 0.85, -1.12, 0.28, 0.014);

    // ---------- torso + hologram base (full variant only) ----------
    let torso = null;
    let reactorCore = null;
    let reactorRing = null;
    let baseRings = [];
    let particles = null;
    let particleMat = null;

    if (full) {
      torso = new THREE.Group();
      rig.add(torso);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.42, 6), darkMat);
      neck.position.y = -1.1;
      torso.add(neck);

      const chestGeo = new THREE.CylinderGeometry(0.82, 1.08, 0.98, 6);
      const chest = new THREE.Mesh(chestGeo, bodyMat);
      chest.rotation.y = Math.PI / 6; // flat face to the front
      chest.position.y = -1.8;
      torso.add(chest);
      const chestEdges = new THREE.LineSegments(new THREE.EdgesGeometry(chestGeo, 5), edgeMat);
      chestEdges.rotation.y = Math.PI / 6;
      chestEdges.position.y = -1.8;
      chestEdges.scale.setScalar(1.004);
      torso.add(chestEdges);

      reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 32), glowMat);
      reactorRing.position.set(0, -1.72, 0.9);
      reactorRing.rotation.x = -0.22;
      torso.add(reactorRing);
      reactorCore = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), glowMat);
      reactorCore.position.set(0, -1.72, 0.895);
      reactorCore.rotation.x = -0.22;
      torso.add(reactorCore);

      [-1, 1].forEach((side) => {
        const padGeo = new THREE.IcosahedronGeometry(0.34, 0);
        const pad = new THREE.Mesh(padGeo, darkMat);
        pad.position.set(side * 1.12, -1.42, 0);
        pad.scale.set(1, 0.85, 1);
        torso.add(pad);
        const padEdges = new THREE.LineSegments(new THREE.EdgesGeometry(padGeo, 5), edgeMat);
        padEdges.position.copy(pad.position);
        padEdges.scale.copy(pad.scale).multiplyScalar(1.006);
        torso.add(padEdges);
      });

      // hologram base
      const baseY = -2.5;
      const mkBase = (r, tube, opacity) => {
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(r, tube, 6, 96),
          new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity, toneMapped: false })
        );
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = baseY;
        scene.add(mesh);
        return mesh;
      };
      baseRings = [mkBase(1.7, 0.014, 0.7), mkBase(1.15, 0.01, 0.45), mkBase(0.6, 0.01, 0.3)];
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1.7, 64),
        new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.06, toneMapped: false })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = baseY;
      scene.add(disc);
      baseRings.push(disc);

      // ambient particles
      const count = 50;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = 1.9 + Math.random() * 0.7;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = r * Math.cos(theta);
        positions[i * 3 + 1] = -2.3 + Math.random() * 4.2;
        positions[i * 3 + 2] = r * Math.sin(theta);
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleMat = new THREE.PointsMaterial({
        color: accent.clone(),
        size: 0.045,
        transparent: true,
        opacity: 0.65,
        toneMapped: false,
      });
      particles = new THREE.Points(pGeo, particleMat);
      scene.add(particles);
    }

    // ---------- lights ----------
    scene.add(new THREE.AmbientLight(0x8fa3c8, 0.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(-2.5, 3.5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x7fa8ff, 2.4);
    rimLight.position.set(-3, 1.5, -4);
    scene.add(rimLight);
    const accentLight = new THREE.PointLight(accent.clone(), 24, 14, 2);
    accentLight.position.set(3.2, 0.3, 3.2);
    scene.add(accentLight);

    // ---------- pointer tracking ----------
    const pointer = { yaw: 0, pitch: 0, lastMove: -Infinity };
    const onPointerMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pointer.yaw = clamp((e.clientX - cx) / (window.innerWidth * 0.5), -1, 1) * 0.6;
      pointer.pitch = clamp((e.clientY - cy) / (window.innerHeight * 0.5), -1, 1) * 0.32;
      pointer.lastMove = performance.now();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // ---------- animation ----------
    const clock = new THREE.Clock();
    const targetColor = new THREE.Color();
    let elapsed = 0;
    let lastStatus = statusRef.current;
    let statusChangedAt = 0;
    let frameId;

    function animate() {
      const delta = Math.min(clock.getDelta(), 0.1);
      elapsed += delta;
      const t = elapsed;

      if (statusRef.current !== lastStatus) {
        lastStatus = statusRef.current;
        statusChangedAt = t;
      }
      const style = STATUS_STYLE[statusRef.current] || STATUS_STYLE.idle;
      const since = t - statusChangedAt;

      // colour follows status
      targetColor.setHex(style.color);
      accent.lerp(targetColor, 1 - Math.exp(-delta * 5));
      const pulse = 0.5 + 0.5 * Math.sin(t * style.pulse * 5);

      bodyMat.emissive.copy(accent);
      bodyMat.emissiveIntensity = 0.03 + pulse * 0.03;
      edgeMat.color.copy(accent);
      edgeMat.opacity = 0.5 + pulse * 0.2;
      glowMat.color.copy(accent).multiplyScalar(0.75 + pulse * 0.5);
      ringMat.color.copy(accent);
      accentLight.color.copy(accent);
      if (particleMat) particleMat.color.copy(accent);
      baseRings.forEach((m) => m.material.color.copy(accent));

      // visor bars
      bars.forEach((mesh, i) => {
        const { h, y } = barHeights(style.bars, i, t);
        mesh.scale.y = Math.max(0.012, h);
        mesh.position.y = y;
        mesh.material.color.copy(accent).multiplyScalar(0.7 + Math.min(1, h / 0.2) * 0.6);
      });

      // antenna tip blinks
      const blink = style.pulse > 1.5 ? (Math.sin(t * style.pulse * 6) > 0 ? 1.25 : 0.7) : 0.85 + pulse * 0.4;
      antTip.scale.setScalar(blink);
      pods.forEach((p) => p.scale.setScalar(0.92 + pulse * 0.16));

      // head: look at pointer if it moved recently, otherwise idle sway
      const pointerActive = performance.now() - pointer.lastMove < 4500;
      let yaw = pointerActive ? pointer.yaw : Math.sin(t * 0.6) * 0.28 * motionScale;
      let pitch = pointerActive ? pointer.pitch : Math.sin(t * 0.45 + 1) * 0.06 * motionScale;
      let roll = 0;

      switch (style.motion) {
        case "scan":
          yaw += Math.sin(t * 2.2) * 0.3 * motionScale;
          break;
        case "tilt": // thinking: look up-and-aside
          pitch -= 0.1;
          roll = Math.sin(t * 1.3) * 0.09 * motionScale;
          break;
        case "lean": // listening: curious head tilt
          pitch += 0.06;
          roll = 0.1 * motionScale;
          break;
        case "talk":
          pitch += Math.sin(t * 8) * 0.025 * motionScale;
          break;
        case "nod":
          pitch += Math.sin(since * 6) * 0.11 * Math.exp(-since * 0.9) * motionScale;
          break;
        case "shake":
          yaw += Math.sin(since * 24) * 0.13 * Math.exp(-since * 1.4) * motionScale;
          yaw += Math.sin(t * 20) * 0.012 * motionScale;
          break;
        default:
          break;
      }

      const k = 1 - Math.exp(-delta * 6);
      head.rotation.y += (yaw - head.rotation.y) * k;
      head.rotation.x += (pitch - head.rotation.x) * k;
      head.rotation.z += (roll - head.rotation.z) * k;

      if (torso) {
        torso.rotation.y += (head.rotation.y * 0.3 - torso.rotation.y) * k;
        if (reactorCore) {
          reactorCore.scale.setScalar(0.8 + pulse * 0.45);
          reactorRing.scale.setScalar(0.95 + pulse * 0.1);
        }
      }

      rig.position.y = Math.sin(t * 1.4) * 0.05 * motionScale;

      ringA.rotation.z += delta * (0.3 + style.ring) * motionScale;
      ringB.rotation.z -= delta * (0.5 + style.ring * 1.3) * motionScale;
      if (particles) particles.rotation.y += delta * 0.08 * motionScale;
      baseRings.forEach((m, i) => {
        if (m.geometry.type === "TorusGeometry") m.scale.setScalar(1 + Math.sin(t * 1.2 + i) * 0.015);
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width || 160;
      const h = entry.contentRect.height || 160;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) [].concat(obj.material).forEach((m) => m.dispose());
      });
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [variant]);

  if (webglFailed) {
    // No WebGL: keep the status colour readable with a plain CSS badge.
    return (
      <div className={`robot-avatar robot-avatar-fallback robot-avatar-${status}`} aria-hidden="true">
        <span>🤖</span>
      </div>
    );
  }

  return <div className="robot-avatar" ref={mountRef} aria-hidden="true" />;
}

export default RobotAvatar;
