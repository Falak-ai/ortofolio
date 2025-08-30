import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../Loader";

const Computers = () => {
  const [modelError, setModelError] = useState(false);
  let computer;
  
  try {
    computer = useGLTF("./desktop_pc/scene.gltf");
    
    // Check for NaN values in geometry
    if (computer.scene) {
      computer.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const positions = child.geometry.attributes.position;
          if (positions && positions.array) {
            for (let i = 0; i < positions.array.length; i++) {
              if (isNaN(positions.array[i])) {
                setModelError(true);
                return;
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.warn("Failed to load 3D model:", error);
    setModelError(true);
  }

  if (modelError) {
    return (
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#915EFF" />
      </mesh>
    );
  }

  return (
    <mesh>
      <hemisphereLight intensity={0.15} groundColor="black" />
      <spotLight
        position={[-20, 50, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={1024}
      />
      <pointLight intensity={1} />
      {computer && (
        <primitive
          object={computer.scene}
          scale={0.75}
          position={[0, -3.25, -1.5]}
          rotation={[-0.01, -0.2, -0.1]}
        />
      )}
    </mesh>
  );
};

const ComputersCanvas = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 500);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 500px)");
    
    const handleMediaQueryChange = (event) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return (
    !isMobile && ( // Hide on mobile screens
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, 2]}
        camera={{ position: [20, 3, 5], fov: 25 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <OrbitControls
            enableZoom={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
          />
          <Computers />
        </Suspense>
        <Preload all />
      </Canvas>
    )
  );
};

export default ComputersCanvas;
