import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import FadeContent from './Fade'

function DottedSurface({ className = '', children }) {
  const [theme, setTheme] = useState('light');
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!canvasContainerRef.current || mountedRef.current) return;
    
    mountedRef.current = true;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 0);
    
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    // Clear any existing canvases
    while (canvasContainerRef.current.firstChild) {
      canvasContainerRef.current.removeChild(canvasContainerRef.current.firstChild);
    }

    canvasContainerRef.current.appendChild(renderer.domElement);

    const positions = [];
    const colors = [];
    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const y = 0;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

        positions.push(x, y, z);
        if (theme === 'dark') {
          colors.push(1,1,1);
        } else {
          colors.push(1,1,1);
        }
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position;
      const positions = positionAttribute.array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;

          positions[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;

          i++;
        }
      }

      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.1;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      animationId,
    };

    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', handleResize);

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);

        sceneRef.current.scene.traverse((object) => {
          if (object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        sceneRef.current.renderer.dispose();

        if (canvasContainerRef.current) {
          while (canvasContainerRef.current.firstChild) {
            canvasContainerRef.current.removeChild(canvasContainerRef.current.firstChild);
          }
        }
        
        sceneRef.current = null;
      }
    };
  }, [theme]);

  return (
    <div className={className}>
      <div
        ref={canvasContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      {children}
    </div>
  );
}

export default function DemoOne() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
        <FadeContent >
            <DottedSurface>
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
                <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 left-1/2 w-full h-full -translate-x-1/2 rounded-full opacity-10 blur-[30px]"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 1), transparent 200%)',
                    zIndex: 9
                }}
                />

            <FadeContent blur={true} duration={2500} easing="ease-out" initialOpacity={0}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',paddingBottom: '300px'}}>
                    <h1 className="font-Algerian text-4xl md:text-6xl font-semibold text-white tracking-tight text-center" style={{ zIndex: 11,paddingBottom: '10px' }}>
                        Welcome to Mentoroid
                    </h1>
                    <button className="mt-4 px-6 py-3 bg-white text-black  shadow-md hover:shadow-lg transition-shadow duration-300 w-full" style={{borderRadius: '10px'}}>
                            Get Started 
                    </button>
                </div> 
            </FadeContent>

            <FadeContent blur={true} duration={2000} easing="ease-out" initialOpacity={0}>
                <div className="mt-6 max-w-3xl px-6">
                <p className="text-white/90 text-base md:text-lg leading-relaxed text-center" style={{ zIndex: 11, paddingBottom: '300px' }}>
                Welcome to Mentoroid, your personal AI-powered academic companion.<br />

                Transform your documents and notes into interactive study sessions by simply uploading them 
                and asking questions to get instant, accurate answers. 
                Challenge yourself by generating quizzes from your materials to master key concepts. 
                You can also track your learning with insightful statistics and collaborate with friends. 
                Study smarter, not harder, and unlock your full academic potential with us.
                </p>
                </div>
            </FadeContent> 
            </div>
            </DottedSurface>
        </FadeContent> 
      
    </div>
  );
}