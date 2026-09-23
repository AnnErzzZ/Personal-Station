// Adapted from React Bits Lanyard (TypeScript + CSS): https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/Lanyard
'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Html, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
  type RigidBodyProps
} from '@react-three/rapier';
import * as THREE from 'three';
import { siteAsset } from '@/lib/site-asset';

// replace with your own imports, see the usage snippet for details
const cardGLB = siteAsset('/lanyard/card.glb');
const lanyard = siteAsset('/lanyard/lanyard.png');

import styles from './Lanyard.module.css';

// 1x1 transparent pixel — lets useTexture be called unconditionally when a
// front/back image isn't supplied.
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas and the back face to the RIGHT half (measured from card.glb). Each
// custom image is composited into its own half so the two faces render
// independently, aspect-preserving (no stretching).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };
const BAND_SEGMENTS = 24;
const ATLAS_SCALE = 1.5;

export async function preloadLanyardAssets() {
  useGLTF.preload(cardGLB);
  useTexture.preload(lanyard);
  useTexture.preload(siteAsset('/lanyard/contact-front.svg'));
  useTexture.preload(siteAsset('/lanyard/contact-back.svg'));
  // Physics normally starts loading only when the canvas mounts. Prepare its
  // WASM while the page is idle so the first click can drop the badge promptly.
  const rapier = await import('@dimforge/rapier3d-compat');
  await rapier.init();
}

// R3F disposes a canvas 500 ms after unmount. React Strict Mode's development
// remount can reuse that same canvas before the old disposal fires, losing the
// new WebGL context. Keep the canvas in its own non-Strict React root.
function StableCanvas(props: ComponentProps<typeof Canvas>) {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<Root | null>(null);
  const latest = useRef<ReactNode>(null);
  const element = <Canvas {...props} />;

  useEffect(() => {
    latest.current = element;
    root.current?.render(element);
  });

  useEffect(() => {
    // The first Strict Mode effect pass is cleaned up before this timer runs.
    const timer = window.setTimeout(() => {
      if (!host.current?.isConnected) return;
      root.current = createRoot(host.current);
      root.current.render(latest.current);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      root.current?.unmount();
      root.current = null;
    };
  }, []);

  return <div ref={host} className={styles.wrapper} />;
}

interface LanyardProps {
  phase?: 'waiting' | 'entering' | 'open' | 'exiting';
  position?: [number, number, number];
  mobilePosition?: [number, number, number] | null;
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  onPointerMissed?: () => void;
  onRequestClose?: () => void;
  onCopyContact?: (kind: 'email' | 'phone') => void;
  onReady?: () => void;
}

export default function Lanyard({
  phase = 'open',
  position = [0, 0, 30],
  mobilePosition = null,
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  onPointerMissed,
  onRequestClose,
  onCopyContact,
  onReady
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [contextLost, setContextLost] = useState(false);
  const sceneReady = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const observedCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleResize = (): void => setIsMobile(window.innerWidth < 768);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (): void => setReducedMotion(motionQuery.matches);
    window.addEventListener('resize', handleResize);
    motionQuery.addEventListener('change', handleMotionChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      motionQuery.removeEventListener('change', handleMotionChange);
      clearTimeout(readyTimer.current);
    };
  }, []);

  if (contextLost) {
    return (
      <FallbackBadge onRequestClose={onRequestClose} onCopyContact={onCopyContact} onReady={onReady} />
    );
  }

  return (
    <div className={styles.wrapper}>
      <StableCanvas
        camera={{ position: isMobile && mobilePosition ? mobilePosition : position, fov }}
        dpr={[1.5, 2]}
        frameloop={phase === 'waiting' ? 'demand' : 'always'}
        gl={{ alpha: transparent }}
        onPointerMissed={onPointerMissed}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1);
          const scheduleReady = () => {
            clearTimeout(readyTimer.current);
            readyTimer.current = setTimeout(function checkReady() {
              if (!gl.domElement.isConnected) return;
              if (sceneReady.current) onReady?.();
              else readyTimer.current = setTimeout(checkReady, 50);
            }, 0);
          };
          scheduleReady();
          if (observedCanvas.current === gl.domElement) return;
          observedCanvas.current = gl.domElement;
          let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
          gl.domElement.addEventListener("webglcontextlost", event => {
            event.preventDefault();
            clearTimeout(readyTimer.current);
            // Next dev can dispose an old canvas during remount. Only replace a
            // still-mounted canvas if its context has not come back shortly.
            fallbackTimer = setTimeout(() => {
              if (gl.domElement.isConnected) setContextLost(true);
            }, 450);
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            clearTimeout(fallbackTimer);
            scheduleReady();
          });
        }}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} paused={phase === 'waiting' || reducedMotion} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            phase={phase}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            frontImage={frontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
            onCopyContact={onCopyContact}
            onSceneReady={() => { sceneReady.current = true; }}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </StableCanvas>
    </div>
  );
}

