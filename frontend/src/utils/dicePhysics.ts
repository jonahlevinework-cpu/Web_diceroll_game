// 3D Dice Physics Engine (Clean Rewrite)

// --- MATH CLASSES ---
export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v: Vec3): Vec3 {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(s: number): Vec3 {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    div(s: number): Vec3 {
        return new Vec3(this.x / s, this.y / s, this.z / s);
    }

    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v: Vec3): Vec3 {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalized(): Vec3 {
        const l = this.length();
        return l > 0 ? this.div(l) : new Vec3(0, 0, 0);
    }
}

export class Mat3 {
    m: number[][];

    constructor(rows?: number[][]) {
        this.m = rows || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }

    static identity(): Mat3 {
        return new Mat3();
    }

    static fromAxisAngle(axis: Vec3, angle: number): Mat3 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const t = 1 - c;
        const x = axis.x, y = axis.y, z = axis.z;

        return new Mat3([
            [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
            [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
            [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
        ]);
    }

    mulVec(v: Vec3): Vec3 {
        return new Vec3(
            this.m[0][0] * v.x + this.m[0][1] * v.y + this.m[0][2] * v.z,
            this.m[1][0] * v.x + this.m[1][1] * v.y + this.m[1][2] * v.z,
            this.m[2][0] * v.x + this.m[2][1] * v.y + this.m[2][2] * v.z
        );
    }

    mulMat(other: Mat3): Mat3 {
        const res: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    res[i][j] += this.m[i][k] * other.m[k][j];
                }
            }
        }
        return new Mat3(res);
    }

    transpose(): Mat3 {
        return new Mat3([
            [this.m[0][0], this.m[1][0], this.m[2][0]],
            [this.m[0][1], this.m[1][1], this.m[2][1]],
            [this.m[0][2], this.m[1][2], this.m[2][2]]
        ]);
    }
}

// --- DICE GEOMETRY ---
export const D6_VERTICES = [
    new Vec3(-1, -1, 1), new Vec3(1, -1, 1), new Vec3(1, 1, 1), new Vec3(-1, 1, 1),
    new Vec3(-1, -1, -1), new Vec3(1, -1, -1), new Vec3(1, 1, -1), new Vec3(-1, 1, -1)
];

export const D6_FACES = [
    [0, 1, 2, 3], // front (1)
    [5, 4, 7, 6], // back (6)
    [4, 0, 3, 7], // left (5)
    [1, 5, 6, 2], // right (2)
    [3, 2, 6, 7], // top (3)
    [4, 5, 1, 0]  // bottom (4)
];

export const FACE_VALUES: Record<number, number> = {
    0: 1, 1: 6, 2: 5, 3: 2, 4: 3, 5: 4
};

// --- PHYSICS CONFIGURATION ---
export const PHYSICS_CONFIG = {
    GRAVITY: -9.8,
    RESTITUTION: 0.4,
    FRICTION: 0.9,
    ANGULAR_DAMPING: 0.98,
    LINEAR_DAMPING: 0.99,
    REST_LINEAR_THRESHOLD: 0.05,
    REST_ANGULAR_THRESHOLD: 0.05,
    REST_FRAMES_NEEDED: 15
};

// --- RIGID BODY ---
interface Collision {
    point: Vec3;
    normal: Vec3;
    penetration: number;
}

export class RigidBody {
    position: Vec3;
    velocity: Vec3;
    rotation: Mat3;
    angularVelocity: Vec3;
    mass: number;
    invMass: number;
    size: number;
    inertia: Mat3;
    invInertia: Mat3;
    atRest: boolean;
    restFrames: number;

    constructor() {
        this.position = new Vec3(0, 5, 0);
        this.velocity = new Vec3(0, 0, 0);
        this.rotation = Mat3.identity();
        this.angularVelocity = new Vec3(0, 0, 0);
        this.mass = 1.0;
        this.invMass = 1.0;
        this.size = 0.167; // Standard dice size

        const I = (1 / 6) * this.mass * (this.size * this.size);
        this.inertia = new Mat3([[I, 0, 0], [0, I, 0], [0, 0, I]]);
        this.invInertia = new Mat3([[1 / I, 0, 0], [0, 1 / I, 0], [0, 0, 1 / I]]);
        this.atRest = false;
        this.restFrames = 0;
    }

    getVertices(): Vec3[] {
        return D6_VERTICES
            .map(v => v.mul(this.size))
            .map(v => this.rotation.mulVec(v).add(this.position));
    }

