import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  generateSpiralData,
  buildSpiralSequenceAllocation,
  MAX_SPIRAL_ORBS,
  DIGIT_RULES,
  FibonacciMatchResult,
} from '../math/fibonacci';
import { ZoomIn, ZoomOut, RotateCcw, Sparkles, Move, Compass } from 'lucide-react';

interface FibonacciCanvasProps {
  matchResult: FibonacciMatchResult | null;
  activeQuery: string;
  onSequenceReady?: () => void;
}

// Pre-allocated math objects to guarantee ZERO GC allocations in render loop
const _vec3 = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();

const DEFAULT_ORBIT_ANGLES = { theta: 0.4, phi: 1.18, radius: 42 };

function computeFrontFacingCameraRadius(matchLen: number, aspect: number): number {
  const baseRadius = 10.5 + Math.max(1, matchLen) * 1.15;
  const aspectFactor = aspect < 1.2 ? Math.min(1.55, 1.15 / Math.max(0.55, aspect)) : 1.0;
  return Math.min(34, Math.max(11.5, baseRadius * aspectFactor));
}

export const FibonacciCanvas: React.FC<FibonacciCanvasProps> = ({
  matchResult,
  activeQuery,
  onSequenceReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<'move' | 'orbit'>('move');
  const [isCtrlHeld, setIsCtrlHeld] = useState(false);
  const dragModeRef = useRef<'move' | 'orbit'>('move');
  dragModeRef.current = dragMode;
  const isCtrlHeldRef = useRef(false);
  const onSequenceReadyRef = useRef(onSequenceReady);
  onSequenceReadyRef.current = onSequenceReady;

  const stateRef = useRef({
    matchResult,
    activeQuery,
    orbitAngles: { ...DEFAULT_ORBIT_ANGLES },
    orbitTarget: new THREE.Vector3(0, 0, 0),
    camLookAt: new THREE.Vector3(0, 0, 0),
    savedResultAngles: { ...DEFAULT_ORBIT_ANGLES },
    savedResultTarget: new THREE.Vector3(0, 0, 0),
    isMouseDown: false,
    prevMouseX: 0,
    prevMouseY: 0,
    pinchDist: 0,
    hasHighlight: false,
    shockwaveProgress: 1.0,
    needsSequenceRebuild: true,
    notifyReadyAfterRebuild: false,
    activeOrbCount: 1000,
    matchStartIdx: -1,
    matchLength: 0,
    windowOffsetInTerm: 0,
  });

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles.radius = Math.max(6, stateRef.current.orbitAngles.radius - 4.5);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles.radius = Math.min(125, stateRef.current.orbitAngles.radius + 5.5);
  };

  const handleResetOrbit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stateRef.current.hasHighlight && stateRef.current.matchResult) {
      stateRef.current.orbitAngles = { ...stateRef.current.savedResultAngles };
      stateRef.current.orbitTarget.copy(stateRef.current.savedResultTarget);
      stateRef.current.shockwaveProgress = 0;
    } else {
      stateRef.current.orbitAngles = { ...DEFAULT_ORBIT_ANGLES };
      stateRef.current.orbitTarget.set(0, 0, 0);
    }
  };

  const handleToggleDragMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = dragMode === 'move' ? 'orbit' : 'move';
    setDragMode(next);
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
    stateRef.current.needsSequenceRebuild = true;
    if (matchResult && matchResult.query) {
      stateRef.current.hasHighlight = true;
      stateRef.current.shockwaveProgress = 0;
      stateRef.current.notifyReadyAfterRebuild = true;
    } else {
      stateRef.current.hasHighlight = false;
      stateRef.current.notifyReadyAfterRebuild = false;
      stateRef.current.orbitAngles = { ...DEFAULT_ORBIT_ANGLES };
      stateRef.current.orbitTarget.set(0, 0, 0);
    }
  }, [matchResult]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 440;

    // --- 1. Scene & Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06080e, 0.0085);

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    container.appendChild(renderer.domElement);

    // --- 2. Studio Glass Environment Map ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envRoom = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(envRoom, 0.04).texture;
    pmremGenerator.dispose();

    // --- 3. Camera ---
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1200);
    camera.position.set(16, 16, 38);
    camera.lookAt(0, 0, 0);

    // --- 4. Studio Lighting Rig ---
    const hemiLight = new THREE.HemisphereLight(0x9ecbff, 0x080d18, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e5, 2.2);
    keyLight.position.set(35, 50, 35);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x71b9ff, 1.8);
    cyanRim.position.set(-35, -20, -35);
    scene.add(cyanRim);

    const sequencePointLight = new THREE.PointLight(0x71b9ff, 2.8, 38);
    sequencePointLight.visible = false;
    scene.add(sequencePointLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // --- 5. Procedural Digit Badge Textures ---
    const createMatchedDigitBadgeTexture = (digit: number, hexColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Crisp dark-glass badge background for high contrast
      ctx.fillStyle = 'rgba(7, 12, 22, 0.94)';
      ctx.beginPath();
      ctx.roundRect(12, 12, 104, 104, 24);
      ctx.fill();

      // Glowing border in digit's color
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = hexColor;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Inner bright rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Bold number in center
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 58px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;
      ctx.fillText(digit.toString(), 64, 66);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      return texture;
    };

    const badgeTextures = DIGIT_RULES.map((rule) =>
      createMatchedDigitBadgeTexture(rule.digit, rule.color)
    );

    // Subtle Halo Glow Texture
    const createHaloTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.32, 'rgba(113, 185, 255, 0.65)');
      grad.addColorStop(0.68, 'rgba(44, 131, 214, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const orbHaloTexture = createHaloTexture();

    // --- 6. Celestial Dust Background ---
    const dustCount = 650;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 200;
      dustPos[i + 1] = (Math.random() - 0.5) * 180;
      dustPos[i + 2] = (Math.random() - 0.5) * 200;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 1.0,
      color: 0x71b9ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // --- 7. Glass Orbs Spiral (InstancedMesh supporting up to 10,000 digits) ---
    const orbGeometry = new THREE.SphereGeometry(0.26, 18, 18);
    const orbMaterial = new THREE.MeshPhysicalMaterial({
      roughness: 0.15,
      metalness: 0.12,
      transmission: 0.45,
      thickness: 1.0,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.96,
    });

    const instancedMesh = new THREE.InstancedMesh(orbGeometry, orbMaterial, MAX_SPIRAL_ORBS);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.frustumCulled = false;
    scene.add(instancedMesh);

    // Pre-allocate full-capacity spiral line geometry (up to 10,000 points)
    const spiralLineBuffer = new Float32Array(MAX_SPIRAL_ORBS * 3);
    const lineGeo = new THREE.BufferGeometry();
    const linePosAttr = new THREE.BufferAttribute(spiralLineBuffer, 3);
    linePosAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', linePosAttr);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4a82b8,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
    });
    const spiralLine = new THREE.Line(lineGeo, lineMat);
    spiralLine.frustumCulled = false;
    scene.add(spiralLine);

    // --- 8. Highlighting Rig ---
    const highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    const maxBadges = 8;
    const badgeSprites: THREE.Sprite[] = [];
    const haloSprites: THREE.Sprite[] = [];
    const microRings: THREE.Mesh[] = [];

    const sharedRingGeometry = new THREE.RingGeometry(0.38, 0.46, 32);
    const sharedHaloMaterial = new THREE.SpriteMaterial({
      map: orbHaloTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let b = 0; b < maxBadges; b++) {
      const bMat = new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0.98,
        depthTest: false,
      });
      const bSprite = new THREE.Sprite(bMat);
      bSprite.scale.set(1.14, 1.14, 1.14);
      bSprite.renderOrder = 20;
      bSprite.visible = false;
      highlightGroup.add(bSprite);
      badgeSprites.push(bSprite);

      const hSprite = new THREE.Sprite(sharedHaloMaterial.clone());
      hSprite.scale.set(2.1, 2.1, 2.1);
      hSprite.visible = false;
      highlightGroup.add(hSprite);
      haloSprites.push(hSprite);

      const rMat = new THREE.MeshBasicMaterial({
        color: 0x71b9ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(sharedRingGeometry, rMat);
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
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
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

    // Current spiral buffer state
    let currentPositions: Float32Array = new Float32Array(0);
    let currentThetas: Float32Array = new Float32Array(0);
    let currentRadii: Float32Array = new Float32Array(0);
    let currentDigits = '';

    const rebuildSpiralForCurrentState = () => {
      const allocation = buildSpiralSequenceAllocation(
        stateRef.current.matchResult,
        MAX_SPIRAL_ORBS
      );
      currentDigits = allocation.digits;
      const count = currentDigits.length;
      const spiralData = generateSpiralData(
        count,
        allocation.matchStartIdx,
        allocation.matchLength
      );

      currentPositions = spiralData.positions;
      currentThetas = spiralData.thetas;
      currentRadii = spiralData.radii;

      stateRef.current.activeOrbCount = count;
      stateRef.current.matchStartIdx = allocation.matchStartIdx;
      stateRef.current.matchLength = allocation.matchLength;
      stateRef.current.windowOffsetInTerm = allocation.windowOffsetInTerm;

      const matchStart = allocation.matchStartIdx;
      const matchEnd = matchStart + allocation.matchLength;
      const hasMatch = matchStart >= 0 && allocation.matchLength > 0;

      // Update InstancedMesh orbs and spiral line vertices
      instancedMesh.count = count;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const ox = currentPositions[i3];
        const oy = currentPositions[i3 + 1];
        const oz = currentPositions[i3 + 2];

        spiralLineBuffer[i3] = ox;
        spiralLineBuffer[i3 + 1] = oy;
        spiralLineBuffer[i3 + 2] = oz;

        const digit = parseInt(currentDigits[i] || '0', 10) || 0;
        const rule = DIGIT_RULES[digit];

        const isMatchedOrb = hasMatch && i >= matchStart && i < matchEnd;
        const orbScale = isMatchedOrb ? 1.32 : 0.96;

        _vec3.set(ox, oy, oz);
        _scaleVec.set(orbScale, orbScale, orbScale);
        _matrix.compose(_vec3, _quat, _scaleVec);
        instancedMesh.setMatrixAt(i, _matrix);

        _color.setHex(rule.hex);
        if (hasMatch && !isMatchedOrb) {
          _color.multiplyScalar(0.75);
        }
        instancedMesh.setColorAt(i, _color);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }

      linePosAttr.needsUpdate = true;
      lineGeo.setDrawRange(0, count);

      // Update badges and compute front-facing viewpoint if a match is active
      if (hasMatch) {
        const trailLen = Math.min(maxBadges, allocation.matchLength);
        const conduitAttr = conduitLine.geometry.attributes.position as THREE.BufferAttribute;

        for (let b = 0; b < maxBadges; b++) {
          if (b < trailLen && matchStart + b < count) {
            const nodeIdx = matchStart + b;
            const n3 = nodeIdx * 3;
            const ox = currentPositions[n3];
            const oy = currentPositions[n3 + 1];
            const oz = currentPositions[n3 + 2];

            const digit = parseInt(currentDigits[nodeIdx] || '0', 10) || 0;
            const rule = DIGIT_RULES[digit];

            const bSprite = badgeSprites[b];
            bSprite.material.map = badgeTextures[digit];
            bSprite.material.needsUpdate = true;
            bSprite.position.set(ox, oy + 0.95, oz);
            bSprite.visible = true;

            const hSprite = haloSprites[b];
            hSprite.material.color.setHex(rule.hex);
            hSprite.position.set(ox, oy, oz);
            hSprite.visible = true;

            const ring = microRings[b];
            (ring.material as THREE.MeshBasicMaterial).color.setHex(rule.hex);
            ring.position.set(ox, oy, oz);
            ring.visible = true;

            conduitAttr.setXYZ(b, ox, oy, oz);
          } else {
            badgeSprites[b].visible = false;
            haloSprites[b].visible = false;
            microRings[b].visible = false;
            const lastValidIdx = Math.min(count - 1, matchStart + Math.max(0, trailLen - 1)) * 3;
            conduitAttr.setXYZ(
              b,
              currentPositions[lastValidIdx] || 0,
              currentPositions[lastValidIdx + 1] || 0,
              currentPositions[lastValidIdx + 2] || 0
            );
          }
        }
        conduitAttr.needsUpdate = true;
        conduitLine.visible = true;

        // Compute exact center of the matched trail for front-facing camera view
        const exactMidIdx = matchStart + (trailLen - 1) * 0.5;
        const idxLow = Math.max(0, Math.min(count - 1, Math.floor(exactMidIdx)));
        const idxHigh = Math.max(0, Math.min(count - 1, Math.ceil(exactMidIdx)));
        const frac = exactMidIdx - idxLow;

        const midTheta =
          currentThetas[idxLow] * (1 - frac) + currentThetas[idxHigh] * frac;
        const midRadius =
          currentRadii[idxLow] * (1 - frac) + currentRadii[idxHigh] * frac;
        const midY =
          currentPositions[idxLow * 3 + 1] * (1 - frac) +
          currentPositions[idxHigh * 3 + 1] * frac;

        const midX = Math.sin(midTheta) * midRadius;
        const midZ = Math.cos(midTheta) * midRadius;

        shockwaveRing.position.set(midX, midY, midZ);
        shockwaveRing.rotation.set(0, midTheta, 0);

        sequencePointLight.position.set(
          midX + Math.sin(midTheta) * 4,
          midY + 2.5,
          midZ + Math.cos(midTheta) * 4
        );
        sequencePointLight.visible = true;

        const currentAspect =
          (container.clientWidth || width) / Math.max(1, container.clientHeight || height);
        const frontRadius = computeFrontFacingCameraRadius(trailLen, currentAspect);

        const targetVec = new THREE.Vector3(midX, midY + 0.35, midZ);
        const targetAngles = {
          theta: midTheta,
          phi: 1.48,
          radius: frontRadius,
        };

        stateRef.current.savedResultTarget.copy(targetVec);
        stateRef.current.savedResultAngles = { ...targetAngles };
        stateRef.current.orbitTarget.copy(targetVec);
        stateRef.current.orbitAngles = { ...targetAngles };
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
    };

    rebuildSpiralForCurrentState();
    stateRef.current.needsSequenceRebuild = false;

    // --- 9. Interaction Handlers ---
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      stateRef.current.isMouseDown = true;
      stateRef.current.prevMouseX = e.clientX;
      stateRef.current.prevMouseY = e.clientY;
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
        stateRef.current.orbitAngles.theta -= deltaX * 0.007;
        stateRef.current.orbitAngles.phi = Math.max(
          0.15,
          Math.min(Math.PI - 0.15, stateRef.current.orbitAngles.phi - deltaY * 0.007)
        );
      } else {
        _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

        const panFactor =
          (stateRef.current.orbitAngles.radius /
            Math.max(container.clientWidth || width, container.clientHeight || height)) *
          1.4;
        stateRef.current.orbitTarget.addScaledVector(_camRight, -deltaX * panFactor);
        stateRef.current.orbitTarget.addScaledVector(_camUp, deltaY * panFactor);
      }
    };

    const onMouseUp = () => {
      stateRef.current.isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || stateRef.current.hasHighlight) {
        e.preventDefault();
        stateRef.current.orbitAngles.radius = Math.max(
          6,
          Math.min(125, stateRef.current.orbitAngles.radius + e.deltaY * 0.03)
        );
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        stateRef.current.prevMouseX = e.touches[0].clientX;
        stateRef.current.prevMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        stateRef.current.pinchDist = Math.hypot(dx, dy);
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
          const panFactor =
            (stateRef.current.orbitAngles.radius /
              Math.max(container.clientWidth || width, container.clientHeight || height)) *
            1.4;
          stateRef.current.orbitTarget.addScaledVector(_camRight, -deltaX * panFactor);
          stateRef.current.orbitTarget.addScaledVector(_camUp, deltaY * panFactor);
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (stateRef.current.pinchDist > 0) {
          const diff = stateRef.current.pinchDist - dist;
          stateRef.current.orbitAngles.radius = Math.max(
            6,
            Math.min(125, stateRef.current.orbitAngles.radius + diff * 0.08)
          );
        }
        stateRef.current.pinchDist = dist;
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const dom = renderer.domElement;
    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // --- 10. Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      let fireReadyCallback = false;
      if (stateRef.current.needsSequenceRebuild) {
        rebuildSpiralForCurrentState();
        stateRef.current.needsSequenceRebuild = false;
        if (stateRef.current.notifyReadyAfterRebuild) {
          stateRef.current.notifyReadyAfterRebuild = false;
          fireReadyCallback = true;
        }
      }

      const hasHighlight = stateRef.current.hasHighlight;
      dustParticles.rotation.y = time * 0.012;

      if (hasHighlight) {
        const trailLen = Math.min(maxBadges, stateRef.current.matchLength);
        const matchStart = stateRef.current.matchStartIdx;
        const count = stateRef.current.activeOrbCount;

        for (let b = 0; b < trailLen; b++) {
          const nodeIdx = matchStart + b;
          if (nodeIdx >= 0 && nodeIdx < count) {
            const ring = microRings[b];
            ring.rotation.z = time * 1.4 + b * 0.5;
            ring.rotation.y = currentThetas[nodeIdx] || 0;
          }
        }

        if (stateRef.current.shockwaveProgress < 1.0) {
          stateRef.current.shockwaveProgress += delta * 1.6;
          const sp = stateRef.current.shockwaveProgress;
          const sScale = 1 + sp * 9;
          shockwaveRing.scale.set(sScale, sScale, sScale);
          shockwaveMat.opacity = Math.max(0, (1 - sp) * 0.75);
          shockwaveRing.visible = true;
        } else {
          shockwaveRing.visible = false;
        }
      } else {
        // Gentle ambient rotation only when no search result is locked in view
        if (!stateRef.current.isMouseDown) {
          stateRef.current.orbitAngles.theta += delta * 0.08;
        }
      }

      // Smooth exponential damping toward target camera state
      const { theta, phi, radius } = stateRef.current.orbitAngles;
      const targetPos = stateRef.current.orbitTarget;

      const cx = targetPos.x + radius * Math.sin(phi) * Math.sin(theta);
      const cy = targetPos.y + radius * Math.cos(phi);
      const cz = targetPos.z + radius * Math.sin(phi) * Math.cos(theta);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 6.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, cy, 6.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, 6.5, delta);

      stateRef.current.camLookAt.x = THREE.MathUtils.damp(
        stateRef.current.camLookAt.x,
        targetPos.x,
        7.5,
        delta
      );
      stateRef.current.camLookAt.y = THREE.MathUtils.damp(
        stateRef.current.camLookAt.y,
        targetPos.y,
        7.5,
        delta
      );
      stateRef.current.camLookAt.z = THREE.MathUtils.damp(
        stateRef.current.camLookAt.z,
        targetPos.z,
        7.5,
        delta
      );

      camera.lookAt(stateRef.current.camLookAt);
      renderer.render(scene, camera);

      if (fireReadyCallback) {
        onSequenceReadyRef.current?.();
      }
    };

    renderer.compile(scene, camera);
    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      orbHaloTexture.dispose();
      badgeTextures.forEach((tex) => tex.dispose());
      badgeSprites.forEach((s) => s.material.dispose());
      haloSprites.forEach((s) => s.material.dispose());
      microRings.forEach((r) => (r.material as THREE.Material).dispose());
      if (scene.environment) {
        scene.environment.dispose();
      }
      envRoom.dispose();

      dustGeo.dispose();
      dustMat.dispose();
      orbGeometry.dispose();
      orbMaterial.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      sharedRingGeometry.dispose();
      sharedHaloMaterial.dispose();
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
        <span className="px-2.5 py-1 rounded-full bg-[#0d1627]/90 border border-white/10 text-[#71b9ff] font-mono text-[10px] tracking-[0.14em] uppercase shadow-[0_0_15px_rgba(113,185,255,0.15)] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#71b9ff]" />
          3D Glass Orbs Swirl
        </span>
      </div>

      <div className="absolute right-4 top-3.5 text-right pointer-events-none z-10 max-w-[62%]">
        <span className="px-2.5 py-1 rounded-full bg-[#0d1627]/90 border border-white/10 text-[#8bbff0] font-mono text-[10px] tracking-wide shadow-md inline-block truncate max-w-full">
          {matchResult
            ? `Found "${matchResult.query}" · F(${matchResult.n.toLocaleString()}) · Pos #${matchResult.pos.toLocaleString()}`
            : activeQuery
            ? `PREVIEW · ${activeQuery}`
            : 'READY · UP TO 10,000 DIGITS'}
        </span>
      </div>

      {/* Glassy Floating Zoom & Navigation Tools */}
      <div className="absolute right-4 bottom-4 flex items-center gap-1.5 z-20 pointer-events-auto">
        {/* Mode Toggle Button: Move vs Orbit */}
        <button
          type="button"
          onClick={handleToggleDragMode}
          title={
            dragMode === 'move'
              ? 'Switch to Orbit Mode (Ctrl+Drag)'
              : 'Switch to Move Mode (Normal Drag)'
          }
          className={`h-8 px-2.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition shadow-lg cursor-pointer active:scale-95 ${
            isOrbitActive
              ? 'bg-[#71b9ff]/20 border-[#71b9ff] text-[#71b9ff] shadow-[0_0_15px_rgba(113,185,255,0.3)]'
              : 'bg-[#0f1728]/90 border-white/10 text-[#8e96a5] hover:text-white hover:border-[#71b9ff]'
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
          aria-label="Zoom In"
          className="w-8 h-8 rounded-xl bg-[#0f1728]/90 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition shadow-lg cursor-pointer hover:shadow-[0_0_12px_rgba(113,185,255,0.25)] active:scale-95"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="w-8 h-8 rounded-xl bg-[#0f1728]/90 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition shadow-lg cursor-pointer hover:shadow-[0_0_12px_rgba(113,185,255,0.25)] active:scale-95"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetOrbit}
          title="Reset View Position"
          aria-label="Reset View Position"
          className="w-8 h-8 rounded-xl bg-[#0f1728]/90 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition shadow-lg cursor-pointer hover:shadow-[0_0_12px_rgba(113,185,255,0.25)] active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Status Caption */}
      <div className="absolute left-4 bottom-4 text-[#7d8fa6] font-mono text-[11px] tracking-wide pointer-events-none z-10 max-w-[65%] truncate flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-[#0d1627]/90 border border-white/10 text-[#9bd3ff]">
          {isOrbitActive ? 'Orbit active' : 'Move active'}
        </span>
        <span className="hidden sm:inline">
          Drag to move · Ctrl + Drag to orbit
        </span>
      </div>
    </div>
  );
};
