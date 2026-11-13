"use client";

// Adapted from Componentry Newsletter Bookshelf, retrieved 2026-10-17.
// https://componentry.dev/docs/components/newsletter-bookshelf
// Local experiment only; review upstream licensing before production use.
import Link from "next/link";
import Image from "@/components/SiteImage";
import { siteAsset } from "@/lib/site-asset";
import styles from "./project-bookshelf.module.css";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export interface NewsletterBookshelfItem {
  id: string;
  title: string;
  date: string;
  subtitle?: string;
  href?: string;
  color?: string;
  foil?: string;
  cover?: string;
  jacket?: string;
  positioning?: string;
  summary?: string;
  tags?: string[];
}

export interface NewsletterBookshelfProps {
  items?: NewsletterBookshelfItem[];
  className?: string;
  height?: number | string;
  brand?: string;
  onSelect?: (item: NewsletterBookshelfItem, index: number) => void;
  variant?: "standalone" | "home";
  active?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type BookLayout = NewsletterBookshelfItem & {
  volume: string;
  x: number;
  width: number;
  bookHeight: number;
  depth: number;
  motif: number;
  color: string;
  foil: string;
};

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function luminance(hex: string) {
  const color = Number.parseInt(hex.slice(1), 16);
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    channel((color >> 16) & 255) * 0.2126 +
    channel((color >> 8) & 255) * 0.7152 +
    channel(color & 255) * 0.0722
  );
}

function deriveLayout(items: NewsletterBookshelfItem[]) {
  let cursor = 0;
  return items.map<BookLayout>((item, index) => {
    const random = seeded(hash(item.id));
    const fallbackColor = "#183e35";
    const width = 0.52 + random() * 0.12;
    const bookHeight = 3.65 + (random() * 2 - 1) * 0.22;
    const color = item.color ?? fallbackColor;
    const foil =
      item.foil ?? (luminance(color) < 0.5 ? "#f2ead8" : "#3030ff");
    // Shelved books face forward together; perspective comes from the camera.
    const x = cursor + width / 2;
    cursor += width + 0.06;
    return {
      ...item,
      volume: String(index + 1).padStart(2, "0"),
      x,
      width,
      bookHeight,
      depth: bookHeight * 0.67,
      motif: Math.floor(random() * 8),
      color,
      foil,
    };
  });
}

function addTexture(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
) {
  const image = context.getImageData(0, 0, width, height);
  const random = seeded(seed);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const noise = (random() - 0.5) * 5;
    image.data[offset] = Math.max(0, Math.min(255, image.data[offset]! + noise));
    image.data[offset + 1] = Math.max(0, Math.min(255, image.data[offset + 1]! + noise));
    image.data[offset + 2] = Math.max(0, Math.min(255, image.data[offset + 2]! + noise));
  }
  context.putImageData(image, 0, 0);
}

/** Fine coated-paper grain, independent of the printed artwork. */
function bindingFinish(book: BookLayout) {
  const height = document.createElement("canvas");
  const roughness = document.createElement("canvas");
  height.width = roughness.width = 512;
  height.height = roughness.height = 768;
  const heightContext = height.getContext("2d");
  const roughContext = roughness.getContext("2d");
  if (!heightContext || !roughContext) return { grain: null, finish: null };
  const relief = heightContext.createImageData(512, 768);
  const matte = roughContext.createImageData(512, 768);
  const random = seeded(hash(`${book.id}-coated-paper`));
  for (let y = 0; y < 768; y++) {
    for (let x = 0; x < 512; x++) {
      const pixel = (y * 512 + x) * 4;
      const fibre = Math.sin(x * 0.81 + y * 0.13) * 1.8;
      const grain = 128 + (random() - 0.5) * 32 + fibre;
      const finish = 204 + (random() - 0.5) * 22;
      for (let channel = 0; channel < 3; channel++) {
        relief.data[pixel + channel] = grain;
        matte.data[pixel + channel] = finish;
      }
      relief.data[pixel + 3] = matte.data[pixel + 3] = 255;
    }
  }
  heightContext.putImageData(relief, 0, 0);
  roughContext.putImageData(matte, 0, 0);
  const grain = new THREE.CanvasTexture(height);
  const finish = new THREE.CanvasTexture(roughness);
  // Height and roughness contain linear data, rather than printed color.
  grain.colorSpace = finish.colorSpace = THREE.NoColorSpace;
  grain.anisotropy = finish.anisotropy = 8;
  return { grain, finish };
}

