import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";

import CanvasLoader from "../Loader";

const Earth = () => {
  const earth = useGLTF("./planet/scene.gltf");
  const [validatedModel, setValidatedModel] = useState(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!earth.scene) {
      setValidatedModel(null);
      setIsValidating(false);
      return;
    }

    try {
      let hasIssue = false;
      
      // Traverse the scene and check all geometries
      earth.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geometry = child.geometry;
          
          // Check position attribute
          if (geometry.attributes.position) {
            const positions = geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
              if (!isFinite(positions.getX(i)) || !isFinite(positions.getY(i)) || !isFinite(positions.getZ(i))) {
                hasIssue = true;
                break;
              }
            }
          }

          // Check normal attribute
          if (geometry.attributes.normal) {
            const normals = geometry.attributes.normal;
            for (let i = 0; i < normals.count; i++) {
              if (!isFinite(normals.getX(i)) || !isFinite(normals.getY(i)) || !isFinite(normals.getZ(i))) {
                hasIssue = true;
                break;
              }
            }
          }

          // Check UV attribute
          if (geometry.attributes.uv) {
            const uvs = geometry.attributes.uv;
            for (let i = 0; i < uvs.count; i++) {
              if (!isFinite(uvs.getX(i)) || !isFinite(uvs.getY(i))) {
                hasIssue = true;
                break;
              }
            }
          }

          // Test bounding sphere and box calculations
          if (!hasIssue) {
            try {
              const testGeometry = geometry.clone();
              testGeometry.computeBoundingSphere();
              testGeometry.computeBoundingBox();
              
              if (!isFinite(testGeometry.boundingSphere.radius) ||
                  !isFinite(testGeometry.boundingBox.min.x) ||
                  !isFinite(testGeometry.boundingBox.max.x)) {
                hasIssue = true;
              }
              
              testGeometry.dispose();
            } catch (error) {
              console.warn('Earth geometry computation failed:', error);
              hasIssue = true;
            }
          }
        }
        if (hasIssue) return;
      });

      setValidatedModel(hasIssue ? null : earth.scene);
    } catch (error) {
      console.warn('Earth model validation failed:', error.message);
      setValidatedModel(null);
    }
    
    setIsValidating(false);
  }, [earth.scene]);

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