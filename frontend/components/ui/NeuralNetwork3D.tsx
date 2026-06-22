'use client';

import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '@/lib/store/themeStore';

interface Node {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  vz: number;
}

export default function NeuralNetwork3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useThemeStore((state) => state.theme);
  const mouseRef = useRef({ x: 0, y: 0, rx: 0, ry: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const nodes: Node[] = [];
    const nodeCount = 100;
    const connectionDistance = 90;
    const focalLength = 300;

    // Generate random 3D positions in a sphere
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 60 + Math.random() * 110;

      nodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        px: 0,
        py: 0,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
      });
    }

    // Rotation angles
    let angleX = 0.001;
    let angleY = 0.0015;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left - width / 2;
      mouseRef.current.y = e.clientY - rect.top - height / 2;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const getAccentColors = () => {
      switch (theme) {
        case 'light':
          return { node: 'rgba(79, 70, 229, 0.45)', line: 'rgba(79, 70, 229, 0.08)' };
        case 'midnight':
          return { node: 'rgba(16, 185, 129, 0.5)', line: 'rgba(16, 185, 129, 0.1)' };
        case 'glass':
          return { node: 'rgba(168, 85, 247, 0.5)', line: 'rgba(168, 85, 247, 0.1)' };
        default: // dark
          return { node: 'rgba(99, 102, 241, 0.4)', line: 'rgba(99, 102, 241, 0.07)' };
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Interpolate mouse coordinates smoothly
      mouseRef.current.rx += (mouseRef.current.x - mouseRef.current.rx) * 0.08;
      mouseRef.current.ry += (mouseRef.current.y - mouseRef.current.ry) * 0.08;

      const colors = getAccentColors();

      // Cosine and Sine calculations for rotations
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // Update positions & project to 2D
      nodes.forEach((node) => {
        // Natural orbits / moves
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        // Sphere bounds return force
        const dist = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
        if (dist > 180) {
          node.vx -= (node.x / dist) * 0.005;
          node.vy -= (node.y / dist) * 0.005;
          node.vz -= (node.z / dist) * 0.005;
        }

        // Apply 3D Rotations
        // Rotate Y
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;

        // Rotate X
        let y2 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        node.x = x1;
        node.y = y2;
        node.z = z2;

        // Mouse attraction pull
        if (mouseRef.current.active) {
          const dx = mouseRef.current.rx - node.x;
          const dy = mouseRef.current.ry - node.y;
          const mDist = Math.sqrt(dx * dx + dy * dy);
          if (mDist < 250) {
            node.x += dx * 0.002;
            node.y += dy * 0.002;
          }
        }

        // 3D perspective projection
        const scale = focalLength / (focalLength + node.z);
        node.px = node.x * scale + width / 2;
        node.py = node.y * scale + height / 2;
      });

      // Draw connections (synapses)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];

          // Calculate 3D Euclidean distance
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist3D < connectionDistance) {
            const alpha = (1 - dist3D / connectionDistance) * 0.55;
            ctx.strokeStyle = colors.line;
            ctx.lineWidth = alpha * 1.2;
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      nodes.forEach((node) => {
        const scale = focalLength / (focalLength + node.z);
        const radius = Math.max(0.5, scale * 2.2);

        // Map depth to opacity
        const depthOpacity = Math.max(0.1, Math.min(1, (node.z + 180) / 360));
        ctx.fillStyle = colors.node;
        ctx.beginPath();
        ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-45 z-0" />;
}
