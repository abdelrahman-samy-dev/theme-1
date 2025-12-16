/**
 * Light Rays Effect - Vanilla JavaScript version
 * Pure WebGL implementation (no external dependencies)
 * Based on: https://reactbits.dev/backgrounds/light-rays
 */

const DEFAULT_COLOR = '#ffffff';

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (origin, w, h) => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

// Simple WebGL utilities
const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

class LightRays {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      raysOrigin: options.raysOrigin || 'top-center',
      raysColor: options.raysColor || DEFAULT_COLOR,
      raysSpeed: options.raysSpeed || 1,
      lightSpread: options.lightSpread || 1,
      rayLength: options.rayLength || 2,
      pulsating: options.pulsating || false,
      fadeDistance: options.fadeDistance || 1.0,
      saturation: options.saturation || 1.0,
      followMouse: options.followMouse !== undefined ? options.followMouse : true,
      mouseInfluence: options.mouseInfluence || 0.1,
      noiseAmount: options.noiseAmount || 0.0,
      distortion: options.distortion || 0.0,
      ...options
    };

    this.gl = null;
    this.program = null;
    this.uniforms = {};
    this.animationId = null;
    this.mouse = { x: 0.5, y: 0.5 };
    this.smoothMouse = { x: 0.5, y: 0.5 };
    this.isVisible = false;
    this.observer = null;
    this.cleanupFunctions = [];
    this.time = 0;

    this.init();
  }

  init() {
    if (!this.container) return;

    // Intersection Observer for visibility
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) {
          this.initializeWebGL();
        } else {
          this.cleanup();
        }
      },
      { threshold: 0.1 }
    );

    this.observer.observe(this.container);

    // Mouse move handler
    if (this.options.followMouse) {
      const handleMouseMove = (e) => {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        this.mouse = { x, y };
      };

      window.addEventListener('mousemove', handleMouseMove);
      this.cleanupFunctions.push(() => {
        window.removeEventListener('mousemove', handleMouseMove);
      });
    }
  }

  initializeWebGL() {
    if (!this.container) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    // Clear container
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(canvas);

    // Get WebGL context
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    this.gl = gl;

    // Set up viewport
    const updateSize = () => {
      if (!this.container || !this.gl) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = this.container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    this.cleanupFunctions.push(() => {
      window.removeEventListener('resize', updateSize);
    });

    // Shaders
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_rayPos;
      uniform vec2 u_rayDir;
      uniform vec3 u_raysColor;
      uniform float u_raysSpeed;
      uniform float u_lightSpread;
      uniform float u_rayLength;
      uniform float u_pulsating;
      uniform float u_fadeDistance;
      uniform float u_saturation;
      uniform vec2 u_mousePos;
      uniform float u_mouseInfluence;
      uniform float u_noiseAmount;
      uniform float u_distortion;
      varying vec2 v_uv;

      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                        float seedA, float seedB, float speed) {
        vec2 sourceToCoord = coord - raySource;
        vec2 dirNorm = normalize(sourceToCoord);
        float cosAngle = dot(dirNorm, rayRefDirection);
        float distortedAngle = cosAngle + u_distortion * sin(u_time * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
        
        float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(u_lightSpread, 0.001));
        float distance = length(sourceToCoord);
        float maxDistance = u_resolution.x * u_rayLength;
        float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
        
        float fadeFalloff = clamp((u_resolution.x * u_fadeDistance - distance) / (u_resolution.x * u_fadeDistance), 0.5, 1.0);
        float pulse = u_pulsating > 0.5 ? (0.8 + 0.2 * sin(u_time * speed * 3.0)) : 1.0;
        float baseStrength = clamp(
          (0.45 + 0.15 * sin(distortedAngle * seedA + u_time * speed)) +
          (0.3 + 0.2 * cos(-distortedAngle * seedB + u_time * speed)),
          0.0, 1.0
        );
        return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
      }

      void main() {
        vec2 coord = vec2(v_uv.x * u_resolution.x, (1.0 - v_uv.y) * u_resolution.y);
        
        vec2 finalRayDir = u_rayDir;
        if (u_mouseInfluence > 0.0) {
          vec2 mouseScreenPos = u_mousePos * u_resolution.xy;
          vec2 mouseDirection = normalize(mouseScreenPos - u_rayPos);
          finalRayDir = normalize(mix(u_rayDir, mouseDirection, u_mouseInfluence));
        }

        vec4 rays1 = vec4(1.0) *
                     rayStrength(u_rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * u_raysSpeed);
        vec4 rays2 = vec4(1.0) *
                     rayStrength(u_rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * u_raysSpeed);
        vec4 fragColor = rays1 * 0.5 + rays2 * 0.4;

        if (u_noiseAmount > 0.0) {
          float n = noise(coord * 0.01 + u_time * 0.1);
          fragColor.rgb *= (1.0 - u_noiseAmount + u_noiseAmount * n);
        }

        float brightness = 1.0 - (coord.y / u_resolution.y);
        fragColor.x *= 0.1 + brightness * 0.8;
        fragColor.y *= 0.3 + brightness * 0.6;
        fragColor.z *= 0.5 + brightness * 0.5;

        if (u_saturation != 1.0) {
          float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
          fragColor.rgb = mix(vec3(gray), fragColor.rgb, u_saturation);
        }

        fragColor.rgb *= u_raysColor;
        gl_FragColor = fragColor;
      }
    `;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      console.error('Failed to create shaders');
      return;
    }

    // Create program
    this.program = createProgram(gl, vertexShader, fragmentShader);
    if (!this.program) {
      console.error('Failed to create program');
      return;
    }

    // Set up geometry (full screen triangle)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       3, -1,
      -1,  3
    ]), gl.STATIC_DRAW);

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    
    this.uniforms = {
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_rayPos: gl.getUniformLocation(this.program, 'u_rayPos'),
      u_rayDir: gl.getUniformLocation(this.program, 'u_rayDir'),
      u_raysColor: gl.getUniformLocation(this.program, 'u_raysColor'),
      u_raysSpeed: gl.getUniformLocation(this.program, 'u_raysSpeed'),
      u_lightSpread: gl.getUniformLocation(this.program, 'u_lightSpread'),
      u_rayLength: gl.getUniformLocation(this.program, 'u_rayLength'),
      u_pulsating: gl.getUniformLocation(this.program, 'u_pulsating'),
      u_fadeDistance: gl.getUniformLocation(this.program, 'u_fadeDistance'),
      u_saturation: gl.getUniformLocation(this.program, 'u_saturation'),
      u_mousePos: gl.getUniformLocation(this.program, 'u_mousePos'),
      u_mouseInfluence: gl.getUniformLocation(this.program, 'u_mouseInfluence'),
      u_noiseAmount: gl.getUniformLocation(this.program, 'u_noiseAmount'),
      u_distortion: gl.getUniformLocation(this.program, 'u_distortion')
    };

    // Set up attributes
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Initial uniform values
    const rgb = hexToRgb(this.options.raysColor);
    gl.useProgram(this.program);
    gl.uniform3f(this.uniforms.u_raysColor, rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(this.uniforms.u_raysSpeed, this.options.raysSpeed);
    gl.uniform1f(this.uniforms.u_lightSpread, this.options.lightSpread);
    gl.uniform1f(this.uniforms.u_rayLength, this.options.rayLength);
    gl.uniform1f(this.uniforms.u_pulsating, this.options.pulsating ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_fadeDistance, this.options.fadeDistance);
    gl.uniform1f(this.uniforms.u_saturation, this.options.saturation);
    gl.uniform1f(this.uniforms.u_mouseInfluence, this.options.mouseInfluence);
    gl.uniform1f(this.uniforms.u_noiseAmount, this.options.noiseAmount);
    gl.uniform1f(this.uniforms.u_distortion, this.options.distortion);

    // Update placement function
    const updatePlacement = () => {
      if (!this.container || !this.gl) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = this.container.getBoundingClientRect();
      const w = rect.width * dpr;
      const h = rect.height * dpr;
      
      gl.uniform2f(this.uniforms.u_resolution, w, h);
      
      const { anchor, dir } = getAnchorAndDir(this.options.raysOrigin, w, h);
      gl.uniform2f(this.uniforms.u_rayPos, anchor[0], anchor[1]);
      gl.uniform2f(this.uniforms.u_rayDir, dir[0], dir[1]);
    };

    updatePlacement();

    // Animation loop
    const loop = (currentTime) => {
      if (!this.gl || !this.isVisible) {
        return;
      }

      this.time = currentTime * 0.001;
      gl.uniform1f(this.uniforms.u_time, this.time);

      if (this.options.followMouse && this.options.mouseInfluence > 0.0) {
        const smoothing = 0.92;
        this.smoothMouse.x = this.smoothMouse.x * smoothing + this.mouse.x * (1 - smoothing);
        this.smoothMouse.y = this.smoothMouse.y * smoothing + this.mouse.y * (1 - smoothing);
        gl.uniform2f(this.uniforms.u_mousePos, this.smoothMouse.x, this.smoothMouse.y);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.gl) {
      const loseContextExt = this.gl.getExtension('WEBGL_lose_context');
      if (loseContextExt) {
        loseContextExt.loseContext();
      }
      this.gl = null;
    }

    this.program = null;
    this.uniforms = {};

    // Run all cleanup functions
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.cleanup();
  }
}

// Initialize Light Rays for Pricing Section
document.addEventListener('DOMContentLoaded', () => {
  const pricingLightRaysContainer = document.getElementById('pricingLightRays');
  if (pricingLightRaysContainer) {
    window.pricingLightRays = new LightRays(pricingLightRaysContainer, {
      raysOrigin: 'top-center',
      raysColor: '#00ffff',
      raysSpeed: 1.5,
      lightSpread: 0.8,
      rayLength: 1.2,
      followMouse: true,
      mouseInfluence: 0.1,
      noiseAmount: 0.1,
      distortion: 0.05
    });
  }

  // Initialize Light Rays for Checkout Section
  const checkoutLightRaysContainer = document.getElementById('checkoutLightRays');
  if (checkoutLightRaysContainer) {
    window.checkoutLightRays = new LightRays(checkoutLightRaysContainer, {
      raysOrigin: 'top-center',
      raysColor: '#00d4ff',
      raysSpeed: 1.2,
      lightSpread: 0.9,
      rayLength: 1.5,
      followMouse: true,
      mouseInfluence: 0.08,
      noiseAmount: 0.05,
      distortion: 0.03
    });
  }
});
