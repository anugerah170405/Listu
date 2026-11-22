export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;

float edge(float y){
  float d = min(y, 1.0 - y);
  float e = 1.0 - smoothstep(0.0, 0.36, d);
  return e * e;
}

vec2 warp(vec2 st, float s){
  float d = min(st.y, 1.0 - st.y);
  float e = edge(st.y);
  float x = 0.5 + (st.x - 0.5) / (1.0 + e * 0.85 * s);
  float nd = d * (1.0 - e * 0.62 * s);
  return vec2(x, st.y < 0.5 ? nd : 1.0 - nd);
}

void main(){
  vec2 st = vec2(vUv.x, 1.0 - vUv.y);
  float e = edge(st.y);
  if (e < 0.0005) {
    gl_FragColor = vec4(texture2D(uTex, st).rgb, 1.0);
    return;
  }
  float dirY = st.y < 0.5 ? 1.0 : -1.0;
  vec3 col = vec3(0.0);
  const int N = 9;
  for (int i = 0; i < N; i++){
    float f = float(i) / float(N - 1);
    vec2 o = vec2(0.0, dirY * f * e * 0.07);
    col.r += texture2D(uTex, warp(st + o, 0.93)).r;
    col.g += texture2D(uTex, warp(st + o * 1.15, 1.0)).g;
    col.b += texture2D(uTex, warp(st + o * 1.3, 1.07)).b;
  }
  col /= float(N);
  float rim = smoothstep(0.03, 0.0, min(st.y, 1.0 - st.y));
  gl_FragColor = vec4(mix(col, col + vec3(0.06), rim * 0.5), 1.0);
}
`

export function initWebGL(gl: WebGLRenderingContext) {
    const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    return { tex, uTex: gl.getUniformLocation(prog, 'uTex') }
}
