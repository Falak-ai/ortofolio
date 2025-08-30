import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../Loader";

const Earth = () => {
  const earth = useGLTF("./planet/scene.gltf");
  const [validatedModel, setValidatedModel] = useState(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!earth?.scene) {
      setValidatedModel(null);
      setIsValidating(false);
      return;
    }

    try {
      let hasIssue = false;
      
      // Traverse the scene and check all geometries
      earth.scene.traverse((child) => {
        if (hasIssue) return; // Early exit if issue found
        
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          
          try {
            // Check position attribute
            const positions = geometry.attributes.position;
            if (positions?.array) {
              // Check raw array data first
              for (let i = 0; i < positions.array.length; i++) {
                if (!isFinite(positions.array[i])) {
                  hasIssue = true;
                  break;
                }
              }
              
              // Also check using accessor methods
              if (!hasIssue) {
                for (let i = 0; i < positions.count; i++) {
                  const x = positions.getX(i);
                  const y = positions.getY(i);
                  const z = positions.getZ(i);
                  if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
                    hasIssue = true;
                    break;
                  }
                }
              }
            }

            // Check normal attribute
            if (!hasIssue) {
              const normals = geometry.attributes.normal;
              if (normals?.array) {
                for (let i = 0; i < normals.array.length; i++) {
                  if (!isFinite(normals.array[i])) {
                    hasIssue = true;
                    break;
                  }
                }
              }
            }

            // Check UV attribute
            if (!hasIssue) {
              const uvs = geometry.attributes.uv;
              if (uvs?.array) {
                for (let i = 0; i < uvs.array.length; i++) {
                  if (!isFinite(uvs.array[i])) {
                    hasIssue = true;
                    break;
                  }
                }
              }
            }

            // Test bounding sphere and box calculations
            if (!hasIssue) {
              try {
                const testGeometry = geometry.clone();
                testGeometry.computeBoundingSphere();
                testGeometry.computeBoundingBox();
                
                if (!testGeometry.boundingSphere || 
                    !isFinite(testGeometry.boundingSphere.radius) ||
                    testGeometry.boundingSphere.radius <= 0) {
                  hasIssue = true;
                }
                
                if (!hasIssue && testGeometry.boundingBox) {
                  const box = testGeometry.boundingBox;
                  if (!isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z) ||
                      !isFinite(box.max.x) || !isFinite(box.max.y) || !isFinite(box.max.z)) {
                    hasIssue = true;
                  }
                }
                
                testGeometry.dispose();
              } catch (error) {
                console.warn('Earth geometry computation failed:', error);
                hasIssue = true;
              }
            }
          } catch (error) {
            console.warn("Earth geometry validation failed:", error);
            hasIssue = true;
          }
        }
      });

      setValidatedModel(hasIssue ? null : earth.scene);
    } catch (error) {
      console.warn('Earth model validation failed:', error);
      setValidatedModel(null);
    }
    
    setIsValidating(false);
  }, [earth?.scene]);

  if (isValidating) {
    return <CanvasLoader />;
  }

  // Render fallback sphere if model is corrupted
  if (!validatedModel) {
    return (
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial color="#4ade80" wireframe />
      </mesh>
    );
  }

  return (
    <primitive object={validatedModel} scale={2.5} position-y={0} rotation-y={0} />
  );
};

const EarthCanvas = () => {
  return (
    <Canvas
      shadows
      frameloop='demand'
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      camera={{
        fov: 45,
        near: 0.1,
        far: 200,
        position: [-4, 3, 6],
      }}
    >
      <Suspense fallback={<CanvasLoader />}>
        <OrbitControls
          autoRotate
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Earth />

        <Preload all />
      </Suspense>
    </Canvas>
  );
};

export default EarthCanvas;