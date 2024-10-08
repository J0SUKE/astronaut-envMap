export const fragmentShader = /* glsl */ `
uniform float uBluriness;
uniform vec2 uDirection;
uniform vec2 uResolution;

vec4 blur(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
    vec4 sum = vec4(0.0);

    vec2 texcoord = 1.0 / resolution;

    sum += texture(image, uv - 4.0 * texcoord * direction) * 0.051;
    sum += texture(image, uv - 3.0 * texcoord * direction) * 0.0918;
    sum += texture(image, uv - 2.0 * texcoord * direction) * 0.12245;
    sum += texture(image, uv - 1.0 * texcoord * direction) * 0.1531;
    sum += texture(image, uv) * 0.1633;
    sum += texture(image, uv + 1.0 * texcoord * direction) * 0.1531;
    sum += texture(image, uv + 2.0 * texcoord * direction) * 0.12245;
    sum += texture(image, uv + 3.0 * texcoord * direction) * 0.0918;
    sum += texture(image, uv + 4.0 * texcoord * direction) * 0.051;

    return sum;
}
`

const t = `void main() {
    FragColor = blur(tMap, vUv, uResolution, uBluriness * uDirection);
}`
