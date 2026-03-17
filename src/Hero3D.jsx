import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = {
  inkSoft: '#123D69',
  brand: '#248BDE',
  sky: '#67C8F3',
  cloud: '#D8F3FF',
};

/* ─── Icosaedro wireframe principal (capa exterior) ─── */
function OuterIcosahedron() {
  const ref = useRef();
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.09;
    ref.current.rotation.x = state.clock.elapsedTime * 0.05;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[2.2, 1]} />
      <meshBasicMaterial
        color={COLORS.brand}
        wireframe
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

/* ─── Dodecaedro wireframe (capa media, contra-rotación) ─── */
function MidDodecahedron() {
  const ref = useRef();
  useFrame((state) => {
    ref.current.rotation.y = -state.clock.elapsedTime * 0.07;
    ref.current.rotation.z = state.clock.elapsedTime * 0.04;
  });
  return (
    <mesh ref={ref}>
      <dodecahedronGeometry args={[1.5]} />
      <meshBasicMaterial
        color={COLORS.sky}
        wireframe
        transparent
        opacity={0.35}
      />
    </mesh>
  );
}

/* ─── Octaedro wireframe (núcleo, rotación rápida) ─── */
function CoreOctahedron() {
  const ref = useRef();
  useFrame((state) => {
    ref.current.rotation.x = state.clock.elapsedTime * 0.15;
    ref.current.rotation.y = state.clock.elapsedTime * 0.18;
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshBasicMaterial
        color={COLORS.cloud}
        wireframe
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/* ─── Partículas flotantes alrededor del cristal ─── */
function Particles({ count = 80 }) {
  const mesh = useRef();

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribuir en esfera hueca (radio 2.5–4.5)
      const r = 2.5 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = Math.random() * 0.04 + 0.01;
    }
    return [pos, sz];
  }, [count]);

  useFrame((state) => {
    mesh.current.rotation.y = state.clock.elapsedTime * 0.03;
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.1;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={COLORS.cloud}
        size={0.04}
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

/* ─── Aristas brillantes extras — líneas conectando vértices ─── */
function GlowEdges() {
  const ref = useRef();

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = [];
    const ico = new THREE.IcosahedronGeometry(2.2, 1);
    const pos = ico.attributes.position;
    // Agregar líneas desde cada vértice al centro y al opuesto
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
      const bx = pos.getX(i+1), by = pos.getY(i+1), bz = pos.getZ(i+1);
      const cx = pos.getX(i+2), cy = pos.getY(i+2), cz = pos.getZ(i+2);
      verts.push(ax, ay, az, bx, by, bz);
      verts.push(bx, by, bz, cx, cy, cz);
      verts.push(cx, cy, cz, ax, ay, az);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, []);

  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.09;
    ref.current.rotation.x = state.clock.elapsedTime * 0.05;
    // Pulso de opacidad
    ref.current.material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 1.2) * 0.3;
  });

  return (
    <lineSegments ref={ref} geometry={lineGeometry}>
      <lineBasicMaterial
        color={COLORS.sky}
        transparent
        opacity={0.8}
        linewidth={1}
      />
    </lineSegments>
  );
}

/* ─── Escena completa ─── */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[4, 4, 4]} intensity={2.0} color={COLORS.brand} />
      <pointLight position={[-4, -2, -4]} intensity={1.0} color={COLORS.inkSoft} />
      <pointLight position={[0, 5, -3]} intensity={0.8} color={COLORS.cloud} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.5}>
        <GlowEdges />
        <OuterIcosahedron />
        <MidDodecahedron />
        <CoreOctahedron />
      </Float>
      <Particles count={100} />
    </>
  );
}

/* ─── Export ─── */
export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <Scene />
    </Canvas>
  );
}
