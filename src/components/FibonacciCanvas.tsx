import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  generateSpiralPositions,
  getFibonacciDigitStream,
  DIGIT_RULES,
  FibonacciMatchResult,
} from '../math/fibonacci';
import { soundEngine } from '../audio/sound';
import { ZoomIn, ZoomOut, RotateCcw, Sparkles, Move, Compass } from 'lucide-react';

interface FibonacciCanvasProps {
  matchResult: FibonacciMatchResult | null;
  activeQuery: string;
}

// Pre-allocated math objects to guarantee ZERO GC allocations in render loop
const _vec3 = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();
const _targetCam = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();

export const FibonacciCanvas: React.FC<FibonacciCanvasProps> = ({
  matchResult,
  activeQuery,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<'move' | 'orbit'>('move');
  const [isCtrlHeld, setIsCtrlHeld] = useState(false);
  const dragModeRef = useRef<'move' | 'orbit'>('move');
  dragModeRef.current = dragMode;
  const isCtrlHeldRef = useRef(false);

  const stateRef = useRef({
    matchResult,
    activeQuery,
    isFlying: false,
    flyProgress: 1,
    targetCoord: new THREE.Vector3(0, 0, 0),
    camLookAt: new THREE.Vector3(0, 0, 0),
    orbitAngles: { theta: 0.9, phi: 1.15, radius: 44 },
    orbitTarget: new THREE.Vector3(0, 0, 0),
    isMouseDown: false,
    prevMouseX: 0,
    prevMouseY: 0,
    trailStart: 0,
    trailLen: 4,
    hasHighlight: false,
    shockwaveProgress: 1.0,
  });

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles.radius = Math.max(12, stateRef.current.orbitAngles.radius - 7);
    stateRef.current.isFlying = false;
    soundEngine.playClick();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles.radius = Math.min(85, stateRef.current.orbitAngles.radius + 7);
    stateRef.current.isFlying = false;
    soundEngine.playClick();
  };

  const handleResetOrbit = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles = { theta: 0.9, phi: 1.15, radius: 44 };
    stateRef.current.orbitTarget.set(0, 0, 0);
    stateRef.current.isFlying = false;
    soundEngine.playClick();
  };

  const handleToggleDragMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = dragMode === 'move' ? 'orbit' : 'move';
    setDragMode(next);
    soundEngine.playClick();
  };

  // Keyboard listener for Ctrl / Meta key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlHeldRef.current = true;
        setIsCtrlHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlHeldRef.current = false;
        setIsCtrlHeld(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    stateRef.current.activeQuery = activeQuery;
  }, [activeQuery]);

  useEffect(() => {
    stateRef.current.matchResult = matchResult;
    if (matchResult && matchResult.query) {
      stateRef.current.trailStart = matchResult.trailStartIndex;
      stateRef.current.trailLen = matchResult.query.length;
      stateRef.current.hasHighlight = true;
      stateRef.current.isFlying = true;
      stateRef.current.flyProgress = 0;
      stateRef.current.shockwaveProgress = 0;
      soundEngine.playFlySwoosh();
    } else {
      stateRef.current.hasHighlight = false;
    }
  }, [matchResult]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- 1. Scene & Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06080e, 0.012);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // --- 2. Studio Glass Environment Map ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envRoom = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(envRoom, 0.04).texture;
    pmremGenerator.dispose();

    // --- 3. Camera ---
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(24, 18, 44);
    camera.lookAt(0, 0, 0);

    // --- 4. Studio Lighting Rig ---
    const ambientLight = new THREE.AmbientLight(0x0a1220, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(35, 50, 35);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x71b9ff, 2.0);
    cyanRim.position.set(-35, -20, -35);
    scene.add(cyanRim);

    // Dynamic sequence spotlight
    const sequencePointLight = new THREE.PointLight(0x71b9ff, 3.5, 45);
    sequencePointLight.visible = false;
    scene.add(sequencePointLight);

    // --- 5. Generate Procedural Digit Badge Textures (0-9) ---
    const createDigitBadgeTexture = (digit: number, hexColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Glass badge background
      ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
      ctx.beginPath();
      ctx.roundRect(14, 14, 100, 100, 24);
      ctx.fill();

      // Glowing neon border
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = hexColor;
      ctx.shadowBlur = 16;
      ctx.stroke();

      // Inner subtle rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Bold number in center
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px monospace, "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = hexColor;
      ctx.shadowBlur = 12;
      ctx.fillText(digit.toString(), 64, 66);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const badgeTextures = DIGIT_RULES.map((rule) => createDigitBadgeTexture(rule.digit, rule.color));

    // Halo Glow Texture
    const createHaloTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(113, 185, 255, 0.85)');
      grad.addColorStop(0.65, 'rgba(44, 131, 214, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const orbHaloTexture = createHaloTexture();

    // --- 6. Celestial Dust Background ---
    const dustCount = 700;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 180;
      dustPos[i + 1] = (Math.random() - 0.5) * 130;
      dustPos[i + 2] = (Math.random() - 0.5) * 180;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 1.1,
      color: 0x71b9ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // --- 7. Glass Orbs Spiral (InstancedMesh) ---
    const totalPoints = 750;
    const digitStream = getFibonacciDigitStream(totalPoints);
    const positions = generateSpiralPositions(totalPoints);

    const orbGeometry = new THREE.SphereGeometry(0.26, 24, 24);
    const orbMaterial = new THREE.MeshPhysicalMaterial({
      roughness: 0.12,
      metalness: 0.15,
      transmission: 0.65,
      thickness: 1.2,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.95,
      emissiveIntensity: 0.45,
    });

    const instancedMesh = new THREE.InstancedMesh(orbGeometry, orbMaterial, totalPoints);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    // Initial setup with uniform size & digit colors
    for (let i = 0; i < totalPoints; i++) {
      const i3 = i * 3;
      const char = digitStream[i] || '0';
      const digit = parseInt(char, 10) || 0;
      const rule = DIGIT_RULES[digit];

      _vec3.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      _scaleVec.set(1.0, 1.0, 1.0);
      _matrix.compose(_vec3, _quat, _scaleVec);
      instancedMesh.setMatrixAt(i, _matrix);

      _color.setHex(rule.hex);
      instancedMesh.setColorAt(i, _color);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    // Spiral filament curve
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4a82b8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const spiralLine = new THREE.Line(lineGeo, lineMat);
    scene.add(spiralLine);

    // --- 8. ADVANCED HIGHLIGHTING RIG ---
    const highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    const maxBadges = 8;
    const badgeSprites: THREE.Sprite[] = [];
    const haloSprites: THREE.Sprite[] = [];
    const microRings: THREE.Mesh[] = [];

    const ringGeometry = new THREE.RingGeometry(0.48, 0.58, 32);

    for (let b = 0; b < maxBadges; b++) {
      const bMat = new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      });
      const bSprite = new THREE.Sprite(bMat);
      bSprite.scale.set(1.4, 1.4, 1.4);
      bSprite.visible = false;
      highlightGroup.add(bSprite);
      badgeSprites.push(bSprite);

      const hMat = new THREE.SpriteMaterial({
        map: orbHaloTexture,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const hSprite = new THREE.Sprite(hMat);
      hSprite.scale.set(2.8, 2.8, 2.8);
      hSprite.visible = false;
      highlightGroup.add(hSprite);
      haloSprites.push(hSprite);

      const rMat = new THREE.MeshBasicMaterial({
        color: 0x71b9ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeometry, rMat);
      ringMesh.visible = false;
      highlightGroup.add(ringMesh);
      microRings.push(ringMesh);
    }

    const conduitMaxPoints = 8;
    const conduitPositions = new Float32Array(conduitMaxPoints * 3);
    const conduitGeo = new THREE.BufferGeometry();
    conduitGeo.setAttribute('position', new THREE.BufferAttribute(conduitPositions, 3));
    const conduitMat = new THREE.LineBasicMaterial({
      color: 0x71b9ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const conduitLine = new THREE.Line(conduitGeo, conduitMat);
    conduitLine.visible = false;
    highlightGroup.add(conduitLine);

    const shockwaveGeo = new THREE.RingGeometry(0.2, 0.45, 48);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x71b9ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwaveRing = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveRing.visible = false;
    highlightGroup.add(shockwaveRing);

    // --- 9. Interaction Handlers ---
    // Normal drag = MOVE / PAN
    // Ctrl + drag = ORBIT / ROTATE
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      stateRef.current.isMouseDown = true;
      stateRef.current.prevMouseX = e.clientX;
      stateRef.current.prevMouseY = e.clientY;
      stateRef.current.isFlying = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isMouseDown) return;
      const deltaX = e.clientX - stateRef.current.prevMouseX;
      const deltaY = e.clientY - stateRef.current.prevMouseY;
      stateRef.current.prevMouseX = e.clientX;
      stateRef.current.prevMouseY = e.clientY;

      const isOrbiting =
        e.ctrlKey ||
        e.metaKey ||
        e.button === 2 ||
        isCtrlHeldRef.current ||
        dragModeRef.current === 'orbit';

      if (isOrbiting) {
        // CTRL + DRAG: ORBIT (Rotate camera around focus)
        stateRef.current.orbitAngles.theta -= deltaX * 0.007;
        stateRef.current.orbitAngles.phi = Math.max(
          0.15,
          Math.min(Math.PI - 0.15, stateRef.current.orbitAngles.phi - deltaY * 0.007)
        );
      } else {
        // NORMAL DRAG: MOVE (Translate camera view plane)
        _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

        const panFactor = (stateRef.current.orbitAngles.radius / Math.max(width, height)) * 1.6;
        stateRef.current.orbitTarget.addScaledVector(_camRight, -deltaX * panFactor);
        stateRef.current.orbitTarget.addScaledVector(_camUp, deltaY * panFactor);
      }
    };

    const onMouseUp = () => {
      stateRef.current.isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        stateRef.current.orbitAngles.radius = Math.max(
          12,
          Math.min(85, stateRef.current.orbitAngles.radius + e.deltaY * 0.05)
        );
        stateRef.current.isFlying = false;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        stateRef.current.prevMouseX = e.touches[0].clientX;
        stateRef.current.prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const deltaX = clientX - stateRef.current.prevMouseX;
        const deltaY = clientY - stateRef.current.prevMouseY;
        stateRef.current.prevMouseX = clientX;
        stateRef.current.prevMouseY = clientY;

        if (dragModeRef.current === 'orbit' || isCtrlHeldRef.current) {
          stateRef.current.orbitAngles.theta -= deltaX * 0.008;
          stateRef.current.orbitAngles.phi = Math.max(
            0.15,
            Math.min(Math.PI - 0.15, stateRef.current.orbitAngles.phi - deltaY * 0.008)
          );
        } else {
          _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
          _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
          const panFactor = (stateRef.current.orbitAngles.radius / Math.max(width, height)) * 1.6;
          stateRef.current.orbitTarget.addScaledVector(_camRight, -deltaX * panFactor);
          stateRef.current.orbitTarget.addScaledVector(_camUp, deltaY * panFactor);
        }
        stateRef.current.isFlying = false;
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // --- 10. Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();
    let lastHighlightedStart = -1;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Synchronous rotation
      const rotSpeed = 0.008;
      dustParticles.rotation.y = time * 0.015;
      spiralLine.rotation.y = time * rotSpeed;
      instancedMesh.rotation.y = time * rotSpeed;
      highlightGroup.rotation.y = time * rotSpeed;

      const hasHighlight = stateRef.current.hasHighlight;
      const trailDigits = stateRef.current.matchResult?.trailDigits || [];
      const trailStart = Math.min(totalPoints - 1, Math.max(0, stateRef.current.trailStart));
      const trailLen = Math.min(maxBadges, trailDigits.length);

      if (hasHighlight && trailLen > 0) {
        // Ensure instanced orbs at the sequence positions are set to the exact searched digits!
        if (lastHighlightedStart !== trailStart) {
          if (lastHighlightedStart !== -1) {
            for (let i = 0; i < totalPoints; i++) {
              const d = parseInt(digitStream[i] || '0', 10) || 0;
              _color.setHex(DIGIT_RULES[d].hex);
              instancedMesh.setColorAt(i, _color);
            }
          }

          for (let b = 0; b < trailDigits.length; b++) {
            const nodeIdx = trailStart + b;
            if (nodeIdx < totalPoints) {
              const d = trailDigits[b];
              _color.setHex(DIGIT_RULES[d].hex);
              instancedMesh.setColorAt(nodeIdx, _color);
            }
          }
          if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
          lastHighlightedStart = trailStart;
        }

        const pulse = 1.0 + Math.sin(time * 5) * 0.12;
        const conduitLinePos = conduitLine.geometry.attributes.position as THREE.BufferAttribute;

        let midX = 0;
        let midY = 0;
        let midZ = 0;

        for (let b = 0; b < maxBadges; b++) {
          if (b < trailLen) {
            const nodeIdx = trailStart + b;
            const n3 = nodeIdx * 3;
            const ox = positions[n3];
            const oy = positions[n3 + 1];
            const oz = positions[n3 + 2];

            const digit = trailDigits[b];
            const rule = DIGIT_RULES[digit];

            // 1. Number Badge floating directly above the orb showing the searched digit
            const bSprite = badgeSprites[b];
            bSprite.material.map = badgeTextures[digit];
            bSprite.material.needsUpdate = true;
            bSprite.position.set(ox, oy + 1.25 + Math.sin(time * 4 + b) * 0.1, oz);
            bSprite.scale.set(1.4 * pulse, 1.4 * pulse, 1.4);
            bSprite.visible = true;

            // 2. Halo aura positioned right around the orb with matching digit color
            const hSprite = haloSprites[b];
            hSprite.material.color.setHex(rule.hex);
            hSprite.position.set(ox, oy, oz);
            hSprite.scale.set(2.8 * pulse, 2.8 * pulse, 2.8);
            hSprite.visible = true;

            // 3. Micro reticle ring around the orb matching digit color
            const ring = microRings[b];
            (ring.material as THREE.MeshBasicMaterial).color.setHex(rule.hex);
            ring.position.set(ox, oy, oz);
            ring.rotation.z = time * 2 + b;
            ring.rotation.x = Math.PI / 2 + Math.sin(time + b) * 0.3;
            ring.scale.set(1.1 * pulse, 1.1 * pulse, 1.1);
            ring.visible = true;

            conduitLinePos.setXYZ(b, ox, oy, oz);

            midX += ox;
            midY += oy;
            midZ += oz;
          } else {
            badgeSprites[b].visible = false;
            haloSprites[b].visible = false;
            microRings[b].visible = false;
            const lastIdx = (trailStart + trailLen - 1) * 3;
            conduitLinePos.setXYZ(b, positions[lastIdx], positions[lastIdx + 1], positions[lastIdx + 2]);
          }
        }

        conduitLinePos.needsUpdate = true;
        conduitLine.visible = true;
        conduitMat.opacity = 0.8 + Math.sin(time * 8) * 0.2;

        midX /= trailLen;
        midY /= trailLen;
        midZ /= trailLen;

        shockwaveRing.position.set(midX, midY, midZ);
        shockwaveRing.rotation.x = Math.PI / 2;

        if (stateRef.current.shockwaveProgress < 1.0) {
          stateRef.current.shockwaveProgress += delta * 1.5;
          const sp = stateRef.current.shockwaveProgress;
          const sScale = sp * 14;
          shockwaveRing.scale.set(sScale, sScale, sScale);
          shockwaveMat.opacity = Math.max(0, (1 - sp) * 0.85);
          shockwaveRing.visible = true;
        } else {
          shockwaveRing.visible = false;
        }

        sequencePointLight.position.set(midX, midY + 3, midZ);
        sequencePointLight.visible = true;

        const rotAngle = time * rotSpeed;
        const cosA = Math.cos(rotAngle);
        const sinA = Math.sin(rotAngle);
        const globalTargetX = midX * cosA - midZ * sinA;
        const globalTargetY = midY;
        const globalTargetZ = midX * sinA + midZ * cosA;

        stateRef.current.targetCoord.set(globalTargetX, globalTargetY, globalTargetZ);
      } else {
        for (let b = 0; b < maxBadges; b++) {
          badgeSprites[b].visible = false;
          haloSprites[b].visible = false;
          microRings[b].visible = false;
        }
        conduitLine.visible = false;
        shockwaveRing.visible = false;
        sequencePointLight.visible = false;
      }

      // Camera Fly-Through vs User Navigation
      if (stateRef.current.isFlying && hasHighlight) {
        stateRef.current.flyProgress = Math.min(1, stateRef.current.flyProgress + delta * 1.25);
        const p = stateRef.current.flyProgress;

        const targetCoord = stateRef.current.targetCoord;
        const dist = Math.hypot(targetCoord.x, targetCoord.z) || 1;
        const normX = targetCoord.x / dist;
        const normZ = targetCoord.z / dist;

        _targetCam.set(
          targetCoord.x + normX * 7.5,
          targetCoord.y + 3.8,
          targetCoord.z + normZ * 7.5
        );

        camera.position.lerp(_targetCam, delta * 4.0);
        stateRef.current.camLookAt.lerp(targetCoord, delta * 5.2);
        camera.lookAt(stateRef.current.camLookAt);

        if (p >= 0.98) {
          stateRef.current.isFlying = false;
          stateRef.current.orbitTarget.copy(targetCoord);
          stateRef.current.orbitAngles.radius = 11;
          soundEngine.playTargetLock();
        }
      } else {
        // Slow ambient orbit only when idle
        if (!stateRef.current.isMouseDown && dragModeRef.current === 'orbit') {
          stateRef.current.orbitAngles.theta += delta * 0.1;
        }

        const { theta, phi, radius } = stateRef.current.orbitAngles;
        const targetPos = stateRef.current.orbitTarget;

        const cx = targetPos.x + radius * Math.sin(phi) * Math.sin(theta);
        const cy = targetPos.y + radius * Math.cos(phi);
        const cz = targetPos.z + radius * Math.sin(phi) * Math.cos(theta);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, cy, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, 5, delta);

        stateRef.current.camLookAt.x = THREE.MathUtils.damp(stateRef.current.camLookAt.x, targetPos.x, 6, delta);
        stateRef.current.camLookAt.y = THREE.MathUtils.damp(stateRef.current.camLookAt.y, targetPos.y, 6, delta);
        stateRef.current.camLookAt.z = THREE.MathUtils.damp(stateRef.current.camLookAt.z, targetPos.z, 6, delta);

        camera.lookAt(stateRef.current.camLookAt);
      }

      renderer.render(scene, camera);
    };

    renderer.compile(scene, camera);
    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      orbHaloTexture.dispose();
      badgeTextures.forEach((tex) => tex.dispose());
      dustGeo.dispose();
      dustMat.dispose();
      orbGeometry.dispose();
      orbMaterial.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      ringGeometry.dispose();
      conduitGeo.dispose();
      conduitMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      renderer.dispose();
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    };
  }, []);

  const isOrbitActive = isCtrlHeld || dragMode === 'orbit';

  return (
    <div
      className={`relative w-full h-full select-none ${
        isOrbitActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Futuristic Glassy Viewport Corners */}
      <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#71b9ff]/60 pointer-events-none z-10" />
      <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#71b9ff]/60 pointer-events-none z-10" />
      <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#71b9ff]/60 pointer-events-none z-10" />
      <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#71b9ff]/60 pointer-events-none z-10" />

      {/* Top Glass Telemetry Badges */}
      <div className="absolute left-4 top-3.5 flex items-center gap-2 pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-full bg-[#0d1627]/85 border border-white/10 text-[#71b9ff] font-mono text-[10px] tracking-[0.14em] uppercase shadow-[0_0_15px_rgba(113,185,255,0.15)] flex items-center gap-1.5 backdrop-blur-md">
          <Sparkles className="w-3 h-3 text-[#71b9ff]" />
          3D Glass Orbs Swirl
        </span>
      </div>

      <div className="absolute right-4 top-3.5 text-right pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-full bg-[#0d1627]/85 border border-white/10 text-[#8bbff0] font-mono text-[10px] tracking-wide shadow-md backdrop-blur-md">
          {matchResult
            ? `Found "${matchResult.query}" · F(${matchResult.n.toLocaleString()})`
            : `PREVIEW · ${activeQuery}`}
        </span>
      </div>

      {/* Glassy Floating Zoom & Navigation Tools */}
      <div className="absolute right-4 bottom-4 flex items-center gap-1.5 z-20 pointer-events-auto">
        {/* Mode Toggle Button: Move vs Orbit */}
        <button
          type="button"
          onClick={handleToggleDragMode}
          title={dragMode === 'move' ? 'Switch to Orbit Mode (Ctrl+Drag)' : 'Switch to Move Mode (Normal Drag)'}
          className={`h-8 px-2.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition shadow-lg backdrop-blur-md cursor-pointer active:scale-95 ${
            isOrbitActive
              ? 'bg-[#71b9ff]/20 border-[#71b9ff] text-[#71b9ff] shadow-[0_0_15px_rgba(113,185,255,0.3)]'
              : 'bg-[#0f1728]/85 border-white/10 text-[#8e96a5] hover:text-white hover:border-[#71b9ff]'
          }`}
        >
          {isOrbitActive ? (
            <>
              <Compass className="w-3.5 h-3.5 text-[#71b9ff]" />
              <span className="hidden sm:inline">Orbit</span>
            </>
          ) : (
            <>
              <Move className="w-3.5 h-3.5 text-[#8bbff0]" />
              <span className="hidden sm:inline">Move</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-xl bg-[#0f1728]/85 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition shadow-lg backdrop-blur-md cursor-pointer hover:shadow-[0_0_12px_rgba(113,185,255,0.25)] active:scale-95"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-xl bg-[#0f1728]/85 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition shadow-lg backdrop-blur-md cursor-pointer hover:shadow-[0_0_12px_rgba(113,185,255,0.25)] active:scale-95"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetOrbit}
          title="Reset View Position"
          className="w-8 h-8 rounded-xl bg-[#0f1728]/85 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition shadow-lg backdrop-blur-md cursor-pointer hover:shadow-[0_0_12px_rgba(113,185,255,0.25)] active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Status Caption */}
      <div className="absolute left-4 bottom-4 text-[#7d8fa6] font-mono text-[11px] tracking-wide pointer-events-none z-10 max-w-[65%] truncate flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[#9bd3ff]">
          {isOrbitActive ? 'Orbit active' : 'Move active'}
        </span>
        <span className="hidden sm:inline">Drag to move · Ctrl + Drag to orbit</span>
      </div>
    </div>
  );
};
