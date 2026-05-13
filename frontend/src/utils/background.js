/* ============================================================
   NexusAI — Immersive 3D Background Logic
   ============================================================ */

export const initBackground = () => {
    const canvas = document.getElementById('three-bg');
    if (!canvas || !window.THREE) return;

    const isLowEnd = navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent);
    const DPR = Math.min(window.devicePixelRatio, isLowEnd ? 1 : 1.5);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 0, 40);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isLowEnd, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x000000, 0);

    const palette = [
        new THREE.Color(0x7c3aed),
        new THREE.Color(0x06b6d4),
        new THREE.Color(0x3b82f6),
        new THREE.Color(0x8b5cf6),
        new THREE.Color(0x0ea5e9),
        new THREE.Color(0xa855f7),
    ];

    const nebulaGroup = new THREE.Group();
    const nebulaCount = isLowEnd ? 4 : 8;

    for (let i = 0; i < nebulaCount; i++) {
        const radius = 4 + Math.random() * 10;
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        const c = palette[i % palette.length];
        const mat = new THREE.MeshBasicMaterial({
            color: c,
            transparent: true,
            opacity: 0.025 + Math.random() * 0.02,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 50,
            -20 - Math.random() * 30
        );
        mesh.userData = {
            speed: 0.001 + Math.random() * 0.003,
            offset: Math.random() * Math.PI * 2,
            rx: 10 + Math.random() * 20,
            ry: 8 + Math.random() * 15,
            baseOpacity: mat.opacity,
        };
        nebulaGroup.add(mesh);
    }
    scene.add(nebulaGroup);

    const PARTICLE_COUNT = isLowEnd ? 80 : 200;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pCol = new Float32Array(PARTICLE_COUNT * 3);
    const pVel = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        pPos[i * 3]     = (Math.random() - 0.5) * 80;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 50;

        pVel.push({
            x: (Math.random() - 0.5) * 0.008,
            y: (Math.random() - 0.5) * 0.008,
            z: (Math.random() - 0.5) * 0.004,
        });

        const c = palette[Math.floor(Math.random() * palette.length)];
        pCol[i * 3]     = c.r;
        pCol[i * 3 + 1] = c.g;
        pCol[i * 3 + 2] = c.b;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

    const pMat = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    const LINE_MAX = isLowEnd ? 100 : 250;
    const lGeo = new THREE.BufferGeometry();
    const lPos = new Float32Array(LINE_MAX * 6);
    const lCol = new Float32Array(LINE_MAX * 6);
    lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 3));

    const lMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const lineSegments = new THREE.LineSegments(lGeo, lMat);
    scene.add(lineSegments);

    const geoGroup = new THREE.Group();
    if (!isLowEnd) {
        const shapes = [
            new THREE.IcosahedronGeometry(1.2, 1),
            new THREE.OctahedronGeometry(0.9, 0),
            new THREE.TorusGeometry(1, 0.3, 8, 16),
        ];

        for (let i = 0; i < 3; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: palette[i],
                wireframe: true,
                transparent: true,
                opacity: 0.08,
                blending: THREE.AdditiveBlending,
            });
            const mesh = new THREE.Mesh(shapes[i], mat);
            mesh.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30, -5 - Math.random() * 15);
            mesh.userData = {
                rotSpeed: { x: 0.001 + Math.random() * 0.003, y: 0.002 + Math.random() * 0.003 },
                floatSpeed: 0.0005 + Math.random() * 0.001,
                floatOffset: Math.random() * Math.PI * 2,
            };
            geoGroup.add(mesh);
        }
    }
    scene.add(geoGroup);

    let mouseX = 0, mouseY = 0, targetMX = 0, targetMY = 0;
    const onMouseMove = (e) => {
        targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    document.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize, { passive: true });

    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
        animId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        mouseX += (targetMX - mouseX) * 0.03;
        mouseY += (targetMY - mouseY) * 0.03;

        const posArr = pGeo.attributes.position.array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            posArr[i * 3] += pVel[i].x;
            posArr[i * 3 + 1] += pVel[i].y;
            posArr[i * 3 + 2] += pVel[i].z;
            if (posArr[i * 3] > 40) posArr[i * 3] = -40;
            if (posArr[i * 3] < -40) posArr[i * 3] = 40;
            if (posArr[i * 3 + 1] > 30) posArr[i * 3 + 1] = -30;
            if (posArr[i * 3 + 1] < -30) posArr[i * 3 + 1] = 30;
            if (posArr[i * 3 + 2] > 25) posArr[i * 3 + 2] = -25;
            if (posArr[i * 3 + 2] < -25) posArr[i * 3 + 2] = 25;
        }
        pGeo.attributes.position.needsUpdate = true;

        let lIdx = 0;
        const threshold = 7;
        for (let i = 0; i < PARTICLE_COUNT && lIdx < LINE_MAX; i += 2) {
            for (let j = i + 1; j < PARTICLE_COUNT && lIdx < LINE_MAX; j += 2) {
                const dist = Math.pow(posArr[i*3]-posArr[j*3], 2) + Math.pow(posArr[i*3+1]-posArr[j*3+1], 2);
                if (dist < threshold * threshold) {
                    const alpha = 1 - Math.sqrt(dist) / threshold;
                    lPos[lIdx*6] = posArr[i*3]; lPos[lIdx*6+1] = posArr[i*3+1]; lPos[lIdx*6+2] = posArr[i*3+2];
                    lPos[lIdx*6+3] = posArr[j*3]; lPos[lIdx*6+4] = posArr[j*3+1]; lPos[lIdx*6+5] = posArr[j*3+2];
                    lCol[lIdx*6] = 0.49 * alpha; lCol[lIdx*6+1] = 0.23 * alpha; lCol[lIdx*6+2] = 0.93 * alpha;
                    lCol[lIdx*6+3] = 0.02 * alpha; lCol[lIdx*6+4] = 0.71 * alpha; lCol[lIdx*6+5] = 0.83 * alpha;
                    lIdx++;
                }
            }
        }
        lGeo.attributes.position.needsUpdate = true;
        lGeo.attributes.color.needsUpdate = true;
        lGeo.setDrawRange(0, lIdx * 2);

        camera.position.x += (mouseX * 4 - camera.position.x) * 0.015;
        camera.position.y += (-mouseY * 3 - camera.position.y) * 0.015;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    };

    animate();

    return () => {
        cancelAnimationFrame(animId);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
    };
};