function paperTexture(book: BookLayout) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const random = seeded(hash(`${book.id}-paper`));

  context.fillStyle = "#ece8de";
  context.fillRect(0, 0, canvas.width, canvas.height);
  addTexture(context, canvas.width, canvas.height, hash(`${book.id}-paper-noise`));

  for (let y = 0.5; y < canvas.height; y += 2) {
    const warm = Math.floor(116 + random() * 35);
    context.strokeStyle = `rgba(${warm}, ${warm - 4}, ${warm - 10}, ${0.14 + random() * 0.13})`;
    context.lineWidth = random() > 0.94 ? 0.9 : 0.38;
    context.beginPath();
    context.moveTo((random() - 0.5) * 4, y);
    context.bezierCurveTo(
      canvas.width * 0.33,
      y + (random() - 0.5) * 0.8,
      canvas.width * 0.66,
      y + (random() - 0.5) * 0.8,
      canvas.width + (random() - 0.5) * 4,
      y,
    );
    context.stroke();
  }

  for (let x = 0.5; x < canvas.width; x += 4) {
    context.strokeStyle = `rgba(124, 103, 72, ${0.025 + random() * 0.04})`;
    context.lineWidth = 0.35;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + (random() - 0.5) * 1.5, canvas.height);
    context.stroke();
  }

  for (let index = 0; index < 170; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    context.fillStyle = `rgba(112, 91, 59, ${0.025 + random() * 0.055})`;
    context.fillRect(x, y, 0.5 + random() * 1.2, 0.5 + random() * 2.5);
  }

  const edgeShade = context.createLinearGradient(0, 0, canvas.width, 0);
  edgeShade.addColorStop(0, "rgba(96,72,42,.2)");
  edgeShade.addColorStop(0.08, "rgba(138,112,72,.035)");
  edgeShade.addColorStop(0.5, "rgba(255,255,255,.16)");
  edgeShade.addColorStop(0.92, "rgba(138,112,72,.035)");
  edgeShade.addColorStop(1, "rgba(96,72,42,.18)");
  context.fillStyle = edgeShade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** One continuous jacket atlas: back | spine | front.
 * All three visible jacket surfaces share the same canvas, color and finish.
 * Artwork feathers to the exact jacket color at its perimeter, so the curved
 * binding has no thumbnail boundary or change of background color.
 */
function jacketTextures(book: BookLayout, brand: string) {
  const faceWidth = 1024;
  const spineWidth = Math.round(faceWidth * book.width / book.depth);
  const height = 1536;
  const frontX = faceWidth + spineWidth;
  const canvas = document.createElement("canvas");
  canvas.width = faceWidth * 2 + spineWidth;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { cover: null, spine: null, back: null };
  context.fillStyle = book.color;
  context.fillRect(0, 0, canvas.width, height);

  // A shared series grid: volume at the head, large title, series and author.
  const spineCenter = faceWidth + spineWidth / 2;
  context.textAlign = "center";
  context.fillStyle = "#c7cdd5";
  context.font = "500 44px Arial, sans-serif";
  context.fillText(book.volume, spineCenter, 132);
  context.fillStyle = "#828b98";
  context.fillRect(faceWidth + 46, 180, spineWidth - 92, 2);
  context.fillStyle = "#eef0f3";
  context.save();
  context.textBaseline = "middle";
  context.font = '700 104px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  if (/[\u3400-\u9fff]/.test(book.title)) {
    context.textAlign = "center";
    const characters = Array.from(book.title);
    const advance = Math.min(124, 850 / characters.length);
    characters.forEach((character, index) => {
      context.fillText(character, spineCenter, 320 + index * advance);
    });
  } else {
    context.translate(spineCenter, 268);
    context.rotate(Math.PI / 2);
    context.textAlign = "left";
    context.fillText(book.title.toUpperCase(), 0, 0, 850);
  }
  context.restore();
  context.save();
  context.translate(spineCenter, 1200);
  context.rotate(Math.PI / 2);
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "#bac2cd";
  context.font = "500 24px Arial, sans-serif";
  context.fillText("SELECTED WORK", 0, 0);
  context.restore();
  context.fillStyle = "#c7cdd5";
  context.textAlign = "center";
  context.font = "600 40px Arial, sans-serif";
  context.fillText("ZW", spineCenter, height - 72);
  context.fillStyle = "#929aa6";
  context.font = "400 18px Arial, sans-serif";
  context.fillText(brand.toUpperCase(), faceWidth / 2, height - 100);

  const atlasTexture = new THREE.CanvasTexture(canvas);
  const view = (x: number, width: number) => {
    // Clones share the atlas source rather than uploading three full copies.
    const texture = atlasTexture.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.offset.set(x / canvas.width, 0);
    texture.repeat.set(width / canvas.width, 1);
    return texture;
  };
  const textures = {
    cover: view(frontX, faceWidth),
    spine: view(faceWidth, spineWidth),
    back: view(0, faceWidth),
  };
  if (book.jacket) {
    const image = new window.Image();
    image.onload = () => {
      context.drawImage(image, frontX, 0, faceWidth, height);
      // Lift the printed artwork's black point to the charcoal binding while
      // preserving white typography and device highlights.
      context.globalCompositeOperation = "screen";
      context.fillStyle = book.color;
      context.fillRect(frontX, 0, faceWidth, height);
      context.globalCompositeOperation = "source-over";
      // Converge all four artwork edges to the binding's exact solid color.
      // This also protects the seam when the source artwork has residual light.
      const edge = 48;
      const clear = `${book.color}00`;
      const feather = (x0: number, y0: number, x1: number, y1: number,
        x: number, y: number, width: number, h: number) => {
        const gradient = context.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, book.color);
        gradient.addColorStop(0.12, book.color);
        gradient.addColorStop(1, clear);
        context.fillStyle = gradient;
        context.fillRect(x, y, width, h);
      };
      feather(frontX, 0, frontX + edge, 0, frontX, 0, edge, height);
      feather(frontX + faceWidth, 0, frontX + faceWidth - edge, 0,
        frontX + faceWidth - edge, 0, edge, height);
      feather(0, 0, 0, edge, frontX, 0, faceWidth, edge);
      feather(0, height, 0, height - edge, frontX, height - edge, faceWidth, edge);
      Object.values(textures).forEach(texture => { texture.needsUpdate = true; });
    };
    image.src = siteAsset(book.jacket);
  }
  return textures;
}

