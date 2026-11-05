import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  generateSpiralData,
  buildSpiralSequenceAllocation,
  MAX_SPIRAL_ORBS,
  SPIRAL_CURVE_SEGMENTS,
  DIGIT_RULES,
  PHI,
  INV_PHI,
  FibonacciMatchResult,
} from '../math/fibonacci';
import { ZoomIn, ZoomOut, RotateCcw, Move, Compass } from 'lucide-react';

interface FibonacciCanvasProps {
  matchResult: FibonacciMatchResult | null;
  activeQuery: string;
  onSequenceReady?: () => void;
}

// Pre-allocated math objects to guarantee ZERO GC allocations in the render loop
const _vec3 = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();

// Default camera framed to showcase the upward-rising Golden Ratio Tornado silhouette
const DEFAULT_ORBIT_ANGLES = { theta: 0.45, phi: 1.25, radius: 24.5 };

function computeFrontFacingCameraRadius(matchLen: number, aspect: number): number {
  const baseRadius = 7.8 + Math.max(1, matchLen) * (INV_PHI * 1.45);
  const aspectFactor = aspect < 1.2 ? Math.min(1.45, 1.12 / Math.max(0.55, aspect)) : 1.0;
  return Math.min(24, Math.max(8.8, baseRadius * aspectFactor));
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
    activeOrbCount: MAX_SPIRAL_ORBS,
    matchStartIdx: -1,
    matchLength: 0,
    termStartIdx: 0,
    termEndIdx: MAX_SPIRAL_ORBS,
    windowOffsetInTerm: 0,
  });

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles.radius = Math.max(4.5, stateRef.current.orbitAngles.radius - 3.2);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    stateRef.current.orbitAngles.radius = Math.min(75, stateRef.current.orbitAngles.radius + 4.0);
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
    const height = container.clientHeight || 460;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // --- 1. Scene & Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010308, 0.012);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    container.appendChild(renderer.domElement);

    // --- 2. Studio Glass Environment Map ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envRoom = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(envRoom, 0.04).texture;
    pmremGenerator.dispose();

    // --- 3. Camera ---
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 600);
    camera.position.set(10, 7.5, 22);
    camera.lookAt(0, 0, 0);

    // --- 4. Studio Lighting Rig ---
    const hemiLight = new THREE.HemisphereLight(0xb8dcff, 0x020610, 1.45);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xeef6ff, 2.15);
    keyLight.position.set(30, 44, 30);
    scene.add(keyLight);

    const azureRim = new THREE.DirectionalLight(0x4da3ff, 1.95);
    azureRim.position.set(-30, -16, -28);
    scene.add(azureRim);

    const sequencePointLight = new THREE.PointLight(0x6cb6ff, 3.2, 32);
    sequencePointLight.visible = false;
    scene.add(sequencePointLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // --- 5. Procedural Circular In-Orb Digit Texture (Integrated Inside Each Matched Glass Orb) ---
    const createInOrbDigitTexture = (digit: number, hexColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const cx = 128;
      const cy = 128;
      const radius = 96;

      // Deep sapphire-obsidian glass core with specular rim
      const coreGrad = ctx.createRadialGradient(cx - 24, cy - 26, 8, cx, cy, radius);
      coreGrad.addColorStop(0.0, 'rgba(18, 42, 82, 0.90)');
      coreGrad.addColorStop(0.62, 'rgba(4, 10, 22, 0.94)');
      coreGrad.addColorStop(0.92, 'rgba(12, 30, 62, 0.88)');
      coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Luminous electric-azure circular ring matching the orb's refractive tone
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 6.5;
      ctx.shadowColor = '#4da3ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle inner ice-blue glass highlight arc
      ctx.strokeStyle = 'rgba(216, 236, 255, 0.68)';
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 14, -Math.PI * 0.78, -Math.PI * 0.18);
      ctx.stroke();

      // Crisp centered numeral inside the orb
      ctx.fillStyle = '#f4f7fb';
      ctx.font = 'bold 112px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(77, 163, 255, 0.92)';
      ctx.shadowBlur = 14;
      ctx.fillText(digit.toString(), cx, cy + 4);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      return texture;
    };

    const badgeTextures = DIGIT_RULES.map((rule) =>
      createInOrbDigitTexture(rule.digit, rule.color)
    );

    // Concentric Saturn-like Planetary Ring Texture
    const createSaturnRingTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const cx = 128;
      const cy = 128;

      const grad = ctx.createRadialGradient(cx, cy, 56, cx, cy, 126);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(0.08, 'rgba(244, 247, 251, 0.96)');
      grad.addColorStop(0.24, 'rgba(184, 220, 255, 0.88)');
      grad.addColorStop(0.42, 'rgba(77, 163, 255, 0.48)');
      grad.addColorStop(0.52, 'rgba(8, 20, 44, 0.12)');
      grad.addColorStop(0.60, 'rgba(232, 244, 255, 0.92)');
      grad.addColorStop(0.78, 'rgba(108, 182, 255, 0.75)');
      grad.addColorStop(0.92, 'rgba(77, 163, 255, 0.42)');
      grad.addColorStop(1.0, 'rgba(77, 163, 255, 0.0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      return texture;
    };
    const saturnRingTexture = createSaturnRingTexture();

    // Subtle Halo Glow Texture
    const createHaloTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(244, 247, 251, 0.88)');
      grad.addColorStop(0.32, 'rgba(108, 182, 255, 0.68)');
      grad.addColorStop(0.68, 'rgba(29, 92, 180, 0.22)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const orbHaloTexture = createHaloTexture();

    // --- 6. Celestial Dust Background ---
    const dustCount = 320;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 110;
      dustPos[i + 1] = (Math.random() - 0.5) * 90;
      dustPos[i + 2] = (Math.random() - 0.5) * 110;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.75,
      color: 0x6cb6ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // --- 7. Glass Orbs Golden Ratio Tornado (Optimized for Maximum 100 Orbs) ---
    const orbSegments = isSoftwareGl ? 18 : 28;
    const orbGeometry = new THREE.SphereGeometry(0.32, orbSegments, orbSegments);
    const orbMaterial = new THREE.MeshPhysicalMaterial({
      roughness: 0.12,
      metalness: 0.14,
      transmission: isSoftwareGl ? 0 : 0.52,
      thickness: 1.15,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: isSoftwareGl ? 0.88 : 0.96,
    });

    const instancedMesh = new THREE.InstancedMesh(orbGeometry, orbMaterial, MAX_SPIRAL_ORBS);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.frustumCulled = false;
    scene.add(instancedMesh);

    // Pre-allocate smooth high-resolution curve buffer for the continuous Golden Ratio Tornado thread
    const maxCurveVertices = SPIRAL_CURVE_SEGMENTS + 1;
    const spiralLineBuffer = new Float32Array(maxCurveVertices * 3);
    const lineGeo = new THREE.BufferGeometry();
    const linePosAttr = new THREE.BufferAttribute(spiralLineBuffer, 3);
    linePosAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', linePosAttr);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4da3ff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    });
    const spiralLine = new THREE.Line(lineGeo, lineMat);
    spiralLine.frustumCulled = false;
    scene.add(spiralLine);

    // --- 8. Highlighting Rig (In-Orb Digits + Saturn Planetary Rings + Halos) ---
    const highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    const maxBadges = 8;
    const badgeSprites: THREE.Sprite[] = [];
    const haloSprites: THREE.Sprite[] = [];
    const microRings: THREE.Mesh[] = [];

    const sharedRingGeometry = new THREE.RingGeometry(0.56, 1.02, 64);
    const sharedHaloMaterial = new THREE.SpriteMaterial({
      map: orbHaloTexture,
      transparent: true,
      opacity: 0.78,
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
      bSprite.scale.set(1.04, 1.04, 1.04);
      bSprite.renderOrder = 20;
      bSprite.visible = false;
      highlightGroup.add(bSprite);
      badgeSprites.push(bSprite);

      const hSprite = new THREE.Sprite(sharedHaloMaterial.clone());
      hSprite.scale.set(2.6, 2.6, 2.6);
      hSprite.visible = false;
      highlightGroup.add(hSprite);
      haloSprites.push(hSprite);

      const rMat = new THREE.MeshBasicMaterial({
        map: saturnRingTexture,
        color: 0xb8dcff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      });
      const ringMesh = new THREE.Mesh(sharedRingGeometry, rMat);
      ringMesh.rotation.order = 'YXZ';
      ringMesh.renderOrder = 22;
      ringMesh.visible = false;
      highlightGroup.add(ringMesh);
      microRings.push(ringMesh);
    }

    const conduitMaxPoints = 8;
    const conduitPositions = new Float32Array(conduitMaxPoints * 3);
    const conduitGeo = new THREE.BufferGeometry();
    conduitGeo.setAttribute('position', new THREE.BufferAttribute(conduitPositions, 3));
    const conduitMat = new THREE.LineBasicMaterial({
      color: 0x6cb6ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const conduitLine = new THREE.Line(conduitGeo, conduitMat);
    conduitLine.visible = false;
    highlightGroup.add(conduitLine);

    const shockwaveGeo = new THREE.RingGeometry(0.24, 0.54, 48);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x6cb6ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwaveRing = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveRing.visible = false;
    highlightGroup.add(shockwaveRing);

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
      const count = Math.min(MAX_SPIRAL_ORBS, currentDigits.length);
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
      stateRef.current.termStartIdx = allocation.termStartIdx;
      stateRef.current.termEndIdx = allocation.termEndIdx;
      stateRef.current.windowOffsetInTerm = allocation.windowOffsetInTerm;

      const matchStart = allocation.matchStartIdx;
      const matchEnd = matchStart + allocation.matchLength;
      const hasMatch = matchStart >= 0 && allocation.matchLength > 0;

      // Update the smooth parametric Golden Ratio Tornado thread
      const curvePts = Math.min(maxCurveVertices, spiralData.curvePointCount);
      spiralLineBuffer.set(spiralData.curvePositions.subarray(0, curvePts * 3));
      linePosAttr.needsUpdate = true;
      lineGeo.setDrawRange(0, curvePts);

      instancedMesh.count = count;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const ox = currentPositions[i3];
        const oy = currentPositions[i3 + 1];
        const oz = currentPositions[i3 + 2];

        const digit = parseInt(currentDigits[i] || '0', 10) || 0;
        const rule = DIGIT_RULES[digit];

        const isMatchedOrb = hasMatch && i >= matchStart && i < matchEnd;

        // Smooth golden-ratio scale progression from lower vortex tip to upper funnel crown
        const heightNorm = i / Math.max(1, count - 1);
        const baseTornadoScale = 0.78 + 0.30 * Math.pow(heightNorm, INV_PHI);
        const orbScale = isMatchedOrb ? 1.42 : baseTornadoScale;

        _vec3.set(ox, oy, oz);
        _scaleVec.set(orbScale, orbScale, orbScale);
        _matrix.compose(_vec3, _quat, _scaleVec);
        instancedMesh.setMatrixAt(i, _matrix);

        if (isMatchedOrb) {
          _color.setHex(0xb8dcff);
        } else {
          _color.setHex(rule.hex);
          if (hasMatch) {
            _color.multiplyScalar(0.65);
          }
        }
        instancedMesh.setColorAt(i, _color);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }

      // Update in-orb digits, Saturn rings, and front-facing camera viewpoint inside the tornado
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
            bSprite.position.set(ox, oy, oz);
            bSprite.visible = true;

            const hSprite = haloSprites[b];
            hSprite.material.color.setHex(0x6cb6ff);
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
        conduitLine.visible = trailLen > 1;

        // Compute exact center of the matched sequence along the tornado curve
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

        // Parametric tornado uses x = r*cos(theta), z = r*sin(theta)
        // In spherical camera coordinates (x = R*sin(phi)*sin(camTheta), z = R*sin(phi)*cos(camTheta)),
        // outward radial direction (cos(midTheta), sin(midTheta)) corresponds to camTheta = PI/2 - midTheta
        const midX = midRadius * Math.cos(midTheta);
        const midZ = midRadius * Math.sin(midTheta);
        const cameraFacingTheta = Math.PI * 0.5 - midTheta;

        shockwaveRing.position.set(midX, midY, midZ);
        shockwaveRing.rotation.set(0, cameraFacingTheta, 0);

        sequencePointLight.position.set(
          midX + Math.cos(midTheta) * 3.5,
          midY + 1.8,
          midZ + Math.sin(midTheta) * 3.5
        );
        sequencePointLight.visible = true;

        const currentAspect =
          (container.clientWidth || width) / Math.max(1, container.clientHeight || height);
        const frontRadius = computeFrontFacingCameraRadius(trailLen, currentAspect);

        const targetVec = new THREE.Vector3(midX, midY, midZ);
        const targetAngles = {
          theta: cameraFacingTheta,
          phi: 1.34,
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
          4.5,
          Math.min(75, stateRef.current.orbitAngles.radius + e.deltaY * 0.025)
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
            4.5,
            Math.min(75, stateRef.current.orbitAngles.radius + diff * 0.065)
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
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // --- 10. Animation Loop ---
    let animId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    const scheduleNextFrame = (cb: () => void) => {
      if (isDisposed) return;
      if (isSoftwareGl) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (isDisposed) return;
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              animId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              animId = window.setTimeout(cb, 80);
            }
          };
          animId = window.setTimeout(poll, 5);
          return;
        }
      }
      animId = requestAnimationFrame(cb);
    };

    const animate = () => {
      if (isDisposed) return;

      if (
        typeof document !== 'undefined' &&
        document.hidden &&
        !stateRef.current.needsSequenceRebuild
      ) {
        clock.getDelta();
        animId = requestAnimationFrame(animate);
        return;
      }

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
      if (!prefersReducedMotion) {
        dustParticles.rotation.y = time * 0.01;
      }

      if (hasHighlight) {
        const trailLen = Math.min(maxBadges, stateRef.current.matchLength);
        const matchStart = stateRef.current.matchStartIdx;
        const count = stateRef.current.activeOrbCount;

        for (let b = 0; b < trailLen; b++) {
          const nodeIdx = matchStart + b;
          if (nodeIdx >= 0 && nodeIdx < count) {
            const ring = microRings[b];
            const baseTheta = Math.PI * 0.5 - (currentThetas[nodeIdx] || 0);
            const motionScale = prefersReducedMotion ? 0 : 1;
            ring.rotation.y = baseTheta + Math.sin(time * 0.7 + b * 0.4) * 0.14 * motionScale;
            ring.rotation.x = 1.16 + Math.cos(time * 0.9 + b * 0.5) * 0.06 * motionScale;
            ring.rotation.z = 0.26 + Math.sin(time * 0.6 + b * 0.7) * 0.08 * motionScale;
          }
        }

        if (stateRef.current.shockwaveProgress < 1.0 && !prefersReducedMotion) {
          stateRef.current.shockwaveProgress += delta * PHI;
          const sp = stateRef.current.shockwaveProgress;
          const sScale = 1 + sp * 7.5;
          shockwaveRing.scale.set(sScale, sScale, sScale);
          shockwaveMat.opacity = Math.max(0, (1 - sp) * 0.72);
          shockwaveRing.visible = true;
        } else {
          shockwaveRing.visible = false;
        }
      } else {
        if (!stateRef.current.isMouseDown && !prefersReducedMotion) {
          stateRef.current.orbitAngles.theta += delta * 0.11;
        }
      }

      const { theta, phi, radius } = stateRef.current.orbitAngles;
      const targetPos = stateRef.current.orbitTarget;

      const cx = targetPos.x + radius * Math.sin(phi) * Math.sin(theta);
      const cy = targetPos.y + radius * Math.cos(phi);
      const cz = targetPos.z + radius * Math.sin(phi) * Math.cos(theta);

      const dampFactor = prefersReducedMotion ? 18.0 : 6.8;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, dampFactor, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, cy, dampFactor, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, dampFactor, delta);

      stateRef.current.camLookAt.x = THREE.MathUtils.damp(
        stateRef.current.camLookAt.x,
        targetPos.x,
        dampFactor + 1.0,
        delta
      );
      stateRef.current.camLookAt.y = THREE.MathUtils.damp(
        stateRef.current.camLookAt.y,
        targetPos.y,
        dampFactor + 1.0,
        delta
      );
      stateRef.current.camLookAt.z = THREE.MathUtils.damp(
        stateRef.current.camLookAt.z,
        targetPos.z,
        dampFactor + 1.0,
        delta
      );

      camera.lookAt(stateRef.current.camLookAt);
      renderer.render(scene, camera);

      if (fireReadyCallback) {
        onSequenceReadyRef.current?.();
      }

      scheduleNextFrame(animate);
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    animate();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      clearTimeout(animId);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      orbHaloTexture.dispose();
      saturnRingTexture.dispose();
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

      {/* Viewport Corner Accents */}
      <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#4da3ff]/55 pointer-events-none z-10" />
      <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#4da3ff]/55 pointer-events-none z-10" />
      <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#4da3ff]/55 pointer-events-none z-10" />
      <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#4da3ff]/55 pointer-events-none z-10" />

      {/* Floating Zoom & Navigation Tools */}
      <div className="absolute right-4 bottom-4 flex items-center gap-1.5 z-20 pointer-events-auto">
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
              ? 'bg-[#102544]/95 border-[#4da3ff] text-[#6cb6ff] shadow-[0_0_15px_rgba(77,163,255,0.3)]'
              : 'bg-[#050b16]/95 border-[#162742] text-[#8594a8] hover:text-[#f4f7fb] hover:border-[#4da3ff]'
          }`}
        >
          {isOrbitActive ? (
            <>
              <Compass className="w-3.5 h-3.5 text-[#4da3ff]" />
              <span className="hidden sm:inline">Orbit</span>
            </>
          ) : (
            <>
              <Move className="w-3.5 h-3.5 text-[#6cb6ff]" />
              <span className="hidden sm:inline">Move</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          className="w-8 h-8 rounded-xl bg-[#050b16]/95 border border-[#162742] hover:border-[#4da3ff] text-[#8594a8] hover:text-[#f4f7fb] flex items-center justify-center transition shadow-lg cursor-pointer hover:shadow-[0_0_12px_rgba(77,163,255,0.25)] active:scale-95"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="w-8 h-8 rounded-xl bg-[#050b16]/95 border border-[#162742] hover:border-[#4da3ff] text-[#8594a8] hover:text-[#f4f7fb] flex items-center justify-center transition shadow-lg cursor-pointer hover:shadow-[0_0_12px_rgba(77,163,255,0.25)] active:scale-95"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetOrbit}
          title="Reset View Position"
          aria-label="Reset View Position"
          className="w-8 h-8 rounded-xl bg-[#050b16]/95 border border-[#162742] hover:border-[#4da3ff] text-[#8594a8] hover:text-[#f4f7fb] flex items-center justify-center transition shadow-lg cursor-pointer hover:shadow-[0_0_12px_rgba(77,163,255,0.25)] active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Status Caption */}
      <div className="absolute left-4 bottom-4 text-[#68788e] font-mono text-[11px] tracking-wide pointer-events-none z-10 max-w-[65%] truncate flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-[#050b16]/95 border border-[#162742] text-[#8bc4ff]">
          {isOrbitActive ? 'Orbit active' : 'Move active'}
        </span>
        <span className="hidden sm:inline">
          Drag to move · Ctrl + Drag to orbit
        </span>
      </div>
    </div>
  );
};