interface BandProps {
  phase: NonNullable<LanyardProps['phase']>;
  maxSpeed?: number;
  minSpeed?: number;
  isMobile?: boolean;
  reducedMotion?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  onCopyContact?: (kind: 'email' | 'phone') => void;
  onSceneReady?: () => void;
}

type LanyardRigidBody = RapierRigidBody & {
  lerped?: THREE.Vector3;
};

function Band({
  phase,
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  reducedMotion = false,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  onCopyContact,
  onSceneReady
}: BandProps) {
  const readySent = useRef(false);
  const bandGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((BAND_SEGMENTS + 1) * 2 * 3);
    const uvs = new Float32Array((BAND_SEGMENTS + 1) * 2 * 2);
    const indices: number[] = [];
    for (let i = 0; i <= BAND_SEGMENTS; i += 1) {
      const u = (i / BAND_SEGMENTS) * 4;
      uvs.set([u, 0, u, 1], i * 4);
      if (i < BAND_SEGMENTS) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  }, []);
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<LanyardRigidBody>(null!);
  const j2 = useRef<LanyardRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: RigidBodyProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4
  };

  const getLerped = (body: LanyardRigidBody): THREE.Vector3 => {
    if (!body.lerped) {
      body.lerped = new THREE.Vector3().copy(body.translation());
    }

    return body.lerped;
  };

  const { nodes, materials } = useGLTF(cardGLB) as unknown as {
    nodes: Record<"card" | "clip" | "clamp", THREE.Mesh>;
    materials: { base: THREE.MeshStandardMaterial; metal: THREE.Material };
  };
  const texture = useTexture(lanyardImage || lanyard);
  // useTexture must be called unconditionally; use a blank pixel when an image
  // isn't supplied for a given face, then skip compositing it below.
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);

  // Composite the front/back images into the card's texture atlas (front = left
  // half, back = right half). Each image is drawn aspect-preserving (no stretch).
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map as THREE.Texture;
    if (!frontImage && !backImage) return baseMap;

    const baseImg = baseMap.image as HTMLImageElement;
    const W = Math.round(baseImg.width * ATLAS_SCALE);
    const H = Math.round(baseImg.height * ATLAS_SCALE);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    // Keep the original baked atlas for the card edges and any untouched face.
    ctx.drawImage(baseImg, 0, 0, W, H);

    const drawFitted = (img: HTMLImageElement, rect: typeof FRONT_UV_RECT) => {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + (rh - dh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    };

    if (frontImage && frontTex.image) drawFitted(frontTex.image as HTMLImageElement, FRONT_UV_RECT);
    if (backImage && backTex.image) drawFitted(backTex.image as HTMLImageElement, BACK_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);
  const [curve] = useState(() => {
    const value = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
    value.curveType = 'chordal';
    return value;
  });
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);
  const [copyHovered, setCopyHovered] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0]
  ]);

  useLayoutEffect(() => {
    if ((phase !== 'waiting' && phase !== 'entering') || !readySent.current) return;
    const startX = isMobile ? 0.15 : 0.5;
    const bodies = [
      [j1, startX], [j2, startX * 2], [j3, startX * 3], [card, startX * 4]
    ] as const;
    for (const [ref, x] of bodies) {
      if (!ref.current) continue;
      ref.current.setTranslation({ x, y: 4, z: 0 }, true);
      ref.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      if ('lerped' in ref.current) ref.current.lerped = undefined;
    }
  }, [phase, isMobile]);

  useEffect(() => {
    if (hovered || copyHovered) {
      document.body.style.cursor = copyHovered ? 'copy' : dragged ? 'grabbing' : 'grab';
      return () => {
        document.body.style.cursor = 'auto';
      };
    }
  }, [hovered, dragged, copyHovered]);

  useFrame((state, delta) => {
    if (!readySent.current && fixed.current && card.current) {
      readySent.current = true;
      onSceneReady?.();
    }
    if (dragged && typeof dragged !== 'boolean') {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z
      });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        const lerped = getLerped(ref.current);
        const clampedDistance = Math.max(0.1, Math.min(1, lerped.distanceTo(ref.current.translation())));
        // Slow frames must not turn lerp into extrapolation and fling the band off-screen.
        lerped.lerp(ref.current.translation(), Math.min(1, delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))));
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(getLerped(j2.current));
      curve.points[2].copy(getLerped(j1.current));
      curve.points[3].copy(fixed.current.translation());
      const points = curve.getPoints(BAND_SEGMENTS);
      const positions = bandGeometry.getAttribute('position') as THREE.BufferAttribute;
      const halfWidth = Math.max(0.01, lanyardWidth * 0.09);
      for (let i = 0; i < points.length; i += 1) {
        const previous = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const dx = next.x - previous.x;
        const dy = next.y - previous.y;
        const length = Math.hypot(dx, dy) || 1;
        const x = (-dy / length) * halfWidth;
        const y = (dx / length) * halfWidth;
        positions.setXYZ(i * 2, points[i].x + x, points[i].y + y, points[i].z);
        positions.setXYZ(i * 2 + 1, points[i].x - x, points[i].y - y, points[i].z);
      }
      positions.needsUpdate = true;
      bandGeometry.computeBoundingSphere();
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
    }
  });

  const bandTexture = useMemo(() => {
    const value = texture.clone();
    value.wrapS = value.wrapT = THREE.RepeatWrapping;
    value.needsUpdate = true;
    return value;
  }, [texture]);

  useEffect(() => () => bandTexture.dispose(), [bandTexture]);

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={reducedMotion ? [0, -1, 0] : [isMobile ? 0.15 : 0.5, 0, 0]} ref={j1} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={reducedMotion ? [0, -2, 0] : [isMobile ? 0.3 : 1, 0, 0]} ref={j2} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={reducedMotion ? [0, -3, 0] : [isMobile ? 0.45 : 1.5, 0, 0]} ref={j3} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={reducedMotion ? [0, -4.45, 0] : [isMobile ? 0.6 : 2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
            {([['email', 0.225], ['phone', 0.115]] as const).flatMap(([kind, y]) =>
              [0.06, -0.06].map(z => (
                <mesh
                  key={`${kind}-${z}`}
                  position={[0, y, z]}
                  onPointerOver={event => { event.stopPropagation(); hover(false); setCopyHovered(true); }}
                  onPointerOut={event => { event.stopPropagation(); setCopyHovered(false); }}
                  onPointerDown={event => event.stopPropagation()}
                  onPointerUp={event => event.stopPropagation()}
                  onClick={event => { event.stopPropagation(); onCopyContact?.(kind); }}
                >
                  <planeGeometry args={[0.65, 0.1]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              ))
            )}
            <Html position={[0, 0, 0.08]} center style={{ pointerEvents: 'none' }}>
              <span data-lanyard-card-marker style={{ display: 'block', width: 1, height: 1, opacity: 0 }} />
            </Html>
          </group>
        </RigidBody>
      </group>
      <mesh geometry={bandGeometry}>
        <meshBasicMaterial map={bandTexture} side={THREE.DoubleSide} transparent depthTest={false} />
      </mesh>
    </>
  );
}

function FallbackBadge({ onRequestClose, onCopyContact, onReady }: Pick<LanyardProps, 'onRequestClose' | 'onCopyContact' | 'onReady'>) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <div className={styles.fallback} onClick={event => {
      if (event.target === event.currentTarget) onRequestClose?.();
    }}>
      <div
        className={styles.fallbackHanger}
        data-dragging={dragging}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div className={styles.fallbackCord} aria-hidden="true" />
        <div
          className={styles.fallbackCard}
          onPointerDown={event => {
            if ((event.target as HTMLElement).closest('a, button')) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragOrigin.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
            setDragging(true);
          }}
          onPointerMove={event => {
            if (!dragging) return;
            setOffset({
              x: dragOrigin.current.offsetX + event.clientX - dragOrigin.current.x,
              y: dragOrigin.current.offsetY + event.clientY - dragOrigin.current.y
            });
          }}
          onPointerUp={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(false);
            setOffset({ x: 0, y: 0 });
          }}
          onPointerCancel={() => {
            setDragging(false);
            setOffset({ x: 0, y: 0 });
          }}
        >
          <span className={styles.fallbackLabel}>ZR / CONTACT</span>
          <strong>伍子荣<br />Zirong Wu</strong>
          <span>Product · Design · AI</span>
          <div className={styles.fallbackContact}>
            <button type="button" onClick={() => onCopyContact?.('email')} title="点击复制邮箱">2462362144@qq.com</button>
            <button type="button" onClick={() => onCopyContact?.('phone')} title="点击复制手机号">13694246950</button>
          </div>
        </div>
      </div>
    </div>
  );
}
