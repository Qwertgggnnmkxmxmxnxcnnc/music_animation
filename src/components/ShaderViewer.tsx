import React, { useEffect, useRef } from 'react';
import { sculptToThreeJSMesh } from 'shader-park-core';
import { PerspectiveCamera, Scene, WebGLRenderer, Mesh, Color } from 'three';

interface ShaderViewerProps {
  width?: number;
  height?: number;
  isDarkMode: boolean;
  animationType: 1 | 2;
  audioAnalyser: AnalyserNode | null;
}

const ShaderViewer: React.FC<ShaderViewerProps> = ({ 
  width = 500, 
  height = 500, 
  isDarkMode,
  animationType,
  audioAnalyser 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const meshRef = useRef<Mesh | null>(null);

  const startAudioAnimation = (analyserNode: AnalyserNode) => {
    const updateAudio = () => {
      if (meshRef.current?.material && analyserNode) {
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(dataArray);
        
        const bass = dataArray.slice(0, 4).reduce((a, b) => a + b) / 4;
        const mids = dataArray.slice(4, 12).reduce((a, b) => a + b) / 8;
        const highs = dataArray.slice(12, 20).reduce((a, b) => a + b) / 8;
        
        const normalizedValue = Math.min(
          (
            bass * 0.5 +
            mids * 0.3 +
            highs * 0.2
          ) / 255 * 0.8,
          0.8
        );
        
        (meshRef.current.material as any).uniforms.audio.value = normalizedValue;
      }
      requestAnimationFrame(updateAudio);
    };
    updateAudio();
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new Scene();
    scene.background = new Color(isDarkMode ? 0x000000 : 0xffffff);

    const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      precision: 'highp',
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.position.z = 2;
    renderer.setSize(width, height);

    // Выбираем шейдер в зависимости от типа анимации
    const shaderCode = animationType === 1 ? `
      // Анимация 1
      rotateY(time * 0.2);
      
      let scale = input(1., 0.0, 10.);
      let s = getSpace();
      let audio = input();

      let n = noise(s * scale + vec3(0, 0, time) + noise(s * scale + vec3(0, 0, time)));

      setStepSize(0.2);
      setGeometryQuality(12);
      setMaxIterations(300);

      metal(1.0);
      shine(1.0);
      fresnel(1.0);
      lightDirection(0.5, 1.0, 0.3);
      lightDirection(-0.5, -0.5, 0.5);

      let nscale = input(1.2, 0, 10);
      let hueOffset = input(0.03, 0, 0.1);
      let rings = input(4, 0, 100);

      let dir1 = vec3(sin(time * 0.3), cos(time * 0.4), sin(time * 0.5));
      let dir2 = vec3(cos(time * 0.2), sin(time * 0.3), cos(time * 0.4));
      let dir3 = vec3(sin(time * 0.4), cos(time * 0.5), sin(time * 0.3));

      let baseFreq = 15.0 + audio * 20.0;
      let waveIntensity = audio * 1.5;
      
      let normalizedPos = normalize(s);
      let waves = 
        sin(dot(normalizedPos, normalize(dir1)) * baseFreq + time * 2.0) * 0.4 +
        sin(dot(normalizedPos, normalize(dir2)) * (baseFreq * 0.5) + time * -1.5) * 0.3 +
        sin(dot(normalizedPos, normalize(dir3)) * (baseFreq * 0.25) - time) * 0.2;
      
      waves *= waveIntensity * smoothstep(1.2, 0.8, length(s));
      
      let warpedSpace = warpSpace(s);
      let samplePos = warpedSpace * nscale + vec3(0, 0, -time) * 0.2;
      
      let audioHue = time * 0.1 + audio * 2.0;
      let n1 = nsin((noise(samplePos)) * rings + audioHue);
      let n2 = nsin((noise(samplePos + hueOffset)) * rings + audioHue * 1.5);
      let n3 = nsin((noise(samplePos + hueOffset * 2)) * rings + audioHue * 2.0);
      
      let audioEffect = audio * 2.0;
      let col = pow(vec3(n1, n2, n3), vec3(3.0 + audioEffect));
      
      let pulseColor = vec3(
        sin(audioHue) * 0.5 + 0.5,
        sin(audioHue * 1.2) * 0.5 + 0.5,
        sin(audioHue * 1.4) * 0.5 + 0.5
      );

      let metalBase = vec3(0.95, 0.97, 1.0);
      let metalColor = mix(col, pulseColor, audio * 0.3) + normal * 0.3;
      color(metalColor * metalBase);

      let baseRadius = 0.9;
      let displacement = n * 0.03 + waves * mix(0.02, 0.08, audio);
      sphere(baseRadius + displacement);

      function warpSpace(s) {
        let strength = 0.14 + audio * 0.05;
        let twistMix = 0.01 + audio * 0.01;
        let t = time / 4.;
        
        s = s * 16.0 * (vec3(0.5, 0.2, 0.1) + s);
        
        let waveCount = 3.0 + audio * 6.0;
        for (let i = 1.0; i < waveCount; i += 1.0) {
          let randOffset = noise(vec3(i, t, 0.0)) * 2.0;
          let waveMod = sin(t * 0.5 + i + randOffset) * 0.5;
          s.x = s.x + strength * sin(2.0 * t + i * 1.5 * s.y + waveMod + randOffset) + t * 0.3;
          s.y = s.y + strength * cos(2.0 * t + i * 2.5 * s.x + waveMod + randOffset);
          s.z = s.z + strength * sin(1.5 * t + i * 2.0 * s.z + waveMod + randOffset);
        }
        return 0.75 + 0.5 * cos(time + vec3(s.x, s.y, s.x) + vec3(0.0, 2.0, 4.0));
      }
    ` : `
      // Анимация 2
      rotateY(time * 0.2);
      let scale = input(1., 0.0, 10.);
      let s = getSpace();
      let audio = input();

      let n = noise(s * scale + vec3(0, 0, time));

      metal(1.0);
      shine(1.0);
      fresnel(1.0);
      lightDirection(0.5, 1.0, 0.3);
      lightDirection(-0.5, -0.5, 0.5);

      setStepSize(0.3);
      setGeometryQuality(8);
      setMaxIterations(150);

      let waveIntensity = 0.3 + audio * 1.2;
      let baseFreq = 10.0 + audio * 10.0;

      let dir1 = vec3(1.0, 0.0, 0.0);
      let dir2 = vec3(0.0, 1.0, 0.0);
      let waves = sin(dot(normalize(s), dir1) * baseFreq + time) * 0.1;
      waves += sin(dot(normalize(s), dir2) * (baseFreq * 0.5) + time * -1.0) * 0.1;

      let hue = time * 0.1 + audio * 2.0;
      let col = vec3(
        sin(hue) * 0.5 + 0.5,
        sin(hue + 2.0) * 0.5 + 0.5,
        sin(hue + 4.0) * 0.5 + 0.5
      );

      let metalColor = col * (0.8 + normal * 0.2);
      color(metalColor);

      let baseRadius = 0.8 + waves;
      let displacement = n * 0.05;
      sphere(baseRadius + displacement);
    `;

    const mesh = sculptToThreeJSMesh(shaderCode, { time: true, audio: true }) as unknown as Mesh;
    meshRef.current = mesh;
    scene.add(mesh);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (mesh.material) {
        (mesh.material as any).uniforms.time.value += 0.01;
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
    };
  }, [width, height, isDarkMode, animationType]);

  useEffect(() => {
    if (audioAnalyser) {
      startAudioAnimation(audioAnalyser);
    }
  }, [audioAnalyser]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default ShaderViewer; 