function damp(current: number, target: number, speed: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
}

const BOOK_ENTER_DURATION = 520;
const BOOK_EXIT_DURATION = 400;

function bezierCoordinate(t: number, point1: number, point2: number) {
  const inverse = 1 - t;
  return (
    3 * inverse * inverse * t * point1 +
    3 * inverse * t * t * point2 +
    t * t * t
  );
}

function easeSmoothOut(progress: number) {
  let t = progress;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const x = bezierCoordinate(t, 0.22, 0.36);
    const inverse = 1 - t;
    const slope =
      3 * inverse * inverse * 0.22 +
      6 * inverse * t * (0.36 - 0.22) +
      3 * t * t * (1 - 0.36);
    if (Math.abs(slope) < 0.0001) break;
    t = THREE.MathUtils.clamp(t - (x - progress) / slope, 0, 1);
  }
  return bezierCoordinate(t, 1, 1);
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2;
}

/** Approximate light loss inside the slot between neighboring volumes.
 * The mask uses actual world-space insertion depth, so it follows the book
 * throughout extraction, rotation and return rather than fading its artwork.
 */
function applyShelfGapLight(
  shader: THREE.WebGLProgramParametersWithUniforms,
  strength: THREE.IUniform<number>,
  mouth: THREE.IUniform<number>,
) {
  shader.uniforms.uShelfGapStrength = strength;
  shader.uniforms.uShelfGapMouthZ = mouth;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vShelfWorldPosition;")
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvShelfWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      varying vec3 vShelfWorldPosition;
      uniform float uShelfGapStrength;
      uniform float uShelfGapMouthZ;`)
    .replace("#include <aomap_fragment>", `#include <aomap_fragment>
      float shelfInset = max(0.0, uShelfGapMouthZ - vShelfWorldPosition.z);
      float shelfLight = 0.055 + 0.945 * exp(-9.0 * shelfInset);
      float shelfVisibility = mix(1.0, shelfLight, uShelfGapStrength);
      reflectedLight.directDiffuse *= shelfVisibility;
      reflectedLight.indirectDiffuse *= shelfVisibility;
      reflectedLight.directSpecular *= shelfVisibility;
      reflectedLight.indirectSpecular *= shelfVisibility;
      #ifdef USE_CLEARCOAT
        clearcoatSpecularDirect *= shelfVisibility;
        clearcoatSpecularIndirect *= shelfVisibility;
      #endif`);
}

const shelfGapProgramKey = () => "bookshelf-world-gap-light-v1";

