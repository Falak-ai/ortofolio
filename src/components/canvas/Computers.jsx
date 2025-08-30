import React, { Suspense, useEffect, useState, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../Loader";

const OrbitControlsWrapper = () => {
  const { gl } = useThree();
  
  return (
    <OrbitControls
      domElement={gl.domElement}
      enableZoom={false}
      maxPolarAngle={Math.PI / 2}
      minPolarAngle={Math.PI / 2}
    />
  );
};

const Computers = () => {
  let computer;
  
  try {
    computer = useGLTF("./desktop_pc/scene.gltf");
  } catch (error) {
    console.warn("Failed to load 3D model:", error);
  }

  const validatedModel = useMemo(() => {
    if (!computer || !computer.scene) {
      return null;
    }

    let hasNaN = false;
    
    computer.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const positions = child.geometry.attributes.position;
        if (positions && positions.array) {
          for (let i = 0; i < positions.array.length; i++) {
            if (isNaN(positions.array[i])) {
              hasNaN = true;
              break;
            }
          }
        }
      }
      if (hasNaN) return;
    });
    
    return hasNaN ? null : computer;
  }, [computer]);

  if (!validatedModel) {
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
      <primitive
        object={validatedModel.scene}
        scale={0.75}
        position={[0, -3.25, -1.5]}
        rotation={[-0.01, -0.2, -0.1]}
      />
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
          <OrbitControlsWrapper />
          <Computers />
        </Suspense>
        <Preload all />
      </Canvas>
    )
  );
};

export default ComputersCanvas;