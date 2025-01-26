declare module 'shader-park-core' {
  import { Mesh } from 'three';

  export function sculptToThreeJSMesh(
    shaderString: string,
    options?: {
      time?: boolean;
      audio?: boolean;
      mouse?: boolean;
      [key: string]: any;
    }
  ): Mesh;
} 