function Book({
  book,
  index,
  hovered,
  selected,
  hasLeftNeighbor,
  hasRightNeighbor,
  reducedMotion,
  cameraX,
  orbit,
  brand,
  onHover,
  onSelect,
}: {
  book: BookLayout;
  index: number;
  hovered: boolean;
  selected: boolean;
  hasLeftNeighbor: boolean;
  hasRightNeighbor: boolean;
  reducedMotion: boolean;
  cameraX: React.MutableRefObject<number>;
  orbit: React.MutableRefObject<{ yaw: number; pitch: number }>;
  brand: string;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const gapLight = useRef({
    front: { value: hasRightNeighbor ? 1 : 0 },
    back: { value: hasLeftNeighbor ? 1 : 0 },
    mouth: { value: book.depth / 2 },
  });
  const compileFront = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    applyShelfGapLight(shader, gapLight.current.front, gapLight.current.mouth);
  }, []);
  const compileBack = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    applyShelfGapLight(shader, gapLight.current.back, gapLight.current.mouth);
  }, []);
  const focusFlight = useRef<{
    startedAt: number;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
  } | null>(null);
  const exitFlight = useRef<{
    startedAt: number;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
  } | null>(null);
  const selectedAt = useRef(0);
  const wasSelected = useRef(false);
  const textures = useMemo(
    () => ({
      ...jacketTextures(book, brand),
      ...bindingFinish(book),
      paper: paperTexture(book),
    }),
    [book, brand],
  );

  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        book.width,
        book.bookHeight,
        book.depth,
        4,
        Math.min(book.width, 0.065),
      ),
    [book.bookHeight, book.depth, book.width],
  );

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((texture) => texture?.dispose());
      geometry.dispose();
    };
  }, [geometry, textures]);

  useEffect(() => {
    const node = group.current;
    if (selected && node) {
      selectedAt.current = performance.now();
      focusFlight.current = {
        startedAt: selectedAt.current,
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.x,
      };
      exitFlight.current = null;
    } else if (wasSelected.current && node) {
      exitFlight.current = {
        startedAt: performance.now(),
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.x,
      };
      focusFlight.current = null;
    } else {
      focusFlight.current = null;
    }
    wasSelected.current = selected;
  }, [selected]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const motion = reducedMotion ? 1000 : selected ? 7 : 11;
    gapLight.current.front.value = damp(gapLight.current.front.value, hasRightNeighbor ? 1 : 0, motion, delta);
    gapLight.current.back.value = damp(gapLight.current.back.value, hasLeftNeighbor ? 1 : 0, motion, delta);
    gapLight.current.mouth.value = book.depth / 2;
    const selectedFor = (performance.now() - selectedAt.current) / 1000;
    const autoYaw =
      selected && !reducedMotion
        ? Math.sin(selectedFor * 0.85) * 0.3
        : 0;
    const autoPitch =
      selected && !reducedMotion
        ? Math.sin(selectedFor * 0.55) * 0.04
        : 0;
    const targetX = selected ? cameraX.current : book.x;
    const targetY = selected
      ? 2.06
      : book.bookHeight / 2 + (hovered ? 0.25 : 0);
    const targetZ = selected ? 1.8 : hovered ? 0.22 : 0;
    const targetScale = selected ? 0.96 : 1;
    const targetRotationY = selected
      ? -Math.PI / 2 + orbit.current.yaw + autoYaw
      : 0;
    const targetRotationX = selected ? orbit.current.pitch + autoPitch : 0;

    const flight = selected ? focusFlight.current : null;
    if (flight) {
      const progress = reducedMotion
        ? 1
        : Math.min(
            1,
            (performance.now() - flight.startedAt) / BOOK_ENTER_DURATION,
          );
      const depthProgress = easeSmoothOut(progress);
      const travelProgress = easeSmoothOut(
        THREE.MathUtils.clamp((progress - 0.06) / 0.94, 0, 1),
      );
      const turnProgress = easeInOutCubic(progress);
      const depthArc = Math.sin(Math.PI * progress) * 0.12;
      node.position.set(
        THREE.MathUtils.lerp(flight.position.x, targetX, travelProgress),
        THREE.MathUtils.lerp(flight.position.y, targetY, travelProgress),
        THREE.MathUtils.lerp(flight.position.z, targetZ, depthProgress) +
          depthArc,
      );
      node.rotation.x = THREE.MathUtils.lerp(
        flight.rotation.x,
        targetRotationX,
        turnProgress,
      );
      node.rotation.y = THREE.MathUtils.lerp(
        flight.rotation.y,
        targetRotationY,
        turnProgress,
      );
      node.rotation.z = THREE.MathUtils.lerp(
        flight.rotation.z,
        0,
        turnProgress,
      );
      const scale = THREE.MathUtils.lerp(
        flight.scale,
        targetScale,
        turnProgress,
      );
      node.scale.setScalar(scale);
      if (progress >= 1) focusFlight.current = null;
    } else if (!selected && exitFlight.current) {
      const exit = exitFlight.current;
      const progress = reducedMotion
        ? 1
        : Math.min(
            1,
            (performance.now() - exit.startedAt) / BOOK_EXIT_DURATION,
          );
      const alignProgress = easeSmoothOut(progress);
      const slotProgress = easeSmoothOut(
        THREE.MathUtils.clamp((progress - 0.3) / 0.7, 0, 1),
      );
      node.position.set(
        THREE.MathUtils.lerp(exit.position.x, book.x, alignProgress),
        THREE.MathUtils.lerp(
          exit.position.y,
          book.bookHeight / 2,
          alignProgress,
        ),
        THREE.MathUtils.lerp(exit.position.z, 0, slotProgress),
      );
      node.rotation.x = THREE.MathUtils.lerp(
        exit.rotation.x,
        0,
        alignProgress,
      );
      node.rotation.y = THREE.MathUtils.lerp(
        exit.rotation.y,
        0,
        alignProgress,
      );
      node.rotation.z = THREE.MathUtils.lerp(
        exit.rotation.z,
        0,
        alignProgress,
      );
      const scale = THREE.MathUtils.lerp(exit.scale, 1, alignProgress);
      node.scale.setScalar(scale);
      if (progress >= 1) exitFlight.current = null;
    } else {
      node.position.x = damp(node.position.x, targetX, motion, delta);
      node.position.y = damp(node.position.y, targetY, motion, delta);
      node.position.z = damp(node.position.z, targetZ, motion, delta);
      node.rotation.y = damp(node.rotation.y, targetRotationY, motion, delta);
      node.rotation.x = damp(node.rotation.x, targetRotationX, motion, delta);
      const nextScale = damp(node.scale.x, targetScale, motion, delta);
      node.scale.setScalar(nextScale);
    }

  });

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(index);
  };

  return (
    <group
      ref={group}
      position={[book.x, book.bookHeight / 2, 0]}
      rotation={[0, 0, 0]}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onHover(index);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={select}
    >
      <mesh geometry={geometry} renderOrder={selected ? 20 : 0}>
        <meshPhysicalMaterial
          attach="material-0"
          onBeforeCompile={compileFront}
          customProgramCacheKey={shelfGapProgramKey}
          map={textures.cover ?? undefined}
          color={textures.cover ? "#ffffff" : book.color}
          roughness={0.82}
          roughnessMap={textures.finish ?? undefined}
          bumpMap={textures.grain ?? undefined}
          bumpScale={0.009}
          clearcoat={0.18}
          clearcoatRoughness={0.62}
          specularIntensity={0.45}
          envMapIntensity={0.55}
          metalness={0}
          depthTest={!selected}
          depthWrite={!selected}
        />
        <meshPhysicalMaterial
          attach="material-1"
          onBeforeCompile={compileBack}
          customProgramCacheKey={shelfGapProgramKey}
          map={textures.back ?? undefined}
          color={textures.back ? "#ffffff" : book.color}
          roughness={0.82}
          roughnessMap={textures.finish ?? undefined}
          bumpMap={textures.grain ?? undefined}
          bumpScale={0.009}
          clearcoat={0.18}
          clearcoatRoughness={0.62}
          specularIntensity={0.45}
          envMapIntensity={0.55}
          metalness={0}
          depthTest={!selected}
          depthWrite={!selected}
        />
        <meshStandardMaterial
          attach="material-2"
          map={textures.paper ?? undefined}
          color={textures.paper ? "#f1eadc" : "#e9e4d8"}
          roughness={0.93}
          bumpMap={textures.paper ?? undefined}
          bumpScale={0.014}
          depthTest={!selected}
          depthWrite={!selected}
        />
        <meshStandardMaterial
          attach="material-3"
          map={textures.paper ?? undefined}
          color={textures.paper ? "#ece3d3" : "#ddd7ca"}
          roughness={0.96}
          bumpMap={textures.paper ?? undefined}
          bumpScale={0.012}
          depthTest={!selected}
          depthWrite={!selected}
        />
        <meshPhysicalMaterial
          attach="material-4"
          map={textures.spine ?? undefined}
          color={textures.spine ? "#ffffff" : book.color}
          roughness={0.86}
          roughnessMap={textures.finish ?? undefined}
          bumpMap={textures.grain ?? undefined}
          bumpScale={0.007}
          clearcoat={0.14}
          clearcoatRoughness={0.65}
          specularIntensity={0.45}
          envMapIntensity={0.55}
          metalness={0}
          depthTest={!selected}
          depthWrite={!selected}
        />
        <meshStandardMaterial
          attach="material-5"
          map={textures.paper ?? undefined}
          color={textures.paper ? "#f3eadc" : "#e6e0d4"}
          roughness={0.94}
          bumpMap={textures.paper ?? undefined}
          bumpScale={0.014}
          depthTest={!selected}
          depthWrite={!selected}
        />
      </mesh>
    </group>
  );
}

