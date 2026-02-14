import { useEffect, useRef } from 'react';
import { RigidBody, D6_FACES, FACE_VALUES } from '../utils/dicePhysics';
import type { Vec3 } from '../utils/dicePhysics';

interface DiceCanvasProps {
    onRollComplete?: (value: number) => void;
    triggerRoll?: number;
}

interface ProjectedPoint {
    px: number;
    py: number;
    z: number;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const SUBSTEPS = 8;

const COLOR_CUBE = '#00ffc8';
const COLOR_WIRE = '#000000';
const COLOR_PIP = '#1e3c78';

// Fixed camera settings for visibility
const CAM_DISTANCE = 6;
const CAM_HEIGHT = 5;
const CAM_TILT = 0.4;

export function DiceCanvas({ triggerRoll, onRollComplete }: DiceCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bodyRef = useRef<RigidBody>(new RigidBody());
    const animationRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const waitingForResultRef = useRef<boolean>(false);
    const timeoutIdRef = useRef<number>();

    // Project 3D point to 2D canvas
    const project = (x: number, y: number, z: number): ProjectedPoint | null => {
        const scale = 120;
        const camX = 0;
        const camY = CAM_HEIGHT;
        const camZ = CAM_DISTANCE;

        const tiltAngle = CAM_TILT;
        const cosT = Math.cos(tiltAngle);
        const sinT = Math.sin(tiltAngle);

        const dx = x - camX;
        let dy = y - camY;
        let dz = z - camZ;

        const dy2 = dy * cosT - dz * sinT;
        const dz2 = dy * sinT + dz * cosT;
        dy = dy2;
        dz = dz2;

        if (dz > -0.1) return null;

        const px = CANVAS_WIDTH / 2 + (dx / -dz) * scale;
        const py = CANVAS_HEIGHT / 2 - (dy / -dz) * scale;

        return { px, py, z: dz };
    };

    // Draw pips on a dice face
    const drawPips = (ctx: CanvasRenderingContext2D, faceValue: number, verts: ProjectedPoint[]) => {
        const centerX = verts.reduce((sum, v) => sum + v.px, 0) / verts.length;
        const centerY = verts.reduce((sum, v) => sum + v.py, 0) / verts.length;

        const dx = verts[1].px - verts[0].px;
        const dy = verts[1].py - verts[0].py;
        const faceSize = Math.sqrt(dx * dx + dy * dy);
        const radius = faceSize / 12;

        ctx.fillStyle = COLOR_PIP;

        const drawPip = (px: number, py: number) => {
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
        };

        const offset = faceSize / 4;

        if (faceValue === 1) {
            drawPip(centerX, centerY);
        } else if (faceValue === 2) {
            drawPip(centerX - offset, centerY - offset);
            drawPip(centerX + offset, centerY + offset);
        } else if (faceValue === 3) {
            drawPip(centerX - offset, centerY - offset);
            drawPip(centerX, centerY);
            drawPip(centerX + offset, centerY + offset);
        } else if (faceValue === 4) {
            drawPip(centerX - offset, centerY - offset);
            drawPip(centerX + offset, centerY - offset);
            drawPip(centerX - offset, centerY + offset);
            drawPip(centerX + offset, centerY + offset);
        } else if (faceValue === 5) {
            drawPip(centerX - offset, centerY - offset);
            drawPip(centerX + offset, centerY - offset);
            drawPip(centerX, centerY);
            drawPip(centerX - offset, centerY + offset);
            drawPip(centerX + offset, centerY + offset);
        } else if (faceValue === 6) {
            drawPip(centerX - offset, centerY - offset);
            drawPip(centerX + offset, centerY - offset);
            drawPip(centerX - offset, centerY);
            drawPip(centerX + offset, centerY);
            drawPip(centerX - offset, centerY + offset);
            drawPip(centerX + offset, centerY + offset);
        }
    };

    // Render the dice
    const draw = (ctx: CanvasRenderingContext2D, body: RigidBody) => {
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#2d1b4e');
        gradient.addColorStop(1, '#1a0f2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw floor plane
        const floorSize = 4;
        const floorCorners = [
            { x: -floorSize, y: 0, z: -floorSize },
            { x: floorSize, y: 0, z: -floorSize },
            { x: floorSize, y: 0, z: floorSize },
            { x: -floorSize, y: 0, z: floorSize }
        ];

        const floorProjected = floorCorners.map(c => project(c.x, c.y, c.z));
        if (floorProjected.every(p => p !== null)) {
            ctx.beginPath();
            ctx.moveTo(floorProjected[0]!.px, floorProjected[0]!.py);
            for (let i = 1; i < floorProjected.length; i++) {
                ctx.lineTo(floorProjected[i]!.px, floorProjected[i]!.py);
            }
            ctx.closePath();

            ctx.fillStyle = 'rgba(150, 120, 200, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(180, 150, 220, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw dice
        const projected = body.getVertices().map((v: Vec3) => project(v.x, v.y, v.z));
        const facesToDraw: { z: number; verts: ProjectedPoint[]; faceIndex: number }[] = [];

        for (let i = 0; i < D6_FACES.length; i++) {
            const pVerts = D6_FACES[i].map(idx => projected[idx]);
            if (pVerts.some(p => p === null)) continue;

            const avgZ = pVerts.reduce((sum, p) => sum + (p?.z || 0), 0) / pVerts.length;
            facesToDraw.push({ z: avgZ, verts: pVerts as ProjectedPoint[], faceIndex: i });
        }

        facesToDraw.sort((a, b) => b.z - a.z);

        for (const face of facesToDraw) {
            ctx.beginPath();
            ctx.moveTo(face.verts[0].px, face.verts[0].py);
            for (let j = 1; j < face.verts.length; j++) {
                ctx.lineTo(face.verts[j].px, face.verts[j].py);
            }
            ctx.closePath();

            ctx.fillStyle = COLOR_CUBE;
            ctx.fill();
            ctx.strokeStyle = COLOR_WIRE;
            ctx.lineWidth = 2;
            ctx.stroke();

            const faceValue = FACE_VALUES[face.faceIndex];
            if (faceValue) {
                drawPips(ctx, faceValue, face.verts);
            }
        }
    };

    // Trigger roll when prop changes
    useEffect(() => {
        if (triggerRoll && triggerRoll > 0) {
            // Clear any existing timeout
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }

            bodyRef.current.throwDice();
            waitingForResultRef.current = true;

            // Fallback timeout in case dice doesn't settle
            timeoutIdRef.current = window.setTimeout(() => {
                if (waitingForResultRef.current) {
                    console.log('⏰ Dice timeout - forcing settlement');
                    waitingForResultRef.current = false;
                    const body = bodyRef.current;
                    body.atRest = true;
                    const topFace = body.getTopFace();
                    if (onRollComplete) {
                        onRollComplete(topFace);
                    }
                }
            }, 5000);
        }
    }, [triggerRoll, onRollComplete]);

    // Animation Loop
    useEffect(() => {
        const loop = (time: number) => {
            const deltaTime = lastTimeRef.current === 0 ? 0 : (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;

            const body = bodyRef.current;

            // Physics update
            const dt = Math.min(deltaTime, 0.1) / SUBSTEPS;
            for (let i = 0; i < SUBSTEPS; i++) {
                body.update(dt);
            }

            // Check for settlement
            const wasRolling = !body.atRest;
            if (wasRolling && body.atRest && waitingForResultRef.current) {
                waitingForResultRef.current = false;
                if (timeoutIdRef.current) {
                    clearTimeout(timeoutIdRef.current);
                }
                const topFace = body.getTopFace();
                setTimeout(() => {
                    if (onRollComplete) {
                        onRollComplete(topFace);
                    }
                }, 500);
            }

            // Rendering
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    draw(ctx, body);
                }
            }

            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, []); // Empty dependency array, but loop uses refs so it's fine

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
                border: '2px solid #222',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0f2e 100%)'
            }}
        />
    );
}

export default DiceCanvas;
