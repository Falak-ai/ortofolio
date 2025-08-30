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
      // Sanitize the model by removing/replacing corrupted geometries
      const sanitizedScene = earth.scene.clone();
      let hasCorruptedGeometry = false;
      
      earth.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          let geometryCorrupted = false;
          
          try {
            // Check position attribute
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
            console.warn("Earth geometry validation failed:", error);
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
        console.warn("Corrupted geometry detected and removed from earth model");
        // If any corrupted geometry is found, discard the entire model to prevent NaN errors
        setValidatedModel(null);
      } else {
        setValidatedModel(earth.scene);
      }
    } catch (error) {
      console.warn('Earth model validation failed:', error);
      setValidatedModel(null);
    }
    
    setIsValidating(false);
  }, [earth]);

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