import React, { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../Loader";

// Error Boundary Component
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Three.js rendering error caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-center">
            <div className="w-16 h-16 bg-[#915EFF] rounded-lg mx-auto mb-4"></div>
            <p>3D Model Loading...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const computer = useGLTF("./desktop_pc/scene.gltf");
  const [validatedModel, setValidatedModel] = useState(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!computer?.scene) {
      setValidatedModel(null);
      setIsValidating(false);
      return;
    }

    try {
      // Sanitize the model by removing/replacing corrupted geometries
      const sanitizedScene = computer.scene.clone();
      let hasCorruptedGeometry = false;
      
      computer.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          let geometryCorrupted = false;
          
          try {
            // Check position attributes for NaN/Infinity values
            const positions = geometry.attributes.position;
            if (positions?.array) {
              for (let i = 0; i < positions.array.length; i++) {
                if (!isFinite(positions.array[i])) {
                  geometryCorrupted = true;
                  break;
                }
              }
            }
            
            if (!geometryCorrupted) {
              const normals = geometry.attributes.normal;
              if (normals?.array) {
                for (let i = 0; i < normals.array.length; i++) {
                  if (!isFinite(normals.array[i])) {
                    geometryCorrupted = true;
                    break;
                  }
                }
              }
            }
            
            if (!geometryCorrupted) {
              const uvs = geometry.attributes.uv;
              if (uvs?.array) {
                for (let i = 0; i < uvs.array.length; i++) {
                  if (!isFinite(uvs.array[i])) {
                    geometryCorrupted = true;
                    break;
                  }
                }
              }
            }

            // If geometry is corrupted, mark it for removal
            if (geometryCorrupted) {
              hasCorruptedGeometry = true;
              // Find corresponding child in sanitized scene and remove it
              const sanitizedChild = sanitizedScene.getObjectByProperty('uuid', child.uuid);
              if (sanitizedChild && sanitizedChild.parent) {
                sanitizedChild.parent.remove(sanitizedChild);
              }
            }
          } catch (error) {
            console.warn("Geometry validation failed:", error);
            geometryCorrupted = true;
            hasCorruptedGeometry = true;
            // Remove corrupted child from sanitized scene
            const sanitizedChild = sanitizedScene.getObjectByProperty('uuid', child.uuid);
            if (sanitizedChild && sanitizedChild.parent) {
              sanitizedChild.parent.remove(sanitizedChild);
            }
          }
        }
      });
      
      // If we found corrupted geometry, use sanitized scene, otherwise use original
      if (hasCorruptedGeometry) {
        console.warn("Corrupted geometry detected and removed from computer model");
        setValidatedModel(null);
      } else {
        setValidatedModel(computer);
      }
    } catch (error) {
      console.warn("Computer model validation failed:", error);
      setValidatedModel(null);
    }
    
    setIsValidating(false);
  }, [computer]);

  if (isValidating) {
    return <CanvasLoader />;
  }

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
    !isMobile && (
      <ThreeErrorBoundary>
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
      </ThreeErrorBoundary>
    )
  );
};

export default ComputersCanvas;