'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/lib/store/themeStore';

interface Particle {
  x: number;
  y: number;
  z: number; // depth for 3D parallax
  vx: number;
  vy: number;
  size: number;
  color: string;
}

interface NeuralNode {
  x: number;
  y: number;
  z: number; // depth [50, 300]
  vx: number;
  vy: number;
  ox: number; // original position
  oy: number;
}

interface EnergyWave {
  yBase: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  color: string;
  width: number;
}

interface DataStream {
  x: number;
  y: number;
  speed: number;
  characters: string[];
  opacity: number;
}

const BackgroundEffects = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useThemeStore((state) => state.theme);
  const mouseRef = useRef({ x: 0, y: 0, rx: 0, ry: 0, active: false, speed: 0 });
  const scrollRef = useRef(0);
  const lastMouseRef = useRef({ x: 0, y: 0, time: Date.now() });
  
  // Track mount state to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Color definitions based on current active theme store state
    const getColors = () => {
      switch (theme) {
        case 'light':
          return {
            bg: '#05050f',
            glow1: 'rgba(59, 130, 246, 0.08)',
            glow2: 'rgba(6, 182, 212, 0.06)',
            node: 'rgba(59, 130, 246, 0.35)',
            line: 'rgba(59, 130, 246, 0.06)',
            particle: 'rgba(59, 130, 246, 0.15)',
            textStream: 'rgba(59, 130, 246, 0.08)',
            wave: 'rgba(59, 130, 246, 0.04)',
          };
        case 'midnight':
          return {
            bg: '#000000',
            glow1: 'rgba(16, 185, 129, 0.08)',
            glow2: 'rgba(6, 182, 212, 0.05)',
            node: 'rgba(16, 185, 129, 0.4)',
            line: 'rgba(16, 185, 129, 0.07)',
            particle: 'rgba(16, 185, 129, 0.2)',
            textStream: 'rgba(16, 185, 129, 0.08)',
            wave: 'rgba(16, 185, 129, 0.03)',
          };
        case 'glass':
          return {
            bg: '#020617',
            glow1: 'rgba(168, 85, 247, 0.1)',
            glow2: 'rgba(6, 182, 212, 0.06)',
            node: 'rgba(168, 85, 247, 0.45)',
            line: 'rgba(168, 85, 247, 0.08)',
            particle: 'rgba(168, 85, 247, 0.25)',
            textStream: 'rgba(168, 85, 247, 0.09)',
            wave: 'rgba(168, 85, 247, 0.04)',
          };
        default: // dark
          return {
            bg: '#050816',
            glow1: 'rgba(0, 229, 255, 0.08)',
            glow2: 'rgba(123, 97, 255, 0.06)',
            node: 'rgba(0, 229, 255, 0.4)',
            line: 'rgba(123, 97, 255, 0.07)',
            particle: 'rgba(0, 229, 255, 0.18)',
            textStream: 'rgba(0, 229, 255, 0.07)',
            wave: 'rgba(123, 97, 255, 0.03)',
          };
      }
    };

    // Responsive capacity check
    const isMobile = width < 768;
    const maxNodes = isMobile ? 20 : 55;
    const maxParticles = isMobile ? 35 : 80;
    const maxStreams = isMobile ? 5 : 12;

    const nodes: NeuralNode[] = [];
    const particles: Particle[] = [];
    const streams: DataStream[] = [];

    // Initialize Nodes
    for (let i = 0; i < maxNodes; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      nodes.push({
        x: rx,
        y: ry,
        z: 50 + Math.random() * 250,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        ox: rx,
        oy: ry,
      });
    }

    // Initialize Particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.5 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.4, // float upwards
        size: 0.5 + Math.random() * 2,
        color: '',
      });
    }

    // Initialize Data Streams
    const charList = '01010101ABCDEFUX'.split('');
    for (let i = 0; i < maxStreams; i++) {
      const streamChars = [];
      const len = 5 + Math.floor(Math.random() * 10);
      for (let j = 0; j < len; j++) {
        streamChars.push(charList[Math.floor(Math.random() * charList.length)]);
      }
      
      streams.push({
        x: Math.random() * width,
        y: Math.random() * -300,
        speed: 1 + Math.random() * 2.5,
        characters: streamChars,
        opacity: 0.15 + Math.random() * 0.5,
      });
    }

    // Waves configuration
    const waves: EnergyWave[] = [
      { yBase: 0.3, amplitude: 40, frequency: 0.002, speed: 0.0005, phase: 0, color: 'glow1', width: 1.2 },
      { yBase: 0.65, amplitude: 60, frequency: 0.0015, speed: -0.0003, phase: Math.PI / 3, color: 'glow2', width: 1.8 }
    ];

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const now = Date.now();
      const dt = now - lastMouseRef.current.time;
      if (dt > 0) {
        const dx = mx - lastMouseRef.current.x;
        const dy = my - lastMouseRef.current.y;
        mouseRef.current.speed = Math.min(12, Math.sqrt(dx * dx + dy * dy) / dt);
      }

      mouseRef.current.x = mx;
      mouseRef.current.y = my;
      mouseRef.current.active = true;

      lastMouseRef.current.x = mx;
      lastMouseRef.current.y = my;
      lastMouseRef.current.time = now;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    let focalLength = 200;
    let waveTime = 0;

    const render = () => {
      const colors = getColors();
      
      // Clear viewport
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      // Smooth mouse tracking interpolation
      mouseRef.current.rx += (mouseRef.current.x - mouseRef.current.rx) * 0.06;
      mouseRef.current.ry += (mouseRef.current.y - mouseRef.current.ry) * 0.06;

      const scrollY = scrollRef.current;
      waveTime += 0.0015;

      // ==========================================
      // 1. Ambient Volumetric Glow & Lighting
      // ==========================================
      const gradOrb1 = ctx.createRadialGradient(
        width * 0.2 + Math.sin(waveTime) * 60,
        height * 0.3 - scrollY * 0.1,
        20,
        width * 0.2 + Math.sin(waveTime) * 60,
        height * 0.3 - scrollY * 0.1,
        Math.min(width, height) * 0.6
      );
      gradOrb1.addColorStop(0, colors.glow1);
      gradOrb1.addColorStop(1, 'transparent');
      ctx.fillStyle = gradOrb1;
      ctx.beginPath();
      ctx.arc(
        width * 0.2 + Math.sin(waveTime) * 60,
        height * 0.3 - scrollY * 0.1,
        Math.min(width, height) * 0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const gradOrb2 = ctx.createRadialGradient(
        width * 0.8 + Math.cos(waveTime * 0.8) * 80,
        height * 0.7 - scrollY * 0.12,
        20,
        width * 0.8 + Math.cos(waveTime * 0.8) * 80,
        height * 0.7 - scrollY * 0.12,
        Math.min(width, height) * 0.5
      );
      gradOrb2.addColorStop(0, colors.glow2);
      gradOrb2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradOrb2;
      ctx.beginPath();
      ctx.arc(
        width * 0.8 + Math.cos(waveTime * 0.8) * 80,
        height * 0.7 - scrollY * 0.12,
        Math.min(width, height) * 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // ==========================================
      // 2. Holographic Sine Energy Waves
      // ==========================================
      waves.forEach((w) => {
        w.phase += w.speed;
        ctx.beginPath();
        ctx.strokeStyle = w.color === 'glow1' ? colors.glow1 : colors.glow2;
        ctx.lineWidth = w.width;

        for (let x = 0; x < width; x += isMobile ? 25 : 12) {
          const waveY = w.yBase * height + Math.sin(x * w.frequency + w.phase) * w.amplitude;
          const finalY = waveY - scrollY * 0.08;
          if (x === 0) {
            ctx.moveTo(x, finalY);
          } else {
            ctx.lineTo(x, finalY);
          }
        }
        ctx.stroke();
      });

      // ==========================================
      // 3. Falling Matrix Data Streams
      // ==========================================
      ctx.font = '10px monospace';
      streams.forEach((s) => {
        s.y += s.speed;
        
        // Reset stream once it falls off screen
        if (s.y > height) {
          s.y = -200;
          s.x = Math.random() * width;
          s.speed = 1 + Math.random() * 2;
        }

        // Draw character column
        s.characters.forEach((char, index) => {
          const charY = s.y + index * 12;
          // Apply scroll parallax
          const renderY = charY - scrollY * 0.1;
          
          if (renderY > -20 && renderY < height + 20) {
            const charOpacity = s.opacity * (1 - index / s.characters.length);
            ctx.fillStyle = colors.textStream.replace(/[\d.]+\)$/, `${charOpacity})`);
            ctx.fillText(char, s.x, renderY);
          }
        });

        // Randomly mutate characters
        if (Math.random() < 0.03) {
          const idx = Math.floor(Math.random() * s.characters.length);
          s.characters[idx] = charList[Math.floor(Math.random() * charList.length)];
        }
      });

      // ==========================================
      // 4. Parallax Floating Particles
      // ==========================================
      particles.forEach((p) => {
        const pParallax = scrollY * (p.z * 0.1);
        let renderY = p.y - pParallax;

        if (renderY < -10) {
          p.y = height + pParallax + 10;
          p.x = Math.random() * width;
          renderY = p.y - pParallax;
        }

        // Mouse displacement repulsion
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - renderY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const force = (100 - dist) * 0.0004;
            p.x -= dx * force * p.z;
            p.y -= dy * force * p.z;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = colors.particle;
        ctx.beginPath();
        ctx.arc(p.x, renderY, p.size * (p.z * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });

      // ==========================================
      // 5. 3D Neural Network Animation (Parallax Depth)
      // ==========================================
      const neuralParallax = scrollY * 0.25;
      
      // Update Nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Orbit returns
        const dx = node.x - node.ox;
        const dy = node.y - node.oy;
        node.vx -= dx * 0.0003;
        node.vy -= dy * 0.0003;

        // Smooth cursor attraction
        if (mouseRef.current.active) {
          const mdx = mouseRef.current.rx - node.x;
          const mdy = (mouseRef.current.ry + scrollY) - node.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 180) {
            const pullForce = (180 - mDist) * (0.0008 + mouseRef.current.speed * 0.0004);
            node.x += mdx * pullForce;
            node.y += mdy * pullForce;
          }
        }
      });

      // Project Nodes and Draw connections
      const projectedNodes = nodes.map((node) => {
        // Perspective scaling
        const scale = focalLength / (focalLength + node.z);
        return {
          px: node.x * scale + (1 - scale) * (width / 2) + (mouseRef.current.rx - width / 2) * (scale * 0.02),
          py: (node.y - neuralParallax) * scale + (1 - scale) * (height / 2),
          size: scale * 2.2,
          z: node.z
        };
      });

      // Connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projectedNodes.length; i++) {
        const n1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n2 = projectedNodes[j];

          // 2D projected distance check for connections
          const dx = n1.px - n2.px;
          const dy = n1.py - n2.py;
          const dist2D = Math.sqrt(dx * dx + dy * dy);
          
          if (dist2D < (isMobile ? 70 : 110)) {
            const maxDist = isMobile ? 70 : 110;
            const alpha = (1 - dist2D / maxDist) * 0.45 * Math.min(n1.size, n2.size);
            ctx.strokeStyle = colors.line.replace(/[\d.]+\)$/, `${alpha})`);
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      projectedNodes.forEach((node) => {
        ctx.fillStyle = colors.node.replace(/[\d.]+\)$/, `${Math.min(1, node.size * 0.5)})`);
        ctx.beginPath();
        ctx.arc(node.px, node.py, node.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ==========================================
      // 6. Interactive Cursor Halo Spotlight
      // ==========================================
      if (mouseRef.current.active) {
        const cursorGlow = ctx.createRadialGradient(
          mouseRef.current.rx,
          mouseRef.current.ry,
          5,
          mouseRef.current.rx,
          mouseRef.current.ry,
          160
        );
        cursorGlow.addColorStop(0, colors.glow1.replace(/[\d.]+\)$/, '0.2)'));
        cursorGlow.addColorStop(0.5, colors.glow2.replace(/[\d.]+\)$/, '0.08)'));
        cursorGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = cursorGlow;
        ctx.beginPath();
        ctx.arc(mouseRef.current.rx, mouseRef.current.ry, 160, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 -z-50 w-full h-full pointer-events-none"
        style={{ transform: 'translate3d(0,0,0)' }} // Enforces GPU Layer rendering
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </motion.div>
    </AnimatePresence>
  );
});

BackgroundEffects.displayName = 'BackgroundEffects';
export default BackgroundEffects;
