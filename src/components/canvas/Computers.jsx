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
    if (!computer || !computer.scene) {
      setValidatedModel(null);
      setIsValidating(false);
      return;
    }

    let hasIssue = false;
    
    try {
      // Deep validation of all geometry data
      computer.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          
          // Check position attributes for NaN values
          const positions = geometry.attributes.position;
          if (positions && positions.array) {
            for (let i = 0; i < positions.count; i++) {
              if (!isFinite(positions.getX(i)) || !isFinite(positions.getY(i)) || !isFinite(positions.getZ(i))) {
                hasIssue = true;
                break;
              }
            }
          }
          
          // Check normal attributes for NaN values
          const normals = geometry.attributes.normal;
          if (normals && normals.array) {
            for (let i = 0; i < normals.count; i++) {
              if (!isFinite(normals.getX(i)) || !isFinite(normals.getY(i)) || !isFinite(normals.getZ(i))) {
                hasIssue = true;
                break;
              }
            }
          }
          
          // Check UV attributes for NaN values
          const uvs = geometry.attributes.uv;
          if (uvs && uvs.array) {
            for (let i = 0; i < uvs.count; i++) {
              if (!isFinite(uvs.getX(i)) || !isFinite(uvs.getY(i))) {
                hasIssue = true;
                break;
              }
            }
          }
          
          // Try to safely compute bounding sphere and box
          if (!hasIssue) {
            try {
              // Create a copy to avoid modifying the original
              const testGeometry = geometry.clone();
              testGeometry.computeBoundingSphere();
              testGeometry.computeBoundingBox();
              
              // Check if computed values are valid
              if (testGeometry.boundingSphere && !isFinite(testGeometry.boundingSphere.radius)) {
                hasIssue = true;
              }
              
              if (testGeometry.boundingBox) {
                const box = testGeometry.boundingBox;
                if (!isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z) ||
                    !isFinite(box.max.x) || !isFinite(box.max.y) || !isFinite(box.max.z)) {
                  hasIssue = true;
                }
              }
              
              // Dispose of test geometry
              testGeometry.dispose();
            } catch (error) {
              console.warn("Geometry computation failed:", error);
              hasIssue = true;
            }
          }
        }
        if (hasIssue) return;
      });
      
      setValidatedModel(hasIssue ? null : computer);
    } catch (error) {
      console.warn("Model validation failed:", error);
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