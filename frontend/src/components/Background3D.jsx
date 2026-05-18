import React, { useEffect, useRef } from 'react';

const Background3D = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, targetX: window.innerWidth / 2, targetY: window.innerHeight / 2 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    // 3D Starfield
    const stars = Array.from({ length: 300 }, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: Math.random() * 2000,
      size: Math.random() * 1.5 + 0.5
    }));

    // 3D Geometric Shapes Data
    const shapes = [
      {
        type: 'cube',
        xOff: 0.85, yOff: 0.2, // Screen position %
        size: 250,
        zPos: 4,
        rotX: 0, rotY: 0, rotZ: 0,
        speedX: 0.005, speedY: 0.007, speedZ: 0.003,
        vertices: [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ],
        edges: [
          [0,1], [1,2], [2,3], [3,0],
          [4,5], [5,6], [6,7], [7,4],
          [0,4], [1,5], [2,6], [3,7]
        ]
      },
      {
        type: 'pyramid',
        xOff: 0.15, yOff: 0.8,
        size: 200,
        zPos: 5,
        rotX: 0, rotY: 0, rotZ: 0,
        speedX: -0.004, speedY: 0.006, speedZ: 0.008,
        vertices: [
          [0, -1, 0], // Top
          [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1] // Base
        ],
        edges: [
          [0,1], [0,2], [0,3], [0,4],
          [1,2], [2,3], [3,4], [4,1]
        ]
      }
    ];

    const animate = () => {
      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      
      const mouseOffsetX = (mouseRef.current.x - width / 2) * 0.05;
      const mouseOffsetY = (mouseRef.current.y - height / 2) * 0.05;

      ctx.clearRect(0, 0, width, height);
      
      const cx = width / 2;
      const cy = height / 2;
      const fov = 400;

      // Draw 3D Stars (Parallaxed by mouse)
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.fillStyle = isLight ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.5)';
      
      stars.forEach(star => {
        star.z -= 1.5;
        if (star.z <= 0) {
          star.z = 2000;
          star.x = (Math.random() - 0.5) * 2000;
          star.y = (Math.random() - 0.5) * 2000;
        }
        
        const scale = fov / (fov + star.z);
        const px = (star.x - mouseOffsetX * (2000 - star.z) * 0.001) * scale + cx;
        const py = (star.y - mouseOffsetY * (2000 - star.z) * 0.001) * scale + cy;
        const radius = Math.max(0.1, star.size * scale);
        
        if (px > 0 && px < width && py > 0 && py < height) {
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw 3D Wireframe Shapes
      ctx.strokeStyle = isLight ? 'rgba(99, 102, 241, 0.25)' : 'rgba(139, 92, 246, 0.25)';
      ctx.lineWidth = 1.5;

      shapes.forEach(shape => {
        shape.rotX += shape.speedX;
        shape.rotY += shape.speedY;
        shape.rotZ += shape.speedZ;

        const sX = Math.sin(shape.rotX), cX = Math.cos(shape.rotX);
        const sY = Math.sin(shape.rotY), cY = Math.cos(shape.rotY);
        const sZ = Math.sin(shape.rotZ), cZ = Math.cos(shape.rotZ);

        const projected = shape.vertices.map(v => {
          // Rot Z
          let x1 = v[0] * cZ - v[1] * sZ;
          let y1 = v[0] * sZ + v[1] * cZ;
          let z1 = v[2];
          // Rot Y
          let x2 = x1 * cY - z1 * sY;
          let y2 = y1;
          let z2 = x1 * sY + z1 * cY;
          // Rot X
          let x3 = x2;
          let y3 = y2 * cX - z2 * sX;
          let z3 = y2 * sX + z2 * cX;

          // Parallax Translation & Projection
          z3 += shape.zPos;
          const scale = shape.size / z3;
          
          const px = x3 * scale + (width * shape.xOff) - (mouseOffsetX * 0.5);
          const py = y3 * scale + (height * shape.yOff) - (mouseOffsetY * 0.5);
          return [px, py];
        });

        shape.edges.forEach(edge => {
          ctx.beginPath();
          ctx.moveTo(projected[edge[0]][0], projected[edge[0]][1]);
          ctx.lineTo(projected[edge[1]][0], projected[edge[1]][1]);
          ctx.stroke();
        });
      });

      requestAnimationFrame(animate);
    };
    
    let animId = requestAnimationFrame(animate);

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', background: 'var(--bg-0)' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
    </div>
  );
};

export default Background3D;