    applyImpulse(impulse: Vec3, contactPoint: Vec3): void {
        this.velocity = this.velocity.add(impulse.mul(this.invMass));
        const r = contactPoint.sub(this.position);
        const torque = r.cross(impulse);
        const invInertiaWorld = this.rotation.mulMat(this.invInertia).mulMat(this.rotation.transpose());
        this.angularVelocity = this.angularVelocity.add(invInertiaWorld.mulVec(torque));
    }

    integrate(dt: number): void {
        if (this.atRest) return;

        this.velocity = this.velocity.add(new Vec3(0, PHYSICS_CONFIG.GRAVITY * dt, 0)).mul(PHYSICS_CONFIG.LINEAR_DAMPING);
        this.position = this.position.add(this.velocity.mul(dt));
        this.angularVelocity = this.angularVelocity.mul(PHYSICS_CONFIG.ANGULAR_DAMPING);

        const angle = this.angularVelocity.length() * dt;
        if (angle > 0.0001) {
            this.rotation = Mat3.fromAxisAngle(this.angularVelocity.normalized(), angle).mulMat(this.rotation);
        }

        if (
            this.velocity.length() < PHYSICS_CONFIG.REST_LINEAR_THRESHOLD &&
            this.angularVelocity.length() < PHYSICS_CONFIG.REST_ANGULAR_THRESHOLD &&
            this.position.y < this.size * 1.5
        ) {
            this.restFrames++;
            if (this.restFrames >= PHYSICS_CONFIG.REST_FRAMES_NEEDED) {
                this.atRest = true;
                this.velocity = new Vec3(0, 0, 0);
                this.angularVelocity = new Vec3(0, 0, 0);
            }
        } else {
            this.restFrames = 0;
            this.atRest = false;
        }
    }

    throwDice(): void {
        this.position = new Vec3(
            (Math.random() - 0.5) * 0.5,
            1.5,
            (Math.random() - 0.5) * 0.5
        );
        this.velocity = new Vec3(
            (Math.random() - 0.5) * 6,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 6
        );
        this.angularVelocity = new Vec3(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30
        );
        this.rotation = Mat3.identity();
        this.atRest = false;
        this.restFrames = 0;
    }

    detectCollisions(): Collision[] {
        const cols: Collision[] = [];
        for (const v of this.getVertices()) {
            if (v.y < 0) {
                cols.push({
                    point: v,
                    normal: new Vec3(0, 1, 0),
                    penetration: -v.y
                });
            }
        }
        return cols;
    }

    resolveCollision(col: Collision): void {
        const { point, normal, penetration } = col;
        this.position = this.position.add(normal.mul(penetration));

        const r = point.sub(this.position);
        const pointVel = this.velocity.add(this.angularVelocity.cross(r));
        const velNormal = pointVel.dot(normal);

        if (velNormal < 0) {
            const rCrossN = r.cross(normal);
            const invInertiaWorld = this.rotation.mulMat(this.invInertia).mulMat(this.rotation.transpose());
            const angularTerm = invInertiaWorld.mulVec(rCrossN).cross(r).dot(normal);
            const impulseMag = -(1 + PHYSICS_CONFIG.RESTITUTION) * velNormal / (this.invMass + angularTerm);

            this.applyImpulse(normal.mul(impulseMag), point);

            const newPointVel = this.velocity.add(this.angularVelocity.cross(r));
            const velTangent = newPointVel.sub(normal.mul(newPointVel.dot(normal)));

            if (velTangent.length() > 0.001) {
                const frictionMag = Math.min(PHYSICS_CONFIG.FRICTION * impulseMag, velTangent.length() * this.mass);
                this.applyImpulse(velTangent.normalized().mul(-frictionMag), point);
            }
        }
    }

    update(dt: number): void {
        this.integrate(dt);
        const collisions = this.detectCollisions();
        for (const col of collisions) {
            this.resolveCollision(col);
        }
    }

    getTopFace(): number {
        const up = new Vec3(0, 1, 0);
        let maxDot = -Infinity;
        let topFaceIndex = 0;

        for (let i = 0; i < D6_FACES.length; i++) {
            const f = D6_FACES[i];
            const v0 = D6_VERTICES[f[0]];
            const v1 = D6_VERTICES[f[1]];
            const v2 = D6_VERTICES[f[2]];
            const normal = v1.sub(v0).cross(v2.sub(v0)).normalized();
            const dot = this.rotation.mulVec(normal).dot(up);

            if (dot > maxDot) {
                maxDot = dot;
                topFaceIndex = i;
            }
        }

        return FACE_VALUES[topFaceIndex];
    }
}