function CameraRig({ target }: { target: React.MutableRefObject<number> }) {
  useFrame(({ camera }, delta) => {
    camera.position.x = damp(camera.position.x, target.current, 8, delta);
    camera.lookAt(camera.position.x, 1.88, 0);
  });
  return null;
}

function BookContactShade({ book, selected, cameraX }: {
  book: BookLayout;
  selected: boolean;
  cameraX: React.MutableRefObject<number>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(26,33,44,.7)");
    gradient.addColorStop(0.3, "rgba(26,33,44,.45)");
    gradient.addColorStop(0.65, "rgba(26,33,44,.15)");
    gradient.addColorStop(1, "rgba(26,33,44,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;
    node.position.x = damp(node.position.x, selected ? cameraX.current : book.x, 8, delta);
    node.position.z = damp(node.position.z, selected ? 1.8 : 0, 8, delta);
    node.rotation.z = damp(node.rotation.z, selected ? -Math.PI / 2 : 0, 7, delta);
    node.scale.setScalar(damp(node.scale.x, selected ? 1.25 : 1, 8, delta));
  });
  return <mesh ref={mesh} position={[book.x, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
    <planeGeometry args={[book.width * 2.6, book.depth * 1.3]} />
    <meshBasicMaterial map={texture} transparent opacity={selected ? 0.15 : 0.24} depthWrite={false} toneMapped={false} />
  </mesh>;
}

function Scene({
  books,
  hoveredIndex,
  selectedIndex,
  reducedMotion,
  cameraX,
  orbit,
  brand,
  onHover,
  onSelect,
}: {
  books: BookLayout[];
  hoveredIndex: number | null;
  selectedIndex: number | null;
  reducedMotion: boolean;
  cameraX: React.MutableRefObject<number>;
  orbit: React.MutableRefObject<{ yaw: number; pitch: number }>;
  brand: string;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <CameraRig target={cameraX} />
      <Environment resolution={128} frames={1} environmentIntensity={0.65}>
        <Lightformer form="rect" intensity={2} position={[-4, 5, 4]} scale={[5, 7, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.3} position={[5, 3, -3]} scale={[2, 6, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.65} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 4, 1]} />
      </Environment>
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#ffffff", "#d7dce8", 1]} />
      <directionalLight position={[5, 7, 5]} intensity={2} />
      {books.map((book, index) => <BookContactShade key={`shade-${book.id}`} book={book}
        selected={selectedIndex === index} cameraX={cameraX} />)}

      {books.map((book, index) => (
        <Book
          key={book.id}
          book={book}
          index={index}
          hovered={hoveredIndex === index && selectedIndex === null}
          selected={selectedIndex === index}
          hasLeftNeighbor={index > 0 && selectedIndex !== index - 1}
          hasRightNeighbor={index < books.length - 1 && selectedIndex !== index + 1}
          reducedMotion={reducedMotion}
          cameraX={cameraX}
          orbit={orbit}
          brand={brand}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function nearestBook(books: BookLayout[], x: number) {
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  books.forEach((book, index) => {
    const next = Math.abs(book.x - x);
    if (next < distance) {
      nearest = index;
      distance = next;
    }
  });
  return nearest;
}

export default function ProjectBookshelf({
  items = [],
  className,
  height = 530,
  brand = "The Brief",
  onSelect,
  variant = "standalone",
  active = true,
  open,
  onOpenChange,
}: NewsletterBookshelfProps) {
  const books = useMemo(
    () => deriveLayout(items),
    [items],
  );
  const shelfCenter = books[Math.floor(books.length / 2)]?.x ?? 0;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [stageWidth, setStageWidth] = useState(1000);
  const stageRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cameraX = useRef(shelfCenter);
  const orbit = useRef({ yaw: 0, pitch: 0 });
  const gesture = useRef<{
    mode: "pending" | "drag" | "orbit";
    x: number;
    y: number;
    startX: number;
    startedAt: number;
  } | null>(null);
  const switchTimer = useRef<number | null>(null);
  const pendingSelection = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const getBounds = useCallback(() => {
    const last = books.at(-1)?.x ?? 0;
    const aspect = stageWidth / Math.max(420, typeof height === "number" ? height : 620);
    const visibleSpan = 2 * 8 * Math.tan((35 * Math.PI) / 360) * aspect;
    const inset = visibleSpan * 0.31;
    const min = Math.min(shelfCenter, (books[0]?.x ?? 0) + inset);
    const max = Math.max(shelfCenter, last - inset);
    return max <= min ? { min: shelfCenter, max: shelfCenter, visibleSpan } : { min, max, visibleSpan };
  }, [books, height, shelfCenter, stageWidth]);

  const moveCamera = useCallback(
    (next: number) => {
      const bounds = getBounds();
      cameraX.current = THREE.MathUtils.clamp(next, bounds.min, bounds.max);
      setCurrentIndex(nearestBook(books, cameraX.current));
    },
    [books, getBounds],
  );

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(motion.matches);
    update();
    motion.addEventListener?.("change", update);
    const stage = stageRef.current;
    if (!stage) return () => motion.removeEventListener?.("change", update);
    const resize = new ResizeObserver(([entry]) => {
      if (entry) setStageWidth(entry.contentRect.width);
    });
    resize.observe(stage);
    return () => {
      resize.disconnect();
      motion.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const bounds = getBounds();
      cameraX.current = THREE.MathUtils.clamp(shelfCenter, bounds.min, bounds.max);
      setCurrentIndex(nearestBook(books, cameraX.current));
    });
    return () => cancelAnimationFrame(frame);
  }, [books, getBounds, shelfCenter]);

  useEffect(
    () => () => {
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
      document.body.style.cursor = "";
    },
    [],
  );

  const presentBook = useCallback(
    (index: number) => {
      moveCamera(books[index]!.x);
      orbit.current = { yaw: 0, pitch: 0 };
      setHoveredIndex(null);
      setSelectedIndex(index);
      onSelect?.(books[index]!, index);
      onOpenChange?.(true);
    },
    [books, moveCamera, onSelect, onOpenChange],
  );

  const openBook = useCallback(
    (index: number) => {
      const href = books[index]?.href;
      if (!href || typeof window === "undefined") return;
      try {
        const destination = new URL(href, window.location.href);
        if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
        window.location.assign(destination.href);
      } catch {
        // Ignore malformed or unsupported destinations supplied by consumers.
      }
    },
    [books],
  );

  const selectBook = useCallback(
    (index: number) => {
      if (suppressClick.current) return;
      if (selectedIndex === index) {
        openBook(index);
        return;
      }

      if (selectedIndex !== null) {
        pendingSelection.current = index;
        moveCamera(books[index]!.x);
        setHoveredIndex(null);
        setSelectedIndex(null);
        orbit.current = { yaw: 0, pitch: 0 };
        if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
        switchTimer.current = window.setTimeout(() => {
          const next = pendingSelection.current;
          pendingSelection.current = null;
          switchTimer.current = null;
          if (next !== null) presentBook(next);
        }, reducedMotion ? 0 : BOOK_EXIT_DURATION);
        return;
      }

      if (switchTimer.current !== null) {
        pendingSelection.current = index;
        return;
      }

      presentBook(index);
    },
    [books, moveCamera, openBook, presentBook, reducedMotion, selectedIndex],
  );

  const close = useCallback(() => {
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
    switchTimer.current = null;
    pendingSelection.current = null;
    setSelectedIndex(null);
    orbit.current = { yaw: 0, pitch: 0 };
    onOpenChange?.(false);
    stageRef.current?.focus({ preventScroll: true });
  }, [onOpenChange]);

  // The home scroll controller requests a close when leaving the work stage.
  useEffect(() => {
    if (open !== false || (selectedIndex === null && switchTimer.current === null)) return;
    const frame = requestAnimationFrame(close);
    return () => cancelAnimationFrame(frame);
  }, [close, open, selectedIndex]);

  useEffect(() => {
    if (variant !== "home" || !open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, open, variant]);

  const switchFocused = useCallback(
    (direction: number) => {
      if (selectedIndex === null) return;
      const next = THREE.MathUtils.clamp(selectedIndex + direction, 0, books.length - 1);
      if (next !== selectedIndex) {
        selectBook(next);
      }
    },
    [books.length, selectBook, selectedIndex],
  );

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    gesture.current = {
      mode: "pending",
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startedAt: performance.now(),
    };
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (tooltipRef.current && rect) {
      tooltipRef.current.style.left = `${event.clientX - rect.left}px`;
      tooltipRef.current.style.top = `${event.clientY - rect.top}px`;
    }
    const active = gesture.current;
    if (!active) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (active.mode === "pending" && Math.hypot(event.clientX - active.startX, dy) > 7) {
      active.mode = selectedIndex === null ? "drag" : "orbit";
      suppressClick.current = true;
      stageRef.current?.setPointerCapture(event.pointerId);
      setHoveredIndex(null);
    }
    if (active.mode === "drag") {
      moveCamera(cameraX.current - dx * 0.0085);
    } else if (active.mode === "orbit") {
      orbit.current.yaw = THREE.MathUtils.clamp(orbit.current.yaw + dx * 0.006, -0.62, 0.62);
      orbit.current.pitch = THREE.MathUtils.clamp(orbit.current.pitch + dy * 0.004, -0.28, 0.28);
    }
    active.x = event.clientX;
    active.y = event.clientY;
  };

  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stageRef.current?.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId);
    }
    gesture.current = null;
    window.requestAnimationFrame(() => {
      suppressClick.current = false;
    });
  };

  const selectedBook = selectedIndex === null ? null : books[selectedIndex];
  const hovered = hoveredIndex === null ? null : books[hoveredIndex];
  const bounds = getBounds();
  return (
    <section className={[styles.bookshelf, variant === "home" && styles.homeBookshelf, className].filter(Boolean).join(" ")} data-selected={selectedBook?.id ?? "none"} data-expanded={variant === "home" ? Boolean(open) : Boolean(selectedBook)} data-bookshelf-variant={variant}>
      <div className={styles.canvasWrap} style={{ "--stage-height": typeof height === "number" ? height + "px" : height } as CSSProperties}>
        <div className={styles.stageLabel} aria-hidden="true">WU ZIRONG / PROJECT ARCHIVE</div>
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-label={
          selectedBook
            ? `${selectedBook.title}，已抽出。拖动旋转，再次点击打开案例。`
            : `项目书架，共 ${books.length} 个项目。左右方向键浏览，回车抽出，Escape 放回。`
        }
        className={styles.stage}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onPointerLeave={() => {
          gesture.current = null;
          setHoveredIndex(null);
        }}
        onWheel={(event) => {
          if (selectedIndex !== null) return;
          const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
          if (horizontal || event.shiftKey) {
            event.preventDefault();
            moveCamera(cameraX.current + (horizontal ? event.deltaX : event.deltaY) * 0.012);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && (selectedIndex !== null || switchTimer.current !== null)) {
            event.preventDefault();
            close();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            if (selectedIndex !== null) switchFocused(1);
            else moveCamera(cameraX.current + bounds.visibleSpan * 0.23);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            if (selectedIndex !== null) switchFocused(-1);
            else moveCamera(cameraX.current - bounds.visibleSpan * 0.23);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (selectedIndex === null) selectBook(currentIndex);
            else openBook(selectedIndex);
          }
        }}
      >
        <Canvas
          frameloop={active ? "always" : "never"}
          camera={{ fov: 35, near: 0.1, far: 60, position: [shelfCenter, 2.65, 8] }}
          dpr={[1, 1.5]}
          fallback={<p className={styles.fallback}>当前浏览器无法显示 3D，仍可从下方选择项目并查看案例。</p>}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onPointerMissed={() => {
            if (selectedIndex !== null) close();
          }}
        >
          <Scene
            books={books}
            hoveredIndex={hoveredIndex}
            selectedIndex={selectedIndex}
            reducedMotion={reducedMotion}
            cameraX={cameraX}
            orbit={orbit}
            brand={brand}
            onHover={setHoveredIndex}
            onSelect={selectBook}
          />
        </Canvas>
        </div>
        <div ref={tooltipRef} aria-hidden className={styles.tooltip} data-visible={Boolean(hovered && !selectedBook)}>
          {hovered?.title}
        </div>
        {selectedBook && <button type="button" className={styles.close} onClick={close} aria-label="放回书架">放回书架 <span aria-hidden="true">×</span></button>}
        <p className={styles.hint}>{selectedBook ? "拖动旋转 · 再次点击书本打开案例 · Esc 放回" : "悬停抽出 · 点击翻看 · 左右拖动浏览"}</p>
      </div>
      <div className={styles.catalog} aria-label="选择项目">
        {books.map((book, index) => <button type="button" key={book.id} aria-pressed={selectedIndex === index} onClick={() => selectedIndex === index ? close() : selectBook(index)} className={styles.catalogItem}>
          <span className={styles.swatch} style={{ background: book.color }} aria-hidden="true" />
          <span>{book.title}</span><span className={styles.catalogArrow} aria-hidden="true">↗</span>
        </button>)}
      </div>
      <div className={styles.details} aria-live="polite" aria-atomic="true">
        {selectedBook ? <>
          <div className={styles.detailsCopy}>
            <p className={styles.detailType}>{selectedBook.date}</p>
            <h2>{selectedBook.title}</h2>
            <p className={styles.positioning}>{selectedBook.positioning}</p>
            <p className={styles.summary}>{selectedBook.summary}</p>
            <div className={styles.tags}>{selectedBook.tags?.map(tag => <span key={tag}>{tag}</span>)}</div>
            {selectedBook.href && <Link className={styles.caseLink} href={selectedBook.href}>查看完整案例 <span aria-hidden="true">↗</span></Link>}
          </div>
          {selectedBook.cover && <div className={styles.preview}><Image src={selectedBook.cover} alt={selectedBook.title + "项目封面"} width={1672} height={941} sizes="(max-width: 700px) 90vw, 420px" /></div>}
        </> : <div className={styles.empty}><h2>每一个项目，都值得翻开。</h2><p>从书架挑一本，看看产品背后的问题、过程与设计取舍。</p></div>}
      </div>
    </section>
  );
}
